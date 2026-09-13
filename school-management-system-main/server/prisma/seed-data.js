const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data population...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Ensure Academic Session Exists
  const session = await prisma.academicSession.upsert({
    where: { name: '2024/2025' },
    update: {},
    create: {
      name: '2024/2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-07-31'),
      isCurrent: true,
      terms: {
        create: [
          { name: 'First Term', startDate: new Date('2024-09-01'), endDate: new Date('2024-12-15'), isCurrent: true },
          { name: 'Second Term', startDate: new Date('2025-01-06'), endDate: new Date('2025-04-10'), isCurrent: false },
          { name: 'Third Term', startDate: new Date('2025-04-28'), endDate: new Date('2025-07-25'), isCurrent: false }
        ]
      }
    }
  });
  console.log('Academic Session ensured.');

  // 2. Create Classes
  const classData = [
    { name: 'JSS 1', arm: 'A' }, { name: 'JSS 1', arm: 'B' },
    { name: 'JSS 2', arm: 'A' }, { name: 'JSS 2', arm: 'B' },
    { name: 'JSS 3', arm: 'A' },
    { name: 'SS 1', arm: 'Science' }, { name: 'SS 1', arm: 'Art' },
    { name: 'SS 2', arm: 'Science' }, { name: 'SS 2', arm: 'Art' },
    { name: 'SS 3', arm: 'Science' }
  ];

  const classes = [];
  for (const cls of classData) {
    const classRecord = await prisma.class.upsert({
      where: { name_arm: { name: cls.name, arm: cls.arm } },
      update: {},
      create: cls
    });
    classes.push(classRecord);
  }
  console.log(`${classes.length} Classes ensured.`);

  // 3. Create Subjects
  const subjectData = [
    { name: 'Mathematics', code: 'MATH' },
    { name: 'English Language', code: 'ENG' },
    { name: 'Basic Science', code: 'BSC' },
    { name: 'Civic Education', code: 'CIV' },
    { name: 'Physics', code: 'PHY' },
    { name: 'Chemistry', code: 'CHM' },
    { name: 'Biology', code: 'BIO' },
    { name: 'Economics', code: 'ECO' },
    { name: 'Literature-in-English', code: 'LIT' },
    { name: 'Government', code: 'GOV' },
    { name: 'Agricultural Science', code: 'AGR' },
    { name: 'Computer Studies', code: 'CSC' }
  ];

  const subjects = [];
  for (const subj of subjectData) {
    const subjectRecord = await prisma.subject.upsert({
      where: { code: subj.code },
      update: {},
      create: subj
    });
    subjects.push(subjectRecord);
  }
  console.log(`${subjects.length} Subjects ensured.`);

  // 4. Create Teachers
  const teacherData = [
    { firstName: 'John', lastName: 'Doe', username: 'teacher1', specialization: 'Science' },
    { firstName: 'Jane', lastName: 'Smith', username: 'teacher2', specialization: 'Arts' },
    { firstName: 'Michael', lastName: 'Johnson', username: 'teacher3', specialization: 'Mathematics' },
    { firstName: 'Sarah', lastName: 'Williams', username: 'teacher4', specialization: 'Languages' },
    { firstName: 'David', lastName: 'Brown', username: 'teacher5', specialization: 'General' }
  ];

  const teachers = [];
  for (const t of teacherData) {
    let user = await prisma.user.findUnique({ where: { username: t.username } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: t.username,
          passwordHash,
          email: `${t.username}@school.com`,
          role: 'teacher',
          firstName: t.firstName,
          lastName: t.lastName,
          teacher: {
            create: {
              staffId: `STf-${Math.floor(Math.random() * 10000)}`,
              specialization: t.specialization
            }
          }
        },
        include: { teacher: true }
      });
      console.log(`Created teacher: ${t.username}`);
    } else {
      // Ensure teacher profile exists if user exists but teacher profile might not (unlikely given schema but good for safety)
      const teacherProfile = await prisma.teacher.findUnique({ where: { userId: user.id } });
      if (!teacherProfile) {
        await prisma.teacher.create({
          data: {
            userId: user.id,
            staffId: `STF-${Math.floor(Math.random() * 10000)}`,
            specialization: t.specialization
          }
        });
      }
    }
    const fullTeacher = await prisma.user.findUnique({ where: { id: user.id }, include: { teacher: true } });
    teachers.push(fullTeacher);
  }

  // 5. Create Students (50 per class)
  const studentNames = [
    'Ahmed', 'Fatima', 'Ibrahim', 'Zainab', 'Musa', 'Aishat', 'Yusuf', 'Maryam', 'Abdullahi', 'Khadija',
    'Samuel', 'Grace', 'Emmanuel', 'Esther', 'Daniel', 'Victoria', 'Joseph', 'Sarah', 'David', 'Deborah',
    'Michael', 'Blessing', 'Chinedu', 'Chioma', 'Emeka', 'Ngozi', 'Tochukwu', 'Ada', 'Ikechukwu', 'Uche',
    'Tunde', 'Funke', 'Segun', 'Kemi', 'Kunle', 'Bimbo', 'Wale', 'Toyin', 'Femi', 'Yemi',
    'Sadiq', 'Hauwa', 'Kabir', 'Halima', 'Bashir', 'Safiya', 'Usman', 'Jummai', 'Hassan', 'Hussaina'
  ];

  // Get current session and term
  const currentSession = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
  const currentTerm = await prisma.term.findFirst({ where: { isCurrent: true } });

  for (const cls of classes) {
    console.log(`Populating students and results for class: ${cls.name} ${cls.arm || ''}`);

    // Determine subjects for this class
    let classSubjects = [];
    if (cls.name.startsWith('JSS')) {
      // JSS Subjects: Math, Eng, BSC, CIV, CSC, AGR
      classSubjects = subjects.filter(s => ['MATH', 'ENG', 'BSC', 'CIV', 'CSC', 'AGR'].includes(s.code));
    } else if (cls.name.startsWith('SS')) {
      // Common: Math, Eng, CSC
      const common = subjects.filter(s => ['MATH', 'ENG', 'CSC'].includes(s.code));
      let specific = [];
      if (cls.arm === 'Science' || !cls.arm) {
        specific = subjects.filter(s => ['PHY', 'CHM', 'BIO'].includes(s.code));
      }
      if (cls.arm === 'Art' || !cls.arm) {
        const arts = subjects.filter(s => ['LIT', 'GOV', 'ECO'].includes(s.code));
        specific = [...specific, ...arts]; // If arm not specified, maybe mix or assumes general. Let's start with correct ones.
        // If no arm, user might have mixed. Let's just add Arts to Art arm.
      }
      // If Arm is science, use Science subs. If Art, Art subs.
      classSubjects = [...common, ...specific];
    }

    for (let i = 0; i < 50; i++) {
      const randName = studentNames[Math.floor(Math.random() * studentNames.length)];
      const lastName = studentNames[Math.floor(Math.random() * studentNames.length)];
      const admissionNumber = `2024-${cls.name.replace(/\s/g, '')}${cls.arm ? cls.arm[0] : ''}-${Math.floor(1000 + Math.random() * 9000)}-${i}`;
      const username = `student-${cls.id}-${i}`;

      let user = await prisma.user.findUnique({ where: { username } });
      let studentId;

      if (!user) {
        user = await prisma.user.create({
          data: {
            username,
            passwordHash,
            firstName: randName,
            lastName: lastName,
            role: 'student',
            student: {
              create: {
                admissionNumber,
                classId: cls.id,
                gender: i % 2 === 0 ? 'Male' : 'Female',
                dateOfBirth: new Date('2010-01-01')
              }
            }
          },
          include: { student: true }
        });
        studentId = user.student.id;
      } else {
        const stud = await prisma.student.findUnique({ where: { userId: user.id } });
        studentId = stud.id;
      }

      // Generate Results for this student if they don't exist
      if (currentSession && currentTerm && classSubjects.length > 0) {
        for (const subj of classSubjects) {
          const resultExists = await prisma.result.findUnique({
            where: {
              studentId_subjectId_termId_academicSessionId: {
                studentId: studentId,
                subjectId: subj.id,
                termId: currentTerm.id,
                academicSessionId: currentSession.id
              }
            }
          });

          if (!resultExists) {
            // Generate random scores
            const a1 = Math.floor(Math.random() * 6); // 0-5
            const a2 = Math.floor(Math.random() * 6); // 0-5
            const t1 = Math.floor(Math.random() * 11); // 0-10
            const t2 = Math.floor(Math.random() * 11); // 0-10

            // Weighted random for Exam to create pass/fail mix
            // 70% chance of passing score (>30/70), 30% chance of fail
            let exam;
            if (Math.random() > 0.3) {
              exam = 30 + Math.floor(Math.random() * 41); // 30-70
            } else {
              exam = Math.floor(Math.random() * 30); // 0-29
            }

            const total = a1 + a2 + t1 + t2 + exam;
            let grade = 'F';
            if (total >= 70) grade = 'A';
            else if (total >= 60) grade = 'B';
            else if (total >= 50) grade = 'C';
            else if (total >= 45) grade = 'D'; // Wait, standard often 40 or 45. Using user's scale:
            // User scale in previous file: 40=D, 30=E.
            else if (total >= 40) grade = 'D';
            else if (total >= 30) grade = 'E';

            await prisma.result.create({
              data: {
                studentId,
                academicSessionId: currentSession.id,
                termId: currentTerm.id,
                classId: cls.id,
                subjectId: subj.id,
                assignment1Score: a1,
                assignment2Score: a2,
                test1Score: t1,
                test2Score: t2,
                examScore: exam,
                totalScore: total,
                grade,
                isSubmitted: true
              }
            });
          }
        }
      }
    }
  }

  // 6. Teacher Assignments (Distribute subjects)
  // Logic: 
  // Teacher 1 (Science) -> Physics, Chem, Bio to SS classes
  // Teacher 2 (Arts) -> Lit, Gov, Eco to SS classes
  // Teacher 3 (Math) -> Math to JSS + SS
  // Teacher 4 (Lang) -> English to JSS + SS
  // Teacher 5 (Gen) -> Basic Sci, Civic to JSS

  const assignments = [];

  // Helper to find subject by code
  const getSub = (code) => subjects.find(s => s.code === code);

  // Teacher 3: Math for All Classes
  const teacherMath = teachers.find(t => t.username === 'teacher3');
  const mathSub = getSub('MATH');
  if (teacherMath && mathSub) {
    for (const cls of classes) {
      assignments.push({ teacherId: teacherMath.id, subjectId: mathSub.id, classId: cls.id });
    }
  }

  // Teacher 4: English for All Classes
  const teacherEng = teachers.find(t => t.username === 'teacher4');
  const engSub = getSub('ENG');
  if (teacherEng && engSub) {
    for (const cls of classes) {
      assignments.push({ teacherId: teacherEng.id, subjectId: engSub.id, classId: cls.id });
    }
  }

  // Teacher 1: Sciences for SS Classes
  const teacherSci = teachers.find(t => t.username === 'teacher1');
  const sciSubs = [getSub('PHY'), getSub('CHM'), getSub('BIO')].filter(Boolean);
  const ssClasses = classes.filter(c => c.name.startsWith('SS') && (c.arm === 'Science' || !c.arm));
  if (teacherSci) {
    for (const cls of ssClasses) {
      for (const sub of sciSubs) {
        assignments.push({ teacherId: teacherSci.id, subjectId: sub.id, classId: cls.id });
      }
    }
  }

  // Teacher 2: Arts for SS Classes
  const teacherArt = teachers.find(t => t.username === 'teacher2');
  const artSubs = [getSub('LIT'), getSub('GOV'), getSub('ECO')].filter(Boolean);
  const artClasses = classes.filter(c => c.name.startsWith('SS') && (c.arm === 'Art' || !c.arm));
  if (teacherArt) {
    for (const cls of artClasses) {
      for (const sub of artSubs) {
        assignments.push({ teacherId: teacherArt.id, subjectId: sub.id, classId: cls.id });
      }
    }
  }

  // Teacher 5: General for JSS Classes
  const teacherGen = teachers.find(t => t.username === 'teacher5');
  const genSubs = [getSub('BSC'), getSub('CIV'), getSub('CSC'), getSub('AGR')].filter(Boolean);
  const jssClasses = classes.filter(c => c.name.startsWith('JSS'));
  if (teacherGen) {
    for (const cls of jssClasses) {
      for (const sub of genSubs) {
        assignments.push({ teacherId: teacherGen.id, subjectId: sub.id, classId: cls.id });
      }
    }
  }

  // Bulk Create Assignments (Handling Duplicates via loop and check/upsert)
  console.log(`Creating ${assignments.length} teacher assignments...`);
  let successCount = 0;
  for (const assign of assignments) {
    try {
      const exists = await prisma.teacherAssignment.findFirst({
        where: {
          teacherId: assign.teacherId,
          subjectId: assign.subjectId,
          classId: assign.classId
        }
      });

      if (!exists) {
        await prisma.teacherAssignment.create({ data: assign });
        successCount++;
      }
    } catch (err) {
      console.error('Error assigning teacher:', err.message);
    }
  }
  console.log(`Successfully created ${successCount} new assignments.`);

  console.log('Data population complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
