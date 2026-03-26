const twilio = require('twilio');

class WhatsAppService {
  constructor(config = {}) {
    this.provider = config.whatsappProvider || 'twilio';
    
    if (this.provider === 'twilio') {
      const { twilioAccountSid, twilioAuthToken, whatsappPhoneNumber } = config;
      if (!twilioAccountSid || !twilioAuthToken || !whatsappPhoneNumber) {
        console.warn('[WhatsApp] Twilio service not initialized: Missing credentials');
        this.client = null;
      } else {
        this.client = twilio(twilioAccountSid, twilioAuthToken);
        this.fromNumber = whatsappPhoneNumber.startsWith('whatsapp:') ? whatsappPhoneNumber : `whatsapp:${whatsappPhoneNumber}`;
      }
    } else if (this.provider === 'meta') {
      const { metaAccessToken, metaPhoneNumberId } = config;
      if (!metaAccessToken || !metaPhoneNumberId) {
        console.warn('[WhatsApp] Meta service not initialized: Missing credentials');
      }
      this.accessToken = metaAccessToken;
      this.phoneNumberId = metaPhoneNumberId;
    }
  }

  /**
   * Send a WhatsApp message
   * @param {string} to - Recipient phone number (with country code)
   * @param {string} message - Message text
   * @returns {Promise<object>} Provider response object
   */
  async send(to, message) {
    if (this.provider === 'twilio') {
      return this.sendTwilio(to, message);
    } else if (this.provider === 'meta') {
      return this.sendMeta(to, message);
    }
    throw new Error(`Unsupported WhatsApp provider: ${this.provider}`);
  }

  async sendTwilio(to, message) {
    if (!this.client) {
      throw new Error('Twilio service not initialized. Check credentials in settings.');
    }

    try {
      const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      const response = await this.client.messages.create({
        from: this.fromNumber,
        to: toNumber,
        body: message
      });
      console.log(`[WhatsApp-Twilio] Message sent to ${to}:`, response.sid);
      return response;
    } catch (error) {
      console.error('[WhatsApp-Twilio] Send error:', error.message);
      throw error;
    }
  }

  async sendMeta(to, message) {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('Meta WhatsApp service not initialized. Check credentials in settings.');
    }

    try {
      // Clean phone number for Meta (remove +, whatsapp:, etc.)
      const cleanTo = to.replace(/[\s\+\-\(\)whatsapp:]/g, '');

      const response = await fetch(`https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanTo,
          type: 'text',
          text: {
            body: message
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Meta API error');
      }

      console.log(`[WhatsApp-Meta] Message sent to ${to}:`, data.messages?.[0]?.id);
      return data;
    } catch (error) {
      console.error('[WhatsApp-Meta] Send error:', error.message);
      throw error;
    }
  }

  /**
   * Format a WhatsApp response with proper markdown
   * @param {string} text - Plain text response
   * @returns {string} Formatted WhatsApp message
   */
  static formatMessage(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '*$1*')  // Convert ** to *
      .replace(/₦/g, 'NGN ')              // Convert currency symbol
      .trim();
  }

  /**
   * Parse incoming WhatsApp webhook data
   * @param {object} body - Webhook request body
   * @param {string} provider - 'twilio' or 'meta'
   * @returns {object} Parsed message data
   */
  static parseIncoming(body, provider = 'twilio') {
    if (provider === 'twilio') {
      return {
        from: body.From?.replace('whatsapp:', ''),
        to: body.To?.replace('whatsapp:', ''),
        message: body.Body || '',
        messageId: body.MessageSid,
        timestamp: new Date()
      };
    } else if (provider === 'meta') {
      // Meta webhook structure: entry[0].changes[0].value.messages[0]
      const change = body.entry?.[0]?.changes?.[0]?.value;
      const message = change?.messages?.[0];

      if (!message) return null;

      return {
        from: message.from,
        to: change.metadata?.display_phone_number,
        message: message.text?.body || '',
        messageId: message.id,
        timestamp: new Date(parseInt(message.timestamp) * 1000)
      };
    }
    return null;
  }
}

module.exports = WhatsAppService;
