const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Middleware to check if user is HR Admin or Admin
const canManageHR = authorize(['admin', 'hr_admin', 'superadmin', 'principal']);

// ================= STAFF ROUTES =================

// Get my HR records (Salaries, Loans, Leaves, Materials)
router.get('/my-records', authenticate, async (req, res) => {
  try {
    const [salaries, loans, leaves, materials] = await Promise.all([
      prisma.payrollRecord.findMany({
        where: { staffId: req.user.id },
        include: { 
          voucher: { select: { month: true, year: true, status: true } },
          allowances: true,
          deductions: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.loanRequest.findMany({
        where: { staffId: req.user.id },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.leaveRequest.findMany({
        where: { staffId: req.user.id },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.materialRequest.findMany({
        where: { staffId: req.user.id },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.json({ salaries, loans, leaves, materials });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request a loan
router.post('/loan-request', authenticate, async (req, res) => {
  try {
    const { amount, reason, repaymentMonths } = req.body;
    const loan = await prisma.loanRequest.create({
      data: {
        staffId: req.user.id,
        amount: parseFloat(amount),
        reason,
        repaymentMonths: parseInt(repaymentMonths) || 1
      }
    });
    res.json(loan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request leave/excuse
router.post('/leave-request', authenticate, async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const leave = await prisma.leaveRequest.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.user.id,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason
      }
    });
    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request materials
router.post('/material-request', authenticate, async (req, res) => {
  try {
    const { items, priority } = req.body;
    const request = await prisma.materialRequest.create({
      data: {
        schoolId: req.schoolId,
        staffId: req.user.id,
        items: JSON.stringify(items),
        priority: priority || 'NORMAL'
      }
    });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= ADMIN ROUTES =================

// Get all staff for payroll setup
router.get('/admin/staff', authenticate, canManageHR, async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: { schoolId: req.schoolId, role: { notIn: ['parent', 'student', 'superadmin'] } },
      select: { id: true, firstName: true, lastName: true, role: true }
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payroll vouchers
router.get('/admin/vouchers', authenticate, canManageHR, async (req, res) => {
  try {
    const vouchers = await prisma.payrollVoucher.findMany({
      where: { schoolId: req.schoolId },
      include: { _count: { select: { records: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });
    res.json(vouchers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Draft a voucher
router.post('/admin/vouchers', authenticate, canManageHR, async (req, res) => {
  try {
    const { month, year } = req.body;
    
    // Check if exists
    const existing = await prisma.payrollVoucher.findUnique({
      where: { schoolId_month_year: { schoolId: req.schoolId, month: parseInt(month), year: parseInt(year) } }
    });
    if (existing) return res.status(400).json({ error: 'Voucher already exists for this period' });

    const voucher = await prisma.payrollVoucher.create({
      data: { schoolId: req.schoolId, month: parseInt(month), year: parseInt(year) }
    });

    // Populate records for all staff
    const staff = await prisma.user.findMany({
      where: { schoolId: req.schoolId, role: { notIn: ['parent', 'student', 'superadmin'] } }
    });

    for (const s of staff) {
      const record = await prisma.payrollRecord.create({
        data: {
          staffId: s.id,
          voucherId: voucher.id,
          baseSalary: 0, 
          netPay: 0
        }
      });

      // Automated Loan Repayment Detection
      const activeLoans = await prisma.loanRequest.findMany({
        where: { staffId: s.id, status: 'APPROVED' }
      });

      for (const loan of activeLoans) {
        if (loan.repaidMonths < loan.repaymentMonths) {
          const monthlyAmount = Math.ceil(loan.amount / loan.repaymentMonths);
          await prisma.payrollDeduction.create({
            data: {
              payrollRecordId: record.id,
              amount: monthlyAmount,
              reason: `Loan Repayment [ID:${loan.id}] (Instalment ${loan.repaidMonths + 1}/${loan.repaymentMonths})`
            }
          });
        }
      }

      // Attendance-Linked Deduction Suggestion
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month

      const absences = await prisma.staffAttendance.count({
        where: {
          staffId: s.id,
          status: 'ABSENT',
          date: { gte: startDate, lte: endDate }
        }
      });

      if (absences > 0) {
        await prisma.payrollDeduction.create({
          data: {
            payrollRecordId: record.id,
            amount: 0, // Admin to decide based on school policy
            reason: `Absenteeism: ${absences} days recorded in ${new Date(0, parseInt(month)-1).toLocaleString('default', {month:'short'})}`
          }
        });
      }
    }

    res.json(voucher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update payroll record (Salary, Deductions, Allowances)
router.patch('/admin/payroll-records/:id', authenticate, canManageHR, async (req, res) => {
  try {
    const { baseSalary, allowances, deductions } = req.body;
    const recordId = parseInt(req.params.id);

    // Update allowances
    if (allowances) {
      await prisma.payrollAllowance.deleteMany({ where: { payrollRecordId: recordId } });
      await prisma.payrollAllowance.createMany({
        data: allowances.map(a => ({ payrollRecordId: recordId, type: a.type, amount: parseFloat(a.amount), description: a.description }))
      });
    }

    // Update deductions
    if (deductions) {
      await prisma.payrollDeduction.deleteMany({ where: { payrollRecordId: recordId } });
      await prisma.payrollDeduction.createMany({
        data: deductions.map(d => ({ payrollRecordId: recordId, amount: parseFloat(d.amount), reason: d.reason }))
      });
    }

    const totalAllowances = allowances ? allowances.reduce((sum, a) => sum + parseFloat(a.amount), 0) : 0;
    const totalDeductions = deductions ? deductions.reduce((sum, d) => sum + parseFloat(d.amount), 0) : 0;
    const netPay = parseFloat(baseSalary) + totalAllowances - totalDeductions;

    const updated = await prisma.payrollRecord.update({
      where: { id: recordId },
      data: {
        baseSalary: parseFloat(baseSalary),
        totalAllowances,
        totalDeductions,
        netPay
      }
    });

    // Update Voucher Totals
    const allRecords = await prisma.payrollRecord.findMany({ where: { voucherId: updated.voucherId } });
    const totalGross = allRecords.reduce((sum, r) => sum + r.baseSalary + r.totalAllowances, 0);
    const totalNet = allRecords.reduce((sum, r) => sum + r.netPay, 0);
    const totalDeductions = allRecords.reduce((sum, r) => sum + r.totalDeductions, 0);

    await prisma.payrollVoucher.update({
      where: { id: updated.voucherId },
      data: { totalGross, totalNet, totalDeductions }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finalize Voucher
router.patch('/admin/vouchers/:id/finalize', authenticate, canManageHR, async (req, res) => {
  try {
    const voucherId = parseInt(req.params.id);
    
    // 1. Mark Voucher as Finalized
    const voucher = await prisma.payrollVoucher.update({
      where: { id: voucherId, schoolId: req.schoolId },
      data: { status: 'FINALIZED' },
      include: { records: { include: { deductions: true } } }
    });

    // 2. Process Loan Repayments
    for (const record of voucher.records) {
      for (const deduction of record.deductions) {
        if (deduction.reason.startsWith('Loan Repayment')) {
          // Extract Loan ID from reason: "Loan Repayment [ID:123] ..."
          const idMatch = deduction.reason.match(/\[ID:(\d+)\]/);
          if (idMatch) {
            const loanId = parseInt(idMatch[1]);
            const activeLoan = await prisma.loanRequest.findUnique({
              where: { id: loanId }
            });

            if (activeLoan && activeLoan.status === 'APPROVED') {
              const newRepaid = activeLoan.repaidMonths + 1;
              const newStatus = newRepaid >= activeLoan.repaymentMonths ? 'COMPLETED' : 'APPROVED';
              
              await prisma.loanRequest.update({
                where: { id: activeLoan.id },
                data: { repaidMonths: newRepaid, status: newStatus }
              });
            }
          }
        }
      }
    }

    res.json(voucher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manage Requests (Loan, Leave, Material)
router.get('/admin/requests', authenticate, canManageHR, async (req, res) => {
  try {
    const [loans, leaves, materials] = await Promise.all([
      prisma.loanRequest.findMany({ 
        where: { staff: { schoolId: req.schoolId } },
        include: { staff: { select: { firstName: true, lastName: true } } } 
      }),
      prisma.leaveRequest.findMany({ where: { schoolId: req.schoolId }, include: { staff: { select: { firstName: true, lastName: true } } } }),
      prisma.materialRequest.findMany({ where: { schoolId: req.schoolId }, include: { staff: { select: { firstName: true, lastName: true } } } })
    ]);
    res.json({ loans, leaves, materials });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/admin/loan-requests/:id', authenticate, canManageHR, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await prisma.loanRequest.update({
      where: { 
        id: parseInt(req.params.id),
        staff: { schoolId: req.schoolId } // Security: Ensure request belongs to this school
      },
      data: { status, processedById: req.user.id, processedAt: new Date() }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/admin/leave-requests/:id', authenticate, canManageHR, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await prisma.leaveRequest.update({
      where: { 
        id: parseInt(req.params.id),
        schoolId: req.schoolId // Security check
      },
      data: { status, processedById: req.user.id, processedAt: new Date() }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/admin/material-requests/:id', authenticate, canManageHR, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await prisma.materialRequest.update({
      where: { 
        id: parseInt(req.params.id),
        schoolId: req.schoolId // Security check
      },
      data: { status, processedById: req.user.id, processedAt: new Date() }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
