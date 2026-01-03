import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

const ParentAttendanceView = () => {
  const { user } = useAuth();
  const [wards, setWards] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingAttendance, setFetchingAttendance] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [filters, setFilters] = useState({
    sessionId: '',
    termId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchWards();
    fetchSessions();
    fetchTerms();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchAttendance();
    }
  }, [selectedStudent, filters]);

  const fetchWards = async () => {
    try {
      const response = await api.get('/api/parents/my-wards');
      if (response.ok) {
        const data = await response.json();
        setWards(data);
        if (data.length > 0) {
          setSelectedStudent(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching wards:', error);
    } finally {
      setLoading(false);
    }
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
        setAttendanceRecords(data);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setFetchingAttendance(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'excused': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateStats = () => {
    const stats = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    attendanceRecords.forEach(record => {
      if (stats[record.status] !== undefined) {
        stats[record.status]++;
      }
      stats.total++;
    });

    const percentage = stats.total > 0 ? ((stats.present + stats.late) / stats.total * 100).toFixed(1) : 0;
    return { ...stats, percentage };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (wards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
          <h3 className="font-bold text-yellow-900 mb-2">No Children Linked</h3>
          <p className="text-yellow-700">
            You don't have any children linked to your account yet. Please contact the school admin.
          </p>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary to-primary/90 p-6 rounded-lg text-white shadow-lg">
        <h1 className="text-3xl font-bold">Attendance Records</h1>
        <p className="text-white/90 mt-2">View your child's attendance history</p>
      </div>

      {wards.length > 1 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Child</label>
          <select
            value={selectedStudent?.id || ''}
            onChange={(e) => {
              const student = wards.find(w => w.id === parseInt(e.target.value));
              setSelectedStudent(student);
            }}
            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary"
          >
            {wards.map(ward => (
              <option key={ward.id} value={ward.id}>
                {ward.user?.firstName} {ward.user?.lastName} - {ward.classModel?.name} {ward.classModel?.arm}
              </option>
            ))}
          </select>
        </div>
      )}

      {wards.length === 1 && selectedStudent && (
        <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-lg">
          <p className="font-semibold text-primary">
            Viewing attendance for: {selectedStudent.user?.firstName} {selectedStudent.user?.lastName}
          </p>
          <p className="text-sm text-primary/80">
            Class: {selectedStudent.classModel?.name} {selectedStudent.classModel?.arm}
          </p>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold text-gray-900 mb-4">Filter Records</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Session</label>
            <select
              value={filters.sessionId}
              onChange={(e) => setFilters({ ...filters, sessionId: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">All Sessions</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
            <select
              value={filters.termId}
              onChange={(e) => setFilters({ ...filters, termId: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">All Terms</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.academicSession?.name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
        </div>
      </div>

      {attendanceRecords.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-600 mb-1">Total Days</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow text-center">
            <p className="text-sm text-green-600 mb-1">Present</p>
            <p className="text-2xl font-bold text-green-700">{stats.present}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow text-center">
            <p className="text-sm text-red-600 mb-1">Absent</p>
            <p className="text-2xl font-bold text-red-700">{stats.absent}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow text-center">
            <p className="text-sm text-yellow-600 mb-1">Late</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.late}</p>
          </div>
          <div className="bg-primary/5 p-4 rounded-lg shadow text-center">
            <p className="text-sm text-primary mb-1">Attendance</p>
            <p className="text-2xl font-bold text-primary">{stats.percentage}%</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Attendance History</h3>
        </div>

        {fetchingAttendance ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading attendance records...</p>
          </div>
        ) : attendanceRecords.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No attendance records found for the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Term</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.academicSession?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.term?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(record.status)}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-700">
            <p className="font-medium">Attendance Information</p>
            <p className="mt-1">
              This shows your child's attendance records for the selected period. You can filter by session, term, or specific date range to view historical attendance data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentAttendanceView;
