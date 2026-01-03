const crypto = require('crypto');
const prisma = require('../db');

// In a real production app, this should be in .env
const LICENSE_SECRET = process.env.LICENSE_SECRET || 'DARUL_QURAN_SECURE_LICENSE_SIGNATURE_KEY_2025';

class LicenseManager {
  /**
   * Generate a signed license key (token)
   * The key encodes the school details and limits, signed with a hash
   */
  static generateLicenseKey(data) {
    // Ensure data object exists
    data = data || {};

    const payload = {
      schoolName: data.schoolName || 'Unknown School',
      packageType: data.packageType || 'basic', // basic, standard, premium
      maxStudents: data.maxStudents || 500,
      expiresAt: data.expiresAt || null, // null = lifetime
      generatedAt: new Date().toISOString(),
      nonce: crypto.randomBytes(4).toString('hex') // Randomness
    };

    // Create signature
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', LICENSE_SECRET)
      .update(payloadString)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase(); // Take first 16 chars for the visible key suffix

    // Encode payload to Base64 to make it transportable
    const encodedPayload = Buffer.from(payloadString).toString('base64');

    // Format: [Base64Payload].[Signature]
    return `${encodedPayload}.${signature}`;
  }

  /**
   * Validate a license key
   */
  static async validateLicenseKey(key) {
    try {
      if (!key || !key.includes('.')) {
        return { valid: false, error: 'Invalid license key format' };
      }

      const [encodedPayload, signature] = key.split('.');

      // 1. Decode payload
      let payloadString;
      try {
        payloadString = Buffer.from(encodedPayload, 'base64').toString();
      } catch (e) {
        return { valid: false, error: 'Invalid license encoding' };
      }

      const payload = JSON.parse(payloadString);

      // 2. Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', LICENSE_SECRET)
        .update(payloadString)
        .digest('hex')
        .substring(0, 16)
        .toUpperCase();

      if (signature !== expectedSignature) {
        return { valid: false, error: 'Invalid license signature' };
      }

      // 3. Check expiry
      if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
        return { valid: false, error: 'License has expired' };
      }

      return { valid: true, license: payload };
    } catch (error) {
      console.error('Validation error:', error);
      return { valid: false, error: 'License validation failed' };
    }
  }

  /**
   * Check activation status from DB for a specific school
   */
  static async checkActivationStatus(schoolId) {
    try {
      if (!schoolId) return { activated: false };

      const school = await prisma.school.findUnique({
        where: { id: schoolId }
      });

      if (!school || !school.isActivated || !school.licenseKey) {
        return { activated: false };
      }

      // Re-validate the stored key
      const validation = await this.validateLicenseKey(school.licenseKey);

      if (!validation.valid) {
        return { activated: false, error: validation.error };
      }

      return {
        activated: true,
        license: validation.license,
        school
      };
    } catch (error) {
      console.error('Status check error:', error);
      return { activated: false, error: 'System error' };
    }
  }
}

module.exports = {
  generateLicenseKey: LicenseManager.generateLicenseKey,
  validateLicense: LicenseManager.validateLicenseKey,
  checkActivationStatus: LicenseManager.checkActivationStatus
};
