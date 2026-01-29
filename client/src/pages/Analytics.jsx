import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import useSchoolSettings from '../hooks/useSchoolSettings';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Analytics = () => {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { settings: schoolSettings } = useSchoolSettings();

  useEffect(() => {
    if (user?.role === 'student' && user?.student?.id) {
      setStudentId(user.student.id);
      fetchAnalytics(user.student.id);
    }
  }, [user]);

  const fetchAnalytics = async (id) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/results?studentId=${id}`);

      if (response.ok) {
        const results = await response.json();
        processAnalytics(results);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (results) => {
    if (!results || results.length === 0) {
      setAnalyticsData(null);
      return;
    }

    // Group by subject
    const subjectPerformance = {};
    results.forEach(result => {
      const subjectName = result.subject?.name || 'Unknown';
      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = {
          scores: [],
          grades: [],
          average: 0
        };
      }
      subjectPerformance[subjectName].scores.push(result.totalScore);
      subjectPerformance[subjectName].grades.push(result.grade);
    });

    // Calculate averages
    Object.keys(subjectPerformance).forEach(subject => {
      const scores = subjectPerformance[subject].scores;
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      subjectPerformance[subject].average = avg;
    });

    // Overall stats
    const allScores = results.map(r => r.totalScore || 0);
    const overallAverage = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const highest = Math.max(...allScores);
    const lowest = Math.min(...allScores);

    // Grade distribution
    const gradeCount = {};
    results.forEach(r => {
      gradeCount[r.grade] = (gradeCount[r.grade] || 0) + 1;
    });

    setAnalyticsData({
      subjectPerformance,
      overallAverage: overallAverage.toFixed(2),
      highest: highest.toFixed(2),
      lowest: lowest.toFixed(2),
      totalSubjects: Object.keys(subjectPerformance).length,
      gradeDistribution: gradeCount,
      results
    });
  };

  const getGradeColor = (grade) => {
    const colors = {
      'A': 'bg-green-500',
      'B': 'bg-blue-500',
      'C': 'bg-yellow-500',
      'D': 'bg-orange-500',
      'E': 'bg-red-400',
      'F': 'bg-red-600'
    };
    return colors[grade] || 'bg-gray-500';
  };

  const getPerformanceColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{schoolSettings?.schoolName || 'School'} Analytics</h1>

        {user?.role !== 'student' && (
          <div className="flex gap-2">
            <input
              type="number"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Student ID"
              className="border rounded-md px-3 py-2 w-32"
            />
            <button
              onClick={() => fetchAnalytics(studentId)}
              className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90"
            >
              Load Analytics
            </button>
          </div>
        )}
      </div>

      {analyticsData ? (
        <>
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-primary to-primary/90 text-white p-6 rounded-lg shadow-lg">
              <p className="text-sm opacity-90">Overall Average</p>
              <p className="text-4xl font-bold mt-2">{analyticsData.overallAverage}%</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
              <p className="text-sm opacity-90">Highest Score</p>
              <p className="text-4xl font-bold mt-2">{analyticsData.highest}%</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-lg shadow-lg">
              <p className="text-sm opacity-90">Lowest Score</p>
              <p className="text-4xl font-bold mt-2">{analyticsData.lowest}%</p>
            </div>
            <div className="bg-gradient-to-br from-secondary to-secondary/90 text-white p-6 rounded-lg shadow-lg">
              <p className="text-sm opacity-90">Total Subjects</p>
              <p className="text-4xl font-bold mt-2">{analyticsData.totalSubjects}</p>
            </div>
          </div>

          {/* Subject Performance Chart */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-6">Subject Performance Comparison</h3>
            <div className="h-80">
              <Bar
                data={{
                  labels: Object.keys(analyticsData.subjectPerformance),
                  datasets: [
                    {
                      label: 'Average Score',
                      data: Object.values(analyticsData.subjectPerformance).map(d => d.average),
                      backgroundColor: 'rgba(59, 130, 246, 0.6)',
                      borderColor: 'rgba(59, 130, 246, 1)',
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Grade Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-6">Grade Distribution</h3>
            <div className="flex justify-center h-64">
              <Doughnut
                data={{
                  labels: ['A', 'B', 'C', 'D', 'E', 'F'],
                  datasets: [
                    {
                      data: ['A', 'B', 'C', 'D', 'E', 'F'].map(grade => analyticsData.gradeDistribution[grade] || 0),
                      backgroundColor: [
                        'rgba(34, 197, 94, 0.6)',  // Green - A
                        'rgba(59, 130, 246, 0.6)',  // Blue - B
                        'rgba(234, 179, 8, 0.6)',   // Yellow - C
                        'rgba(249, 115, 22, 0.6)',  // Orange - D
                        'rgba(248, 113, 113, 0.6)', // Red-400 - E
                        'rgba(220, 38, 38, 0.6)',   // Red-600 - F
                      ],
                      borderColor: [
                        'rgba(34, 197, 94, 1)',
                        'rgba(59, 130, 246, 1)',
                        'rgba(234, 179, 8, 1)',
                        'rgba(249, 115, 22, 1)',
                        'rgba(248, 113, 113, 1)',
                        'rgba(220, 38, 38, 1)',
                      ],
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </div>

          {/* Performance Trend */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-6">Recent Performance Trend</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grade</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analyticsData.results.slice(0, 10).map((result, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {result.subject?.name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-lg font-bold ${getPerformanceColor(result.totalScore)}`}>
                          {result.totalScore?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getGradeColor(result.grade)} text-white`}>
                          {result.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {result.totalScore >= 40 ? (
                          <span className="text-green-600 font-semibold">✓ Pass</span>
                        ) : (
                          <span className="text-red-600 font-semibold">✗ Fail</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {result.totalScore >= 70 ? (
                          <span className="text-green-600">↑ Excellent</span>
                        ) : result.totalScore >= 60 ? (
                          <span className="text-blue-600">→ Good</span>
                        ) : result.totalScore >= 40 ? (
                          <span className="text-yellow-600">→ Fair</span>
                        ) : (
                          <span className="text-red-600">↓ Needs Improvement</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-6 shadow-inner">
            <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
              <span className="p-1.5 bg-primary/20 rounded-lg">📊</span> Performance Insights
            </h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700">
                • <strong>Strongest Subject:</strong> {Object.entries(analyticsData.subjectPerformance)
                  .sort((a, b) => b[1].average - a[1].average)[0]?.[0]}
                ({Object.entries(analyticsData.subjectPerformance)
                  .sort((a, b) => b[1].average - a[1].average)[0]?.[1].average.toFixed(1)}%)
              </p>
              <p className="text-gray-700">
                • <strong>Needs Attention:</strong> {Object.entries(analyticsData.subjectPerformance)
                  .sort((a, b) => a[1].average - b[1].average)[0]?.[0]}
                ({Object.entries(analyticsData.subjectPerformance)
                  .sort((a, b) => a[1].average - b[1].average)[0]?.[1].average.toFixed(1)}%)
              </p>
              <p className="text-gray-700">
                • <strong>Passing Rate:</strong> {
                  ((analyticsData.results.filter(r => r.totalScore >= 40).length /
                    analyticsData.results.length) * 100).toFixed(1)
                }%
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500 text-lg">
            {user?.role === 'student'
              ? 'No results available yet for analytics'
              : 'Enter a student ID and click "Load Analytics" to view performance data'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Analytics;
