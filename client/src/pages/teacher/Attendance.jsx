import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import { API_BASE_URL } from '../../config';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import Papa from 'papaparse';

const Attendance = () => {
  const { user } = useAuth();

  // State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Stats
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0 });
  const [holidayCheck, setHolidayCheck] = useState({ isHoliday: false, info: null });
  const [isPastDate, setIsPastDate] = useState(false);
  const [noActiveSession, setNoActiveSession] = useState(false);


  // Download functionality
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloadFilters, setDownloadFilters] = useState({
    classId: '',
    startDate: '',
    endDate: '',
    termId: '',
    sessionId: ''
  });
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [downloading, setDownloading] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    if (user?.id) {
      const init = async () => {
        setInitialLoading(true);
        await Promise.all([
          fetchClasses(),
          fetchSessions(),
          fetchTerms()
        ]);
        setInitialLoading(false);
      };
      init();
    }
  }, [user?.id]);

  // Fetch Attendance when Class or Date changes
  useEffect(() => {
    if (selectedClassId && selectedDate) {
      if (new Date(selectedDate) > new Date()) {
        toast.error('You cannot mark attendance for future dates.');
        setSelectedDate(new Date().toISOString().split('T')[0]);
        return;
      }
      fetchAttendanceSheet();
    }
  }, [selectedClassId, selectedDate]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      const data = await response.json();
      let classesArr = Array.isArray(data) ? data : [];

      // Filter classes: Only show classes where user is the Form Master
      if (user?.role === 'teacher') {
        classesArr = classesArr.filter(c => c.classTeacherId == user.id);
      }

      setClasses(classesArr);

      if (user?.role === 'teacher') {
        if (classesArr.length === 1) {
          const classIdStr = classesArr[0].id.toString();
          setSelectedClassId(classIdStr);
          setDownloadFilters(prev => ({ ...prev, classId: classIdStr }));
        } else if (classesArr.length === 0) {
          setSelectedClassId('');
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setError('Failed to load classes. Please refresh the page.');
    }
  };

  const fetchAttendanceSheet = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/attendance/class/${selectedClassId}?date=${selectedDate}`);

      if (!response.ok) {
        let errorMsg = 'Failed to load attendance list';
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorData.error || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }


      const data = await response.json();
      const studentsData = Array.isArray(data?.students) ? data.students : [];

      setHolidayCheck({
        isHoliday: data?.isHoliday || false,
        info: data?.holidayInfo || null
      });

      // Students are 'pending' if not marked by teacher yet on this date
      const initializedStudents = studentsData.map(s => ({
        ...s,
        status: s.status || 'pending'
      }));

      setStudents(initializedStudents);
      calculateStats(initializedStudents);

      // Detect missing session/term and show warning
      if (!data?.session || !data?.term) {
        setNoActiveSession(true);
      } else {
        setNoActiveSession(false);
      }


      // Lock check: If the date is more than 48 hours ago, teachers cannot edit
      const dateDiff = (new Date() - new Date(selectedDate)) / (1000 * 60 * 60);
      if (user?.role === 'teacher' && dateDiff > 48 && !data?.isHoliday) {
        toast.info('Attendance is locked for this date (48h window)');
      }

      // Check if selected date is in the past (before today's local date)
      const selectedParts = selectedDate.split('-');
      const selected = new Date(selectedParts[0], selectedParts[1] - 1, selectedParts[2]);
      selected.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      setIsPastDate(selected < today);

    } catch (error) {
      console.error('Error fetching attendance:', error);
      setError(error.message);
      // Don't toast if it's the session error we handle in the banner
      if (!error.message.includes('academic session')) {
        toast.error(error.message || 'Failed to load attendance list');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (studentList) => {
    const newStats = { present: 0, absent: 0, late: 0, excused: 0, pending: 0 };
    studentList.forEach(s => {
      if (newStats[s.status] !== undefined) newStats[s.status]++;
    });
    setStats(newStats);
  };

  const handleStatusChange = (studentId, newStatus) => {
    setStudents(prev => {
      const updated = prev.map(s => s.studentId === studentId ? { ...s, status: newStatus } : s);
      calculateStats(updated);
      return updated;
    });
  };

  const handleNoteChange = (studentId, note) => {
    setStudents(prev => prev.map(s => s.studentId === studentId ? { ...s, notes: note } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        classId: selectedClassId,
        date: selectedDate,
        records: students.map(s => ({
          studentId: s.studentId,
          status: s.status,
          notes: s.notes
        }))
      };

      const response = await api.post('/api/attendance/mark', payload);
      if (response.ok) {
        toast.success(`✅ Attendance saved for ${students.length} students`);
        fetchAttendanceSheet(); // Refresh to ensure sync
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || errorData.message || 'Cloud synchronization failed');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Critical Error: Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status) => {
    setStudents(prev => {
      const updated = prev.map(s => ({ ...s, status: status }));
      calculateStats(updated);
      return updated;
    });
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get('/api/academic-sessions');
      const data = await response.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load academic sessions.');
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await api.get('/api/terms');
      const data = await response.json();
      setTerms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching terms:', error);
      setError('Failed to load academic terms.');
    }
  };

  const handleDownload = async (format = 'csv') => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (downloadFilters.classId) params.append('classId', downloadFilters.classId);
      if (downloadFilters.startDate) params.append('startDate', downloadFilters.startDate);
      if (downloadFilters.endDate) params.append('endDate', downloadFilters.endDate);
      if (downloadFilters.termId) params.append('termId', downloadFilters.termId);
      if (downloadFilters.sessionId) params.append('sessionId', downloadFilters.sessionId);

      const response = await api.get(`/api/attendance/download?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Download failed');
      }

      const csvData = await response.text();
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      const records = parsed.data;

      const fileName = `Attendance_Report_${new Date().toISOString().split('T')[0]}`;

      if (format === 'excel') {
        exportToExcel(records, fileName, 'Attendance');
        toast.success('Excel report generated');
      } else if (format === 'pdf') {
        const headers = ['Date', 'Student Name', 'Admission No', 'Class', 'Status', 'Notes'];
        const data = records.map(r => [
          r['Date'],
          r['Student Name'],
          r['Admission Number'],
          r['Class'],
          r['Status'],
          r['Notes']
        ]);
        exportToPDF({
          title: 'Attendance Report',
          headers,
          data,
          fileName,
          orientation: 'landscape'
        });
        toast.success('PDF report generated');
      } else {
        // Fallback to original CSV download
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('CSV report generated');
      }

      setShowDownloadDialog(false);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Report generation failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Attendance Roll Call</h1>
          <button
            onClick={() => setShowDownloadDialog(true)}
            className="w-full sm:w-auto bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-bold shadow-sm transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Records
          </button>
        </div>
        
        {students.length > 0 && !error && (
          <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 sm:gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex-1">
              <span className="text-[10px] sm:text-xs font-black text-emerald-600 uppercase">Present</span>
              <span className="text-sm sm:text-base font-black text-emerald-700">{holidayCheck.isHoliday ? 0 : stats.present}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-2 bg-rose-50 rounded-xl border border-rose-100 flex-1">
              <span className="text-[10px] sm:text-xs font-black text-rose-600 uppercase">Absent</span>
              <span className="text-sm sm:text-base font-black text-rose-700">{holidayCheck.isHoliday ? 0 : stats.absent}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100 flex-1">
              <span className="text-[10px] sm:text-xs font-black text-amber-600 uppercase">Late</span>
              <span className="text-sm sm:text-base font-black text-amber-700">{holidayCheck.isHoliday ? 0 : stats.late}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-2 bg-slate-100 rounded-xl border border-slate-200 flex-1">
              <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase">Unmarked</span>
              <span className="text-sm sm:text-base font-black text-slate-600">{holidayCheck.isHoliday ? 0 : stats.pending}</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 font-medium">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {noActiveSession && !error && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-bold text-amber-800">No Active Academic Session or Term</p>
              <p className="text-sm text-amber-700 mt-1">
                You can view the class list, but <strong>saving attendance is disabled</strong> until an active session and term are configured.
                Please contact the Administrator to go to <strong>Academic Setup → Sessions & Terms</strong> and set the current session/term.
              </p>
            </div>
          </div>
        </div>
      )}

      {initialLoading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500 font-medium">Verifying authorization...</p>
        </div>
      ) : user?.role === 'teacher' && classes.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center border border-gray-200">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Access Restricted</h3>
          <p className="text-gray-600 mt-2">You are not assigned as a Form Master for any class. Attendance management is reserved for Form Masters and Administrators.</p>
          <div className="mt-6">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="text-primary font-bold hover:underline"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="relative group">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Marking Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-gray-900"
                />
              </div>
              <div className="relative group">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                  {user?.role === 'teacher' && classes.length === 1 ? 'Assigned Class' : 'Target Class'}
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-gray-900 disabled:opacity-70"
                  disabled={user?.role === 'teacher' && classes.length === 1}
                >
                  <option value="">Select Class</option>
                  {(Array.isArray(classes) ? classes : []).map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.arm}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchAttendanceSheet}
                  disabled={!selectedClassId}
                  className="w-full bg-primary text-white px-6 py-3.5 rounded-xl hover:brightness-95 disabled:bg-gray-200 disabled:text-gray-400 font-black uppercase text-xs tracking-widest shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  Load Sheet
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Attendance Sheet */}
      {selectedClassId && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {holidayCheck.isHoliday && (
            <div className={`border-b-4 p-8 flex flex-col items-center justify-center text-center ${holidayCheck.info?.type === 'weekend' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <span className="text-5xl mb-3 drop-shadow-sm">{holidayCheck.info?.type === 'weekend' ? '🌴' : '🎉'}</span>
              <h3 className={`text-xl font-bold uppercase ${holidayCheck.info?.type === 'weekend' ? 'text-blue-900' : 'text-orange-900'}`}>
                {holidayCheck.info?.name} ({holidayCheck.info?.type})
              </h3>
              <p className={`text-sm mt-2 font-medium ${holidayCheck.info?.type === 'weekend' ? 'text-blue-700' : 'text-orange-800'}`}>
                {holidayCheck.info?.description || 'Daily attendance cannot be marked on this day.'}
              </p>
            </div>
          )}

          {loading && !holidayCheck.isHoliday ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading student list...</p>
            </div>
          ) : students.length === 0 && !holidayCheck.isHoliday ? (
            <div className="p-12 text-center text-gray-500">
              No students found in this class.
            </div>
          ) : !holidayCheck.isHoliday ? (
            <>
              {isPastDate && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 mx-4 mt-4 rounded-r-md">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p className="text-sm text-amber-700 font-medium">
                      Attendance records for past dates are <strong>read-only</strong>. You can view or download the records, but you cannot make changes.
                    </p>
                  </div>
                </div>
              )}
              {/* Desktop Header Description */}
              <div className="hidden md:flex p-4 bg-primary/5 border-b border-primary/10 justify-between items-center">
                <span className="font-semibold text-primary">Class Roll Call</span>
                {!isPastDate && (
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => markAll('present')} className="px-3 py-1 bg-white border border-primary/20 text-primary rounded hover:bg-primary/10">Mark All Present</button>
                    <button onClick={() => markAll('absent')} className="px-3 py-1 bg-white border border-red-200 text-red-700 rounded hover:bg-red-50">Mark All Absent</button>
                  </div>
                )}
              </div>
              <div className="overflow-x-visible md:overflow-x-auto no-scrollbar">
                <div className="md:hidden p-4 space-y-4 bg-gray-50 border-b">
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-2xl shadow-sm border border-gray-100">
                      <div className="hidden sm:block pl-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bulk</span>
                      </div>
                      {!isPastDate && (
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => markAll('present')} className="flex-1 sm:flex-none px-3 py-2 bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-black rounded-xl border border-emerald-100 uppercase tracking-tighter shadow-sm transition-all active:scale-95">Mark All Present</button>
                          <button onClick={() => markAll('absent')} className="flex-1 sm:flex-none px-3 py-2 bg-rose-50 text-rose-700 text-[10px] sm:text-xs font-black rounded-xl border border-rose-100 uppercase tracking-tighter shadow-sm transition-all active:scale-95">Mark All Absent</button>
                        </div>
                      )}
                    </div>
                </div>

                <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10 border-r">Student</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student, idx) => (
                      <tr key={student.studentId} className={student.status === 'absent' ? 'bg-red-50' : student.status === 'pending' ? 'bg-slate-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                        <td className="px-6 py-4 whitespace-nowrap sticky left-0 z-10 border-r" style={{ backgroundColor: student.status === 'absent' ? '#fef2f2' : student.status === 'pending' ? '#f8fafc' : idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm shrink-0">
                              {student.photoUrl ? (
                                <img src={student.photoUrl.startsWith('data:') || student.photoUrl.startsWith('http') ? student.photoUrl : `${API_BASE_URL}${student.photoUrl}`} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-black text-gray-900">{student.name}</div>
                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{student.admissionNumber}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex justify-center items-center bg-gray-100 p-1 rounded-xl w-fit mx-auto lg:w-full max-w-[280px]">
                            {[
                              { id: 'present', label: 'Present', short: 'P', color: 'peer-checked:bg-emerald-600 peer-checked:text-white text-emerald-700 bg-emerald-50' },
                              { id: 'absent', label: 'Absent', short: 'A', color: 'peer-checked:bg-rose-600 peer-checked:text-white text-rose-700 bg-rose-50' },
                              { id: 'late', label: 'Late', short: 'L', color: 'peer-checked:bg-amber-500 peer-checked:text-white text-amber-700 bg-amber-50' },
                              { id: 'excused', label: 'Excused', short: 'E', color: 'peer-checked:bg-indigo-600 peer-checked:text-white text-indigo-700 bg-indigo-50' }
                            ].map(s => (
                              <label key={s.id} className="relative flex-1 cursor-pointer group">
                                <input
                                  type="radio"
                                  name={`status-${student.studentId}`}
                                  value={s.id}
                                  checked={student.status === s.id}
                                  onChange={() => handleStatusChange(student.studentId, s.id)}
                                  className="sr-only peer"
                                  disabled={isPastDate}
                                />
                                <div className={`
                                  flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200
                                  ${s.color} hover:brightness-95 mx-0.5
                                  ${student.status === s.id ? 'shadow-md scale-105 z-10' : 'opacity-40 grayscale-[0.5]'}
                                  ${isPastDate ? 'cursor-not-allowed opacity-30 shadow-none scale-100' : ''}
                                `}>
                                  <span className="text-sm font-black md:hidden">{s.short}</span>
                                  <span className="text-[10px] font-bold uppercase hidden md:inline tracking-tighter">{s.label}</span>
                                </div>
                                {student.status === s.id && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-current flex items-center justify-center animate-bounce">
                                    <div className="w-1 h-1 bg-current rounded-full" />
                                  </div>
                                )}
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={student.notes || ''}
                            onChange={(e) => handleNoteChange(student.studentId, e.target.value)}
                            placeholder={student.status === 'excused' || student.status === 'late' ? "Reason required..." : "Optional note..."}
                            readOnly={isPastDate}
                            className={`w-full text-sm border-gray-200 rounded-lg focus:ring-primary focus:border-primary transition-all ${(student.status === 'excused' || student.status === 'late') && !student.notes ? 'border-orange-300 bg-orange-50' : ''
                              } ${isPastDate ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Card View */}
                <div className="md:hidden bg-gray-50 p-4 space-y-4">
                   {students.map((student, idx) => (
                     <div key={student.studentId} className={`bg-white rounded-2xl shadow-sm border p-4 space-y-4 ${student.status === 'absent' ? 'border-rose-200 bg-rose-50/20' : student.status === 'pending' ? 'border-slate-100 bg-slate-50/10' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                           <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden border shadow-sm shrink-0">
                              {student.photoUrl ? (
                                <img src={student.photoUrl.startsWith('data:') || student.photoUrl.startsWith('http') ? student.photoUrl : `${API_BASE_URL}${student.photoUrl}`} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                </div>
                              )}
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="text-base font-black text-gray-900 truncate">{student.name}</div>
                              <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">{student.admissionNumber}</div>
                           </div>
                           <div className={`shrink-0 h-6 px-3 flex items-center justify-center rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                               student.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                               student.status === 'absent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                               student.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                               student.status === 'pending' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                               'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                               {student.status === 'pending' ? 'unmarked' : student.status}
                           </div>
                        </div>

                        {/* Status Grid */}
                        <div className="grid grid-cols-4 gap-1.5">
                           {[
                              { id: 'present', label: 'Present', sub: 'On Time', icon: '✅', color: 'peer-checked:bg-emerald-600 peer-checked:text-white bg-emerald-50 text-emerald-700 border-emerald-100' },
                              { id: 'absent', label: 'Absent', sub: 'Missing', icon: '❌', color: 'peer-checked:bg-rose-600 peer-checked:text-white bg-rose-50 text-rose-700 border-rose-100' },
                              { id: 'late', label: 'Late', sub: 'Delayed', icon: '⏰', color: 'peer-checked:bg-amber-500 peer-checked:text-white bg-amber-50 text-amber-700 border-amber-100' },
                              { id: 'excused', label: 'Excused', sub: 'Permit', icon: '📝', color: 'peer-checked:bg-indigo-600 peer-checked:text-white bg-indigo-50 text-indigo-700 border-indigo-100' }
                           ].map(s => (
                              <label key={s.id} className="relative flex-1 cursor-pointer">
                                 <input
                                   type="radio"
                                   name={`mobile-status-${student.studentId}`}
                                   value={s.id}
                                   checked={student.status === s.id}
                                   onChange={() => handleStatusChange(student.studentId, s.id)}
                                   className="sr-only peer"
                                   disabled={isPastDate}
                                 />
                                 <div className={`
                                    flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-300
                                    ${s.color}
                                    ${student.status === s.id ? 'shadow-lg border-transparent' : 'opacity-40'}
                                    ${isPastDate ? 'cursor-not-allowed grayscale' : ''}
                                 `}>
                                    <span className="text-base mb-1">{s.icon}</span>
                                    <span className="text-[9px] font-black uppercase tracking-tighter">{s.label}</span>
                                 </div>
                              </label>
                           ))}
                        </div>

                        {/* Note Input */}
                        <div className="relative group">
                           <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                           </div>
                           <input
                             type="text"
                             value={student.notes || ''}
                             onChange={(e) => handleNoteChange(student.studentId, e.target.value)}
                             placeholder={(student.status === 'excused' || student.status === 'late') ? "Enter reason here..." : "Add a note..."}
                             readOnly={isPastDate}
                             className={`w-full pl-9 pr-4 py-3 text-sm bg-gray-50 border-gray-100 rounded-xl focus:ring-primary focus:border-primary transition-all outline-none font-bold placeholder:font-normal placeholder:text-gray-300
                               ${(student.status === 'excused' || student.status === 'late') && !student.notes ? 'border-orange-300 bg-orange-50/50' : ''}
                               ${isPastDate ? 'text-gray-500 opacity-60' : ''}
                             `}
                           />
                        </div>
                     </div>
                   ))}
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <div className="text-xs text-gray-500 italic">
                  {(students.some(s => (s.status === 'excused' || s.status === 'late') && !s.notes)) && !isPastDate && (
                    <span className="text-orange-600 font-bold flex items-center gap-1 animate-pulse">
                      ⚠️ Please provide reasons for lates/excuses before saving.
                    </span>
                  )}
                </div>
                {!isPastDate && (
                  <button
                    onClick={handleSave}
                    disabled={saving || noActiveSession || (user?.role === 'teacher' && holidayCheck.isHoliday) || (user?.role === 'teacher' && (new Date() - new Date(selectedDate)) / (1000 * 60 * 60) > 48)}
                    title={noActiveSession ? 'Cannot save: No active academic session/term. Contact admin.' : ''}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2 font-black uppercase text-xs tracking-widest transition-all"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving Attendance...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Daily Roll
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Download Dialog */}
      {showDownloadDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-8">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Download Attendance Records</h2>
              <button
                onClick={() => setShowDownloadDialog(false)}
                className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Select filters to download specific attendance records. Leave fields empty to download all records.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Class Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {user?.role === 'teacher' && classes.length === 1 ? 'Assigned Class' : 'Class (Optional)'}
                  </label>
                  <select
                    value={downloadFilters.classId}
                    onChange={(e) => setDownloadFilters({ ...downloadFilters, classId: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
                    disabled={user?.role === 'teacher' && classes.length === 1}
                  >
                    <option value="">All Classes</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.arm}</option>
                    ))}
                  </select>
                </div>

                {/* Session Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Academic Session (Optional)</label>
                  <select
                    value={downloadFilters.sessionId}
                    onChange={(e) => setDownloadFilters({ ...downloadFilters, sessionId: e.target.value })}
                    className="w-full border rounded-md px-3 py-2">
                    <option value="">All Sessions</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Term Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Term (Optional)</label>
                  <select
                    value={downloadFilters.termId}
                    onChange={(e) => setDownloadFilters({ ...downloadFilters, termId: e.target.value })}
                    className="w-full border rounded-md px-3 py-2">
                    <option value="">All Terms</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.academicSession?.name})</option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date (Optional)</label>
                  <input
                    type="date"
                    value={downloadFilters.startDate}
                    onChange={(e) => setDownloadFilters({ ...downloadFilters, startDate: e.target.value })}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date (Optional)</label>
                  <input
                    type="date"
                    value={downloadFilters.endDate}
                    onChange={(e) => setDownloadFilters({ ...downloadFilters, endDate: e.target.value })}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Tip:</p>
                    <p>Download will include all matching attendance records in CSV format. You can open the file in Excel or any spreadsheet application.</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDownloadDialog(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={() => handleDownload('csv')}
                  disabled={downloading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2">
                  CSV
                </button>
                <button
                  onClick={() => handleDownload('excel')}
                  disabled={downloading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                  {downloading ? '...' : 'Excel'}
                </button>
                <button
                  onClick={() => handleDownload('pdf')}
                  disabled={downloading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                  {downloading ? '...' : 'PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
};

export default Attendance;
