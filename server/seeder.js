const prisma = require('./db');
const bcrypt = require('bcryptjs');

module.exports = function (app) {
  // 0. RESET
  app.get('/api/debug/seed-clear', async (req, res) => {
    try {
      const school = await prisma.school.findUnique({ where: { slug: 'demo-academy' } });
      if (school) {
        await prisma.attendanceRecord.deleteMany({ where: { schoolId: school.id } });
        await prisma.result.deleteMany({ where: { schoolId: school.id } });
        await prisma.student.deleteMany({ where: { schoolId: school.id } });
        await prisma.teacher.deleteMany({ where: { schoolId: school.id } });
        await prisma.user.deleteMany({ where: { schoolId: school.id, role: { in: ['student', 'teacher'] } } });
        res.json({ success: true, message: 'Demo student/teacher data cleared' });
      } else {
        res.json({ success: false, message: 'School not found' });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 1. BASE
  app.get('/api/debug/seed-base', async (req, res) => {
    try {
      const passwordHash = await bcrypt.hash('password123', 8);
      const school = await prisma.school.upsert({
        where: { slug: 'demo-academy' },
        update: { isActivated: true, isSetupComplete: true },
        create: {
          slug: 'demo-academy', name: 'Demo Excellence Academy',
          address: '123 Demo Street, Innovation Hub', phone: '0800-DEMO-ACADEMY',
          email: 'info@demoacademy.com', primaryColor: '#0f172a',
          secondaryColor: '#3b82f6', isActivated: true, packageType: 'premium',
          maxStudents: 1000, isSetupComplete: true
        }
      });
      await prisma.user.upsert({
        where: { schoolId_username: { schoolId: school.id, username: 'demo.admin' } },
        update: { passwordHash, isActive: true },
        create: {
          schoolId: school.id, username: 'demo.admin', passwordHash,
          email: 'admin@demo.com', role: 'admin', firstName: 'System', lastName: 'Admin', isActive: true
        }
      });
      const session = await prisma.academicSession.upsert({
        where: { schoolId_name: { schoolId: school.id, name: '2025/2026 Academic Session' } },
        update: { isCurrent: true },
        create: {
          schoolId: school.id, name: '2025/2026 Academic Session',
          startDate: new Date('2025-09-01'), endDate: new Date('2026-07-31'), isCurrent: true
        }
      });
      const term = await prisma.term.upsert({
        where: { schoolId_academicSessionId_name: { schoolId: school.id, academicSessionId: session.id, name: 'First Term' } },
        update: { isCurrent: true },
        create: {
          schoolId: school.id, academicSessionId: session.id, name: 'First Term',
          startDate: new Date('2025-09-01'), endDate: new Date('2025-12-15'), isCurrent: true
        }
      });
      const classNames = ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'];
      for (const name of classNames) {
        await prisma.class.upsert({
          where: { schoolId_name_arm: { schoolId: school.id, name, arm: 'A' } },
          update: { isActive: true },
          create: { schoolId: school.id, name, arm: 'A', isActive: true }
        });
      }
      res.json({ success: true, message: 'Phase 1: Base Ready (School, Admin, Session, Term, 6 Classes)' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. SUBJECTS
  app.get('/api/debug/seed-subjects', async (req, res) => {
    try {
      const school = await prisma.school.findUnique({ where: { slug: 'demo-academy' } });
      if (!school) return res.status(404).json({ error: 'Run phase 1 first' });
      const classes = await prisma.class.findMany({ where: { schoolId: school.id } });
      const subData = [
        { n: 'Mathematics', c: 'MTH' }, { n: 'English Language', c: 'ENG' },
        { n: 'Basic Science', c: 'SCI' }, { n: 'Social Studies', c: 'SOS' },
        { n: 'ICT', c: 'ICT' }, { n: 'Agric Science', c: 'AGR' },
        { n: 'Civic Education', c: 'CIV' }, { n: 'Business Studies', c: 'BUS' },
        { n: 'P.H.E', c: 'PHE' }, { n: 'Fine Arts', c: 'ART' }
      ];
      for (const s of subData) {
        const sub = await prisma.subject.upsert({
          where: { schoolId_code: { schoolId: school.id, code: s.c } },
          update: { name: s.n },
          create: { schoolId: school.id, name: s.n, code: s.c }
        });
        for (const cls of classes) {
          await prisma.classSubject.upsert({
            where: { schoolId_classId_subjectId: { schoolId: school.id, classId: cls.id, subjectId: sub.id } },
            update: {},
            create: { schoolId: school.id, classId: cls.id, subjectId: sub.id }
          });
        }
      }
      res.json({ success: true, message: 'Phase 2: 10 Subjects linked to all classes' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. STUDENTS & RESULTS
  app.get('/api/debug/seed-students', async (req, res) => {
    try {
      const school = await prisma.school.findUnique({ where: { slug: 'demo-academy' } });
      const classes = await prisma.class.findMany({ where: { schoolId: school.id } });
      const session = await prisma.academicSession.findFirst({ where: { schoolId: school.id, isCurrent: true } });
      const term = await prisma.term.findFirst({ where: { schoolId: school.id, isCurrent: true } });
      const subjects = await prisma.subject.findMany({ where: { schoolId: school.id } });
      const passwordHash = await bcrypt.hash('password123', 8);

      // Teachers
      const tData = [
        { u: 't.maths', f: 'Isaac', l: 'Newton' }, { u: 't.english', f: 'Jane', l: 'Austen' },
        { u: 't.science', f: 'Marie', l: 'Curie' }, { u: 't.ict', f: 'Alan', l: 'Turing' }
      ];
      for (const t of tData) {
        const tUser = await prisma.user.upsert({
          where: { schoolId_username: { schoolId: school.id, username: t.u } },
          update: { isActive: true },
          create: {
            schoolId: school.id, username: t.u, passwordHash, role: 'teacher',
            firstName: t.f, lastName: t.l, isActive: true
          }
        });
        await prisma.teacher.upsert({
          where: { schoolId_staffId: { schoolId: school.id, staffId: t.u.toUpperCase() } },
          update: { userId: tUser.id },
          create: { schoolId: school.id, userId: tUser.id, staffId: t.u.toUpperCase(), specialization: 'General' }
        });
      }

      // Students
      const fNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Lopez'];
      const lNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez'];

      for (let i = 0; i < classes.length; i++) {
        const cls = classes[i];
        for (let j = 0; j < 2; j++) {
          const idx = (i * 2) + j;
          const adm = `STUD/2025/${String(idx + 1).padStart(3, '0')}`;
          const uname = adm.toLowerCase().replace(/\//g, '');
          const user = await prisma.user.upsert({
            where: { schoolId_username: { schoolId: school.id, username: uname } },
            update: { isActive: true },
            create: {
              schoolId: school.id, username: uname, passwordHash,
              role: 'student', firstName: fNames[idx], lastName: lNames[idx], isActive: true
            }
          });
          const student = await prisma.student.upsert({
            where: { schoolId_admissionNumber: { schoolId: school.id, admissionNumber: adm } },
            update: { classId: cls.id, rollNo: adm },
            create: {
              schoolId: school.id, userId: user.id, admissionNumber: adm, classId: cls.id, rollNo: adm
            }
          });
          for (const sub of subjects) {
            await prisma.result.upsert({
              where: { studentId_academicSessionId_termId_subjectId: { studentId: student.id, academicSessionId: session.id, termId: term.id, subjectId: sub.id } },
              update: { isSubmitted: true },
              create: {
                schoolId: school.id, studentId: student.id, academicSessionId: session.id, termId: term.id, classId: cls.id, subjectId: sub.id,
                assignment1Score: 12, test1Score: 15, examScore: 50, totalScore: 77, isSubmitted: true, grade: 'A', remark: 'Excellent'
              }
            });
          }
        }
      }
      res.json({ success: true, message: 'Phase 3: Students/Teachers/Results created' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
};
