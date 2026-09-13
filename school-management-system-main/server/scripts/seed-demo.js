const bcrypt = require('bcryptjs');
const prisma = require('../db');

async function seedDemo() {
  console.log('🚀 Starting Demo Data Seeding...');

  try {
    // 1. Check if Demo School already exists
    const existingSchool = await prisma.school.findUnique({
      where: { slug: 'demo-academy' }
    });

    if (existingSchool) {
      console.log('⚠️ Demo Academy already exists. Cleaning up existing demo data...');
      // Note: In a production environment, we might want to skip or handle this differently
      // But for a demo seeder, we'll try to keep it fresh if run multiple times
      // For safety, we'll just skip creation if it exists to avoid accidental wipes
      console.log('✅ Demo Academy is already at: /s/demo-academy');
      return;
    }

    // 2. Create School
    const school = await prisma.school.create({
      data: {
        slug: 'demo-academy',
        name: 'Demo Excellence Academy',
        address: '123 Demo Street, Innovation Hub',
        phone: '0800-DEMO-ACADEMY',
        email: 'info@demoacademy.com',
        motto: 'Testing the Future, Today.',
        primaryColor: '#0f172a',
        secondaryColor: '#3b82f6',
        isActivated: true,
        packageType: 'premium',
        maxStudents: 1000,
        isSetupComplete: true
      }
    });
    console.log('✅ Created School: Demo Excellence Academy');

    const passwordHash = await bcrypt.hash('password123', 12);

    // 3. Create Users
    const adminUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        username: 'demo.admin',
        passwordHash,
        email: 'admin@demo.com',
        role: 'admin',
        firstName: 'System',
        lastName: 'Admin'
      }
    });

    const principalUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        username: 'demo.principal',
        passwordHash,
        email: 'principal@demo.com',
        role: 'principal',
        firstName: 'Marcus',
        lastName: 'Principal'
      }
    });

    const accountantUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        username: 'demo.accountant',
        passwordHash,
        email: 'accountant@demo.com',
        role: 'accountant',
        firstName: 'Sarah',
        lastName: 'Finance'
      }
    });

    console.log('✅ Created Core Staff Users (Admin, Principal, Accountant)');

    // 4. Create Academic Sessions & Terms
    const session = await prisma.academicSession.create({
      data: {
        schoolId: school.id,
        name: '2025/2026 Academic Session',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-07-31'),
        isCurrent: true
      }
    });

    const term1 = await prisma.term.create({
      data: {
        schoolId: school.id,
        academicSessionId: session.id,
        name: 'First Term',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-12-15'),
        isCurrent: true
      }
    });

    console.log('✅ Created Academic Session and First Term');

    // 5. Create Classes
    const classJSS1 = await prisma.class.create({
      data: {
        schoolId: school.id,
        name: 'JSS 1',
        arm: 'Gold',
        isActive: true
      }
    });

    const classJSS2 = await prisma.class.create({
      data: {
        schoolId: school.id,
        name: 'JSS 2',
        arm: 'Silver',
        isActive: true
      }
    });

    console.log('✅ Created Classes: JSS 1 Gold, JSS 2 Silver');

    // 6. Create Teachers
    const teacher1User = await prisma.user.create({
      data: {
        schoolId: school.id,
        username: 'demo.teacher1',
        passwordHash,
        email: 'teacher1@demo.com',
        role: 'teacher',
        firstName: 'John',
        lastName: 'Maths',
        teacher: {
          create: {
            schoolId: school.id,
            staffId: 'DEMO/T/001',
            specialization: 'Mathematics'
          }
        }
      }
    });

    const teacher2User = await prisma.user.create({
      data: {
        schoolId: school.id,
        username: 'demo.teacher2',
        passwordHash,
        email: 'teacher2@demo.com',
        role: 'teacher',
        firstName: 'Jane',
        lastName: 'Science',
        teacher: {
          create: {
            schoolId: school.id,
            staffId: 'DEMO/T/002',
            specialization: 'Basic Science'
          }
        }
      }
    });

    console.log('✅ Created Teachers with Staff Profiles');

    // 7. Create Subjects & Assignments
    const subjectMaths = await prisma.subject.create({
      data: { schoolId: school.id, name: 'Mathematics', code: 'MTH101' }
    });

    const subjectScience = await prisma.subject.create({
      data: { schoolId: school.id, name: 'Basic Science', code: 'SCI101' }
    });

    const classSubject1 = await prisma.classSubject.create({
      data: {
        schoolId: school.id,
        classId: classJSS1.id,
        subjectId: subjectMaths.id,
        periodsPerWeek: 5
      }
    });

    await prisma.teacherAssignment.create({
      data: {
        schoolId: school.id,
        teacherId: teacher1User.id,
        classSubjectId: classSubject1.id
      }
    });

    console.log('✅ Created Subjects and Assigned Teacher John to JSS 1 Maths');

    // 8. Create Fee Structure
    const feeStructure = await prisma.classFeeStructure.create({
      data: {
        schoolId: school.id,
        classId: classJSS1.id,
        academicSessionId: session.id,
        termId: term1.id,
        amount: 45000,
        description: 'First Term Tuition and Levies'
      }
    });

    console.log('✅ Created Fee Structure for JSS 1 (45,000)');

    // 9. Create Students
    const studentNames = [
      { first: 'Abubakar', last: 'Sadiq' },
      { first: 'Fatima', last: 'Zahra' },
      { first: 'Musa', last: 'Kamal' },
      { first: 'Aisha', last: 'Bello' },
      { first: 'Ibrahim', last: 'Musa' }
    ];

    for (let i = 0; i < studentNames.length; i++) {
      const s = studentNames[i];
      const admissionNumber = `DEMO/2025/${String(i + 1).padStart(3, '0')}`;

      const studentUser = await prisma.user.create({
        data: {
          schoolId: school.id,
          username: admissionNumber.toLowerCase().replace(/\//g, ''),
          passwordHash,
          role: 'student',
          firstName: s.first,
          lastName: s.last,
          student: {
            create: {
              schoolId: school.id,
              admissionNumber,
              classId: classJSS1.id,
              parentGuardianName: `Parent of ${s.first}`,
              parentPhone: '0123456789',
              rollNo: admissionNumber,
              isScholarship: i === 0 // First student is on scholarship
            }
          }
        },
        include: { student: true }
      });

      // 10. Create Fee Records
      const expectedAmount = studentUser.student.isScholarship ? 0 : 45000;
      const paidAmount = i === 1 ? 45000 : (i === 2 ? 20000 : 0); // One fully paid, one partial, others 0

      const feeRecord = await prisma.feeRecord.create({
        data: {
          schoolId: school.id,
          studentId: studentUser.student.id,
          academicSessionId: session.id,
          termId: term1.id,
          expectedAmount,
          paidAmount,
          balance: expectedAmount - paidAmount,
          isClearedForExam: studentUser.student.isScholarship || paidAmount >= expectedAmount
        }
      });

      if (paidAmount > 0) {
        await prisma.feePayment.create({
          data: {
            schoolId: school.id,
            feeRecordId: feeRecord.id,
            amount: paidAmount,
            paymentMethod: 'cash',
            recordedBy: accountantUser.id,
            notes: 'Demo payment recorded at seeding'
          }
        });
      }
    }

    console.log(`✅ Created ${studentNames.length} Students with Fee Records and Payments`);

    console.log('\n--- DEMO ACADEMY SEEDED SUCCESSFULLY ---');
    console.log(`URL Path: /s/demo-academy`);
    console.log(`Admin Login: demo.admin / password123`);
    console.log(`Principal Login: demo.principal / password123`);
    console.log(`Accountant Login: demo.accountant / password123`);
    console.log(`Teacher Login: demo.teacher1 / password123`);
    console.log(`Student Login: demo2025002 / password123 (Fully Paid student)`);
    console.log('-----------------------------------------\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDemo();
