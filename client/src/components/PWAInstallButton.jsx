import React from 'react';
import { usePWA } from '../context/PWAContext';
import { FiDownload } from 'react-icons/fi';

const PWAInstallButton = ({ className = "" }) => {
  const { isInstallable, isInstalled, installApp } = usePWA();

  // If already installed or not installable on this browser/device, don't show anything
  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <button
      onClick={installApp}
      className={`group relative flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary text-white rounded-2xl font-black shadow-xl transform transition-all hover:scale-[1.05] active:scale-95 overflow-hidden md:hidden ${className}`}
    >
      {/* Glossy overlay effect */}
      <div className="absolute inset-x-0 h-[200%] top-[-50%] bg-white/20 -skew-y-12 transform -translate-y-[120%] group-hover:translate-y-[120%] transition-transform duration-700 pointer-events-none"></div>
      
      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
        <FiDownload className="w-6 h-6 animate-bounce" />
      </div>
      
      <div className="text-left">
        <span className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-70 leading-none mb-1">Mobile Optimized</span>
        <span className="text-lg">Install EduTech App</span>
      </div>
    </button>
  );
};

export default PWAInstallButton;
