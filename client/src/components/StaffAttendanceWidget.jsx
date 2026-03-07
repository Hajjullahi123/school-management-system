import React, { useState, useEffect } from 'react';
import { api } from '../api';

const StaffAttendanceWidget = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/staff-attendance/my-status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching attendance status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const response = await api.post('/api/staff-attendance/check-in', {});

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check in');
      }

      const data = await response.json();

      // Show success notification
      alert(`✅ Check-in successful!\nTime: ${new Date(data.checkInTime).toLocaleTimeString()}\n${data.isLate ? `⚠️ Late by ${data.lateMinutes} minutes` : '✅ On time'}`);

      // Refresh status
      await fetchStatus();
    } catch (error) {
      console.error('Check-in error:', error);
      alert(error.message || 'Failed to check in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      const response = await api.post('/api/staff-attendance/check-out', {});

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check out');
      }

      const data = await response.json();

      // Show success notification
      alert(`✅ Check-out successful!\nTime: ${new Date(data.checkOutTime).toLocaleTimeString()}\nHours worked: ${data.hoursWorked} hours`);

      // Refresh status
      await fetchStatus();
    } catch (error) {
      console.error('Check-out error:', error);
      alert(error.message || 'Failed to check out');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-600 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${status?.hasCheckedIn ? 'border-green-600' : 'border-blue-600'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">📍 Today's Attendance</h3>
        {status?.isLate && (
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold">
            Late by {status.lateMinutes} min
          </span>
        )}
      </div>

      {!status?.hasCheckedIn ? (
        <div>
          <p className="text-gray-600 mb-4 text-sm">
            {status?.staffClockInMode === 'scan_only'
              ? '⚠️ Your school requires attendance to be marked at the gate scanner.'
              : "You haven't checked in yet today"}
          </p>
          <button
            onClick={handleCheckIn}
            disabled={actionLoading || status?.staffClockInMode === 'scan_only'}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {actionLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Clock In/Commence lesson</span>
              </>
            )}
          </button>
          {status?.staffClockInMode === 'ip_locked' && (
            <p className="mt-2 text-xs text-blue-600 text-center flex items-center justify-center gap-1 font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              On-Premises Restriction Active
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs text-gray-600 font-medium">Check-in</p>
                <p className="text-sm font-bold text-gray-900">
                  {new Date(status.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${status.status === 'present' ? 'bg-green-100 text-green-800' :
              status.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
              {status.status === 'present' ? '✓ On Time' : status.status === 'late' ? '⚠ Late' : status.status}
            </span>
          </div>

          {status.hasCheckedOut ? (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Check-out</p>
                  <p className="text-sm font-bold text-gray-900">
                    {new Date(status.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Hours worked</p>
                <p className="text-sm font-bold text-blue-600">{status.hoursWorked}h</p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleCheckOut}
              disabled={actionLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Clock Out</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {status?.hasCheckedIn && !status?.hasCheckedOut && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Remember to clock out at the end of your day</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffAttendanceWidget;
