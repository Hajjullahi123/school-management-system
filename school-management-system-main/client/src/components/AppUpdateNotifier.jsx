import React, { useState, useEffect } from 'react';
import { FiDownload, FiX, FiAlertCircle } from 'react-icons/fi';
import { apiCall } from '../api';

const CURRENT_VERSION = '1.0.0'; // Manually update this when building a new APK

const AppUpdateNotifier = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    // Only check for updates if running in a "physical" environment (like Capacitor)
    // or if the user explicitly wants to see it on web for testing.
    const isCapacitor = window.hasOwnProperty('Capacitor');
    
    const checkUpdates = async () => {
      try {
        const res = await apiCall('/api/public/global-settings');
        const settings = res.data;

        if (settings?.latestAppVersion && settings.latestAppVersion !== CURRENT_VERSION) {
          setUpdateInfo(settings);
        }
      } catch (err) {
        console.error('[UpdateCheck] Failed:', err);
      }
    };

    // Check on mount
    checkUpdates();
  }, []);

  if (!updateInfo || isHidden) return null;

  const handleDownload = () => {
    if (updateInfo.apkDownloadUrl) {
      window.open(updateInfo.apkDownloadUrl, '_blank');
    }
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9999] animate-bounce-in">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-4 text-white border border-white/20 backdrop-blur-lg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse">
              <FiDownload size={24} />
            </div>
            <div>
              <h4 className="font-black text-sm uppercase tracking-tighter">New Version Available!</h4>
              <p className="text-[11px] opacity-80 font-medium">
                Version {updateInfo.latestAppVersion} is ready to download.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownload}
              className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-xs font-black shadow-lg shadow-indigo-900/20 active:scale-95 transition-all"
            >
              DOWNLOAD APK
            </button>
            <button 
              onClick={() => setIsHidden(true)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppUpdateNotifier;
