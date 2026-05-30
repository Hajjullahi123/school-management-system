import React, { useState } from 'react';
import { FiAward, FiShield, FiBookOpen, FiGlobe, FiCheckCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const AccreditationsBand = ({ primary }) => {
  const [isOpen, setIsOpen] = useState(false);

  const accreditations = [
    { icon: <FiShield />, text: "Ministry of Education Approved" },
    { icon: <FiAward />, text: "WAEC & NECO Certified Center" },
    { icon: <FiGlobe />, text: "Global STEM Curriculum" },
    { icon: <FiBookOpen />, text: "Continuous Professional Development" },
    { icon: <FiCheckCircle />, text: "100% Safety Compliance" }
  ];

  return (
    <div className="bg-slate-900 border-y border-white/5 relative transform-gpu">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 50%, ${primary} 0%, transparent 70%)` }} />
      
      {/* Mobile Toggle Button (Visible only on md and below) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden w-full flex items-center justify-between px-6 py-4 text-sm font-bold text-white hover:bg-white/5 transition-colors cursor-pointer relative z-20"
      >
        <div className="flex items-center gap-2">
          <FiAward className="w-4 h-4 text-white" />
          <span className="uppercase tracking-wide text-white text-[11px]">Standards & Accreditations</span>
        </div>
        <div className="text-white/80">
          {isOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Content Container (Collapsible on mobile, always visible on desktop) */}
      <div className={`relative z-10 ${isOpen ? 'block' : 'hidden md:block'}`}>
        <div className="max-w-7xl mx-auto px-6 py-6 md:py-8 flex flex-col items-center justify-center border-t border-white/10 md:border-none">
          
          {/* Heading (Desktop only, since mobile has the toggle button) */}
          <div className="hidden md:block text-center mb-6">
            <h3 className="text-[10px] md:text-xs font-black tracking-[0.2em] text-gray-400 uppercase mb-3">
              Standards & Accreditations
            </h3>
            <div className="w-12 h-0.5 mx-auto rounded-full bg-white/10" />
          </div>

          <div className="flex items-center gap-3 md:gap-5 flex-wrap justify-center w-full">
            {accreditations.map((item, index) => (
              <div 
                key={index} 
                className="group flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-4 py-2 hover:bg-white/10 hover:border-white/20 transition-all cursor-default shadow-sm"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                  {React.cloneElement(item.icon, { className: 'w-3 h-3' })}
                </div>
                <span className="text-[11px] md:text-xs font-semibold text-gray-300 tracking-wide uppercase group-hover:text-white transition-colors">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccreditationsBand;
