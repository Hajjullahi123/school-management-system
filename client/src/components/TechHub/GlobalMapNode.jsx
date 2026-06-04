import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const MOCK_NODES = [
  { top: '35%', left: '22%', name: 'US East' },
  { top: '40%', left: '18%', name: 'US West' },
  { top: '65%', left: '32%', name: 'Brazil' },
  { top: '30%', left: '48%', name: 'UK' },
  { top: '35%', left: '52%', name: 'Germany' },
  { top: '55%', left: '55%', name: 'Nigeria' },
  { top: '45%', left: '72%', name: 'India' },
  { top: '60%', left: '82%', name: 'Singapore' },
  { top: '35%', left: '85%', name: 'Japan' },
  { top: '80%', left: '88%', name: 'Australia' }
];

const GlobalMapNode = () => {
  // Generate random connecting lines between some nodes
  const lines = useMemo(() => {
    const l = [];
    for(let i = 0; i < 15; i++) {
      const from = MOCK_NODES[Math.floor(Math.random() * MOCK_NODES.length)];
      let to = MOCK_NODES[Math.floor(Math.random() * MOCK_NODES.length)];
      while(from === to) to = MOCK_NODES[Math.floor(Math.random() * MOCK_NODES.length)];
      
      l.push({
        x1: from.left, y1: from.top,
        x2: to.left, y2: to.top,
        id: i
      });
    }
    return l;
  }, []);

  return (
    <div className="relative w-full aspect-[2/1] bg-[#050505] rounded-3xl overflow-hidden border border-gray-800 shadow-2xl flex items-center justify-center p-8">
      {/* Fallback dotted map background representing the world */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}>
      </div>
      
      {/* Title */}
      <div className="absolute top-6 left-8 z-20">
        <h3 className="text-white text-xl font-bold tracking-tight">Global Educator Network Map</h3>
        <p className="text-gray-400 text-sm mt-1">Real-time active sessions & Edge inference nodes</p>
      </div>

      <div className="relative w-full h-full">
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {lines.map(line => (
            <motion.line
              key={line.id}
              x1={line.x1} y1={line.y1}
              x2={line.x2} y2={line.y2}
              stroke="url(#lineGradient)"
              strokeWidth="1"
              strokeDasharray="4 4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0.1, 0.5, 0.1] }}
              transition={{ duration: Math.random() * 2 + 2, repeat: Infinity, ease: "linear" }}
            />
          ))}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0" />
              <stop offset="50%" stopColor="#818CF8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Nodes */}
        {MOCK_NODES.map((node, i) => (
          <div key={i} className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 group" style={{ top: node.top, left: node.left }}>
            <div className="relative flex items-center justify-center">
              <motion.div 
                className="absolute w-8 h-8 bg-indigo-500 rounded-full opacity-20"
                animate={{ scale: [1, 2.5, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2 + Math.random() * 2, repeat: Infinity }}
              />
              <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full shadow-[0_0_10px_#818CF8] z-10"></div>
            </div>
            <div className="absolute top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 border border-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-30 shadow-xl">
              {node.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalMapNode;
