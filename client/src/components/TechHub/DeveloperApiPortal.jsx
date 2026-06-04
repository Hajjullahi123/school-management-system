import React, { useState } from 'react';
import { Code2, Terminal, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const SDK_SNIPPETS = {
  Node: `import { EduTechAI } from '@edutechai/sdk';

const client = new EduTechAI({ apiKey: process.env.EDU_API_KEY });

async function gradeEssay() {
  const result = await client.models.TutorGPT4.grade({
    studentId: "STU-8492",
    rubric: "AP_ENGLISH_LIT",
    content: "The green light in Gatsby represents..."
  });
  
  console.log("Score:", result.score);
  console.log("Feedback:", result.pedagogicalFeedback);
}`,
  Python: `from edutechai import EduTechClient
import os

client = EduTechClient(api_key=os.getenv("EDU_API_KEY"))

def generate_quiz():
    quiz = client.models.AssessNet.generate(
        topic="Photosynthesis",
        difficulty="Grade 8",
        question_count=5
    )
    
    for q in quiz.questions:
        print(f"Q: {q.text}")
        print(f"Bias Score: {q.bias_metrics.score}")`,
  cURL: `curl -X POST https://api.edutechai.com/v1/models/TutorGPT/chat \\
  -H "Authorization: Bearer $EDU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "Explain fractions"}],
    "student_profile": {"age": 10, "learning_style": "visual"}
  }'`
};

const DeveloperApiPortal = () => {
  const [activeTab, setActiveTab] = useState('Node');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SDK_SNIPPETS[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full">
      <div className="bg-[#111] px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Code2 className="text-blue-500" />
          <h3 className="text-lg font-bold text-white tracking-tight">API-First Developer Portal</h3>
        </div>
      </div>
      
      <div className="flex border-b border-gray-800 bg-[#0A0A0A]">
        {Object.keys(SDK_SNIPPETS).map((lang) => (
          <button
            key={lang}
            onClick={() => setActiveTab(lang)}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === lang ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {lang}
            {activeTab === lang && (
              <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500" />
            )}
          </button>
        ))}
      </div>
      
      <div className="relative flex-1 bg-[#050505] p-6 group">
        <button 
          onClick={handleCopy}
          className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
        </button>
        <pre className="text-sm font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
          <code dangerouslySetInnerHTML={{ 
            __html: SDK_SNIPPETS[activeTab]
              .replace(/from|import|const|new|async|function|await|def|for|in/g, '<span class="text-pink-500">$&</span>')
              .replace(/EduTechAI|EduTechClient|TutorGPT4|AssessNet/g, '<span class="text-amber-300">$&</span>')
              .replace(/".*?"|'.*?'/g, '<span class="text-green-400">$&</span>')
          }} />
        </pre>
      </div>
      
      <div className="bg-[#111] border-t border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-1">
            <Terminal size={12} /> Status: All Systems Operational
          </span>
        </div>
        <a href="#" className="text-sm text-blue-400 hover:text-blue-300 font-medium">Read Documentation &rarr;</a>
      </div>
    </div>
  );
};

export default DeveloperApiPortal;
