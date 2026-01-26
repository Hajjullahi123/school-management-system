const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seedDemoData() {
  console.log('🌱 Generating Rich Demo Environment...');

  try {
    // 1. Create/Update Demo School
    const demoSchool = await prisma.school.upsert({
      where: { slug: 'demo' },
      update: {
        isActivated: true,
        subscriptionActive: true,
        packageType: 'premium',
        maxStudents: 1000,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      create: {
        name: 'EduTech Academy (Demo)',
        slug: 'demo',
        isActivated: true,
        subscriptionActive: true,
        packageType: 'premium',
        licenseKey: 'DEMO-PREMIUM-2026',
        maxStudents: 1000,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

    const hashedPassword = await bcrypt.hash('Pass1234!', 10);

    // 2. Create Demo Admin User
    const demoAdminUser = await prisma.user.upsert({
      where: { schoolId_username: { schoolId: demoSchool.id, username: 'demo_admin' } },
      update: { role: 'admin', isActive: true },
      create: {
        username: 'demo_admin',
        passwordHash: hashedPassword,
        email: 'demo@edutechai.com',
        firstName: 'Demo',
        lastName: 'Administrator',
        role: 'admin',
        schoolId: demoSchool.id,
        isActive: true
      }
    });

    // 3. Academic Structure
    const session = await prisma.academicSession.upsert({
      where: { schoolId_name: { schoolId: demoSchool.id, name: '2025/2026' } },
      update: { isCurrent: true },
      create: {
        name: '2025/2026',
        isCurrent: true,
        schoolId: demoSchool.id,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-07-31')
      }
    });

    const term = await prisma.term.upsert({
      where: { schoolId_academicSessionId_name: { schoolId: demoSchool.id, name: 'First Term', academicSessionId: session.id } },
      update: { isCurrent: true },
      create: {
        name: 'First Term',
        isCurrent: true,
        academicSessionId: session.id,
        schoolId: demoSchool.id,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-12-20')
      }
    });

    // 4. Classes & Subjects
    const classes = [];
    for (const className of ['JSS 1', 'JSS 2', 'JSS 3']) {
      const cls = await prisma.class.upsert({
        where: { schoolId_name_arm: { schoolId: demoSchool.id, name: className, arm: 'A' } },
        update: {},
        create: { name: className, arm: 'A', schoolId: demoSchool.id }
      });
      classes.push(cls);
    }

    const subjects = [];
    for (const subName of ['Mathematics', 'English Language', 'Basic Science', 'Quran Studies']) {
      const sub = await prisma.subject.upsert({
        where: { schoolId_code: { schoolId: demoSchool.id, code: subName.substring(0, 3).toUpperCase() } },
        update: {},
        create: { name: subName, code: subName.substring(0, 3).toUpperCase(), schoolId: demoSchool.id }
      });
      subjects.push(sub);
    }

    // 5. Students & Results & Fees
    console.log('👥 Creating students, results and financial records...');
    await prisma.feePayment.deleteMany({ where: { schoolId: demoSchool.id } });
    await prisma.feeRecord.deleteMany({ where: { schoolId: demoSchool.id } });
    await prisma.result.deleteMany({ where: { schoolId: demoSchool.id } });

    for (let i = 1; i <= 20; i++) {
      const studentUsername = `demo_stu_${i}`;
      const targetClass = classes[i % classes.length];

      const user = await prisma.user.upsert({
        where: { schoolId_username: { schoolId: demoSchool.id, username: studentUsername } },
        update: {},
        create: {
          username: studentUsername,
          passwordHash: hashedPassword,
          role: 'student',
          firstName: `Student`,
          lastName: `${i}`,
          schoolId: demoSchool.id
        }
      });

      const student = await prisma.student.upsert({
        where: { schoolId_admissionNumber: { schoolId: demoSchool.id, admissionNumber: `ADM/2026/${i.toString().padStart(3, '0')}` } },
        update: { classId: targetClass.id },
        create: {
          admissionNumber: `ADM/2026/${i.toString().padStart(3, '0')}`,
          schoolId: demoSchool.id,
          userId: user.id,
          classId: targetClass.id,
          gender: i % 2 === 0 ? 'Female' : 'Male',
          status: 'active'
        }
      });

      // Create Results for Dashboard Analytics
      for (const subject of subjects) {
        const score = 50 + Math.random() * 45; // Random score 50-95
        await prisma.result.create({
          data: {
            schoolId: demoSchool.id,
            studentId: student.id,
            academicSessionId: session.id,
            termId: term.id,
            classId: targetClass.id,
            subjectId: subject.id,
            totalScore: score,
            grade: score >= 70 ? 'A' : score >= 60 ? 'B' : 'C',
            isSubmitted: true
          }
        });
      }

      // Create Fee Records
      const amount = 55000;
      const paid = i % 3 === 0 ? 20000 : i % 5 === 0 ? 0 : amount;

      const feeRecord = await prisma.feeRecord.create({
        data: {
          schoolId: demoSchool.id,
          studentId: student.id,
          termId: term.id,
          academicSessionId: session.id,
          expectedAmount: amount,
          paidAmount: paid,
          balance: amount - paid,
          isClearedForExam: paid >= amount
        }
      });

      if (paid > 0) {
        await prisma.feePayment.create({
          data: {
            schoolId: demoSchool.id,
            feeRecordId: feeRecord.id,
            amount: paid,
            paymentMethod: i % 2 === 0 ? 'Cash' : 'Bank Transfer',
            paymentDate: new Date(),
            recordedBy: demoAdminUser.id
          }
        });
      }
    }

    // 6. Notices
    await prisma.notice.deleteMany({ where: { schoolId: demoSchool.id } });
    await prisma.notice.create({
      data: {
        schoolId: demoSchool.id,
        title: 'Welcome to EduTech Academy!',
        content: 'We are excited to have you on our new digital platform.',
        audience: 'all',
        authorId: demoAdminUser.id
      }
    });

    await prisma.notice.create({
      data: {
        schoolId: demoSchool.id,
        title: 'Term Exam Schedule',
        content: 'The first term examinations will begin on the 15th of next month.',
        audience: 'students',
        authorId: demoAdminUser.id
      }
    });

    console.log('✅ Rich Demo Environment Seeded Successfully!');
  } catch (e) {
    console.error('❌ Seeding failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

seedDemoData();
