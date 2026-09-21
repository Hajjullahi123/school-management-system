import React, { createContext, useContext, useState, useEffect } from 'react';
import { FiX, FiShare, FiSmartphone, FiMonitor, FiDownload, FiCheckCircle, FiMoreVertical } from 'react-icons/fi';

const PWAContext = createContext({
  deferredPrompt: null,
  isInstallable: false,
  isInstalled: false,
  installApp: () => {},
  showGuideModal: false,
  setShowGuideModal: () => {},
});

export const usePWA = () => useContext(PWAContext);

const PWAInstallModal = ({ isOpen, onClose, onNativeInstall, hasNativePrompt, isInstalled }) => {
  if (!isOpen) return null;

  const isIOS = typeof navigator !== 'undefined' && /ipad|iphone|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 relative overflow-hidden transform transition-all animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Decor */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-primary to-accent"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close modal"
        >
          <FiX className="w-6 h-6" />
        </button>

        {/* App Info Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-primary rounded-2xl flex items-center justify-center text-white shadow-lg p-2 flex-shrink-0">
            <img src="/logo-pwa.png" alt="App Icon" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            <FiCheckCircle className="w-7 h-7" style={{ display: 'none' }} />
          </div>
          <div>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${
              isInstalled ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400' : 'text-primary bg-primary/10'
            }`}>
              {isInstalled ? 'App Installed ✓' : 'PWA Web App'}
            </span>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
              {isInstalled ? 'EduTech App Installed' : 'Install EduTech App'}
            </h3>
          </div>
        </div>

        {isInstalled ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
              <FiCheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                EduTech is installed on this device! You can launch it directly from your home screen or app grid for full screen access.
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Need to reinstall or add to another device? Use the browser menu options to manage or add app shortcuts anytime.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Install EduTech on your device for quick full-screen access, faster load speeds, offline access, and instant portal notifications!
            </p>

            {/* Native Install Button Trigger if browser supported */}
            {hasNativePrompt && (
              <button
                onClick={() => {
                  onClose();
                  onNativeInstall();
                }}
                className="w-full mb-6 py-3.5 px-4 bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 transform active:scale-95 transition-all text-base"
              >
                <FiDownload className="w-5 h-5 animate-bounce" />
                <span>Install Instantly Now</span>
              </button>
            )}

            {/* Installation Instructions */}
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50 space-y-3.5 text-sm">
              <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                {isIOS ? (
                  <><FiSmartphone className="text-primary" /> How to install on iOS (iPhone / iPad):</>
                ) : isAndroid ? (
                  <><FiSmartphone className="text-emerald-500" /> How to install on Android:</>
                ) : (
                  <><FiMonitor className="text-accent" /> How to install on Desktop Browser:</>
                )}
              </h4>

              {isIOS ? (
                <ol className="space-y-2 text-gray-600 dark:text-gray-300 text-xs font-medium">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>Tap the <strong className="text-gray-900 dark:text-white flex-inline items-center gap-1">Share <FiShare className="inline w-4 h-4 text-blue-500" /></strong> button at the bottom of Safari.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>Scroll down the share options and select <strong className="text-gray-900 dark:text-white">"Add to Home Screen"</strong> ➕.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <span>Tap <strong className="text-gray-900 dark:text-white">"Add"</strong> in the top right to complete setup!</span>
                  </li>
                </ol>
              ) : isAndroid ? (
                <ol className="space-y-2 text-gray-600 dark:text-gray-300 text-xs font-medium">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>Tap the browser menu <strong className="text-gray-900 dark:text-white inline-flex items-center gap-0.5">(3 dots <FiMoreVertical className="inline w-3.5 h-3.5" />)</strong> in top corner.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>Select <strong className="text-gray-900 dark:text-white">"Install app"</strong> or <strong className="text-gray-900 dark:text-white">"Add to Home screen"</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <span>Confirm install to add EduTech to your home screen!</span>
                  </li>
                </ol>
              ) : (
                <ol className="space-y-2 text-gray-600 dark:text-gray-300 text-xs font-medium">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>Look for the <strong className="text-gray-900 dark:text-white">Install Icon 📥</strong> inside your browser's address bar.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>Or open menu <strong className="text-gray-900 dark:text-white">(⋮)</strong> &rarr; <strong className="text-gray-900 dark:text-white">"Install EduTech App"</strong> / <strong className="text-gray-900 dark:text-white">"Save and Share"</strong>.</span>
                  </li>
                </ol>
              )}
            </div>
          </>
        )}

        {/* Got It Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-2xl transition-colors text-sm"
        >
          Got it, Close
        </button>
      </div>
    </div>
  );
};

export const PWAProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('PWA: beforeinstallprompt fired');
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      console.log('PWA: App was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA: User response to prompt: ${outcome}`);
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('PWA: prompt error', err);
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <PWAContext.Provider 
      value={{ 
        deferredPrompt, 
        isInstallable: true, 
        isInstalled, 
        installApp,
        showGuideModal,
        setShowGuideModal
      }}
    >
      {children}
      <PWAInstallModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onNativeInstall={installApp}
        hasNativePrompt={!!deferredPrompt}
        isInstalled={isInstalled}
      />
    </PWAContext.Provider>
  );
};
