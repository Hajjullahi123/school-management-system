import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api, API_BASE_URL } from '../../api';
import { useAuth } from '../../context/AuthContext';

const ParentAttendanceView = () => {
  const { user } = useAuth();
  const [wards, setWards] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [classAttendanceDates, setClassAttendanceDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingAttendance, setFetchingAttendance] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [todayStatus, setTodayStatus] = useState(null);
  const [schoolSettings, setSchoolSettings] = useState(null);

  const getTodayString = () => {
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
  };

  const [filters, setFilters] = useState({
    sessionId: '',
    termId: '',
    startDate: getTodayString(),
    endDate: getTodayString()
  });

  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchWards(),
        fetchSessions(),
        fetchTerms(),
        fetchHolidays(),
        fetchSchoolSettings(),
        checkTodayStatus()
      ]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchAttendance();
    }
  }, [selectedStudent, filters]);

  const checkTodayStatus = async () => {
    try {
      const response = await api.get(`/api/holidays/check?date=${getTodayString()}`);
      if (response.ok) {
        setTodayStatus(await response.json());
      }
    } catch (error) { console.error(error); }
  };

  const fetchSchoolSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      if (response.ok) {
        setSchoolSettings(await response.json());
      }
    } catch (e) { console.error(e); }
  };

  const fetchHolidays = async () => {
    try {
      const response = await api.get('/api/holidays');
      if (response.ok) {
        setHolidays(await response.json());
      }
    } catch (e) { console.error(e); }
  };

  const fetchWards = async () => {
    try {
      const response = await api.get('/api/parents/my-wards');
      if (response.ok) {
        const data = await response.json();
        setWards(data);

        const params = new URLSearchParams(location.search);
        const studentIdParam = params.get('studentId');

        if (studentIdParam && data.length > 0) {
          const student = data.find(w => w.id === parseInt(studentIdParam));
          setSelectedStudent(student || data[0]);
        } else if (data.length > 0) {
          setSelectedStudent(data[0]);
        }
      }
    } catch (error) { console.error(error); }
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get('/api/academic-sessions');
      if (response.ok) setSessions(await response.json());
    } catch (error) { console.error(error); }
  };

  const fetchTerms = async () => {
    try {
      const response = await api.get('/api/terms');
      if (response.ok) setTerms(await response.json());
    } catch (error) { console.error(error); }
  };

  const fetchAttendance = async () => {
    if (!selectedStudent) return;
    setFetchingAttendance(true);
    try {
      const params = new URLSearchParams();
      params.append('studentId', selectedStudent.id);
      if (filters.sessionId) params.append('sessionId', filters.sessionId);
      if (filters.termId) params.append('termId', filters.termId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/api/parents/student-attendance?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // Handle new response format { records, classAttendanceDates }
        if (data.records) {
          setAttendanceRecords(data.records);
          setClassAttendanceDates(data.classAttendanceDates || []);
        } else {
          // Fallback for old format (plain array)
          setAttendanceRecords(Array.isArray(data) ? data : []);
          setClassAttendanceDates([]);
        }
      }
    } catch (error) { console.error(error); }
    finally { setFetchingAttendance(false); }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'excused': return 'bg-blue-100 text-blue-800';
      case 'unmarked': return 'bg-gray-200 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateStats = () => {
    const stats = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0, total: 0 };
    const holidayDates = new Set(holidays.map(h => {
      const d = new Date(h.date);
      d.setHours(0,0,0,0);
      return d.getTime();
    }));

    const weekendDays = (schoolSettings?.weekendDays ?? '0,6').split(',').map(d => parseInt(d.trim()));

    // Build a set of dates the student actually has records for
    const studentRecordDates = new Set();
    attendanceRecords.forEach(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0,0,0,0);
      const isWeekend = weekendDays.includes(recordDate.getDay());
      const isHoliday = holidayDates.has(recordDate.getTime());

      if (!isHoliday && !isWeekend) {
        studentRecordDates.add(recordDate.getTime());
        if (record.status === 'present') stats.present++;
        else if (record.status === 'absent') stats.absent++;
        else if (record.status === 'late') { stats.present++; stats.late++; }
        else if (record.status === 'excused') stats.excused++;
      }
    });

    // Count unmarked days: class had attendance taken but this student has no record
    classAttendanceDates.forEach(dateStr => {
      const d = new Date(dateStr);
      d.setHours(0,0,0,0);
      const isWeekend = weekendDays.includes(d.getDay());
      const isHoliday = holidayDates.has(d.getTime());
      if (!isHoliday && !isWeekend && !studentRecordDates.has(d.getTime())) {
        stats.unmarked++;
      }
    });

    // Total = recorded days + unmarked days
    stats.total = studentRecordDates.size + stats.unmarked;

    const percentage = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0;
    return { ...stats, percentage };
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold italic animate-pulse">Initializing Dashboard...</div>;
  if (wards.length === 0) return <div className="p-8 text-center text-red-500 font-bold">No students linked to your account.</div>;

  const stats = calculateStats();
  const isTodayFiltered = filters.startDate === getTodayString() && filters.endDate === getTodayString();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary to-primary/90 p-6 rounded-lg text-white shadow-lg">
        <h1 className="text-3xl font-bold">Attendance History</h1>
        <p className="text-white/90 mt-2">Personalized tracker for your child's records.</p>
      </div>

      {wards.length > 1 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <label className="block text-sm font-bold text-gray-700 mb-2">Select Child</label>
          <select
            value={selectedStudent?.id || ''}
            onChange={(e) => setSelectedStudent(wards.find(w => w.id === parseInt(e.target.value)))}
            className="w-full border border-gray-300 rounded-md px-4 py-2"
          >
            {wards.map(ward => (
              <option key={ward.id} value={ward.id}>
                {ward.user?.firstName} {ward.user?.lastName} ({ward.classModel?.name})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Date & Academic Period Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-2">Academic Session</label>
            <select value={filters.sessionId} onChange={(e) => setFilters({ ...filters, sessionId: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="">All Sessions</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-2">Term</label>
            <select value={filters.termId} onChange={(e) => setFilters({ ...filters, termId: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="">All Terms</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-2">Start Date</label>
            <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-2">End Date</label>
            <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 text-center">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Total Days</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
         </div>
         <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
            <p className="text-[10px] font-black uppercase text-green-600 mb-1">Present</p>
            <p className="text-2xl font-bold text-green-700">{stats.present}</p>
         </div>
         <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
            <p className="text-[10px] font-black uppercase text-red-600 mb-1">Absent</p>
            <p className="text-2xl font-bold text-red-700">{stats.absent}</p>
         </div>
         <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-center">
            <p className="text-[10px] font-black uppercase text-yellow-600 mb-1">Late</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.late}</p>
         </div>
         <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 text-center">
            <p className="text-[10px] font-black uppercase text-gray-500 mb-1">Unmarked</p>
            <p className="text-2xl font-bold text-gray-600">{stats.unmarked}</p>
         </div>
         <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 text-center">
            <p className="text-[10px] font-black uppercase text-primary mb-1">Attendance</p>
            <p className="text-2xl font-bold text-primary">{stats.percentage}%</p>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-900">Attendance Log</h3>
        </div>

        {fetchingAttendance ? (
          <div className="p-12 text-center text-primary font-bold animate-pulse">Syncing records...</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {isTodayFiltered && todayStatus?.isHoliday && (
              <div className="p-8 text-center">
                <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl p-8 max-w-lg mx-auto">
                    <div className="text-5xl mb-4">🏠</div>
                    <h3 className="text-xl font-black text-blue-900 mb-2 uppercase tracking-tight">Today is a {todayStatus.type === 'weekend' ? 'Weekend' : 'Holiday'}</h3>
                    <p className="text-blue-700 font-medium">No school activities are scheduled for today. {todayStatus.name ? `(${todayStatus.name})` : ''}</p>
                </div>
              </div>
            )}
            
            {attendanceRecords.length === 0 ? (
              !isTodayFiltered || !todayStatus?.isHoliday ? (
                <div className="p-12 text-center text-gray-400 italic">No attendance records found for this period.</div>
              ) : null
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {(() => {
                      const weekendDays = (schoolSettings?.weekendDays ?? '0,6').split(',').map(d => parseInt(d.trim()));
                      const holidayDates = new Set(holidays.map(h => {
                        const d = new Date(h.date);
                        d.setHours(0,0,0,0);
                        return d.getTime();
                      }));

                      // Filter actual records (exclude weekends/holidays)
                      const filteredRecords = attendanceRecords.filter(r => {
                        const rd = new Date(r.date);
                        rd.setHours(0,0,0,0);
                        return !holidayDates.has(rd.getTime()) && !weekendDays.includes(rd.getDay());
                      }).map(r => ({ ...r, _type: 'recorded' }));

                      // Synthesize unmarked day records
                      const studentDates = new Set(filteredRecords.map(r => {
                        const d = new Date(r.date);
                        d.setHours(0,0,0,0);
                        return d.getTime();
                      }));

                      const unmarkedRecords = classAttendanceDates
                        .filter(dateStr => {
                          const d = new Date(dateStr);
                          d.setHours(0,0,0,0);
                          return !holidayDates.has(d.getTime()) && !weekendDays.includes(d.getDay()) && !studentDates.has(d.getTime());
                        })
                        .map(dateStr => ({
                          id: `unmarked-${dateStr}`,
                          date: dateStr,
                          status: 'unmarked',
                          notes: 'Not marked by teacher',
                          _type: 'unmarked'
                        }));

                      // Merge and sort by date descending
                      const allRecords = [...filteredRecords, ...unmarkedRecords]
                        .sort((a, b) => new Date(b.date) - new Date(a.date));

                      return allRecords.map((record) => (
                        <tr key={record.id} className={`hover:bg-gray-50 transition-colors ${record._type === 'unmarked' ? 'bg-gray-50/50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">
                              {new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${getStatusColor(record.status)}`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 italic">
                            {record.notes || '-'}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-bold text-blue-800">Attendance Policy</h3>
            <p className="text-xs text-blue-700 mt-1">Attendance is calculated based on working school days. Weekends and official holidays are automatically excluded from the totals to ensure accuracy.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentAttendanceView;
