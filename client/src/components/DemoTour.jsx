import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronRight, FiChevronLeft, FiX, FiCheckCircle } from 'react-icons/fi';

const tourSteps = [
  {
    title: "Welcome to the Future!",
    content: "You are currently exploring the Premium Demo of EduTechAI. This guided tour will show you how to manage your school efficiently.",
    target: "dashboard-overview"
  },
  {
    title: "Global Analytics",
    content: "This dashboard gives you real-time insights into student performance, fee collection, and attendance metrics at a glance.",
    target: "stats-grid"
  },
  {
    title: "Financial Governance",
    content: "Track every Naira. Our system prevents 'leakage' by automating fee records and generating instant digital receipts.",
    target: "fees-link"
  },
  {
    title: "AI Predictive Insights",
    content: "Go to Advanced Analytics to see which students are at risk of failing and intervene before the term ends.",
    target: "analytics-link"
  },
  {
    title: "Mobile Ready",
    content: "Don't forget! Everything you see here is fully accessible via our Native Android App for parents and teachers.",
    target: "mobile-info"
  }
];

const DemoTour = ({ isDemo }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show tour after a brief delay if it's a demo account and hasn't been seen this session
    const hasSeenTour = sessionStorage.getItem('hasSeenDemoTour');
    if (isDemo && !hasSeenTour) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isDemo]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('hasSeenDemoTour', 'true');
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-8 right-8 z-[100] w-80 bg-white rounded-[32px] shadow-2xl border border-indigo-100 p-6 overflow-hidden"
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 h-1.5 bg-gray-100 w-full">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
            className="h-full bg-indigo-600"
          />
        </div>

        <div className="flex justify-between items-start mb-4">
          <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
            Step {currentStep + 1} of {tourSteps.length}
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <FiX size={200} className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-xl font-black text-gray-900 mb-2 leading-tight">
          {tourSteps[currentStep].title}
        </h3>
        <p className="text-gray-500 text-sm font-medium mb-8 leading-relaxed">
          {tourSteps[currentStep].content}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`p-2 rounded-full transition-all ${currentStep === 0 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            <FiChevronLeft size={24} />
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
            {currentStep === tourSteps.length - 1 ? (
              <>Finished <FiCheckCircle /></>
            ) : (
              <>Next Step <FiChevronRight /></>
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DemoTour;
