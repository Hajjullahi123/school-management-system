const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { JWT_SECRET, authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { validate } = require('../middleware/validate');
const { loginSchema, identifySchema, changePasswordSchema, resetPasswordSchema } = require('../schemas/authSchema');

// Helper to construct the unified, rich user object returned during login & /me sessions
const getFullUserPayload = async (userId, schoolId, role) => {
  // Build a minimal select to avoid loading heavy JSON columns (gradingSystem etc.)
  const schoolSelect = {
    id: true, slug: true, name: true, logoUrl: true,
    motto: true, isActivated: true, packageType: true
  };

  // Role-specific includes — only what's actually needed
  let include = { school: { select: schoolSelect } };
  if (role === 'teacher' || role === 'principal') {
    include.teacher = { select: { id: true, staffId: true, specialization: true, photoUrl: true } };
    include.classesAsTeacher = { select: { id: true, name: true, arm: true } };
  } else if (role === 'student') {
    include.student = {
      select: {
        id: true, admissionNumber: true, photoUrl: true, classId: true,
        classModel: { 
          select: { 
            id: true, name: true, arm: true,
            classTeacher: {
              select: {
                firstName: true,
                lastName: true,
                signatureUrl: true
              }
            }
          } 
        }
      }
    };
  } else if (role === 'parent') {
    include.Parent = {
      include: {
        parentChildren: {
          include: {
            user: { select: { firstName: true, lastName: true, photoUrl: true } },
            classModel: {
              include: {
                classTeacher: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                    photoUrl: true,
                    username: true,
                    teacher: {
                      select: {
                        publicPhone: true,
                        publicEmail: true,
                        publicWhatsapp: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, username: true, role: true, schoolId: true,
      firstName: true, lastName: true, email: true,
      signatureUrl: true, mustChangePassword: true, photoUrl: true,
      departmentAsHead: { select: { id: true, name: true } },
      ...include
    }
  });

  if (!user) return null;

  // Perform essential lookups in parallel
  const [unreadCount, formMasterClass, hasQuranAccess, unassignedClasses] = await Promise.all([
    // Unread message count
    prisma.parentTeacherMessage.count({
      where: { receiverId: userId, isRead: false, schoolId: schoolId || undefined }
    }),
    // Form Master check
    ['teacher', 'principal'].includes(role) ? prisma.class.findFirst({
      where: { classTeacherId: userId, schoolId: schoolId || undefined },
      select: { id: true, name: true }
    }) : null,
    // Quran access check
    (async () => {
      if (role === 'admin' || role === 'principal' || role === 'superadmin') return true;
      
      const studentClassId = user?.student?.classId || user?.student?.classModel?.id;
      
      if (role === 'teacher') {
        if (user.departmentAsHead) {
          const deptName = user.departmentAsHead.name.toLowerCase();
          if (deptName.includes('quran') || deptName.includes("qur'an")) {
            return true;
          }
        }

        const quranAssignment = await prisma.teacherAssignment.findFirst({
          where: {
            teacherId: userId,
            schoolId: schoolId || undefined,
            classSubject: {
              subject: {
                OR: [
                  { name: { contains: 'quran', mode: 'insensitive' } },
                  { name: { contains: "qur'an", mode: 'insensitive' } }
                ]
              }
            }
          },
          select: { id: true }
        });
        
        return !!quranAssignment;
      }
      
      if (role === 'student' && studentClassId) {
        const quranSubject = await prisma.classSubject.findFirst({
          where: {
            classId: studentClassId,
            schoolId: schoolId || undefined,
            subject: {
              name: { contains: 'quran', mode: 'insensitive' }
            }
          },
          select: { id: true }
        });

        if (!quranSubject && studentClassId) {
           const quranAltSubject = await prisma.classSubject.findFirst({
              where: {
                classId: studentClassId,
                schoolId: schoolId || undefined,
                subject: {
                  name: { contains: "qur'an", mode: 'insensitive' }
                }
              },
              select: { id: true }
           });
           return !!quranAltSubject;
        }
        return !!quranSubject;
      }
      return false;
    })(),
    // Unassigned classes for examination officer
    role === 'examination_officer' ? prisma.class.findMany({
      where: {
        schoolId: schoolId || undefined,
        isActive: true,
        classTeacherId: null
      },
      select: { id: true, name: true, arm: true },
      orderBy: [{ name: 'asc' }, { arm: 'asc' }]
    }) : null
  ]);

  const parentProfile = user.Parent ? {
    id: user.Parent.id,
    phone: user.Parent.phone,
    address: user.Parent.address,
    students: (user.Parent.parentChildren || []).map(s => ({
      ...s,
      displayName: s.user ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() : (s.name || s.admissionNumber)
    }))
  } : null;

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    schoolId: user.schoolId,
    schoolSlug: user.school?.slug,
    schoolLogo: user.school?.logoUrl,
    schoolName: user.school?.name,
    schoolMotto: user.school?.motto,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    signatureUrl: user.signatureUrl,
    mustChangePassword: user.mustChangePassword,
    teacher: user.teacher,
    student: user.student,
    parent: parentProfile,
    classesAsTeacher: user.classesAsTeacher,
    photoUrl: user.photoUrl,
    unreadMessageCount: unreadCount,
    isFormMaster: !!formMasterClass || (role === 'examination_officer' && unassignedClasses && unassignedClasses.length > 0),
    formMasterClass: formMasterClass || (unassignedClasses && unassignedClasses.length > 0 ? unassignedClasses[0] : null),
    unassignedClasses: unassignedClasses || [],
    hasQuranAccess: hasQuranAccess,
    departmentAsHead: user.departmentAsHead
  };
// Helper to construct normalized identifier variations (slash vs dash, spaces, leading zeros, and sub-segments)
const getIdentifierVariants = (rawIdentifier) => {
  if (!rawIdentifier || typeof rawIdentifier !== 'string') return [];
  const trimmed = rawIdentifier.trim();
  const noSpace = trimmed.replace(/\s+/g, '');
  
  const variants = [
    trimmed,
    noSpace,
    noSpace.replace(/\//g, '-'),
    noSpace.replace(/-/g, '/'),
    noSpace.replace(/_/g, '/'),
    noSpace.replace(/\./g, '/')
  ];

  // Split into segments by separators (/ - . _) to find sub-component variations
  const segments = noSpace.split(/[\/\-_.]+/).filter(Boolean);
  if (segments.length > 1) {
    for (let i = 1; i < segments.length; i++) {
      const subSegments = segments.slice(i);
      const subStr = subSegments.join('');
      if (subStr.length >= 3) {
        variants.push(subSegments.join('/'));
        variants.push(subSegments.join('-'));
      }
    }
  }

  // Handle leading zero mismatches (e.g. /001 vs /1)
  const match = noSpace.match(/^(.*?)[/\-._]?(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const num = parseInt(numStr, 10);
    if (!isNaN(num)) {
      variants.push(`${prefix}/${num}`);
      variants.push(`${prefix}-${num}`);
      variants.push(`${prefix}/${String(num).padStart(2, '0')}`);
      variants.push(`${prefix}-${String(num).padStart(2, '0')}`);
      variants.push(`${prefix}/${String(num).padStart(3, '0')}`);
      variants.push(`${prefix}-${String(num).padStart(3, '0')}`);
      variants.push(`${prefix}${num}`);
      variants.push(`${prefix}${String(num).padStart(3, '0')}`);
      if (prefix.includes('/')) {
        variants.push(`${prefix.replace(/\//g, '-')}/${String(num).padStart(3, '0')}`);
        variants.push(`${prefix.replace(/\//g, '-')}-${String(num).padStart(3, '0')}`);
      }
    }
  }

  return Array.from(new Set(variants)).filter(Boolean);
};

// Helper to generate phone number variations (+234 vs 0 vs digits only)
const getPhoneVariants = (rawPhone) => {
  if (!rawPhone || typeof rawPhone !== 'string') return [];
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits || digits.length < 6) return [];

  const variants = [digits, rawPhone.trim()];
  if (digits.startsWith('234') && digits.length === 13) {
    const local = '0' + digits.slice(3);
    variants.push(local);
    variants.push(digits.slice(3));
  } else if (digits.startsWith('0') && digits.length === 11) {
    const intl = '234' + digits.slice(1);
    variants.push(intl);
    variants.push(digits.slice(1));
  } else if (digits.length === 10) {
    variants.push('0' + digits);
    variants.push('234' + digits);
  }
  return Array.from(new Set(variants)).filter(Boolean);
};

// Identify school based on username/email/admissionNumber/staffId/rollNo/phone/name
router.post('/identify', validate(identifySchema), async (req, res) => {
  try {
    const { identifier, schoolSlug } = req.body;

    const searchId = identifier.trim();
    const idVariants = getIdentifierVariants(searchId);
    const phoneVariants = getPhoneVariants(searchId);

    if (idVariants.length === 0) {
      return res.status(400).json({ error: 'Valid identifier is required' });
    }

    // Superadmin fast-path (no schoolSlug needed)
    try {
      const superadmin = await prisma.user.findFirst({
        where: {
          role: 'superadmin',
          schoolId: null,
          OR: [
            ...idVariants.map(id => ({ username: { equals: id, mode: 'insensitive' } })),
            ...idVariants.map(id => ({ email: { equals: id, mode: 'insensitive' } }))
          ]
        },
        select: { role: true }
      });
      if (superadmin) {
        return res.json({ schools: [], count: 0, globalAccess: true, message: 'Global admin detected' });
      }
    } catch (e) {
      console.warn('[Identify] Superadmin check error:', e.message);
    }

    // 1. PERFORM GLOBAL DISCOVERY
    const userSelect = { 
      schoolId: true,
      school: { 
        select: { id: true, name: true, slug: true, logoUrl: true } 
      } 
    };

    const studentSelect = {
      schoolId: true,
      school: {
        select: { id: true, name: true, slug: true, logoUrl: true }
      }
    };

    // Parallel lookups across Users, Students, Teachers, and Parents
    const [globalUserMatches, studentMatches, teacherMatches] = await Promise.all([
      prisma.user.findMany({
        where: { 
          OR: [
            ...idVariants.map(id => ({ username: { equals: id, mode: 'insensitive' } })),
            ...idVariants.filter(id => id.length >= 3).map(id => ({ username: { startsWith: id, mode: 'insensitive' } })),
            ...idVariants.map(id => ({ email: { equals: id, mode: 'insensitive' } })),
            ...phoneVariants.map(p => ({ phone: { contains: p } })),
            ...phoneVariants.map(p => ({ Parent: { phone: { contains: p } } })),
            ...(searchId.length >= 3 ? [
              { firstName: { contains: searchId, mode: 'insensitive' } },
              { lastName: { contains: searchId, mode: 'insensitive' } }
            ] : [])
          ] 
        },
        select: userSelect
      }).catch(err => {
        console.error('[Identify] User match error:', err.message);
        return [];
      }),
      prisma.student.findMany({
        where: { 
          OR: [
            ...idVariants.map(id => ({ admissionNumber: { equals: id, mode: 'insensitive' } })),
            ...idVariants.filter(id => id.length >= 3).map(id => ({ admissionNumber: { startsWith: id, mode: 'insensitive' } })),
            ...idVariants.filter(id => id.length >= 3).map(id => ({ admissionNumber: { endsWith: id, mode: 'insensitive' } })),
            ...idVariants.filter(id => id.length >= 4).map(id => ({ admissionNumber: { contains: id, mode: 'insensitive' } })),
            ...phoneVariants.map(p => ({ parentPhone: { contains: p } })),
            ...phoneVariants.map(p => ({ parentGuardianPhone: { contains: p } })),
            ...(searchId.length >= 3 ? [
              { name: { contains: searchId, mode: 'insensitive' } },
              { parentEmail: { equals: searchId, mode: 'insensitive' } }
            ] : [])
          ]
        },
        select: studentSelect
      }).catch(err => {
        console.error('[Identify] Student match error:', err.message);
        return [];
      }),
      prisma.teacher.findMany({
        where: { 
          OR: [
            ...idVariants.map(id => ({ staffId: { equals: id, mode: 'insensitive' } })),
            ...idVariants.filter(id => id.length >= 3).map(id => ({ staffId: { startsWith: id, mode: 'insensitive' } })),
            ...idVariants.filter(id => id.length >= 4).map(id => ({ staffId: { contains: id, mode: 'insensitive' } })),
            ...phoneVariants.map(p => ({ publicPhone: { contains: p } })),
            ...(searchId.length >= 3 ? [
              { publicEmail: { equals: searchId, mode: 'insensitive' } }
            ] : [])
          ]
        },
        select: {
          schoolId: true,
          school: { select: { id: true, name: true, slug: true, logoUrl: true } }
        }
      }).catch(err => {
        console.error('[Identify] Teacher match error:', err.message);
        return [];
      })
    ]);

    // Optional rollNo fallback check (if column exists)
    let rollNoMatches = [];
    try {
      rollNoMatches = await prisma.student.findMany({
        where: { 
          OR: [
            ...idVariants.map(id => ({ rollNo: { equals: id, mode: 'insensitive' } })),
            ...idVariants.filter(id => id.length >= 3).map(id => ({ rollNo: { startsWith: id, mode: 'insensitive' } })),
            ...idVariants.filter(id => id.length >= 3).map(id => ({ rollNo: { endsWith: id, mode: 'insensitive' } }))
          ]
        },
        select: studentSelect
      });
    } catch (e) {
      // Ignore if rollNo column does not exist in database schema
    }

    // Aggregate all matching schools and missing school IDs
    const schoolMap = new Map();
    const unresolvedSchoolIds = new Set();

    [...globalUserMatches, ...studentMatches, ...teacherMatches, ...rollNoMatches].forEach(match => {
      if (match?.school?.id) {
        schoolMap.set(match.school.id, match.school);
      } else if (match?.schoolId) {
        unresolvedSchoolIds.add(match.schoolId);
      }
    });

    // Resolve any schoolIds whose relation was null
    if (unresolvedSchoolIds.size > 0) {
      try {
        const fetchedSchools = await prisma.school.findMany({
          where: { id: { in: Array.from(unresolvedSchoolIds) } },
          select: { id: true, name: true, slug: true, logoUrl: true }
        });
        fetchedSchools.forEach(s => schoolMap.set(s.id, s));
      } catch (err) {
        console.error('[Identify] Failed to resolve schoolIds:', err.message);
      }
    }

    const schools = Array.from(schoolMap.values());

    // 2. LOGIC FOR RETURNING MATCHES
    if (schools.length > 0) {
      // If a schoolSlug was provided, check if it's in our matches
      if (schoolSlug) {
        const currentSchoolMatch = schools.find(s => s.slug === schoolSlug);
        if (currentSchoolMatch && schools.length === 1) {
          return res.json({ schools: [currentSchoolMatch], count: 1 });
        }
        return res.json({ 
          schools, 
          count: schools.length,
          message: schools.length > 1 ? 'Multiple accounts found' : 'Account found'
        });
      }

      // If no schoolSlug provided (Central Login / Discovery), return matches
      return res.json({ 
        schools, 
        count: schools.length,
        message: schools.length > 1 ? 'Multiple accounts found' : 'Account found'
      });
    }

    return res.status(404).json({ error: 'Account not found. Check your credentials.' });
  } catch (error) {
    console.error('Identify error:', error);
    res.status(500).json({ error: 'Identification failed' });
  }
});

// Login endpoint
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    let { username, password, schoolSlug } = req.body;

    const searchId = username.trim();
    const idVariants = getIdentifierVariants(searchId);
    const phoneVariants = getPhoneVariants(searchId);

    let user;
    if (!schoolSlug) {
      // Global login (superadmin)
      user = await prisma.user.findFirst({
        where: {
          username: { equals: searchId, mode: 'insensitive' },
          schoolId: null,
          role: 'superadmin'
        },
        include: { school: true }
      });
    } else {
      // School-specific login
      const school = await prisma.school.findUnique({ 
        where: { slug: schoolSlug },
        select: { id: true } 
      });
      if (!school) return res.status(404).json({ error: 'Invalid school domain' });

      // Minimal payload selection for faster queries
      const userSelect = {
        id: true,
        username: true,
        passwordHash: true,
        role: true,
        firstName: true,
        lastName: true,
        schoolId: true,
        signatureUrl: true,
        mustChangePassword: true,
        photoUrl: true,
        isActive: true,
        departmentAsHead: { select: { id: true, name: true } },
        school: {
          select: {
            name: true,
            slug: true,
            logoUrl: true,
            isActivated: true
          }
        }
      };

      // FAST PATH 1: Try username lookup (exact match or variant)
      user = await prisma.user.findFirst({
        where: {
          schoolId: school.id,
          OR: [
            ...idVariants.map(id => ({ username: { equals: id, mode: 'insensitive' } })),
            ...idVariants.filter(id => id.length >= 3).map(id => ({ username: { startsWith: id, mode: 'insensitive' } }))
          ]
        },
        select: userSelect
      });

      // FAST PATH 2: Try email lookup
      if (!user) {
        user = await prisma.user.findFirst({
          where: {
            schoolId: school.id,
            email: { equals: searchId, mode: 'insensitive' }
          },
          select: userSelect
        });
      }

      // FAST PATH 3: Try phone lookup (across User and Parent models)
      if (!user && phoneVariants.length > 0) {
        user = await prisma.user.findFirst({
          where: {
            schoolId: school.id,
            OR: [
              ...phoneVariants.map(p => ({ phone: { contains: p } })),
              ...phoneVariants.map(p => ({ Parent: { phone: { contains: p } } }))
            ]
          },
          select: userSelect
        });
      }

      // SLOW PATH: Check Student & Teacher models by ID numbers, rollNo, parent contacts
      if (!user) {
        const [studentRecord, teacherRecord] = await Promise.all([
          prisma.student.findFirst({
            where: {
              schoolId: school.id,
              OR: [
                ...idVariants.map(id => ({ admissionNumber: { equals: id, mode: 'insensitive' } })),
                ...idVariants.filter(id => id.length >= 3).map(id => ({ admissionNumber: { startsWith: id, mode: 'insensitive' } })),
                ...idVariants.filter(id => id.length >= 3).map(id => ({ admissionNumber: { endsWith: id, mode: 'insensitive' } })),
                ...idVariants.filter(id => id.length >= 4).map(id => ({ admissionNumber: { contains: id, mode: 'insensitive' } })),
                ...phoneVariants.map(p => ({ parentPhone: { contains: p } })),
                ...phoneVariants.map(p => ({ parentGuardianPhone: { contains: p } }))
              ]
            },
            select: { id: true, userId: true, name: true, admissionNumber: true, user: { select: userSelect } }
          }).catch(err => {
            console.error('[Login] Student findFirst error:', err.message);
            return null;
          }),
          prisma.teacher.findFirst({
            where: {
              schoolId: school.id,
              OR: [
                ...idVariants.map(id => ({ staffId: { equals: id, mode: 'insensitive' } })),
                ...idVariants.filter(id => id.length >= 3).map(id => ({ staffId: { startsWith: id, mode: 'insensitive' } })),
                ...idVariants.filter(id => id.length >= 4).map(id => ({ staffId: { contains: id, mode: 'insensitive' } }))
              ]
            },
            select: { id: true, userId: true, staffId: true, user: { select: userSelect } }
          }).catch(err => {
            console.error('[Login] Teacher findFirst error:', err.message);
            return null;
          })
        ]);

        // Optional rollNo fallback check for student
        let rollNoRecord = null;
        if (!studentRecord) {
          try {
            rollNoRecord = await prisma.student.findFirst({
              where: {
                schoolId: school.id,
                OR: [
                  ...idVariants.map(id => ({ rollNo: { equals: id, mode: 'insensitive' } })),
                  ...idVariants.filter(id => id.length >= 3).map(id => ({ rollNo: { startsWith: id, mode: 'insensitive' } })),
                  ...idVariants.filter(id => id.length >= 3).map(id => ({ rollNo: { endsWith: id, mode: 'insensitive' } }))
                ]
              },
              select: { id: true, userId: true, name: true, admissionNumber: true, user: { select: userSelect } }
            });
          } catch (e) {
            // Ignore if rollNo column does not exist
          }
        }

        // Get user from linked record
        const matchedStudent = studentRecord || rollNoRecord;
        user = matchedStudent?.user || teacherRecord?.user;

        // If student/teacher record exists but userId is null (not linked to a User login account yet),
        // try finding a User record in the same school by username matching admissionNumber or student name
        if (!user && (matchedStudent || teacherRecord)) {
          const admNo = matchedStudent?.admissionNumber || teacherRecord?.staffId;
          if (admNo) {
            user = await prisma.user.findFirst({
              where: {
                schoolId: school.id,
                OR: [
                  { username: { equals: admNo, mode: 'insensitive' } },
                  ...(matchedStudent?.name ? [
                    { firstName: { contains: matchedStudent.name.split(' ')[0], mode: 'insensitive' } }
                  ] : [])
                ]
              },
              select: userSelect
            });
          }

          if (!user) {
            console.error('[Auth] Login failed: Profile found but has no linked User login account. Identifier:', searchId);
            return res.status(401).json({ 
              error: 'Your profile exists in the school database, but your user login account has not been activated yet. Please contact your school administrator to enable your portal account.' 
            });
          }
        }
      }
    }

    if (!user || user.isActive === false) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    if (user.schoolId && user.school && user.school.isActivated === false && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Your school account has been deactivated. Please contact your school administrator or platform support.' });
    }

    // Compare password — handle both bcrypt hashes and plain-text defaults
    let isMatch = false;
    const isBcryptHash = user.passwordHash && (user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$'));
    
    if (isBcryptHash) {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    } else {
      // Plain-text password (schema default or legacy). Compare directly.
      isMatch = (password === user.passwordHash);
      if (isMatch) {
        // Immediately upgrade to a proper bcrypt hash on first successful login
        try {
          const upgradedHash = await bcrypt.hash(password, 10);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: upgradedHash }
          });
          console.log(`[Auth] Upgraded plain-text password to bcrypt hash for user ${user.username}`);
        } catch (upgradeErr) {
          console.error('[Auth] Failed to upgrade plain-text password hash:', upgradeErr);
        }
      }
    }
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Performance Optimization: If the hash uses 12 rounds (slow in JS), re-hash to 8 for speed
    if (user.passwordHash.startsWith('$2a$12$') || user.passwordHash.startsWith('$2b$12$') || 
        user.passwordHash.startsWith('$2a$10$') || user.passwordHash.startsWith('$2b$10$')) {
      try {
        const newHash = await bcrypt.hash(password, 8);
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash }
        });
        console.log(`[Auth] Migrated user ${user.username} to faster password hash (8 rounds)`);
      } catch (err) {
        console.error('[Auth] Failed to migrate password hash:', err);
      }
    }

    // Generate JWT (Trimmed payload for speed)
    const token = jwt.sign(
      { id: user.id, role: user.role, schoolId: user.schoolId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    const fullUserPayload = await getFullUserPayload(user.id, user.schoolId, user.role);

    res.json({
      success: true,
      token,
      user: fullUserPayload
    });

    // Log login success here (Moved from /me for better performance)
    logAction({
      schoolId: user.schoolId || 1,
      userId: user.id,
      action: 'LOGIN',
      resource: 'USER',
      details: { username: user.username, role: user.role, method: 'credentials' },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
router.post('/logout', authenticate, (req, res) => {
  logAction({
    schoolId: req.schoolId || 1,
    userId: req.user.id,
    action: 'LOGOUT',
    resource: 'USER',
    details: { username: req.user.username },
    ipAddress: req.ip
  });
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me - Get current user data
router.get('/me', authenticate, async (req, res) => {
  try {
    const fullUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        schoolId: true,
        role: true,
        isActive: true,
        school: { select: { isActivated: true } }
      }
    });

    if (!fullUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (fullUser.schoolId && fullUser.school && fullUser.school.isActivated === false && fullUser.role !== 'superadmin') {
      return res.status(403).json({ error: 'Your school account has been deactivated. Please contact your administrator.' });
    }

    const fullUserPayload = await getFullUserPayload(req.user.id, req.schoolId, req.user.role);
    res.json(fullUserPayload);
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change current user's password
 * @access  Private
 */
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Fetch user from DB
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordHash: newPasswordHash,
        mustChangePassword: false // Clear flag if it was set
      }
    });

    // Log the action
    logAction({
      schoolId: user.schoolId || 1,
      userId: user.id,
      action: 'UPDATE',
      resource: 'USER_PASSWORD',
      details: { username: user.username },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Admin reset user password
 * @access  Private (Admin/Principal only)
 */
router.post('/reset-password', authenticate, authorize(['admin', 'principal']), validate(resetPasswordSchema), async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { 
        passwordHash,
        mustChangePassword: true // Force change on next login
      }
    });

    // Log the action
    logAction({
      schoolId: req.schoolId || (updatedUser.schoolId || 1),
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'USER_PASSWORD_RESET',
      details: { 
        targetUserId: updatedUser.id,
        targetUsername: updatedUser.username,
        resetBy: req.user.username 
      },
      ipAddress: req.ip
    });

    res.json({ 
      success: true, 
      message: 'Password reset successfully',
      username: updatedUser.username,
      temporaryPassword: newPassword // Returning for the admin to show/print
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});
/**
 * @route   POST /api/auth/impersonate
 * @desc    Admin impersonate a user account (Ghost Login)
 * @access  Private (Admin/Superadmin only)
 */
router.post('/impersonate', authenticate, authorize(['admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { targetUserId } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(targetUserId) }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // Ensure they don't impersonate superadmin unless they are superadmin
    if (targetUser.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Cannot impersonate a superadmin' });
    }

    // Only allow impersonating users in the same school (superadmin can bypass)
    if (req.user.role !== 'superadmin' && targetUser.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Cannot impersonate users from other schools' });
    }

    const fullUser = await getFullUserPayload(targetUser.id, targetUser.schoolId, targetUser.role);

    // Create JWT token with FLAT structure matching the login endpoint
    // so the authenticate middleware can read decoded.id, decoded.role, etc.
    const token = jwt.sign(
      {
        id: targetUser.id,
        role: targetUser.role,
        schoolId: targetUser.schoolId,
        impersonatorId: req.user.id // Mark this as an impersonation session
      },
      JWT_SECRET,
      { expiresIn: '1h' } // Short expiry for impersonation tokens
    );

    // Log the impersonation action
    logAction({
      schoolId: targetUser.schoolId || 1,
      userId: req.user.id,
      action: 'IMPERSONATE',
      resource: 'USER_ACCOUNT',
      details: { 
        targetUserId: targetUser.id,
        targetUsername: targetUser.username
      },
      ipAddress: req.ip
    });

    res.json({ token, user: fullUser });
  } catch (error) {
    console.error('Impersonate error:', error);
    res.status(500).json({ error: 'Failed to impersonate user' });
  }
});

module.exports = router;
