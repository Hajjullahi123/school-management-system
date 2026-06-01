import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiMinus, FiHelpCircle } from 'react-icons/fi';

// Helper to convert hex colors to RGBA
const hexToRgba = (hex, alpha = 1) => {
  if (!hex) return `rgba(59, 130, 246, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16) || 59;
  const g = parseInt(hex.slice(3, 5), 16) || 130;
  const b = parseInt(hex.slice(5, 7), 16) || 246;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const FaqWidget = ({ school }) => {
  const [openIndex, setOpenIndex] = useState(0); // Open first by default

  const primary = school?.settings?.primaryColor || '#1e3a8a';
  const secondary = school?.settings?.secondaryColor || '#3b82f6';

  const defaultFaqs = [
    {
      question: "What is your admission process and requirements?",
      answer: "Our admission process is straightforward. First, you submit an online inquiry or application form. Next, your child will be scheduled for a brief assessment and interview. Once admitted, you will receive an offer letter with further instructions on enrollment and fee payment."
    },
    {
      question: "Do you offer a school bus service?",
      answer: "Yes! We offer a reliable, air-conditioned school bus service with multiple routes across the city. Each bus is staffed with an assistant to ensure the safety and comfort of the children during transit. You can opt-in for this service during enrollment."
    },
    {
      question: "What extracurricular activities do you provide?",
      answer: "We believe in holistic education. Our students participate in various clubs including Coding & Robotics, Debate & Public Speaking, Sports (Football, Basketball, Athletics), Music, and Drama. These activities run after regular academic hours."
    },
    {
      question: "What is the teacher-to-student ratio?",
      answer: "We maintain a low teacher-to-student ratio (typically 1:15 for younger grades and 1:20 for older grades). This ensures that every child receives personalized attention, support, and guidance from our dedicated educators."
    },
    {
      question: "Are your teachers qualified?",
      answer: "Absolutely. All our teaching staff are certified professionals with relevant degrees in education and their specific subject areas. Furthermore, we conduct continuous professional development (CPD) sessions to keep them updated on modern teaching methodologies."
    }
  ];

  let activeFaqs = defaultFaqs;
  if (school?.faqConfig) {
    try {
      const parsed = JSON.parse(school.faqConfig);
      if (Array.isArray(parsed) && parsed.length > 0) {
        activeFaqs = parsed;
      }
    } catch (e) {}
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 flex flex-col h-full text-left relative overflow-hidden group hover:shadow-md transition-all">
      {/* Subtle glowing accent */}
      <div 
        className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-[0.03] pointer-events-none translate-x-1/3 -translate-y-1/3 transition-all group-hover:opacity-[0.06]"
        style={{ backgroundColor: primary }}
      />

      <div className="flex items-center justify-between mb-2">
        <div>
          <span 
            className="inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-3 border"
            style={{ 
              backgroundColor: hexToRgba(primary, 0.08), 
              color: primary,
              borderColor: hexToRgba(primary, 0.15) 
            }}
          >
            ❓ Common Questions
          </span>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
            Help & <span style={{ color: primary }}>FAQs</span>
          </h3>
        </div>
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary || primary})` }}
        >
          <FiHelpCircle className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="space-y-1.5 flex-1 overflow-y-auto pr-1" style={{ maxHeight: '400px' }}>
        {activeFaqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div 
              key={index} 
              className={`rounded-[4px] transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md border border-white/10`}
              style={{ backgroundColor: primary }}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                className="w-full px-2.5 h-[24px] flex items-center justify-between gap-2 text-left focus:outline-none"
              >
                <span className="font-bold text-[10px] md:text-[11px] text-white leading-none truncate pr-2">
                  {faq.question}
                </span>
                <div 
                  className="w-4 h-4 shrink-0 rounded-[2px] flex items-center justify-center transition-colors text-white"
                  style={{ backgroundColor: isOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }}
                >
                  {isOpen ? <FiMinus className="w-2.5 h-2.5" /> : <FiPlus className="w-2.5 h-2.5" />}
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <div className="px-2.5 pb-2.5 pt-0 text-[10px] text-white/90 leading-relaxed border-t border-white/10 mt-1">
                      <div className="pt-1.5">
                        {faq.answer}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FaqWidget;
