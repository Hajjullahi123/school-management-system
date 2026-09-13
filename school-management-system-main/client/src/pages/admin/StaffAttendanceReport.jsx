import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { formatDateVerbose } from '../../utils/formatters';
import { toast } from '../../utils/toast';

const StaffAttendanceReport = () => {
  const [dailyReports, setDailyReports] = useState([]); // Array<{ date, stats, staff }>
  const [expandedDays, setExpandedDays] = useState([0]); // Default first day expanded
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Verification Modal State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState('present');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifyCheckIn, setVerifyCheckIn] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Bulk Marking State
  const [isMarkMode, setIsMarkMode] = useState(false);
  const [attendanceUpdates, setAttendanceUpdates] = useState({}); // { userId: { status, notes } }
  const [savingBulk, setSavingBulk] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState(null);

  useEffect(() => {
    fetchDailyReport();
    fetchSchoolInfo();
  }, [selectedDate, endDate]);

  const fetchSchoolInfo = async () => {
    try {
      const response = await api.get('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSchoolInfo(data);
      }
    } catch (error) {
      console.error('Error fetching school info:', error);
    }
  };

  const fetchDailyReport = async () => {
    try {
      setLoading(true);

      // Calculate days between selectedDate and endDate
      const start = new Date(selectedDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Fetch the range (max 31 days to prevent overload)
      const daysToFetch = Math.min(Math.max(diffDays, 1), 31);

      const response = await api.get(`/api/staff-attendance/daily-report?date=${endDate}&days=${daysToFetch}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch report');
      }

      const data = await response.json();
      const reports = Array.isArray(data) ? data : [data];
      setDailyReports(reports);

      // Initialize bulk updates with current status of the FIRST day (today/selected)
      if (reports.length > 0) {
        const initialUpdates = {};
        reports[0].staff.forEach(s => {
          initialUpdates[s.userId] = { status: s.status, notes: s.notes || '' };
        });
        setAttendanceUpdates(initialUpdates);
      }
    } catch (error) {
      console.error('Error fetching daily report:', error);
      toast.error(error.message || 'Error fetching staff attendance');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (idx) => {
    setExpandedDays(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const openVerifyModal = (staff) => {
    setSelectedStaff(staff);
    setVerifyStatus(staff.status === 'absent' ? 'present' : staff.status);
    setVerifyNotes(staff.notes || '');

    if (staff.checkInTime) {
      const time = new Date(staff.checkInTime).toTimeString().slice(0, 5);
      setVerifyCheckIn(time);
    } else {
      setVerifyCheckIn('08:00');
    }

    setShowVerifyModal(true);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    try {
      // Create a date object combining selectedDate and verifyCheckIn time
      let checkInDateTime = null;
      if (verifyCheckIn) {
        checkInDateTime = new Date(`${selectedDate}T${verifyCheckIn}:00`);
      }

      const response = await api.post('/api/staff-attendance/verify', {
        userId: selectedStaff.userId,
        date: selectedDate,
        status: verifyStatus,
        notes: verifyNotes,
        checkInTime: checkInDateTime
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      toast.success('Attendance updated successfully');
      fetchDailyReport();
      setShowVerifyModal(false);
    } catch (error) {
      console.error('Error verifying attendance:', error);
      toast.error(error.message || 'Failed to verify attendance');
    } finally {
      setVerifying(false);
    }
  };

  const handleBulkStatusChange = (userId, status) => {
    setAttendanceUpdates(prev => ({
      ...prev,
      [userId]: { ...prev[userId], status }
    }));
  };

  const handleBulkNotesChange = (userId, notes) => {
    setAttendanceUpdates(prev => ({
      ...prev,
      [userId]: { ...prev[userId], notes }
    }));
  };

  const handleSaveBulk = async () => {
    setSavingBulk(true);
    try {
      const records = Object.entries(attendanceUpdates).map(([userId, data]) => ({
        userId,
        status: data.status,
        notes: data.notes
      }));

      const response = await api.post('/api/staff-attendance/mark-bulk', {
        date: selectedDate,
        records
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bulk save failed');
      }

      toast.success('✅ All changes saved successfully');
      setIsMarkMode(false);
      fetchDailyReport();
    } catch (error) {
      console.error('Bulk save error:', error);
      toast.error(error.message || 'Failed to save daily roll');
    } finally {
      setSavingBulk(false);
    }
  };

  const handleFullDownload = () => {
    const url = `${api.baseURL}/api/staff-attendance/download?startDate=${selectedDate}&endDate=${endDate}`;
    // Since we're using auth tokens, we need to fetch or use a hidden form/link with token if possible
    // But for a simple GET with redirect, most systems use a temporary token or session cookie.
    // If api.get handles headers, we can't easily use window.location.
    // Let's use the fetch approach to get the blob.

    setExporting(true);
    api.get(`/api/staff-attendance/download?startDate=${selectedDate}&endDate=${endDate}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to download');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Staff_Attendance_${selectedDate}_to_${endDate}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('Download error:', err);
        toast.error('Failed to download Excel report');
      })
      .finally(() => setExporting(false));
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToCSV = (report) => {
    setExporting(true);
    try {
      if (!report?.staff) return;

      const headers = ['Name', 'Role', 'Check-In', 'Check-Out', 'Status', 'Late (min)', 'Hours', 'Verified By', 'Verified At'];
      const rows = report.staff.map(s => [
        s.name,
        s.role,
        s.checkInTime ? new Date(s.checkInTime).toLocaleTimeString() : '-',
        s.checkOutTime ? new Date(s.checkOutTime).toLocaleTimeString() : '-',
        s.status,
        s.lateMinutes || '0',
        s.hoursWorked || '-',
        s.verifiedBy || '-',
        s.verifiedAt ? new Date(s.verifiedAt).toLocaleString() : '-'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const reportDate = new Date(report.date).toISOString().split('T')[0];
      a.download = `staff-attendance-${reportDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'half-day': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto report-container">
      {/* Formal Report Header (Print Only) */}
      <div className="hidden print-header mb-8">
        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4">
          <div className="flex items-center gap-6">
            {schoolInfo?.logoUrl ? (
              <img src={schoolInfo.logoUrl} alt="Logo" className="w-24 h-24 object-contain" />
            ) : (
              <div className="w-24 h-24 bg-gray-200 flex items-center justify-center font-bold text-gray-400">LOGO</div>
            )}
            <div>
              <h1 className="text-3xl font-black text-gray-900 uppercase leading-none mb-1">
                {schoolInfo?.schoolName || schoolInfo?.name || 'SCHOOL MANAGEMENT SYSTEM'}
              </h1>
              <p className="text-sm font-bold text-gray-700 italic mb-1">{schoolInfo?.motto || 'Knowledge is Light'}</p>
              <p className="text-xs text-gray-600 max-w-md">{schoolInfo?.address || 'School Premises, Nigerian Territory'}</p>
              <p className="text-xs text-gray-600">{schoolInfo?.phone} | {schoolInfo?.email}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest mb-1">Staff Attendance Report</h2>
            <div className="text-[10px] font-bold text-gray-500 uppercase">
              <p>Period: {selectedDate} To {endDate}</p>
              <p>Generated: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 no-print">
        <h1 className="text-2xl font-black text-gray-800 mb-2">Staff Attendance Report</h1>
        <p className="text-gray-500 font-medium">Monitor and manage staff attendance records with daily history</p>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white p-4 rounded-xl shadow-md mb-6 border border-gray-100 no-print">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[180px]">
            <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">
              Start Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-gray-700"
            />
          </div>
          <div className="min-w-[180px]">
            <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={selectedDate}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-gray-700"
            />
          </div>

          <div className="flex-1 flex flex-wrap gap-2 justify-end">
            <button
              onClick={handlePrint}
              className="bg-gray-800 text-white hover:bg-black font-bold py-2 px-6 rounded-lg transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>
            <button
              onClick={handleFullDownload}
              disabled={exporting}
              className="bg-green-600 text-white hover:bg-green-700 font-bold py-2 px-6 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {exporting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              Download Excel
            </button>
            <button
              onClick={() => setIsMarkMode(!isMarkMode)}
              className={`${isMarkMode ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-100 text-gray-700'} hover:opacity-90 font-bold py-2 px-6 rounded-lg transition-all flex items-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {isMarkMode ? 'Exit Mark' : 'Daily Roll'}
            </button>
          </div>
        </div>
      </div>

      {isMarkMode && (
        <div className="mb-6 bg-primary/5 border-L-4 border-primary p-4 rounded-xl flex justify-between items-center animate-pulse">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-primary font-bold">Mark Mode Active: Select statuses for staff and click save.</p>
          </div>
          <button
            onClick={handleSaveBulk}
            disabled={savingBulk}
            className="bg-primary text-white px-8 py-2 rounded-lg font-black shadow-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 uppercase tracking-wider"
          >
            {savingBulk ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            Save All Changes
          </button>
        </div>
      )}

      {/* Daily Reports List */}
      <div className="space-y-8">
        {loading ? (
          <div className="p-8 text-center bg-white rounded-lg shadow-md">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-600">Loading attendance data...</p>
          </div>
        ) : dailyReports.length > 0 ? (
          dailyReports.map((report, reportIdx) => (
            <div key={reportIdx} className="animate-fadeIn">
              {/* Day Header/Card */}
              <div
                onClick={() => toggleDay(reportIdx)}
                className={`bg-white rounded-xl shadow-md overflow-hidden border-L-4 mb-4 cursor-pointer hover:shadow-lg transition-all ${reportIdx === 0 ? 'border-primary' : 'border-gray-300'
                  }`}
              >
                <div className="p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${expandedDays.includes(reportIdx) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <svg className={`w-6 h-6 transition-transform duration-300 ${expandedDays.includes(reportIdx) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        {formatDateVerbose(report.date)}
                      </h3>
                      {reportIdx === 0 && (
                        <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full mt-1 inline-block uppercase">Today / Selected</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div className="text-center px-4 border-r border-gray-100">
                      <p className="text-[10px] text-gray-400 font-black uppercase">Present</p>
                      <p className="text-xl font-black text-green-600">{report.stats.present}</p>
                    </div>
                    <div className="text-center px-4 border-r border-gray-100">
                      <p className="text-[10px] text-gray-400 font-black uppercase">Late</p>
                      <p className="text-xl font-black text-yellow-600">{report.stats.late}</p>
                    </div>
                    <div className="text-center px-4">
                      <p className="text-[10px] text-gray-400 font-black uppercase">Absent</p>
                      <p className="text-xl font-black text-red-600">{report.stats.absent}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportToCSV(report);
                      }}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="Export this day"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    {reportIdx === 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMarkMode(!isMarkMode);
                          if (!expandedDays.includes(0)) toggleDay(0);
                        }}
                        className={`p-2 rounded-lg transition-colors ${isMarkMode ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-primary'}`}
                        title="Mark Daily Roll"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Holiday Notification */}
              {report.isHoliday && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-8 mb-8 text-center animate-fadeIn">
                  <div className="flex justify-center mb-4">
                    <div className="bg-blue-600/10 p-3 rounded-full">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <h4 className="text-xl font-black text-blue-900 uppercase tracking-tight mb-2">SCHOOL CLOSED: {report.holidayName || 'Official Holiday'}</h4>
                  <p className="text-blue-700 font-medium tracking-tight">No staff attendance expected or recorded for this day.</p>
                </div>
              )}

              {/* Expanded Content */}
              {expandedDays.includes(reportIdx) && !report.isHoliday && (
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-8 animate-fadeIn">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff Member</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-In</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-Out</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {report.staff.map((staff, sIdx) => (
                          <tr key={staff.userId} className={sIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900">{staff.name}</div>
                              <div className="text-xs text-gray-500">{staff.email}</div>
                              {staff.verifiedBy && (
                                <div className="mt-1 flex items-center gap-1">
                                  <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-[10px] text-gray-500 italic">Verified by {staff.verifiedBy}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-[10px] font-black rounded bg-blue-50 text-blue-600 uppercase tracking-wider">
                                {staff.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {staff.checkInTime ? (
                                <div>
                                  <p className="text-sm font-bold text-gray-800">
                                    {new Date(staff.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  {staff.lateMinutes > 0 && (
                                    <p className="text-[10px] font-black text-red-500 uppercase">+{staff.lateMinutes} min late</p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-300">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {staff.checkOutTime ? (
                                new Date(staff.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isMarkMode && reportIdx === 0 ? (
                                <div className="flex gap-1">
                                  {['present', 'late', 'absent', 'half-day'].map(s => (
                                    <button
                                      key={s}
                                      onClick={() => handleBulkStatusChange(staff.userId, s)}
                                      className={`px-2 py-1 text-[9px] font-black rounded uppercase border transition-all ${attendanceUpdates[staff.userId]?.status === s
                                        ? (s === 'present' ? 'bg-green-600 border-green-600 text-white' :
                                          s === 'late' ? 'bg-yellow-500 border-yellow-500 text-white' :
                                            s === 'absent' ? 'bg-red-600 border-red-600 text-white' :
                                              'bg-orange-600 border-orange-600 text-white')
                                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                                        }`}
                                    >
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className={`px-2 py-1 text-[10px] font-black rounded uppercase tracking-wider ${getStatusColor(staff.status)}`}>
                                  {staff.status}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                              {isMarkMode && reportIdx === 0 ? (
                                <input
                                  type="text"
                                  value={attendanceUpdates[staff.userId]?.notes || ''}
                                  onChange={(e) => handleBulkNotesChange(staff.userId, e.target.value)}
                                  placeholder="Note..."
                                  className="w-full border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                />
                              ) : (
                                <div className="max-w-[150px] truncate">{staff.notes || '-'}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {(!isMarkMode || reportIdx !== 0) && (
                                <button
                                  onClick={() => openVerifyModal(staff)}
                                  className="text-primary hover:text-primary/70 text-[10px] font-black uppercase flex items-center gap-1 ml-auto"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Verify
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center bg-white rounded-lg shadow-md">
            <svg className="mx-auto h-16 w-16 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xl font-bold text-gray-400">No attendance records found</p>
            <p className="text-gray-400 mt-2 italic">Try selecting a different date or checking back later.</p>
          </div>
        )}
      </div>

      {/* Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Verify Attendance</h3>
                <p className="text-sm text-gray-500">{selectedStaff?.name}</p>
              </div>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={verifying}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleVerify} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Attendance Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['present', 'late', 'absent', 'half-day'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setVerifyStatus(s)}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-all ${verifyStatus === s
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {(verifyStatus === 'present' || verifyStatus === 'late' || verifyStatus === 'half-day') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">Manual Check-In Time</label>
                  <input
                    type="time"
                    value={verifyCheckIn}
                    onChange={(e) => setVerifyCheckIn(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 text-center">leave as is to use existing time or school default</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Administrative Notes</label>
                <textarea
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Reason for manual marking or justification..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={verifying}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    'Verify Status'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100 flex flex-wrap justify-between items-center">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Status Legend</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-[10px] font-black rounded bg-green-100 text-green-800 uppercase">present</span>
              <span className="text-xs text-gray-500 font-medium">- On time</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-[10px] font-black rounded bg-yellow-100 text-yellow-800 uppercase">late</span>
              <span className="text-xs text-gray-500 font-medium">- Arrived late</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-[10px] font-black rounded bg-red-100 text-red-800 uppercase">absent</span>
              <span className="text-xs text-gray-500 font-medium">- Not checked in</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-[10px] font-black rounded bg-orange-100 text-orange-800 uppercase">half-day</span>
              <span className="text-xs text-gray-500 font-medium">- Partial day</span>
            </div>
          </div>
        </div>
        <div className="mt-4 md:mt-0 text-[10px] text-gray-400 font-bold italic">
          * Records with <span className="text-green-500">✔</span> indicate manual admin verification.
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .p-6 { padding: 0 !important; }
          .max-w-7xl { max-width: 100% !important; }
          .shadow-md { shadow: none !important; border: 1px solid #eee !important; }
          .animate-fadeIn { opacity: 1 !important; }
          
          /* Expand all daily reports for printing */
          .animate-fadeIn > div { margin-bottom: 2rem !important; break-inside: avoid; }
          
          /* Ensure table is visible and clean */
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #ddd !important; padding: 8px !important; font-size: 10px !important; }
          th { background-color: #f8f9fa !important; -webkit-print-color-adjust: exact; }
          
          /* Hide expansion icons */
          .p-2.rounded-lg.bg-primary { display: none !important; }
          
          /* Force page breaks between major sections if needed */
          h1, h3 { color: black !important; }
        }
      `}} />
    </div>
  );
};

export default StaffAttendanceReport;
