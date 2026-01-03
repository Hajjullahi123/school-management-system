import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

const QuranProgress = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRecords: 0,
    thisWeek: 0,
    thisMonth: 0,
    averageStatus: 'N/A'
  });

  useEffect(() => {
    if (user?.student?.id) {
      fetchRecords();
      fetchTargets();
    }
  }, [user]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/quran-tracker/records/${user.student.id}`);
      const data = await response.json();
      setRecords(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTargets = async () => {
    if (!user?.student?.classId) return;
    try {
      const response = await api.get(`/api/quran-tracker/targets/${user.student.classId}`);
      const data = await response.json();
      setTargets(data);
    } catch (error) {
      console.error('Error fetching targets:', error);
    }
  };

  const calculateStats = (records) => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const thisWeek = records.filter(r => new Date(r.date) >= weekAgo).length;
    const thisMonth = records.filter(r => new Date(r.date) >= monthAgo).length;

    const statusValues = { 'Excellent': 4, 'Good': 3, 'Fair': 2, 'Poor': 1 };
    const avgValue = records.length > 0
      ? records.reduce((sum, r) => sum + (statusValues[r.status] || 0), 0) / records.length
      : 0;

    const avgStatus = avgValue >= 3.5 ? 'Excellent' : avgValue >= 2.5 ? 'Good' : avgValue >= 1.5 ? 'Fair' : 'Poor';

    setStats({
      totalRecords: records.length,
      thisWeek,
      thisMonth,
      averageStatus: records.length > 0 ? avgStatus : 'N/A'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'Good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Excellent': return '🌟';
      case 'Good': return '✅';
      case 'Fair': return '⚠️';
      case 'Poor': return '❌';
      default: return '📝';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg p-6 shadow-lg">
        <h1 className="text-2xl font-bold mb-2">My Qur'an Progress</h1>
        <p className="text-green-100">Track your memorization journey</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRecords}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Average Performance</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageStatus}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Active Targets */}
      {targets.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold text-gray-900">Class Targets</h2>
            <p className="text-sm text-gray-600">Current memorization goals for your class</p>
          </div>
          <div className="p-6 space-y-4">
            {targets.map(target => (
              <div key={target.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${target.targetType === 'memorization' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                      {target.targetType}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {target.period}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(target.startDate).toLocaleDateString()} - {new Date(target.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {target.surahStart && (
                    <div>
                      <span className="text-gray-500">Surah:</span>
                      <p className="font-medium">{target.surahStart} {target.surahEnd && `- ${target.surahEnd}`}</p>
                    </div>
                  )}
                  {target.juzStart && (
                    <div>
                      <span className="text-gray-500">Juz:</span>
                      <p className="font-medium">{target.juzStart} {target.juzEnd && `- ${target.juzEnd}`}</p>
                    </div>
                  )}
                  {target.ayahStart && (
                    <div>
                      <span className="text-gray-500">Ayah:</span>
                      <p className="font-medium">{target.ayahStart} {target.ayahEnd && `- ${target.ayahEnd}`}</p>
                    </div>
                  )}
                  {target.pagesCount && (
                    <div>
                      <span className="text-gray-500">Pages:</span>
                      <p className="font-medium">{target.pagesCount}</p>
                    </div>
                  )}
                </div>
                {target.description && (
                  <p className="mt-3 text-sm text-gray-600 italic">{target.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">My Progress History</h2>
          <p className="text-sm text-gray-600">Detailed record of your memorization sessions</p>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="mt-2 text-gray-500">No progress recorded yet</p>
              <p className="text-sm text-gray-400 mt-1">Your teacher will add your first session soon</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map(record => (
                <div key={record.id} className={`border rounded-lg p-4 ${getStatusColor(record.status)}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getStatusIcon(record.status)}</span>
                      <div>
                        <p className="font-medium">{new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</p>
                        <p className="text-xs opacity-75">
                          {record.type === 'memorization' ? 'New Memorization' : 'Revision'}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-bold">
                      {record.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3">
                    {record.surah && (
                      <div>
                        <span className="opacity-75">Surah:</span>
                        <p className="font-medium">{record.surah}</p>
                      </div>
                    )}
                    {record.juz && (
                      <div>
                        <span className="opacity-75">Juz:</span>
                        <p className="font-medium">{record.juz}</p>
                      </div>
                    )}
                    {record.ayahStart && (
                      <div>
                        <span className="opacity-75">Ayah:</span>
                        <p className="font-medium">{record.ayahStart} {record.ayahEnd && `- ${record.ayahEnd}`}</p>
                      </div>
                    )}
                    {record.pages && (
                      <div>
                        <span className="opacity-75">Pages:</span>
                        <p className="font-medium">{record.pages}</p>
                      </div>
                    )}
                  </div>

                  {record.comments && (
                    <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                      <p className="text-sm">
                        <span className="font-medium">Teacher's Note:</span> {record.comments}
                      </p>
                    </div>
                  )}

                  <div className="mt-2 text-xs opacity-60">
                    Recorded by: {record.teacher.firstName} {record.teacher.lastName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuranProgress;
