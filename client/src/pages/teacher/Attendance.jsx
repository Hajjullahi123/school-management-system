import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import { API_BASE_URL } from '../../config';

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

  // Stats
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0 });

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

      if (user?.role === 'teacher') {
        const teacherClasses = data.filter(c => Number(c.classTeacherId) === Number(user.id));
        setClasses(teacherClasses);

        if (teacherClasses.length === 1) {
          const classIdStr = teacherClasses[0].id.toString();
          setSelectedClassId(classIdStr);
          setDownloadFilters(prev => ({ ...prev, classId: classIdStr }));
        } else {
          // Reset if multiple or zero classes
          setSelectedClassId('');
        }
      } else {
        setClasses(data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchAttendanceSheet = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/attendance/class/${selectedClassId}?date=${selectedDate}`);
      const data = await response.json();

      // Initialize status to 'present' if it's 'pending' (for easier quick marking)
      const initializedStudents = data.students.map(s => ({
        ...s,
        status: s.status === 'pending' ? 'present' : s.status
      }));

      setStudents(initializedStudents);
      calculateStats(initializedStudents);

      // Lock check: If the date is more than 48 hours ago, teachers cannot edit
      const dateDiff = (new Date() - new Date(selectedDate)) / (1000 * 60 * 60);
      if (user?.role === 'teacher' && dateDiff > 48) {
        toast('Attendance is locked for this date (48h window)', { icon: '🔒', duration: 4000 });
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance list');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (studentList) => {
    const newStats = { present: 0, absent: 0, late: 0, excused: 0 };
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
        toast.error('Cloud synchronization failed');
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
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await api.get('/api/terms');
      const data = await response.json();
      setTerms(data);
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Build query string from filters
      const params = new URLSearchParams();

      if (downloadFilters.classId) params.append('classId', downloadFilters.classId);
      if (downloadFilters.startDate) params.append('startDate', downloadFilters.startDate);
      if (downloadFilters.endDate) params.append('endDate', downloadFilters.endDate);
      if (downloadFilters.termId) params.append('termId', downloadFilters.termId);
      if (downloadFilters.sessionId) params.append('sessionId', downloadFilters.sessionId);

      // Make download request
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin.replace('5173', '3000')}/api/attendance/download?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Convert response to blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_records_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Report downloaded successfully');
      setShowDownloadDialog(false);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('CSV Generation failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Daily Attendance</h1>
          <button
            onClick={() => setShowDownloadDialog(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Records
          </button>
        </div>
        {students.length > 0 && (
          <div className="text-sm font-medium flex gap-4 bg-white px-4 py-2 rounded-lg shadow-sm">
            <span className="text-green-600">Present: {stats.present}</span>
            <span className="text-red-600">Absent: {stats.absent}</span>
            <span className="text-yellow-600">Late: {stats.late}</span>
            <span className="text-blue-600">Excused: {stats.excused}</span>
          </div>
        )}
      </div>

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
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full border rounded-md px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {user?.role === 'teacher' && classes.length === 1 ? 'Assigned Class' : 'Class'}
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
                  disabled={user?.role === 'teacher' && classes.length === 1}
                >
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.arm}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchAttendanceSheet}
                  disabled={!selectedClassId}
                  className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400 w-full"
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
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading student list...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No students found in this class.
            </div>
          ) : (
            <>
              <div className="p-4 bg-primary/5 border-b border-primary/10 flex justify-between items-center">
                <span className="font-semibold text-primary">Class Roll Call</span>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => markAll('present')} className="px-3 py-1 bg-white border border-primary/20 text-primary rounded hover:bg-primary/10">Mark All Present</button>
                  <button onClick={() => markAll('absent')} className="px-3 py-1 bg-white border border-red-200 text-red-700 rounded hover:bg-red-50">Mark All Absent</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.studentId} className={student.status === 'absent' ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm shrink-0">
                              {student.photoUrl ? (
                                <img src={`${API_BASE_URL}${student.photoUrl}`} alt="" className="w-full h-full object-cover" />
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex justify-center gap-2">
                            {['present', 'absent', 'late', 'excused'].map(status => (
                              <label key={status} className={`
                                                        inline-flex flex-col items-center cursor-pointer p-2 rounded-lg transition-colors border
                                                        ${student.status === status
                                  ? (status === 'present' ? 'bg-green-100 border-green-300 ring-1 ring-green-500' :
                                    status === 'absent' ? 'bg-red-100 border-red-300 ring-1 ring-red-500' :
                                      status === 'late' ? 'bg-yellow-100 border-yellow-300 ring-1 ring-yellow-500' :
                                        'bg-blue-100 border-blue-300 ring-1 ring-blue-500')
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                                }
                                                    `}>
                                <input
                                  type="radio"
                                  name={`status-${student.studentId}`}
                                  value={status}
                                  checked={student.status === status}
                                  onChange={() => handleStatusChange(student.studentId, status)}
                                  className="sr-only"
                                />
                                <span className={`text-xs capitalize font-medium
                                                            ${student.status === status ? 'text-gray-900' : 'text-gray-500'}
                                                        `}>
                                  {status}
                                </span>
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
                            className={`w-full text-sm border-gray-200 rounded-lg focus:ring-primary focus:border-primary transition-all ${(student.status === 'excused' || student.status === 'late') && !student.notes ? 'border-orange-300 bg-orange-50' : ''
                              }`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <div className="text-xs text-gray-500 italic">
                  {(students.some(s => (s.status === 'excused' || s.status === 'late') && !s.notes)) && (
                    <span className="text-orange-600 font-bold flex items-center gap-1 animate-pulse">
                      ⚠️ Please provide reasons for lates/excuses before saving.
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || (user?.role === 'teacher' && (new Date() - new Date(selectedDate)) / (1000 * 60 * 60) > 48)}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:shadow-none flex items-center gap-2 font-black uppercase text-xs tracking-widest transition-all"
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
              </div>
            </>
          )}
        </div>
      )}

      {/* Download Dialog */}
      {showDownloadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
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
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                  {downloading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
