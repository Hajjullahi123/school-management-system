const express = require('express');
const router = express.Router();
const prisma = require('../db');
const https = require('https');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

/**
 * @route   GET /api/platform-billing/status
 * @desc    Get subscription status of the current school
 * @access  Admin only
 */
router.get('/status', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        id: true,
        name: true,
        packageType: true,
        isActivated: true,
        expiresAt: true,
        subscriptionActive: true,
        lastBillingDate: true,
        nextBillingDate: true,
        maxStudents: true
      }
    });

    const globalSettings = await prisma.globalSettings.findFirst();

    res.json({
      school,
      pricing: {
        basic: globalSettings?.basicPrice || 50000,
        standard: globalSettings?.standardPrice || 120000,
        premium: globalSettings?.premiumPrice || 250000
      }
    });
  } catch (error) {
    console.error('Billing status error:', error);
    res.status(500).json({ error: 'Failed to fetch billing status' });
  }
});

/**
 * @route   POST /api/platform-billing/initialize-subscription
 * @desc    Initialize payment to the PLATFORM owner for subscription
 * @access  Admin only
 */
router.post('/initialize-subscription', authenticate, authorize(['admin']), async (req, res) => {
  const { packageType, provider = 'paystack' } = req.body;

  try {
    const globalSettings = await prisma.globalSettings.findFirst();
    const school = await prisma.school.findUnique({ where: { id: req.schoolId } });

    if (!globalSettings || (!globalSettings.platformPaystackKey && provider === 'paystack')) {
      return res.status(400).json({ error: 'Platform billing is not configured by the developer.' });
    }

    let amount = 0;
    if (packageType === 'basic') amount = globalSettings.basicPrice;
    else if (packageType === 'standard') amount = globalSettings.standardPrice;
    else if (packageType === 'premium') amount = globalSettings.premiumPrice;
    else return res.status(400).json({ error: 'Invalid package type' });

    const reference = `SUB-${req.schoolId}-${Date.now()}`;

    // Paystack Logic (Platform Level)
    if (provider === 'paystack') {
      const params = JSON.stringify({
        email: req.user.email || `admin@${school.slug}.com`,
        amount: Math.round(amount * 100),
        reference,
        callback_url: `${process.env.FRONTEND_URL}/dashboard/billing/verify`,
        metadata: {
          schoolId: req.schoolId,
          packageType,
          type: 'PLATFORM_SUBSCRIPTION'
        }
      });

      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transaction/initialize',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${globalSettings.platformPaystackKey}`,
          'Content-Type': 'application/json'
        }
      };

      const payReq = https.request(options, payRes => {
        let data = '';
        payRes.on('data', chunk => data += chunk);
        payRes.on('end', () => {
          const response = JSON.parse(data);
          if (response.status) {
            res.json({ success: true, authorization_url: response.data.authorization_url, reference });
          } else {
            res.status(400).json({ error: response.message });
          }
        });
      });
      payReq.on('error', e => res.status(500).json({ error: 'Payment initialization failed' }));
      payReq.write(params);
      payReq.end();
    }
  } catch (error) {
    console.error('Subscription init error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/platform-billing/verify/:reference
 * @desc    Verify platform subscription payment and update school status
 * @access  Admin only
 */
router.get('/verify/:reference', authenticate, authorize(['admin']), async (req, res) => {
  const { reference } = req.params;

  try {
    const globalSettings = await prisma.globalSettings.findFirst();
    if (!globalSettings?.platformPaystackKey) {
      return res.status(500).json({ error: 'Platform billing configuration missing' });
    }

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${globalSettings.platformPaystackKey}` }
    };

    const verifyData = await new Promise((resolve, reject) => {
      const payReq = https.request(options, payRes => {
        let d = '';
        payRes.on('data', c => d += c);
        payRes.on('end', () => resolve(JSON.parse(d)));
      });
      payReq.on('error', reject);
      payReq.end();
    });

    if (verifyData.status && verifyData.data.status === 'success') {
      const { packageType, schoolId } = verifyData.data.metadata;

      if (parseInt(schoolId) !== req.schoolId) {
        return res.status(403).json({ error: 'Unauthorized payment verification' });
      }

      // Update School Subscription
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      const maxStudents = packageType === 'basic' ? 500 : packageType === 'standard' ? 1500 : 10000;

      await prisma.school.update({
        where: { id: req.schoolId },
        data: {
          isActivated: true,
          packageType,
          expiresAt: oneYearFromNow,
          subscriptionActive: true,
          lastBillingDate: new Date(),
          nextBillingDate: oneYearFromNow,
          maxStudents
        }
      });

      logAction({
        schoolId: req.schoolId,
        userId: req.user.id,
        action: 'RENEW_SUBSCRIPTION',
        resource: 'PLATFORM_BILLING',
        details: { packageType, reference },
        ipAddress: req.ip
      });

      res.json({ success: true, message: 'Subscription renewed successfully' });
    } else {
      res.status(400).json({ error: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
