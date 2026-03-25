const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIQueryHandler {
  constructor(apiKey) {
    if (!apiKey) {
      console.warn('[AI] Gemini API key not provided, will check global fallback');
      this.initAsync();
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }, { apiVersion: 'v1beta' });
    }
  }

  async initAsync() {
    try {
      const prisma = require('../db');
      const settings = await prisma.globalSettings.findFirst();
      if (settings?.geminiApiKey) {
        this.genAI = new GoogleGenerativeAI(settings.geminiApiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }, { apiVersion: 'v1beta' });
        console.log('[AI] Initialized with Global Gemini API Key');
      }
    } catch (e) { }
  }

  /**
   * Analyze parent query and extract intent
   * @param {string} message - Parent's message
   * @param {object} context - Parent and student context
   * @returns {Promise<object>} { intent, entities }
   */
  async analyzeQuery(message, context = {}) {
    if (!this.genAI) {
      // Fallback to simple keyword matching if no AI
      return this.fallbackIntentDetection(message);
    }

    const prompt = `You are an AI assistant for a school management system. Analyze this parent's query and determine their intent.

Parent's Message: "${message}"

Available Intents:
- balance: Asking about fee balance or payments
- attendance: Asking if their child came to school
- holiday: Asking about school holidays or calendar
- general: General school information (hours, phone, etc.)
- help: Asking what the bot can do
- unknown: Cannot determine intent

Respond ONLY with a JSON object in this format:
{
  "intent": "one of the intents above",
  "confidence": 0.0 to 1.0,
  "entities": {
    "studentName": "if mentioned, otherwise null",
    "date": "if mentioned, otherwise null"
  }
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[AI] Intent detected:', parsed);
        return parsed;
      }

      throw new Error('Could not parse AI response');
    } catch (error) {
      console.error('[AI] Analysis error:', error.message);
      return this.fallbackIntentDetection(message);
    }
  }

  /**
   * Simple keyword-based intent detection (fallback)
   */
  fallbackIntentDetection(message) {
    const lower = message.toLowerCase();

    if (/(balance|owe|pay|fee|debt|owing)/i.test(lower)) {
      return { intent: 'balance', confidence: 0.7, entities: {} };
    }

    if (/(attend|came|school today|present|absent)/i.test(lower)) {
      return { intent: 'attendance', confidence: 0.7, entities: {} };
    }

    if (/(holiday|break|close|open|calendar|resumption)/i.test(lower)) {
      return { intent: 'holiday', confidence: 0.7, entities: {} };
    }

    if (/(help|what can|how to|assist)/i.test(lower)) {
      return { intent: 'help', confidence: 0.8, entities: {} };
    }

    if (/(time|hour|phone|email|address|contact)/i.test(lower)) {
      return { intent: 'general', confidence: 0.6, entities: {} };
    }

    return { intent: 'unknown', confidence: 0.5, entities: {} };
  }

  /**
   * Generate a natural response using AI
   * @param {object} data - Structured data to convert to natural language
   * @param {string} intent - Query intent
   * @returns {Promise<string>} Natural language response
   */
  async generateResponse(data, intent) {
    if (!this.genAI) {
      // Use template-based responses
      return this.templateResponse(data, intent);
    }

    const prompt = `You are a friendly school assistant. Convert this data into a natural, concise WhatsApp message for a parent.

Intent: ${intent}
Data: ${JSON.stringify(data, null, 2)}

Rules:
- Be warm and professional
- Use proper grammar
- Keep it under 300 characters
- Use emojis sparingly (max 2)
- For Nigerian schools, use NGN for currency

Respond with ONLY the message text, nothing else.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('[AI] Response generation error:', error.message);
      return this.templateResponse(data, intent);
    }
  }

  /**
   * Template-based responses (fallback)
   */
  templateResponse(data, intent) {
    switch (intent) {
      case 'balance':
        if (data.students && data.students.length > 0) {
          let msg = `Hi! Fee balance for your ${data.students.length === 1 ? 'child' : 'children'}:\n\n`;
          data.students.forEach((s, i) => {
            msg += `${i + 1}. ${s.name} (${s.class}): NGN ${s.balance.toLocaleString()}\n`;
          });
          msg += `\nTotal: NGN ${data.totalBalance.toLocaleString()}`;
          return msg;
        }
        return 'No fee information available.';

      case 'attendance':
        if (data.students && data.students.length > 0) {
          let msg = `Attendance for today:\n\n`;
          data.students.forEach((s, i) => {
            const status = s.present ? '✅ Present' : '❌ Absent';
            const time = s.arrivalTime || '';
            msg += `${i + 1}. ${s.name}: ${status} ${time}\n`;
          });
          return msg;
        }
        return 'No attendance information available.';

      case 'help':
        return `Hello! I can help you with:\n\n1. Fee balance - "What is my balance?"\n2. Attendance - "Did my child come to school?"\n3. Holidays - "When is the next break?"\n4. General info - "What time does school open?"\n\nJust ask me any question! 😊`;

      default:
        return data.message || 'I found the information you requested.';
    }
  }
}

module.exports = AIQueryHandler;
