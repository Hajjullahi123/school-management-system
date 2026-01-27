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
      schoolId: data.schoolId || null,
      schoolName: data.schoolName || 'Unknown School',
      packageType: data.packageType || 'basic', // basic, standard, premium
      maxStudents: data.maxStudents || 500,
      features: this.getPackageFeatures(data.packageType || 'basic', data.customFeatures || []),
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
        const daysExpired = Math.floor((new Date() - new Date(payload.expiresAt)) / (1000 * 60 * 60 * 24));
        return {
          valid: false,
          error: `License expired ${daysExpired} day(s) ago`,
          expired: true,
          payload
        };
      }

      // Calculate days remaining
      const daysRemaining = payload.expiresAt
        ? Math.floor((new Date(payload.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
        : -1; // -1 means lifetime

      return {
        valid: true,
        license: payload,
        daysRemaining
      };
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
        where: { id: schoolId },
        include: {
          _count: {
            select: { students: true }
          }
        }
      });

      if (!school || !school.isActivated || !school.licenseKey) {
        return { activated: false };
      }

      // Re-validate the stored key
      const validation = await this.validateLicenseKey(school.licenseKey);

      if (!validation.valid) {
        // Mark as inactive if license is invalid
        await prisma.school.update({
          where: { id: schoolId },
          data: { subscriptionActive: false }
        });
        return { activated: false, error: validation.error };
      }

      const currentStudents = school._count.students;
      const maxStudents = validation.license.maxStudents;
      const remainingSlots = maxStudents === -1 ? -1 : Math.max(0, maxStudents - currentStudents);

      return {
        activated: true,
        license: validation.license,
        school,
        currentStudents,
        maxStudents,
        remainingSlots,
        daysRemaining: validation.daysRemaining,
        packageType: school.packageType
      };
    } catch (error) {
      console.error('Status check error:', error);
      return { activated: false, error: 'System error' };
    }
  }

  /**
   * Activate a license for a school
   */
  static async activateLicense(schoolId, licenseKey) {
    try {
      // Validate the license key
      const validation = await this.validateLicenseKey(licenseKey);

      if (!validation.valid) {
        return {
          success: false,
          message: validation.error
        };
      }

      const { license } = validation;

      // Verify school ID matches (if provided in license)
      if (license.schoolId && license.schoolId !== schoolId) {
        return {
          success: false,
          message: 'This license key is not valid for this school'
        };
      }

      // Update school with license information
      await prisma.school.update({
        where: { id: schoolId },
        data: {
          licenseKey,
          isActivated: true,
          packageType: license.packageType,
          maxStudents: license.maxStudents,
          expiresAt: license.expiresAt ? new Date(license.expiresAt) : null,
          subscriptionActive: true,
          lastBillingDate: new Date()
        }
      });

      return {
        success: true,
        message: 'License activated successfully',
        packageType: license.packageType,
        maxStudents: license.maxStudents,
        expiresAt: license.expiresAt,
        daysRemaining: validation.daysRemaining
      };
    } catch (error) {
      console.error('License activation error:', error);
      return {
        success: false,
        message: 'Failed to activate license'
      };
    }
  }

  /**
   * Check if a license has access to a specific feature
   */
  static hasFeature(licenseData, feature) {
    if (!licenseData || !licenseData.features) return false;

    // 'all' grants access to everything
    if (licenseData.features.includes('all')) return true;

    return licenseData.features.includes(feature);
  }

  /**
   * Get features included in a package
   */
  static getPackageFeatures(packageType, customFeatures = []) {
    const features = [...customFeatures];

    switch (packageType) {
      case 'basic':
        features.push(
          'students',
          'teachers',
          'results',
          'attendance',
          'classes',
          'subjects',
          'reports'
        );
        break;

      case 'standard':
        features.push(
          'all', // Access to all current features
          'fee_management',
          'online_exams',
          'cbt',
          'messaging',
          'alumni',
          'analytics'
        );
        break;

      case 'premium':
        features.push('all'); // Everything
        break;
    }

    return [...new Set(features)]; // Remove duplicates
  }

  /**
   * Check if school can add more students
   */
  static async canAddStudent(schoolId) {
    const status = await this.checkActivationStatus(schoolId);

    if (!status.activated) return false;

    // Unlimited for -1
    if (status.maxStudents === -1) return true;

    return status.remainingSlots > 0;
  }
}

module.exports = {
  generateLicenseKey: LicenseManager.generateLicenseKey,
  validateLicense: LicenseManager.validateLicenseKey,
  checkActivationStatus: LicenseManager.checkActivationStatus,
  activateLicense: LicenseManager.activateLicense,
  hasFeature: LicenseManager.hasFeature,
  canAddStudent: LicenseManager.canAddStudent
};
