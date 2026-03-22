const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Get all miscellaneous fees
router.get('/', authenticate, async (req, res) => {
  try {
    const { sessionId, termId } = req.query;

    const where = { schoolId: req.schoolId };
    if (sessionId) where.academicSessionId = parseInt(sessionId);
    if (termId) where.termId = parseInt(termId);

    const fees = await prisma.miscellaneousFee.findMany({
      where,
      include: {
        academicSession: true,
        term: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Parse classIds from JSON string
    const formattedFees = fees.map(fee => ({
      ...fee,
      classIds: JSON.parse(fee.classIds || '[]')
    }));

    res.json(formattedFees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new miscellaneous fee
router.post('/', authenticate, authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    const { title, description, amount, isCompulsory, classIds, academicSessionId, termId } = req.body;

    const fee = await prisma.miscellaneousFee.create({
      data: {
        schoolId: req.schoolId,
        title,
        description,
        amount: parseFloat(amount),
        isCompulsory: !!isCompulsory,
        classIds: JSON.stringify(classIds || []),
        academicSessionId: academicSessionId ? parseInt(academicSessionId) : null,
        termId: termId ? parseInt(termId) : null
      }
    });

    res.status(201).json({
      ...fee,
      classIds: JSON.parse(fee.classIds)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update miscellaneous fee
router.put('/:id', authenticate, authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, amount, isCompulsory, classIds, academicSessionId, termId } = req.body;

    const fee = await prisma.miscellaneousFee.update({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      data: {
        title,
        description,
        amount: parseFloat(amount),
        isCompulsory: !!isCompulsory,
        classIds: JSON.stringify(classIds || []),
        academicSessionId: academicSessionId ? parseInt(academicSessionId) : null,
        termId: termId ? parseInt(termId) : null
      }
    });

    res.json({
      ...fee,
      classIds: JSON.parse(fee.classIds)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete miscellaneous fee
router.delete('/:id', authenticate, authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.miscellaneousFee.delete({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      }
    });

    res.json({ message: 'Fee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailed analytics (per fee, per class, per student)
router.get('/detailed-analytics', authenticate, async (req, res) => {
  try {
    const { sessionId, termId } = req.query;

    const where = { schoolId: req.schoolId };
    if (sessionId) where.academicSessionId = parseInt(sessionId);
    if (termId) where.termId = parseInt(termId);

    const fees = await prisma.miscellaneousFee.findMany({
      where,
      include: {
        payments: {
          include: {
            student: {
              include: {
                user: {
                  select: { firstName: true, lastName: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const classes = await prisma.class.findMany({
      where: { schoolId: req.schoolId },
      include: {
        students: {
          include: {
            user: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      }
    });

    const detailedData = fees.map(fee => {
      const classIds = JSON.parse(fee.classIds || '[]');
      const applicableClasses = classes.filter(c => classIds.includes(c.id.toString()));

      const classesData = applicableClasses.map(cls => {
        const studentsInClass = cls.students.map(student => {
          const studentPayments = fee.payments.filter(p => p.studentId === student.id);
          const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
          return {
            id: student.id,
            name: `${student.user.firstName} ${student.user.lastName}`,
            admissionNumber: student.admissionNumber,
            totalPaid,
            balance: fee.amount - totalPaid,
            payments: studentPayments.map(p => ({
              id: p.id,
              amount: p.amount,
              date: p.paymentDate,
              method: p.paymentMethod,
              receiptNumber: p.receiptNumber
            }))
          };
        });

        const totalExpected = fee.amount * cls.students.length;
        const totalReceived = studentsInClass.reduce((sum, s) => sum + s.totalPaid, 0);

        return {
          id: cls.id,
          name: cls.name,
          arm: cls.arm,
          totalExpected,
          totalReceived,
          outstanding: totalExpected - totalReceived,
          students: studentsInClass
        };
      });

      const totalExpected = classesData.reduce((sum, c) => sum + c.totalExpected, 0);
      const totalReceived = classesData.reduce((sum, c) => sum + c.totalReceived, 0);

      return {
        id: fee.id,
        title: fee.title,
        amount: fee.amount,
        isCompulsory: fee.isCompulsory,
        totalExpected,
        totalReceived,
        outstanding: totalExpected - totalReceived,
        classes: classesData
      };
    });

    res.json(detailedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analytics (total expected, received, outstanding)
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const fees = await prisma.miscellaneousFee.findMany({
      where: { schoolId: req.schoolId },
      include: {
        payments: true
      }
    });

    const classes = await prisma.class.findMany({
      where: { schoolId: req.schoolId },
      include: {
        students: true
      }
    });

    let totalExpected = 0;
    let totalReceived = 0;

    fees.forEach(fee => {
      const classIds = JSON.parse(fee.classIds || '[]');

      // Calculate expected amount based on assigned classes
      const relevantClasses = classes.filter(c => classIds.includes(c.id.toString()));
      const studentCount = relevantClasses.reduce((sum, c) => sum + c.students.length, 0);

      totalExpected += fee.amount * studentCount;

      // Calculate received amount
      const received = fee.payments.reduce((sum, payment) => sum + payment.amount, 0);
      totalReceived += received;
    });

    const outstanding = totalExpected - totalReceived;

    res.json({
      totalExpected,
      totalReceived,
      outstanding
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get student's misc fee obligations
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) }
    });

    if (!student || student.schoolId !== req.schoolId) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get all fees applicable to this student's class
    const fees = await prisma.miscellaneousFee.findMany({
      where: { schoolId: req.schoolId },
      include: {
        payments: {
          where: { studentId: parseInt(studentId) }
        }
      }
    });

    const applicableFees = fees.filter(fee => {
      const classIds = JSON.parse(fee.classIds || '[]');
      return classIds.includes(student.classId?.toString());
    }).map(fee => {
      const totalPaid = fee.payments.reduce((sum, p) => sum + p.amount, 0);
      return {
        id: fee.id,
        title: fee.title,
        description: fee.description,
        amount: fee.amount,
        isCompulsory: fee.isCompulsory,
        paid: totalPaid,
        balance: fee.amount - totalPaid,
        payments: fee.payments
      };
    });

    res.json(applicableFees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record payment
router.post('/payments', authenticate, authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    const { studentId, feeId, amount, paymentMethod, receiptNumber } = req.body;

    const payment = await prisma.miscellaneousFeePayment.create({
      data: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId),
        feeId: parseInt(feeId),
        amount: parseFloat(amount),
        paymentMethod,
        receiptNumber,
        recordedBy: req.userId
      },
      include: {
        student: {
          include: {
            user: true
          }
        },
        fee: true
      }
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment history
router.get('/payments', authenticate, async (req, res) => {
  try {
    const { studentId, feeId } = req.query;

    const where = { schoolId: req.schoolId };
    if (studentId) where.studentId = parseInt(studentId);
    if (feeId) where.feeId = parseInt(feeId);

    const payments = await prisma.miscellaneousFeePayment.findMany({
      where,
      include: {
        student: {
          include: {
            user: true
          }
        },
        fee: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete payment
router.delete('/payments/:id', authenticate, authorize(['admin', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.miscellaneousFeePayment.delete({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      }
    });

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get receipt data
router.get('/receipt/:paymentId', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.miscellaneousFeePayment.findUnique({
      where: { id: parseInt(paymentId) },
      include: {
        student: {
          include: {
            user: true,
            classModel: true
          }
        },
        fee: true,
        school: true
      }
    });

    if (!payment || payment.schoolId !== req.schoolId) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
