const twilio = require('twilio');

class WhatsAppService {
  constructor(accountSid, authToken, fromNumber) {
    if (!accountSid || !authToken || !fromNumber) {
      console.warn('[WhatsApp] Service not initialized: Missing credentials');
      this.client = null;
      this.fromNumber = null;
      return;
    }

    this.client = twilio(accountSid, authToken);
    this.fromNumber = `whatsapp:${fromNumber}`;
  }

  /**
   * Send a WhatsApp message
   * @param {string} to - Recipient phone number (with country code)
   * @param {string} message - Message text
   * @returns {Promise<object>} Twilio message object
   */
  async send(to, message) {
    if (!this.client) {
      throw new Error('WhatsApp service not initialized. Check Twilio credentials in school settings.');
    }

    try {
      // Ensure phone number is in WhatsApp format
      const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const response = await this.client.messages.create({
        from: this.fromNumber,
        to: toNumber,
        body: message
      });

      console.log(`[WhatsApp] Message sent to ${to}:`, response.sid);
      return response;
    } catch (error) {
      console.error('[WhatsApp] Send error:', error.message);
      throw error;
    }
  }

  /**
   * Format a WhatsApp response with proper markdown
   * @param {string} text - Plain text response
   * @returns {string} Formatted WhatsApp message
   */
  static formatMessage(text) {
    // WhatsApp supports: *bold*, _italic_, ~strikethrough~
    return text
      .replace(/\*\*(.*?)\*\*/g, '*$1*')  // Convert ** to *
      .replace(/₦/g, 'NGN ')              // Convert currency symbol
      .trim();
  }

  /**
   * Parse incoming WhatsApp webhook data
   * @param {object} body - Webhook request body
   * @returns {object} Parsed message data
   */
  static parseIncoming(body) {
    return {
      from: body.From?.replace('whatsapp:', ''),
      to: body.To?.replace('whatsapp:', ''),
      message: body.Body || '',
      messageId: body.MessageSid,
      timestamp: new Date()
    };
  }
}

module.exports = WhatsAppService;
