const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIQueryHandler {
  constructor(options = {}) {
    // Support legacy single-key constructor: new AIQueryHandler('key')
    if (typeof options === 'string') {
      options = { geminiApiKey: options };
    }

    const { geminiApiKey, groqApiKey } = options;
    this.provider = null;

    // Try Gemini first
    if (geminiApiKey && geminiApiKey !== 'NONE') {
      this.setupGemini(geminiApiKey.trim());
    }

    // Setup Groq as fallback (or primary if no Gemini)
    if (groqApiKey && groqApiKey !== 'NONE') {
      this.groqApiKey = groqApiKey.trim();
      this.groqModel = 'llama-3.3-70b-versatile';
      if (!this.provider) {
        this.provider = 'groq';
        console.log(`[AI SERVICE] Primary provider: Groq (${this.groqModel})`);
      } else {
        console.log(`[AI SERVICE] Fallback provider: Groq (${this.groqModel})`);
      }
    }

    if (!this.provider && !this.groqApiKey) {
      console.warn('[AI SERVICE] No AI provider configured. AI features will be disabled.');
    }
  }

  setupGemini(key) {
    try {
      this.genAI = new GoogleGenerativeAI(key);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      this.provider = 'gemini';
      console.log(`[AI SERVICE] Primary provider: Google Gemini (gemini-2.0-flash)`);
    } catch (error) {
      console.error(`[AI SERVICE] Gemini initialization failed:`, error.message);
      this.genAI = null;
    }
  }

  /**
   * Generate with Groq (OpenAI-compatible REST API)
   */
  async generateWithGroq(prompt, expectsJson = false) {
    const body = {
      model: this.groqModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 8192
    };

    if (expectsJson) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Groq API error ${response.status}: ${errData?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Generate with Gemini
   */
  async generateWithGemini(prompt, expectsJson = false) {
    const config = {};
    if (expectsJson) {
      config.responseMimeType = 'application/json';
    }

    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: config
    });

    const response = await result.response;
    return response.text();
  }

  /**
   * General purpose generation method with automatic failover
   */
  async generate(prompt, expectsJson = false) {
    if (!this.provider) {
      throw new Error("AI service is not configured with a valid API key for this school.");
    }

    // Try primary provider
    try {
      if (this.provider === 'gemini') {
        return await this.generateWithGemini(prompt, expectsJson);
      } else {
        return await this.generateWithGroq(prompt, expectsJson);
      }
    } catch (error) {
      const isQuotaError = error.message && (
        error.message.includes('429') ||
        error.message.includes('quota') ||
        error.message.includes('Too Many Requests') ||
        error.message.includes('RESOURCE_EXHAUSTED')
      );

      // Failover: if primary was Gemini and we have Groq, try Groq
      if (this.provider === 'gemini' && this.groqApiKey && isQuotaError) {
        console.warn(`[AI SERVICE] Gemini quota exceeded. Failing over to Groq...`);
        try {
          return await this.generateWithGroq(prompt, expectsJson);
        } catch (groqError) {
          console.error(`[AI SERVICE] Groq fallback also failed:`, groqError.message);
          throw groqError;
        }
      }

      // Failover: if primary was Groq and we have Gemini, try Gemini
      if (this.provider === 'groq' && this.genAI && this.model && isQuotaError) {
        console.warn(`[AI SERVICE] Groq quota exceeded. Failing over to Gemini...`);
        try {
          return await this.generateWithGemini(prompt, expectsJson);
        } catch (geminiError) {
          console.error(`[AI SERVICE] Gemini fallback also failed:`, geminiError.message);
          throw geminiError;
        }
      }

      console.error(`[AI SERVICE] Generation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Cleans AI output and extracts JSON
   */
  cleanJson(text) {
    if (!text) return null;
    try {
      // Remove markdown code blocks if present
      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
      }
      return cleaned.trim();
    } catch (e) {
      return text;
    }
  }

  /**
   * Analyze parent query and extract intent
   */
  async analyzeQuery(message, context = {}) {
    if (!this.provider) {
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
      const text = await this.generate(prompt, true);
      const cleaned = this.cleanJson(text);
      const parsed = JSON.parse(cleaned);
      console.log('[AI SERVICE] Intent detected:', parsed);
      return parsed;
    } catch (error) {
      console.error('[AI SERVICE] Analysis error:', error.message);
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
   */
  async generateResponse(data, intent) {
    if (!this.provider) {
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
      const text = await this.generate(prompt, false);
      return text.trim();
    } catch (error) {
      console.error('[AI SERVICE] Response generation error:', error.message);
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
