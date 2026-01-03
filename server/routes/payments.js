const express = require('express');
const router = express.Router();
const prisma = require('../db');
const https = require('https');
const { sendPaymentConfirmation } = require('../services/emailService');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Initialize a payment (Paystack)
router.post('/initialize', authenticate, async (req, res) => {
  const { email, amount, studentId, feeRecordId, callbackUrl } = req.body;

  if (!email || !amount || !studentId || !feeRecordId) {
    return res.status(400).json({ error: 'Missing required payment details' });
  }

  try {
    // Get school for API keys
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId }
    });

    if (!school || !school.paystackSecretKey) {
      return res.status(400).json({ error: 'Payment gateway not configured' });
    }

    // Create a unique reference
    const reference = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    // Initialize with Paystack
    const params = JSON.stringify({
      email,
      amount: amount * 100, // Convert to kobo
      reference,
      callback_url: callbackUrl,
      metadata: {
        studentId,
        feeRecordId,
        custom_fields: [
          {
            display_name: "Student ID",
            variable_name: "student_id",
            value: studentId
          },
          {
            display_name: "Fee Record ID",
            variable_name: "fee_record_id",
            value: feeRecordId
          }
        ]
      }
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

      paystackRes.on('data', (chunk) => {
        data += chunk;
      });

      paystackRes.on('end', async () => {
        const response = JSON.parse(data);

        if (response.status) {
          // Create pending payment record
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

          res.json({
            success: true,
            authorization_url: response.data.authorization_url,
            reference
          });

          // Log the initialization
          logAction({
            schoolId: req.schoolId,
            userId: req.user.id,
            action: 'INITIALIZE',
            resource: 'ONLINE_PAYMENT',
            details: {
              amount: parseFloat(amount),
              studentId: parseInt(studentId),
              feeRecordId: parseInt(feeRecordId),
              reference
            },
            ipAddress: req.ip
          });
        } else {
          res.status(400).json({ error: response.message });
        }
      });
    });

    paystackReq.on('error', error => {
      console.error(error);
      res.status(500).json({ error: 'Payment initialization failed' });
    });

    paystackReq.write(params);
    paystackReq.end();

  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify a payment (Paystack)
router.get('/verify/:reference', authenticate, async (req, res) => {
  const { reference } = req.params;

  try {
    // Get school for API keys
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId }
    });

    if (!school || !school.paystackSecretKey) {
      return res.status(400).json({ error: 'Payment gateway not configured' });
    }

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${school.paystackSecretKey}`
      }
    };

    const paystackReq = https.request(options, paystackRes => {
      let data = '';

      paystackRes.on('data', (chunk) => {
        data += chunk;
      });

      paystackRes.on('end', async () => {
        const response = JSON.parse(data);

        if (response.status && response.data.status === 'success') {
          // Update payment record
          const payment = await prisma.onlinePayment.findFirst({
            where: {
              reference,
              schoolId: req.schoolId
            },
            include: {
              student: {
                where: { schoolId: req.schoolId },
                include: {
                  user: {
                    where: { schoolId: req.schoolId }
                  },
                  parent: {
                    where: { schoolId: req.schoolId },
                    include: {
                      user: {
                        where: { schoolId: req.schoolId }
                      }
                    }
                  },
                  classModel: {
                    where: { schoolId: req.schoolId }
                  }
                }
              }
            }
          });

          if (payment && payment.status !== 'success') {
            // 1. Update online payment status
            await prisma.onlinePayment.update({
              where: {
                id: payment.id,
                schoolId: req.schoolId
              },
              data: {
                status: 'success',
                paidAt: new Date(),
                providerResponse: JSON.stringify(response.data)
              }
            });

            // 2. Update fee record
            const feeRecord = await prisma.feeRecord.findFirst({
              where: {
                id: payment.feeRecordId,
                schoolId: req.schoolId
              },
              include: {
                term: true,
                academicSession: true
              }
            });

            const newPaidAmount = feeRecord.paidAmount + payment.amount;
            const newBalance = feeRecord.expectedAmount - newPaidAmount;

            await prisma.feeRecord.update({
              where: {
                id: feeRecord.id,
                schoolId: req.schoolId
              },
              data: {
                paidAmount: newPaidAmount,
                balance: newBalance
              }
            });

            // 3. Create fee payment record (for accounting)
            const feePayment = await prisma.feePayment.create({
              data: {
                schoolId: req.schoolId,
                feeRecordId: feeRecord.id,
                amount: payment.amount,
                paymentMethod: 'online',
                reference: reference,
                notes: `Online payment via Paystack`,
                recordedBy: 1 // System/Admin ID
              }
            });

            // 4. Send email notification (non-blocking)
            if (payment.student.parent?.user?.email) {
              const emailData = {
                parentEmail: payment.student.parent.user.email,
                studentName: `${payment.student.user.firstName} ${payment.student.user.lastName}`,
                amount: payment.amount,
                paymentMethod: 'Online (Paystack)',
                date: new Date(),
                receiptNumber: feePayment.id,
                balance: newBalance,
                termName: feeRecord.term?.name || 'Current Term',
                sessionName: feeRecord.academicSession?.name || 'Current Session',
                schoolName: school.name || process.env.SCHOOL_NAME || 'School Management System',
                className: payment.student.classModel?.name || 'N/A'
              };

              sendPaymentConfirmation(emailData)
                .then(result => {
                  if (result.success) console.log('✅ Payment email sent');
                  else console.warn('⚠️ Payment email failed:', result.error);
                })
                .catch(err => console.error('❌ Payment email error:', err));
            }

            // NEW: Send SMS confirmation (non-blocking)
            if (payment.student.parent?.phoneNumber) {
              const { sendPaymentSMS } = require('../services/smsService');
              sendPaymentSMS({
                phone: payment.student.parent.phoneNumber,
                studentName: `${payment.student.user.firstName} ${payment.student.user.lastName}`,
                amount: payment.amount,
                balance: newBalance,
                schoolName: school.name || process.env.SCHOOL_NAME || 'School Management System'
              }).catch(e => console.error('Payment SMS error:', e));
            }

            res.json({ success: true, message: 'Payment verified successfully' });

            // Log the verification
            logAction({
              schoolId: req.schoolId,
              userId: req.user.id,
              action: 'VERIFY',
              resource: 'ONLINE_PAYMENT',
              details: {
                paymentId: payment.id,
                reference: reference,
                amount: payment.amount,
                studentId: payment.studentId,
                status: 'SUCCESS'
              },
              ipAddress: req.ip
            });
          } else {
            res.json({ success: true, message: 'Payment already verified' });
          }
        } else {
          // Update as failed if not pending
          await prisma.onlinePayment.update({
            where: { reference },
            data: {
              status: 'failed',
              providerResponse: JSON.stringify(response)
            }
          });

          res.status(400).json({ error: 'Payment verification failed' });
        }
      });
    });

    paystackReq.on('error', error => {
      console.error(error);
      res.status(500).json({ error: 'Verification request failed' });
    });

    paystackReq.write(''); // Need to write something to fire end for GET? No, but good practice.
    paystackReq.end();

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment history
router.get('/history', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const payments = await prisma.onlinePayment.findMany({
      where: { schoolId: req.schoolId },
      include: {
        student: {
          where: { schoolId: req.schoolId },
          select: {
            id: true,
            userId: true,
            admissionNumber: true,
            user: {
              where: { schoolId: req.schoolId },
              select: {
                firstName: true,
                lastName: true
              }
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
