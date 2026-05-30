import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiMinus, FiHelpCircle } from 'react-icons/fi';

const FaqWidget = ({ primary, secondary }) => {
  const [openIndex, setOpenIndex] = useState(0); // Open first by default

  const faqs = [
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

  return (
    <div className="w-full relative z-20 py-16" style={{ backgroundColor: '#f8fafc' }}>
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-6 shadow-lg border-2 border-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary || primary})` }}>
            <FiHelpCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-4">
            Frequently Asked <span style={{ color: primary }}>Questions</span>
          </h2>
          <p className="text-gray-500 text-sm max-w-2xl mx-auto leading-relaxed">
            We know choosing the right school is a big decision. Here are answers to some of the most common questions prospective parents ask us.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${isOpen ? 'border-transparent ring-2' : 'border-gray-100 hover:border-gray-300'}`}
                style={{ ringColor: isOpen ? `${primary}40` : 'transparent' }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left focus:outline-none"
                >
                  <span className={`font-bold text-sm md:text-base ${isOpen ? 'text-gray-900' : 'text-gray-700'}`}>
                    {faq.question}
                  </span>
                  <div 
                    className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'text-white' : 'bg-gray-50 text-gray-400'}`}
                    style={{ backgroundColor: isOpen ? primary : '' }}
                  >
                    {isOpen ? <FiMinus className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-6 pb-6 pt-0 text-sm text-gray-500 leading-relaxed border-t border-gray-50 mt-2">
                        <div className="pt-4">
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
    </div>
  );
};

export default FaqWidget;
