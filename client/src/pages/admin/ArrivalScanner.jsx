import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { toast } from '../../utils/toast';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const ArrivalScanner = () => {
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [dailyStats, setDailyStats] = useState([]); // Array<{ date: string, studentStats: [], staffStats: {} }>
  const [expandedDays, setExpandedDays] = useState([0]); // Index of expanded days (today expanded by default)
  const inputRef = useRef(null);
  const { settings: schoolSettings } = useSchoolSettings();

  useEffect(() => {
    fetchStats();
  }, []);

  // Keep input focused for barcode scanners
  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(focusInterval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/attendance/arrival-stats');
      if (response.ok) {
        const data = await response.json();
        setDailyStats(data);
      }
    } catch (error) {
      console.error('Error fetching arrival stats:', error);
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!admissionNumber) return;

    setLoading(true);
    try {
      const response = await api.post('/api/attendance/scan', { admissionNumber });
      const data = await response.json();

      if (response.ok) {
        const scanResult = {
          student: data.student,
          staff: data.staff,
          isStaff: data.isStaff,
          time: new Date().toLocaleTimeString(),
          success: true
        };
        setLastScan(scanResult);
        const historyItem = data.isStaff
          ? { name: data.staff.name, time: scanResult.time, isStaff: true }
          : { name: data.student.name, time: scanResult.time, isStaff: false };
        setScanHistory([historyItem, ...scanHistory].slice(0, 10));

        if (data.isStaff) {
          toast.success(`Welcome ${data.staff.name} (Staff)!`);
        } else {
          toast.success(`Welcome ${data.student.name}! Notification sent to parent.`);
        }

        // Refresh statistics
        fetchStats();

        // Play success sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
        audio.play().catch(e => console.log('Audio play failed'));
      } else {
        toast.error(data.error || 'Scan failed');
        // Play error sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3');
        audio.play().catch(e => console.log('Audio play failed'));
      }
    } catch (error) {
      toast.error('Error processing scan');
    } finally {
      setLoading(false);
      setAdmissionNumber('');
      inputRef.current?.focus();
    }
  };

  const toggleDay = (idx) => {
    setExpandedDays(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-primary p-8 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">Gate Scanning System</h1>
          <div className="flex justify-center gap-4 mt-2">
            <p className="opacity-90">Safe Arrival Notifications • {schoolSettings?.schoolName || 'School Management'}</p>
            {dailyStats && dailyStats.length > 0 && dailyStats[0]?.staffStats && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                Today: {(dailyStats[0].staffStats?.scanned || 0) + (dailyStats[0].studentStats?.reduce((acc, curr) => acc + (curr.scanned || 0), 0) || 0)} Arrivals
              </span>
            )}
          </div>
        </div>

        <div className="p-8">
          <div className="mb-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 12h.01M12 12h.01M16 12h.01M8 12h.01M8 16h.01M16 16h.01" />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">Ready to Scan ID Card</h2>
            <form onSubmit={handleScan} className="max-w-md mx-auto relative">
              <input
                ref={inputRef}
                type="text"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                autoFocus
                placeholder="Scan Card or Type ID"
                className="w-full px-6 py-4 text-center text-2xl font-mono tracking-widest border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all outline-none uppercase"
                disabled={loading}
              />
              {loading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
            </form>
            <p className="text-sm text-gray-500 mt-4 italic font-medium">Auto-focus enabled for barcode scanners.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Last Scan Detail */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2">
                {lastScan && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lastScan.isStaff ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {lastScan.isStaff ? 'STAFF' : 'STUDENT'}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Last Scanned</h3>
              {lastScan ? (
                <div className="flex items-center gap-4 animate-fadeIn">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${lastScan.isStaff ? 'bg-purple-100' : 'bg-green-100'}`}>
                    <svg className={`w-8 h-8 ${lastScan.isStaff ? 'text-purple-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-800 leading-tight">{lastScan.isStaff ? lastScan.staff.name : lastScan.student.name}</h4>
                    <p className="text-sm text-gray-600 font-medium">
                      {lastScan.isStaff ? lastScan.staff.role : `Class: ${lastScan.student.class}`}
                    </p>
                    <p className="text-xs text-primary font-black mt-1 flex items-center gap-1 uppercase">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      ARRIVED AT {lastScan.time}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 italic">
                  <p>Awaiting cards...</p>
                </div>
              )}
            </div>

            {/* Scan History */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Recent Scans</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {scanHistory.map((scan, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${scan.isStaff ? 'bg-purple-500' : 'bg-green-500'}`}></span>
                      <span className="font-bold text-gray-700">{scan.name}</span>
                      {scan.isStaff && <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-black">STAFF</span>}
                    </div>
                    <span className="text-gray-400 font-mono text-xs bg-gray-50 px-2 py-1 rounded">{scan.time}</span>
                  </div>
                ))}
                {scanHistory.length === 0 && <p className="text-center text-gray-400 py-8 italic font-medium">No history yet</p>}
              </div>
            </div>
          </div>

          <div className="mt-12 space-y-12">
            {Array.isArray(dailyStats) && dailyStats.map((day, dayIdx) => (
              <div key={dayIdx} className="animate-fadeIn">
                <div
                  onClick={() => toggleDay(dayIdx)}
                  className="flex items-center justify-between mb-6 bg-gray-50/50 p-4 rounded-xl cursor-pointer hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${expandedDays.includes(dayIdx) ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                      <svg className={`w-5 h-5 transition-transform duration-300 ${expandedDays.includes(dayIdx) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-800 uppercase tracking-tighter">
                        {day.date ? new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date'}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {dayIdx === 0 && (
                          <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                        )}
                        <span className="text-[10px] font-bold text-gray-400">
                          {day.staffStats?.scanned || 0} Staff • {day.studentStats?.reduce((acc, curr) => acc + (curr.scanned || 0), 0) || 0} Students
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] text-gray-400 font-black uppercase mb-0.5">Quick Stat</p>
                      <p className="text-sm font-bold text-primary">
                        {Math.round(((day.staffStats?.scanned || 0) + (day.studentStats?.reduce((acc, curr) => acc + (curr.scanned || 0), 0) || 0)) /
                          Math.max(1, (day.staffStats?.total || 0) + (day.studentStats?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0)) * 100)}% Arrival
                      </p>
                    </div>
                  </div>
                </div>

                {expandedDays.includes(dayIdx) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                    {/* Overall Staff Card */}
                    <div className="bg-purple-50 border-2 border-purple-100 rounded-2xl p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-purple-600 text-white p-2 rounded-lg">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <span className="text-xs font-black text-purple-700 uppercase">TEACHERS & STAFF</span>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm font-bold text-purple-800 mb-1">
                            <span>Scanned</span>
                            <span>{day.staffStats?.scanned || 0}</span>
                          </div>
                          <div className="w-full bg-purple-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all duration-1000"
                              style={{ width: `${((day.staffStats?.scanned || 0) / Math.max(1, day.staffStats?.total || 0)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-purple-100">
                          <span className="text-xs font-bold text-gray-500 uppercase">Absent (Unscanned)</span>
                          <span className="text-sm font-black text-red-500">{day.staffStats?.unscanned || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Individual Class Summary Cards */}
                    {day.studentStats?.map((cls, idx) => (
                      <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-sm font-black text-gray-800 uppercase truncate pr-4">{cls.className}</h4>
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full">STUDENTS</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                            <p className="text-[10px] font-black text-green-700 uppercase mb-1">Scanned</p>
                            <p className="text-xl font-black text-green-800">{cls.scanned}</p>
                          </div>
                          <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
                            <p className="text-[10px] font-black text-orange-700 uppercase mb-1">Absent</p>
                            <p className="text-xl font-black text-orange-800">{cls.unscanned}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-grow bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all duration-1000"
                              style={{ width: `${(cls.scanned / Math.max(1, cls.total)) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-black text-gray-400 whitespace-nowrap">{cls.scanned}/{cls.total} Total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {dailyStats.length === 0 && (
              <div className="py-12 text-center text-gray-400 italic font-medium">
                Loading statistics...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} Premium Gate Security System • Built for Excellence</p>
      </div>
    </div>
  );
};

export default ArrivalScanner;
