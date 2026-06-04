import React, { useState } from 'react';
import { Terminal, Play, Copy, Check, Activity, Code2, Server } from 'lucide-react';
import { motion } from 'framer-motion';

const DevelopersPage = () => {
  const [copied, setCopied] = useState('');
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState('');

  const codeString = `from edutechai import Tutor

client = Tutor(api_key="demo_key")  # demo key works instantly

response = client.ask(
    subject="algebra",
    grade=8,
    question="Solve for x: 2x + 5 = 15",
    teaching_style="socratic"
)

print(response.explanation)
print(response.next_question)`;

  const runCode = () => {
    setRunning(true);
    setOutput('');
    setTimeout(() => {
      setOutput(`{
  "explanation": "Let's think: what number plus 5 equals 15? Then divide by 2...",
  "next_question": "If x = 5, what is 3x - 4?",
  "latency_ms": 112,
  "tokens_used": 45
}`);
      setRunning(false);
    }, 800);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Hero */}
      <section className="tech-hero py-24 px-6 border-b border-gray-800">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center gap-10 md:gap-16 relative z-10">
          <div className="flex-1 animate-fade-up">
            <h1 className="tech-fluid-h1 font-bold mb-6">Build the future <br/><span className="text-emerald-400">of learning.</span></h1>
            <p className="tech-fluid-base text-gray-400 mb-8 max-w-lg">Zero marketing fluff. Just raw educational intelligence. Get your API keys in 60 seconds.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="active-scale w-full sm:w-auto text-center justify-center bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-md font-bold transition-colors">
                Generate API Key
              </button>
              <button className="active-scale w-full sm:w-auto text-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-md font-bold transition-colors flex items-center gap-2">
                <Code2 size={18} /> Read Docs
              </button>
            </div>
          </div>
          <div className="flex-1 w-full animate-fade-up delay-200">
            <div className="tech-glass-dark rounded-xl p-6 font-mono text-sm shadow-2xl shadow-emerald-500/10">
              <div className="flex items-center gap-2 mb-4 text-gray-500 border-b border-gray-800 pb-4">
                <Terminal size={16} /> <span className="text-emerald-500 font-bold">bash</span>
              </div>
              <div className="text-gray-300">
                <span className="text-pink-500">~</span> $ pip install edutechai<br/>
                <span className="text-emerald-400">Successfully installed edutechai-2.4.1</span><br/><br/>
                <span className="text-pink-500">~</span> $ edutechai auth login<br/>
                <span className="text-gray-500">Opening browser... </span><span className="text-emerald-400">Logged in as admin!</span><br/>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Sandbox */}
      <section className="py-24 px-6">
        <div className="max-w-[1400px] mx-auto animate-fade-up">
          <div className="flex items-center justify-between mb-8">
            <h2 className="tech-fluid-h2">Live Sandbox</h2>
            <div className="flex items-center gap-2 text-sm font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <Activity size={14} /> All systems operational
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Editor */}
            <div className="tech-glass-dark rounded-xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/10">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
                <div className="text-xs text-gray-500 font-mono">example.py</div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => copyToClipboard(codeString, 'code')}
                    className="p-1.5 hover:bg-white/10 rounded text-gray-400 transition-colors"
                  >
                    {copied === 'code' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  <button 
                    onClick={runCode}
                    disabled={running}
                    className="flex items-center gap-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                  >
                    <Play size={12} className={running ? "animate-pulse" : ""} /> {running ? 'Running...' : 'Run'}
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-x-auto text-sm font-mono leading-relaxed text-gray-300">
                <pre dangerouslySetInnerHTML={{ __html: codeString.replace(/(".*?")/g, '<span class="text-emerald-300">$1</span>').replace(/(from|import|print)/g, '<span class="text-purple-400">$1</span>') }} />
              </div>
            </div>

            {/* Output */}
            <div className="tech-glass-dark rounded-xl flex flex-col overflow-hidden relative">
              <div className="px-4 py-3 bg-black/40 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Output</span>
                {output && (
                  <span className="text-xs font-mono text-emerald-500 flex items-center gap-1">
                    <Check size={12} /> 200 OK
                  </span>
                )}
              </div>
              <div className="p-6 font-mono text-sm text-emerald-400 flex-1 overflow-y-auto">
                {output ? (
                  <motion.pre initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{output}</motion.pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-600 italic">
                    Click Run to execute...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SDKs */}
      <section className="py-16 px-6 bg-[#0A0A0A] border-t border-gray-800">
        <div className="max-w-[1400px] mx-auto animate-fade-up">
          <h3 className="tech-fluid-h2 text-xl font-bold mb-8">Official SDKs</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['Python', 'JavaScript', 'Java', 'Go', 'C#'].map((lang, i) => (
              <div key={lang} className={`tech-glass-dark rounded-lg p-6 flex flex-col items-center justify-center hover:border-emerald-500/50 transition-colors cursor-pointer group animate-fade-up delay-${(i % 5 + 1) * 100}`}>
                <span className="text-gray-500 group-hover:text-emerald-400 font-bold mb-2 transition-colors">{lang}</span>
                <span className="text-xs text-gray-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity">npm i edutech-{lang.toLowerCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DevelopersPage;
