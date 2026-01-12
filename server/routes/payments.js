const express = require('express');
const router = express.Router();
const prisma = require('../db');
const https = require('https');
const { sendPaymentConfirmation } = require('../services/emailService');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Cache school logo base URL helper
const getLogoUrl = (school, logoPath) => {
  if (!logoPath) return null;
  if (logoPath.startsWith('http')) return logoPath;
  const baseUrl = process.env.BASE_URL || '';
  return `${baseUrl}${logoPath}`;
};

/**
 * @route   POST /api/payments/initialize
 * @desc    Initialize a payment (Unified: Paystack or Flutterwave)
 * @access  Authenticated
 */
router.post('/initialize', authenticate, async (req, res) => {
  const { email, amount, studentId, feeRecordId, callbackUrl, provider = 'paystack' } = req.body;

  if (!email || !amount || !studentId || !feeRecordId) {
    return res.status(400).json({ error: 'Missing required payment details' });
  }

  try {
    const school = await prisma.school.findUnique({ where: { id: req.schoolId } });

    if (!school) return res.status(404).json({ error: 'School not found' });

    const reference = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    // --- PAYSTACK LOGIC ---
    if (provider === 'paystack') {
      if (!school.paystackSecretKey) return res.status(400).json({ error: 'Paystack is not configured' });

      const params = JSON.stringify({
        email,
        amount: Math.round(amount * 100),
        reference,
        callback_url: callbackUrl,
        metadata: { studentId, feeRecordId }
      });

      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transaction/initialize',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${school.paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      };

      const paystackReq = https.request(options, paystackRes => {
        let data = '';
        paystackRes.on('data', chunk => data += chunk);
        paystackRes.on('end', async () => {
          try {
            const response = JSON.parse(data);
            if (response.status) {
              await prisma.onlinePayment.create({
                data: {
                  schoolId: req.schoolId,
                  feeRecordId: parseInt(feeRecordId),
                  studentId: parseInt(studentId),
                  amount: parseFloat(amount),
                  provider: 'paystack',
                  reference,
                  status: 'pending'
                }
              });
              res.json({ success: true, authorization_url: response.data.authorization_url, reference });
            } else {
              res.status(400).json({ error: response.message });
            }
          } catch (e) {
            res.status(500).json({ error: 'Failed to parse Paystack response' });
          }
        });
      });
      paystackReq.on('error', e => res.status(500).json({ error: 'Paystack init failed' }));
      paystackReq.write(params);
      paystackReq.end();
    }

    // --- FLUTTERWAVE LOGIC ---
    else if (provider === 'flutterwave') {
      if (!school.flutterwaveSecretKey) return res.status(400).json({ error: 'Flutterwave is not configured' });

      const params = JSON.stringify({
        tx_ref: reference,
        amount: amount,
        currency: 'NGN',
        redirect_url: callbackUrl,
        customer: { email, name: email.split('@')[0] },
        meta: { studentId, feeRecordId },
        customizations: {
          title: school.name || 'School Fee Payment',
          logo: getLogoUrl(school, school.logoUrl)
        }
      });

      const options = {
        hostname: 'api.flutterwave.com',
        port: 443,
        path: '/v3/payments',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${school.flutterwaveSecretKey}`,
          'Content-Type': 'application/json'
        }
      };

      const fwReq = https.request(options, fwRes => {
        let data = '';
        fwRes.on('data', chunk => data += chunk);
        fwRes.on('end', async () => {
          try {
            const response = JSON.parse(data);
            if (response.status === 'success') {
              await prisma.onlinePayment.create({
                data: {
                  schoolId: req.schoolId,
                  feeRecordId: parseInt(feeRecordId),
                  studentId: parseInt(studentId),
                  amount: parseFloat(amount),
                  provider: 'flutterwave',
                  reference,
                  status: 'pending'
                }
              });
              res.json({ success: true, authorization_url: response.data.link, reference });
            } else {
              res.status(400).json({ error: response.message });
            }
          } catch (e) {
            res.status(500).json({ error: 'Failed to parse Flutterwave response' });
          }
        });
      });
      fwReq.on('error', e => res.status(500).json({ error: 'Flutterwave init failed' }));
      fwReq.write(params);
      fwReq.end();
    }
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/payments/verify/:reference
 * @desc    Verify a payment (Unified: Paystack or Flutterwave)
 * @access  Authenticated
 */
router.get('/verify/:reference', authenticate, async (req, res) => {
  const { reference } = req.params;

  try {
    const payment = await prisma.onlinePayment.findFirst({
      where: { reference, schoolId: req.schoolId },
      include: {
        student: {
          include: {
            user: true,
            parent: { include: { user: true } },
            classModel: true
          }
        }
      }
    });

    if (!payment) return res.status(404).json({ error: 'Payment record not found' });
    if (payment.status === 'success') return res.json({ success: true, message: 'Already verified' });

    const school = await prisma.school.findUnique({ where: { id: req.schoolId } });

    let isSuccess = false;
    let providerData = null;

    // --- VERIFY PAYSTACK ---
    if (payment.provider === 'paystack') {
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/transaction/verify/${reference}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${school.paystackSecretKey}` }
      };

      const verifyData = await new Promise((resolve, reject) => {
        const payReq = https.request(options, payRes => {
          let d = '';
          payRes.on('data', c => d += c);
          payRes.on('end', () => {
            try {
              resolve(JSON.parse(d));
            } catch (e) {
              reject(new Error('Failed to parse Paystack verification response'));
            }
          });
        });
        payReq.on('error', reject);
        payReq.end();
      });

      if (verifyData.status && verifyData.data.status === 'success') {
        isSuccess = true;
        providerData = verifyData.data;
      }
    }

    // --- VERIFY FLUTTERWAVE ---
    else if (payment.provider === 'flutterwave') {
      const options = {
        hostname: 'api.flutterwave.com',
        port: 443,
        path: `/v3/transactions/verify_by_reference?tx_ref=${reference}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${school.flutterwaveSecretKey}` }
      };

      const verifyData = await new Promise((resolve, reject) => {
        const fwReq = https.request(options, fwRes => {
          let d = '';
          fwRes.on('data', c => d += c);
          fwRes.on('end', () => {
            try {
              resolve(JSON.parse(d));
            } catch (e) {
              reject(new Error('Failed to parse Flutterwave verification response'));
            }
          });
        });
        fwReq.on('error', reject);
        fwReq.end();
      });

      if (verifyData.status === 'success' && verifyData.data.status === 'successful') {
        isSuccess = true;
        providerData = verifyData.data;
      }
    }

    if (isSuccess) {
      if (payment.status !== 'success') {
        // Use a transaction for consistency
        await prisma.$transaction(async (tx) => {
          // 1. Update online payment status
          await tx.onlinePayment.update({
            where: { id: payment.id },
            data: {
              status: 'success',
              paidAt: new Date(),
              providerResponse: JSON.stringify(providerData)
            }
          });

          // 2. Fetch and update fee record
          const feeRecord = await tx.feeRecord.findFirst({
            where: { id: payment.feeRecordId, schoolId: req.schoolId },
            include: { term: true, academicSession: true }
          });

          if (feeRecord) {
            const newPaidAmount = feeRecord.paidAmount + payment.amount;
            const newBalance = Math.max(0, feeRecord.expectedAmount - newPaidAmount);

            await tx.feeRecord.update({
              where: { id: feeRecord.id },
              data: {
                paidAmount: newPaidAmount,
                balance: newBalance
              }
            });

            // 3. Create fee payment record
            const feePayment = await tx.feePayment.create({
              data: {
                schoolId: req.schoolId,
                feeRecordId: feeRecord.id,
                amount: payment.amount,
                paymentMethod: 'online',
                reference: reference,
                notes: `Online payment via ${payment.provider}`,
                recordedBy: 1 // System
              }
            });

            // 4. Send notifications (Non-blocking)
            // Trigger notifications after transaction commits
          }
        });

        // Notifications after successful transaction
        const freshRecord = await prisma.feeRecord.findFirst({
          where: { id: payment.feeRecordId },
          include: { term: true, academicSession: true }
        });

        const newBalance = freshRecord ? Math.max(0, freshRecord.expectedAmount - freshRecord.paidAmount) : 0;

        // Email
        if (payment.student.parent?.user?.email) {
          sendPaymentConfirmation({
            parentEmail: payment.student.parent.user.email,
            studentName: `${payment.student.user.firstName} ${payment.student.user.lastName}`,
            amount: payment.amount,
            paymentMethod: `Online (${payment.provider})`,
            date: new Date(),
            receiptNumber: reference,
            balance: newBalance,
            termName: freshRecord?.term?.name || 'Current Term',
            sessionName: freshRecord?.academicSession?.name || 'Current Session',
            schoolName: school.name || 'School Management System',
            className: payment.student.classModel?.name || 'N/A'
          }).catch(err => console.error('Email error:', err));
        }

        // SMS
        if (payment.student.parent?.phoneNumber) {
          try {
            const { sendPaymentSMS } = require('../services/smsService');
            sendPaymentSMS({
              phone: payment.student.parent.phoneNumber,
              studentName: `${payment.student.user.firstName} ${payment.student.user.lastName}`,
              amount: payment.amount,
              balance: newBalance,
              schoolName: school.name || 'School Management System'
            }).catch(e => console.error('SMS error:', e));
          } catch (e) { }
        }

        logAction({
          schoolId: req.schoolId,
          userId: req.user.id,
          action: 'VERIFY',
          resource: 'ONLINE_PAYMENT',
          details: { reference, amount: payment.amount, status: 'SUCCESS' },
          ipAddress: req.ip
        });

        return res.json({ success: true, message: 'Payment verified successfully' });
      }
      return res.json({ success: true, message: 'Payment already verified' });
    } else {
      await prisma.onlinePayment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          providerResponse: JSON.stringify(providerData)
        }
      });
      return res.status(400).json({ error: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/payments/history
 * @desc    Get payment history for the school
 * @access  Admin only
 */
router.get('/history', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const payments = await prisma.onlinePayment.findMany({
      where: { schoolId: req.schoolId },
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            user: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

module.exports = router;
