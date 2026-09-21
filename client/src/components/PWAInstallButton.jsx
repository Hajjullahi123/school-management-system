import React from 'react';
import { usePWA } from '../context/PWAContext';
import { FiDownload, FiSmartphone, FiCheckCircle } from 'react-icons/fi';

const PWAInstallButton = ({ className = "", variant = "button", showText = true }) => {
  const { isInstalled, installApp } = usePWA();

  if (variant === "icon") {
    return (
      <button
        onClick={installApp}
        className={`relative p-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 group ${
          isInstalled
            ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
        } ${className}`}
        title={isInstalled ? "EduTech App Installed ✓ - Tap for Info" : "Install EduTech App for offline access & speed"}
      >
        <div className="relative flex items-center justify-center">
          {isInstalled ? (
            <FiCheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <FiDownload className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
          )}
          {!isInstalled && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          )}
        </div>
        {showText && (
          <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 hidden sm:inline">
            {isInstalled ? 'App Installed ✓' : 'Install App'}
          </span>
        )}
      </button>
    );
  }

  if (variant === "badge") {
    return (
      <button
        onClick={installApp}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95 text-white ${
          isInstalled
            ? 'bg-emerald-600 hover:bg-emerald-700'
            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
        } ${className}`}
      >
        {isInstalled ? <FiCheckCircle className="w-3.5 h-3.5" /> : <FiDownload className="w-3.5 h-3.5 animate-bounce" />}
        <span>{isInstalled ? 'App Installed ✓' : 'Install App'}</span>
      </button>
    );
  }

  if (variant === "banner") {
    return (
      <div className={`bg-gradient-to-r from-gray-900 via-emerald-950 to-gray-900 text-white p-4 rounded-2xl border border-emerald-500/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
            {isInstalled ? <FiCheckCircle className="w-6 h-6 text-emerald-400" /> : <FiSmartphone className="w-6 h-6 animate-pulse" />}
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">
              {isInstalled ? 'EduTech App Installed ✓' : 'Install EduTech Mobile App'}
            </h4>
            <p className="text-xs text-gray-300">
              {isInstalled
                ? 'App is installed on your device. Launch from home screen anytime.'
                : 'Get faster load times, offline access & full screen mode.'}
            </p>
          </div>
        </div>
        <button
          onClick={installApp}
          className={`w-full sm:w-auto px-5 py-2.5 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap text-white ${
            isInstalled ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-400'
          }`}
        >
          {isInstalled ? <FiCheckCircle className="w-4 h-4" /> : <FiDownload className="w-4 h-4" />}
          <span>{isInstalled ? 'App Installed ✓' : 'Install Now'}</span>
        </button>
      </div>
    );
  }

  // Default "button" variant
  return (
    <button
      onClick={installApp}
      className={`group relative flex items-center gap-3 px-6 py-4 text-white rounded-2xl font-black shadow-xl transform transition-all hover:scale-[1.02] active:scale-95 overflow-hidden ${
        isInstalled
          ? 'bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700'
          : 'bg-gradient-to-r from-emerald-600 via-primary to-accent hover:opacity-95'
      } ${className}`}
    >
      {/* Glossy overlay effect */}
      <div className="absolute inset-x-0 h-[200%] top-[-50%] bg-white/20 -skew-y-12 transform -translate-y-[120%] group-hover:translate-y-[120%] transition-transform duration-700 pointer-events-none"></div>
      
      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner flex-shrink-0">
        {isInstalled ? <FiCheckCircle className="w-6 h-6" /> : <FiDownload className="w-6 h-6 animate-bounce" />}
      </div>
      
      <div className="text-left">
        <span className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none mb-1">
          {isInstalled ? 'Installed on Device' : 'Mobile & Desktop App'}
        </span>
        <span className="text-base font-bold">
          {isInstalled ? 'EduTech App Installed ✓' : 'Install EduTech App'}
        </span>
      </div>
    </button>
  );
};

export default PWAInstallButton;
