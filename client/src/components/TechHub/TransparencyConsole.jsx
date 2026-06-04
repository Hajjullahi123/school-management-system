import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Activity, ShieldCheck, Globe } from 'lucide-react';

const MOCK_EVENTS = [
  { region: 'Brazil', query: 'photosynthesis explanation', confidence: 94, ms: 210, safe: true },
  { region: 'Japan', query: 'calculus derivative rules', confidence: 98, ms: 185, safe: true },
  { region: 'Germany', query: 'history of the berlin wall', confidence: 91, ms: 240, safe: true },
  { region: 'USA', query: 'essay grading parameters', confidence: 88, ms: 310, safe: true },
  { region: 'India', query: 'physics projectile motion', confidence: 96, ms: 195, safe: true },
  { region: 'Nigeria', query: 'financial accounting principles', confidence: 93, ms: 220, safe: true },
  { region: 'UK', query: 'literature semantic analysis', confidence: 89, ms: 265, safe: true },
  { region: 'Singapore', query: 'coding python recursion', confidence: 99, ms: 150, safe: true }
];

const TransparencyConsole = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Start with a few logs
    setLogs([
      { ...MOCK_EVENTS[0], id: 1 },
      { ...MOCK_EVENTS[1], id: 2 }
    ]);

    let idCounter = 3;
    const interval = setInterval(() => {
      const randomEvent = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
      setLogs((prev) => {
        const newLogs = [{ ...randomEvent, id: idCounter++ }, ...prev];
        return newLogs.slice(0, 5); // Keep only the latest 5
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl font-mono text-sm">
      <div className="bg-[#111] px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400">
          <Terminal size={16} />
          <span className="font-semibold text-xs tracking-widest uppercase">Live AI Transparency Console</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs text-green-500 font-medium">Streaming</span>
        </div>
      </div>
      
      <div className="p-4 h-64 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-[#0A0A0A] to-transparent z-10"></div>
        <AnimatePresence>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-3 py-2 border-b border-gray-800/50 text-gray-300"
            >
              <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
              <Globe size={14} className="text-indigo-400" />
              <span className="text-indigo-300 w-20 truncate">{log.region}</span>
              <span className="text-gray-400 mx-2">→</span>
              <span className="truncate flex-1">"{log.query}"</span>
              
              <div className="flex items-center gap-4 ml-auto">
                <span className="flex items-center gap-1 text-blue-400">
                  <Activity size={14} /> {log.ms}ms
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck size={14} /> {log.confidence}% safe
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#0A0A0A] to-transparent z-10"></div>
      </div>
    </div>
  );
};

export default TransparencyConsole;
