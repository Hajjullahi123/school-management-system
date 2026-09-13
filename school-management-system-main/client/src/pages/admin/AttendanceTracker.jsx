import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';

const AttendanceTracker = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/analytics/attendance-tracking');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance stats:', error);
      toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const handleNudge = async (teacherId, className) => {
    if (!teacherId) {
      toast.error('No teacher assigned to this class');
      return;
    }

    setNudging(className);
    try {
      const response = await api.post('/api/analytics/nudge-attendance', {
        teacherId,
        className
      });

      if (response.ok) {
        toast.success('Nudge sent successfully');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to send nudge');
      }
    } catch (error) {
      toast.error('Failed to send nudge');
    } finally {
      setNudging(null);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance Marking Tracker</h1>
        <button
          onClick={fetchStats}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh Stats"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((item) => (
          <div
            key={item.classId}
            className={`bg-white rounded-2xl p-6 shadow-sm border ${item.isMarked ? 'border-green-100' : 'border-red-100'}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{item.className}</h3>
                <p className="text-sm text-gray-500">{item.teacherName}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${item.isMarked ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {item.isMarked ? 'MARKED' : 'PENDING'}
              </span>
            </div>

            {!item.isMarked && (
              <button
                onClick={() => handleNudge(item.teacherId, item.className)}
                disabled={nudging === item.className}
                className="w-full mt-4 bg-primary text-white py-2 rounded-xl font-bold text-sm hover:brightness-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {nudging === item.className ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Send Reminder
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceTracker;
