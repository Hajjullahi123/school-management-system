import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sigma, Dna, FileText, Download, ShieldAlert, Cpu } from 'lucide-react';
const MOCK_BG = '/neural_zoo_bg.png';

const MODELS = [
  {
    id: 'tutor-gpt-4',
    name: 'TutorGPT-4Edu (v2.1)',
    subject: 'Language',
    ageGroup: 'K-12',
    license: 'Proprietary',
    params: '7B',
    training: '2M+ tutoring conversations',
    strengths: 'Socratic questioning, misconception detection',
    weakness: 'Struggles with non-English word problems',
    latency: '210ms',
    cost: '$0.0004/token',
    benchmarks: { math: '89%', hallucination: '1.2%', bias: '0.03' },
    safety: 'Profanity filter | No PII logging',
    downloads: ['ONNX', 'TensorRT', 'GGUF'],
    icon: <FileText className="text-orange-400" size={32} />
  },
  {
    id: 'assess-net-stem',
    name: 'AssessNet-STEM',
    subject: 'Science',
    ageGroup: 'HigherEd',
    license: 'Open Weight',
    params: '13B',
    training: '10M+ STEM research papers',
    strengths: 'Automated code grading, symbolic math verification',
    weakness: 'High memory usage during inference',
    latency: '450ms',
    cost: 'Free (Self-Hosted)',
    benchmarks: { math: '94%', hallucination: '0.8%', bias: '0.01' },
    safety: 'Academic integrity verified',
    downloads: ['PyTorch', 'Safetensors'],
    icon: <Dna className="text-blue-400" size={32} />
  },
  {
    id: 'math-solver-mini',
    name: 'MathSolver-Mini',
    subject: 'Math',
    ageGroup: 'K-5',
    license: 'Proprietary',
    params: '1.5B',
    training: 'Curated elementary math curriculum',
    strengths: 'Extremely fast, pedagogical step-by-step',
    weakness: 'Cannot solve algebra beyond linear equations',
    latency: '85ms',
    cost: '$0.0001/token',
    benchmarks: { math: '99%', hallucination: '0.1%', bias: '0.00' },
    safety: 'COPPA compliant | Child-safe guardrails',
    downloads: ['CoreML', 'TFLite'],
    icon: <Sigma className="text-purple-400" size={32} />
  }
];

const ModelCard = ({ model }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="relative h-96 w-full perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
      <motion.div
        className="w-full h-full relative preserve-3d cursor-pointer"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* Front */}
        <div className="absolute w-full h-full backface-hidden bg-[#111] border border-gray-800 rounded-3xl p-8 flex flex-col hover:border-indigo-500/50 transition-colors shadow-xl">
          <div className="flex items-start justify-between mb-6">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-800">
              {model.icon}
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-400">{model.license}</span>
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-2">{model.name}</h3>
          <ul className="text-sm text-gray-400 space-y-2 mb-6 flex-1">
            <li className="flex items-center gap-2"><Cpu size={14}/> {model.params} parameters</li>
            <li className="flex items-center gap-2"><FileText size={14}/> Trained on {model.training}</li>
            <li className="text-green-400 mt-2"><strong>Strengths:</strong> {model.strengths}</li>
            <li className="text-red-400"><strong>Weakness:</strong> {model.weakness}</li>
          </ul>
          
          <div className="pt-4 border-t border-gray-800 flex justify-between text-sm">
            <span className="text-indigo-400 font-mono">Latency: {model.latency}</span>
            <span className="text-gray-300 font-mono">{model.cost}</span>
          </div>
        </div>

        {/* Back */}
        <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-500/30 rounded-3xl p-8 flex flex-col transform rotateY-180 shadow-indigo-500/20 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <ShieldAlert className="text-indigo-400" /> Validation & Safety
          </h3>
          
          <div className="space-y-4 mb-6 flex-1">
            <div>
              <div className="text-xs text-indigo-300 uppercase tracking-widest mb-1">Benchmarks</div>
              <ul className="text-sm text-white font-mono space-y-1 bg-black/30 p-3 rounded-lg">
                <li>GSM8K (Math): {model.benchmarks.math}</li>
                <li>Hallucination: {model.benchmarks.hallucination}</li>
                <li>Bias Score: {model.benchmarks.bias}</li>
              </ul>
            </div>
            <div>
              <div className="text-xs text-indigo-300 uppercase tracking-widest mb-1">Safety Guardrails</div>
              <p className="text-sm text-white">{model.safety}</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-indigo-500/30">
            <div className="text-xs text-indigo-300 uppercase tracking-widest mb-2">Download Formats</div>
            <div className="flex gap-2">
              {model.downloads.map(d => (
                <span key={d} className="px-2 py-1 bg-black/40 rounded text-xs text-white font-mono flex items-center gap-1">
                  <Download size={12}/> {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ModelZooPage = () => {
  const [filter, setFilter] = useState('All');

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Hero */}
      <section className="relative h-[400px] flex items-center justify-center border-b border-gray-800 overflow-hidden">
        {/* We use the AI generated image as a deeply integrated background */}
        <div 
          className="absolute inset-0 opacity-40 mix-blend-screen bg-cover bg-center"
          style={{ backgroundImage: `url(${MOCK_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050505]" />
        
        <div className="relative z-10 text-center px-6">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4">Our AI Menagerie</h1>
          <p className="text-xl text-indigo-200/80 max-w-2xl mx-auto">Open, audited, and pedagogically tuned. Explore the models powering the future of education.</p>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="border-b border-gray-800 bg-[#0A0A0A] sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4 overflow-x-auto hide-scrollbar">
          <span className="text-sm text-gray-500 font-semibold uppercase tracking-widest mr-4">Filter:</span>
          {['All', 'Math', 'Science', 'Language'].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              {f}
            </button>
          ))}
          <div className="w-px h-6 bg-gray-800 mx-2" />
          <button className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors ml-auto flex items-center gap-2">
            Compare Models
          </button>
        </div>
      </section>

      {/* Grid */}
      <section className="py-24 px-6 max-w-7xl mx-auto min-h-screen">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {MODELS.filter(m => filter === 'All' || m.subject === filter).map(model => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <ModelCard model={model} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>
      
      {/* 3D CSS utilities - need to add to global CSS or inline */}
      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotateY-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  );
};

export default ModelZooPage;
