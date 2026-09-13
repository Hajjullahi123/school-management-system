const prisma = require('../db');
const WhatsAppService = require('../services/WhatsAppService');

/**
 * Gets a configured WhatsAppService instance for a school, 
 * falling back to global platform settings if school-specific keys are missing.
 * @param {number} schoolId - The ID of the school
 * @returns {Promise<WhatsAppService|null>} - The configured service or null if no keys found
 */
async function getWhatsAppHandler(schoolId) {
  try {
    // 1. Fetch School Settings
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        whatsappBotEnabled: true,
        whatsappProvider: true,
        whatsappPhoneNumber: true,
        twilioAccountSid: true,
        twilioAuthToken: true,
        metaAccessToken: true,
        metaPhoneNumberId: true,
        metaBusinessAccountId: true,
        metaVerifyToken: true
      }
    });

    if (!school) return null;

    // 2. Fetch Global Settings (Fallback)
    const globalSettings = await prisma.globalSettings.findFirst({
      select: {
        whatsappProvider: true,
        whatsappPhoneNumber: true,
        twilioAccountSid: true,
        twilioAuthToken: true,
        metaAccessToken: true,
        metaPhoneNumberId: true,
        metaBusinessAccountId: true,
        metaVerifyToken: true
      }
    });

    // 3. Determine Effective Provider
    const provider = school.whatsappProvider || globalSettings?.whatsappProvider || 'twilio';

    // 4. Construct Config (School Keys > Global Keys)
    let config = {};

    if (provider === 'meta') {
      config = {
        metaAccessToken: (school.metaAccessToken && school.metaAccessToken !== 'NONE') ? school.metaAccessToken : globalSettings?.metaAccessToken,
        metaPhoneNumberId: school.metaPhoneNumberId || globalSettings?.metaPhoneNumberId,
        metaBusinessAccountId: school.metaBusinessAccountId || globalSettings?.metaBusinessAccountId,
        metaVerifyToken: school.metaVerifyToken || globalSettings?.metaVerifyToken
      };
      
      // Verification: Require at least Token and Phone ID for Meta
      if (!config.metaAccessToken || !config.metaPhoneNumberId) return null;
    } else {
      config = {
        twilioSid: school.twilioAccountSid || globalSettings?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: school.twilioAuthToken || globalSettings?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN,
        twilioPhoneNumber: school.whatsappPhoneNumber || globalSettings?.whatsappPhoneNumber || process.env.TWILIO_PHONE_NUMBER
      };

      // Verification: Require SID and Token for Twilio
      if (!config.twilioSid || !config.twilioAuthToken) return null;
    }

    // 5. Initialize Service
    return new WhatsAppService(
      config.twilioSid,
      config.twilioAuthToken,
      config.twilioPhoneNumber,
      {
        provider,
        ...config
      }
    );
  } catch (error) {
    console.error('[WhatsAppConfig] Error initializing handler:', error);
    return null;
  }
}

module.exports = { getWhatsAppHandler };
