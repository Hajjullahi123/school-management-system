const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function list() {
  const global = await prisma.globalSettings.findFirst();
  const apiKey = global?.geminiApiKey;
  if (!apiKey) {
    console.log('No API Key found');
    return;
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" }); 
  
  // This is how we list models in the Node SDK
  const result = await model.generateContent("List all your available model IDs. Return only the names.");
  console.log('AI Response for models:', await result.response.text());
  
  await prisma.$disconnect();
}

list();
