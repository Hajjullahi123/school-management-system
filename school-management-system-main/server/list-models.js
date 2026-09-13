const { OpenAI } = require('openai');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function list() {
  const global = await prisma.globalSettings.findFirst();
  
  const key = process.env.DEEPSEEK_API_KEY || process.env.GROK_API_KEY || process.env.OPENAI_API_KEY || global?.geminiApiKey;
  
  if (!key || key === 'NONE') {
    console.log('No API Key found in ENV or DB');
    return;
  }
  
  let baseURL = undefined;
  if (process.env.DEEPSEEK_API_KEY) baseURL = 'https://api.deepseek.com';
  else if (process.env.GROK_API_KEY) baseURL = 'https://api.x.ai/v1';

  const openai = new OpenAI({ apiKey: key.trim(), baseURL });
  
  try {
    const response = await openai.chat.completions.create({
      model: baseURL ? (process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'grok-beta') : 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say hello' }]
    });
    console.log('AI Response:', response.choices[0].message.content);
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await prisma.$disconnect();
}

list();
