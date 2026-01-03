const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const https = require('https');

// Initialize a payment (Paystack)
router.post('/initialize', async (req, res) => {
  const { email, amount, studentId, feeRecordId, callbackUrl } = req.body;

  if (!email || !amount || !studentId || !feeRecordId) {
    return res.status(400).json({ error: 'Missing required payment details' });
  }

  try {
    // Get school settings for API keys
    const settings = await prisma.schoolSettings.findFirst();

    if (!settings || !settings.paystackSecretKey) {
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
        Authorization: `Bearer ${settings.paystackSecretKey}`,
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
            access_code: response.data.access_code,
            reference
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
router.get('/verify/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    // Get school settings for API keys
    const settings = await prisma.schoolSettings.findFirst();

    if (!settings || !settings.paystackSecretKey) {
      return res.status(400).json({ error: 'Payment gateway not configured' });
    }

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${settings.paystackSecretKey}`
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
          const payment = await prisma.onlinePayment.findUnique({
            where: { reference }
          });

          if (payment && payment.status !== 'success') {
            // 1. Update online payment status
            await prisma.onlinePayment.update({
              where: { id: payment.id },
              data: {
                status: 'success',
                paidAt: new Date(),
                providerResponse: JSON.stringify(response.data)
              }
            });

            // 2. Update fee record
            const feeRecord = await prisma.feeRecord.findUnique({
              where: { id: payment.feeRecordId }
            });

            const newPaidAmount = feeRecord.paidAmount + payment.amount;
            const newBalance = feeRecord.expectedAmount - newPaidAmount;

            await prisma.feeRecord.update({
              where: { id: feeRecord.id },
              data: {
                paidAmount: newPaidAmount,
                balance: newBalance,
                // Auto-clear if balance is 0 or less
                isClearedForExam: newBalance <= 0,
                clearedBy: newBalance <= 0 ? 1 : feeRecord.clearedBy, // System/Admin ID
                clearedAt: newBalance <= 0 ? new Date() : feeRecord.clearedAt
              }
            });

            // 3. Create fee payment record (for accounting)
            await prisma.feePayment.create({
              data: {
                feeRecordId: feeRecord.id,
                amount: payment.amount,
                paymentMethod: 'online',
                reference: reference,
                notes: `Online payment via Paystack`,
                recordedBy: 1 // System/Admin ID
              }
            });

            res.json({ success: true, message: 'Payment verified successfully' });
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

    paystackReq.end();

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment history
router.get('/history', async (req, res) => {
  try {
    const payments = await prisma.onlinePayment.findMany({
      include: {
        student: {
          select: {
            id: true,
            userId: true,
            admissionNumber: true,
            user: {
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
