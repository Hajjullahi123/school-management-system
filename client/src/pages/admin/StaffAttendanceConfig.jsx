import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import { api } from '../../api';

const StaffAttendanceConfig = () => {
  const [settings, setSettings] = useState({
    staffExpectedArrivalTime: '07:00',
    staffClockInDeadline: '10:00',
    enableStaffAttendanceReport: true,
    staffClockInMode: 'anywhere',
    authorizedIP: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      const data = await response.json();
      setSettings({
        staffExpectedArrivalTime: data.staffExpectedArrivalTime || '07:00',
        staffClockInDeadline: data.staffClockInDeadline || '10:00',
        enableStaffAttendanceReport: data.enableStaffAttendanceReport ?? true,
        staffClockInMode: data.staffClockInMode || 'anywhere',
        authorizedIP: data.authorizedIP || ''
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.put('/api/settings', settings);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }
      toast.success('Attendance configuration saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const detectIP = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      setSettings(prev => ({ ...prev, authorizedIP: data.ip }));
      toast.success(`Detected IP: ${data.ip}`);
    } catch (e) {
      toast.error('Failed to auto-detect IP. Check your internet connection.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Attendance Rules</h1>
          <p className="text-gray-500 font-medium">Configure punctuality rules and network restrictions for staff</p>
        </div>
        <button 
          onClick={handleSaveSettings} 
          disabled={saving} 
          className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:brightness-90 disabled:bg-gray-400 transition-all shadow-lg flex items-center gap-2"
        >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-xl">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800 font-medium">
                These rules apply to all staff members clocking in from their dashboards.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timing Rules */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
             <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter border-b pb-4">⏰ Timing Expectations</h3>
             
             <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Expected Arrival</label>
                <input
                  type="time"
                  name="staffExpectedArrivalTime"
                  value={settings.staffExpectedArrivalTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-100 bg-gray-50/50 rounded-2xl font-bold text-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <p className="mt-2 text-[11px] text-gray-500 italic">Staff clocked after this are marked as "Late"</p>
             </div>

             <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Clock-in Deadline</label>
                <input
                  type="time"
                  name="staffClockInDeadline"
                  value={settings.staffClockInDeadline}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-100 bg-gray-50/50 rounded-2xl font-bold text-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <p className="mt-2 text-[11px] text-gray-500 italic">Prevents clock-in attempts after this time</p>
             </div>
          </div>

          {/* Reporting & Automation */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
             <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter border-b pb-4">📊 Reports & Alerts</h3>
             
             <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                <div>
                   <p className="font-bold text-gray-800">Daily Admin Summary</p>
                   <p className="text-[11px] text-gray-500">Auto-generate report at end of day</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="enableStaffAttendanceReport"
                    checked={settings.enableStaffAttendanceReport}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
             </div>

             <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex gap-3">
                   <span className="text-xl">📧</span>
                   <div>
                      <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest mb-1">Coming Soon</p>
                      <p className="text-xs text-amber-700 font-medium">Automatic absenteeism alerts to HODs via email and WhatsApp.</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Network Security */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6 md:col-span-2">
             <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter border-b pb-4">🛡️ Network & Security Restrictions</h3>
             
             <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Access Policy</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   {[
                     { id: 'anywhere', label: 'Remote / Anywhere', desc: 'No network restrictions', icon: '🌍' },
                     { id: 'ip_locked', label: 'Office Network Only', desc: 'Locked to Authorized IP', icon: '🏢' },
                     { id: 'scan_only', label: 'Physical Scan Only', desc: 'Must be scanned at gate', icon: '🔍' }
                   ].map(mode => (
                     <button
                       key={mode.id}
                       onClick={() => setSettings(prev => ({ ...prev, staffClockInMode: mode.id }))}
                       className={`p-4 rounded-2xl border-2 text-left transition-all ${
                         settings.staffClockInMode === mode.id
                         ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/10'
                         : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                       }`}
                     >
                        <div className="flex items-center gap-3 mb-2">
                           <span className="text-xl">{mode.icon}</span>
                           <span className="font-bold text-sm text-gray-800">{mode.label}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium">{mode.desc}</p>
                     </button>
                   ))}
                </div>
             </div>

             {settings.staffClockInMode === 'ip_locked' && (
               <div className="pt-4 animate-fadeIn">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Authorized IP Address</label>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      name="authorizedIP"
                      value={settings.authorizedIP}
                      onChange={handleInputChange}
                      placeholder="e.g. 192.168.1.1"
                      className="flex-1 px-4 py-3 border border-gray-100 bg-gray-50/50 rounded-2xl font-mono font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={detectIP}
                      className="px-6 py-3 bg-secondary text-white rounded-2xl font-bold text-sm hover:brightness-90 transition-all shadow-lg"
                    >
                      Use Current IP
                    </button>
                  </div>
                  <p className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-xl text-[11px] font-medium leading-relaxed">
                    <strong>Note:</strong> Staff using mobile data or different networks will be unable to clock in. Ensure your school has a static public IP address for best results.
                  </p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffAttendanceConfig;
