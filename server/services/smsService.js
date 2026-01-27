const termArr = [1, 2, 3]; // just a placeholder for logic
const AfricasTalking = require('africastalking');
const prisma = require('../db');

/**
 * Get Africa's Talking instance configured with DB settings
 * Falls back to .env if DB settings are missing
 */
const getSMS = async () => {
  const settings = await prisma.school.findFirst();

  const username = settings?.smsUsername || process.env.SMS_USERNAME;
  const apiKey = settings?.smsApiKey || process.env.SMS_API_KEY;

  if (!username || !apiKey) {
    console.warn('⚠️ SMS not configured. Please set Africa\'s Talking credentials in Settings.');
    return null;
  }

  return AfricasTalking({
    apiKey,
    username
  });
};

/**
 * Send a basic SMS
 */
const sendSMS = async (to, message) => {
  const settings = await prisma.school.findFirst();

  if (settings && !settings.enableSMS) {
    console.log('ℹ️ SMS notifications are disabled in settings.');
    return { success: false, error: 'SMS disabled' };
  }

  const at = await getSMS();
  if (!at) return { success: false, error: 'SMS not configured' };

  try {
    const sms = at.SMS;
    const options = {
      to: [to],
      message,
      from: settings?.smsSenderId || undefined // Use Sender ID if configured
    };

    const response = await sms.send(options);
    console.log('✅ SMS sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ SMS failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send Payment Confirmation SMS
 */
const sendPaymentSMS = async (paymentData) => {
  const { phone, studentName, amount, balance, schoolName } = paymentData;
  if (!phone) return;

  const message = `Payment Received! \nStudent: ${studentName}\nAmount: ₦${amount.toLocaleString()}\nBalance: ₦${balance.toLocaleString()}\nThank you for choosing ${schoolName}.`;
  return sendSMS(phone, message);
};

/**
 * Send Absence Alert SMS
 */
const sendAbsenceSMS = async (absenceData) => {
  const { phone, studentName, date, schoolName } = absenceData;
  if (!phone) return;

  const message = `ABENCE ALERT: ${studentName} was marked absent today (${date}). Please contact ${schoolName} for more info.`;
  return sendSMS(phone, message);
};

/**
 * Send Welcome SMS
 */
const sendWelcomeSMS = async (welcomeData) => {
  const { phone, studentName, admissionNumber, loginUrl, schoolName } = welcomeData;
  if (!phone) return;

  const message = `Welcome to ${schoolName}! \nStudent: ${studentName}\nAdm No: ${admissionNumber}\nLogin here: ${loginUrl}\nKeep your credentials safe.`;
  return sendSMS(phone, message);
};

module.exports = {
  sendSMS,
  sendPaymentSMS,
  sendAbsenceSMS,
  sendWelcomeSMS
};
