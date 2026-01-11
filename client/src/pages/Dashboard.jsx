import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, API_BASE_URL } from '../api';
import ParentDashboard from './parent/ParentDashboard';
import useSchoolSettings from '../hooks/useSchoolSettings';

const Dashboard = () => {
  const { user } = useAuth();
  const { settings: schoolSettings } = useSchoolSettings();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);

  useEffect(() => {
    if (user?.role === 'superadmin') {
      navigate('/dashboard/superadmin', { replace: true });
    } else if (user?.role === 'admin' && schoolSettings && !schoolSettings.isSetupComplete) {
      navigate('/dashboard/settings', { replace: true });
    } else if (user?.role === 'alumni') {
      navigate('/dashboard/alumni', { replace: true });
    }
  }, [user, navigate, schoolSettings]);
  const [recentResults, setRecentResults] = useState([]);
  const [stats, setStats] = useState({
    currentTermAverage: 0,
    totalSubjects: 0,
    attendanceRate: 0,
    overallPosition: 0
  });
  const [loading, setLoading] = useState(true);
  const [feeStats, setFeeStats] = useState(null);
  const [studentFeeRecord, setStudentFeeRecord] = useState(null);
  const [teacherStats, setTeacherStats] = useState(null);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [assignedClassCount, setAssignedClassCount] = useState(0);
  const [notices, setNotices] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  useEffect(() => {
    fetchNotices();
  }, [user]);

  useEffect(() => {
    if (user?.role === 'parent') {
      setLoading(false);
    } else if (user?.role === 'student' && user?.student?.id) {
      fetchDashboardData();
    } else if (user?.role === 'accountant') {
      fetchAccountantData();
    } else if (user?.role === 'teacher' || user?.role === 'admin') {
      fetchTeacherStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchNotices = async () => {
    try {
      const response = await api.get('/api/notices');
      if (response.ok) {
        setNotices(await response.json());
      }
    } catch (e) {
      console.error('Failed to fetch notices');
    }
  };

  const fetchTeacherStats = async () => {
    try {
      // Fetch students count
      const studentsRes = await api.get('/api/students');
      const students = await studentsRes.json();

      // Fetch classes count
      const classesRes = await api.get('/api/classes');
      const classes = await classesRes.json();

      setTeacherStats({
        totalStudents: students.length,
        activeClasses: classes.length
      });

      // Fetch current session and term
      const [sessionsRes, termsRes] = await Promise.all([
        api.get('/api/academic-sessions'),
        api.get('/api/terms')
      ]);

      if (sessionsRes.ok) {
        const sessions = await sessionsRes.json();
        setCurrentSession(sessions.find(s => s.isCurrent));
      }

      if (termsRes.ok) {
        const terms = await termsRes.json();
        setCurrentTerm(terms.find(t => t.isCurrent));
      }

      // Fetch Teacher Assignments if user is a teacher
      if (user?.role === 'teacher') {
        const assignmentsRes = await api.get(`/api/teacher-assignments/teacher/${user.id}`);
        if (assignmentsRes.ok) {
          const assignments = await assignmentsRes.json();
          setTeacherAssignments(assignments);
          const uniqueClasses = new Set(assignments.map(a => a.classId));
          setAssignedClassCount(uniqueClasses.size);
        }
      }

    } catch (error) {
      console.error('Error fetching teacher stats:', error);
      setTeacherStats({
        totalStudents: 0,
        activeClasses: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountantData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Get current term and session
      const [termsRes, sessionsRes] = await Promise.all([
        api.get('/api/terms'),
        api.get('/api/academic-sessions')
      ]);

      const terms = await termsRes.json();
      const sessions = await sessionsRes.json();

      const currentTerm = terms.find(t => t.isCurrent);
      const currentSession = sessions.find(s => s.isCurrent);

      setCurrentTerm(currentTerm);
      setCurrentSession(currentSession);

      if (currentTerm && currentSession) {
        const response = await api.get(
          `/api/fees/summary?termId=${currentTerm.id}&academicSessionId=${currentSession.id}`
        );
        const data = await response.json();
        setFeeStats(data);
      }
    } catch (error) {
      console.error('Error fetching accountant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch academic info
      const [sessionsRes, termsRes] = await Promise.all([
        api.get('/api/academic-sessions'),
        api.get('/api/terms')
      ]);

      let currentSessionData = null;
      let currentTermData = null;

      if (sessionsRes.ok) {
        const sessions = await sessionsRes.json();
        currentSessionData = sessions.find(s => s.isCurrent);
        setCurrentSession(currentSessionData);
      }

      if (termsRes.ok) {
        const terms = await termsRes.json();
        currentTermData = terms.find(t => t.isCurrent);
        setCurrentTerm(currentTermData);
      }

      // Fetch student details
      const studentResponse = await api.get(`/api/students/${user.student.id}`);
      const student = await studentResponse.json();
      setStudentData(student);

      // Fetch fee record for current term
      if (currentTermData && currentSessionData) {
        console.log('Fetching fee record for:', {
          studentId: user.student.id,
          termId: currentTermData.id,
          sessionId: currentSessionData.id
        });
        try {
          const feeResponse = await api.get(
            `/api/fees/student/${user.student.id}/summary?termId=${currentTermData.id}&academicSessionId=${currentSessionData.id}`
          );
          if (feeResponse.ok) {
            const feeData = await feeResponse.json();
            console.log('Fee data fetched:', feeData);
            setStudentFeeRecord(feeData);
          } else {
            console.error('Failed to fetch fee record:', await feeResponse.text());
          }
        } catch (error) {
          console.error('Error fetching fee record:', error);
        }
      } else {
        console.warn('Current term or session not found, skipping fee fetch');
      }
      // Fetch current term results
      const resultsResponse = await api.get(
        `/api/results?studentId=${user.student.id}`
      );
      const results = await resultsResponse.json();

      if (results && results.length > 0) {
        setRecentResults(results.slice(0, 5)); // Top 5 recent

        // Calculate stats
        const totalScore = results.reduce((sum, r) => sum + (r.totalScore || 0), 0);
        const average = results.length > 0 ? (totalScore / results.length).toFixed(2) : 0;

        setStats({
          currentTermAverage: average,
          totalSubjects: results.length,
          attendanceRate: 95, // Placeholder
          overallPosition: results[0]?.positionInClass || 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade) => {
    const colors = {
      'A': 'text-green-600 bg-green-100',
      'B': 'text-blue-600 bg-blue-100',
      'C': 'text-yellow-600 bg-yellow-100',
      'D': 'text-orange-600 bg-orange-100',
      'E': 'text-red-600 bg-red-100',
      'F': 'text-red-700 bg-red-200'
    };
    return colors[grade] || 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Parent Dashboard
  if (user?.role === 'parent') {
    return (
      <div className="space-y-6">
        {/* Notices for Parent */}
        {notices.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden border-left-4 border-orange-500 mb-6">
            <div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
              <h3 className="font-bold text-orange-800 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                School News
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {notices.map(notice => (
                <div key={notice.id} className="p-4 hover:bg-gray-50">
                  <h4 className="font-semibold text-gray-900">{notice.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{notice.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <ParentDashboard />
      </div>
    );
  }

  // Accountant Dashboard
  if (user?.role === 'accountant') {
    return (
      <div className="space-y-3 sm:space-y-6">
        <div className="bg-gradient-to-r from-primary to-primary/90 text-white p-4 sm:p-6 rounded-lg shadow-lg">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Welcome back, {user?.firstName}!</h1>
          <p className="text-white/90 text-sm sm:text-base mt-2">School Accountant Dashboard</p>
        </div>

        {/* Notices Section */}
        {notices.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-orange-500">
            <div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
              <h3 className="font-bold text-orange-800 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                School News
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {notices.map(notice => (
                <div key={notice.id} className="p-4 hover:bg-gray-50">
                  <h4 className="font-semibold text-gray-900">{notice.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{notice.content}</p>
                  <div className="mt-2 text-xs text-gray-400 flex justify-between">
                    <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                    <span>From: {notice.author?.firstName} {notice.author?.lastName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fee Statistics */}
        {feeStats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-green-600">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs sm:text-sm text-gray-600">Total Expected</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">₦{feeStats.totalExpected.toLocaleString()}</p>
                  </div>
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-blue-600">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs sm:text-sm text-gray-600">Total Collected</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">₦{feeStats.totalPaid.toLocaleString()}</p>
                  </div>
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-orange-600">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs sm:text-sm text-gray-600">Outstanding</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">₦{feeStats.totalBalance.toLocaleString()}</p>
                  </div>
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-purple-600">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs sm:text-sm text-gray-600">Cleared Students</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{feeStats.clearedStudents}/{feeStats.totalStudents}</p>
                  </div>
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Payment Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Fully Paid</span>
                    <span className="text-xs sm:text-sm font-bold text-green-600">{feeStats.fullyPaid} students</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Partially Paid</span>
                    <span className="text-xs sm:text-sm font-bold text-yellow-600">{feeStats.partiallyPaid} students</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Not Paid</span>
                    <span className="text-xs sm:text-sm font-bold text-red-600">{feeStats.notPaid} students</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Clearance Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Cleared for Exam</span>
                    <span className="text-xs sm:text-sm font-bold text-green-600">{feeStats.clearedStudents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Not Cleared</span>
                    <span className="text-xs sm:text-sm font-bold text-red-600">{feeStats.unclearedStudents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Collection Rate</span>
                    <span className="text-xs sm:text-sm font-bold text-blue-600">
                      {feeStats.totalExpected > 0
                        ? ((feeStats.totalPaid / feeStats.totalExpected) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary to-primary/90 text-white p-4 sm:p-6 rounded-lg shadow-md">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Quick Info</h3>
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <p className="text-white/90">📊 Total Students: <span className="font-bold text-white">{feeStats.totalStudents}</span></p>
                  <p className="text-white/90">💰 Avg. Payment: <span className="font-bold text-white">
                    ₦{feeStats.totalStudents > 0
                      ? (feeStats.totalPaid / feeStats.totalStudents).toLocaleString(undefined, { maximumFractionDigits: 0 })
                      : 0}
                  </span></p>
                </div>
              </div>
            </div>
          </>
        )}

        {!feeStats && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded">
            <p className="text-yellow-700">No fee data available for the current term. Please set up fee structures first.</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <Link to="/fees" className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border-l-4 border-primary">
            <div className="flex items-center gap-3 sm:gap-4">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Fee Management</h3>
                <p className="text-xs sm:text-sm text-gray-600">Manage student payments and clearances</p>
              </div>
            </div>
          </Link>

          <Link to="/fee-structure" className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border-l-4 border-blue-600">
            <div className="flex items-center gap-3 sm:gap-4">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Fee Structure</h3>
                <p className="text-xs sm:text-sm text-gray-600">Set and manage class fee structures</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  // Admin/Teacher Dashboard
  if (user?.role === 'admin' || user?.role === 'teacher') {
    const isProfileIncomplete = user?.role === 'teacher' && (!user?.teacher?.photoUrl || !user?.teacher?.specialization);

    return (
      <div className="space-y-3 sm:space-y-6">
        {/* Welcome Message Section - FIRST */}
        <div className="bg-gradient-to-r from-primary to-primary/90 text-white p-4 sm:p-6 lg:p-8 rounded-lg shadow-lg">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Welcome back, {user?.firstName} {user?.lastName}!</h1>
          <p className="text-white/90 text-sm sm:text-base lg:text-lg">{schoolSettings?.schoolName || user?.school?.name || "School Management"} System</p>
          <p className="text-white/80 text-xs sm:text-sm mt-1">Use the sidebar to navigate to different sections of the system.</p>
        </div>

        {/* Profile Completion Reminder */}
        {isProfileIncomplete && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Profile Incomplete!</strong> Please complete your profile by uploading a profile picture and adding your specialization.
                  <Link to="/profile" className="font-medium underline ml-2">Complete Profile →</Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notices Section */}
        {notices.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-orange-500 mb-6">
            <div className="p-4 bg-orange-50 border-b border-orange-100">
              <h3 className="font-bold text-orange-800 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                School News
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {notices.map(notice => (
                <div key={notice.id} className="p-4 hover:bg-gray-50">
                  <h4 className="font-semibold text-gray-900">{notice.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{notice.content}</p>
                  <div className="mt-2 text-xs text-gray-400 flex justify-between">
                    <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                    <span>From: {notice.author?.firstName} {notice.author?.lastName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teacher Assignments Section */}
        {user?.role === 'teacher' && (
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-t-4 border-primary">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">My Assigned Classes</h2>
              <span className="bg-primary/10 text-primary py-1 px-3 rounded-full text-xs sm:text-sm font-semibold">
                {assignedClassCount} Classes Assigned
              </span>
            </div>

            {teacherAssignments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {teacherAssignments.map((assignment) => (
                  <Link
                    key={assignment.id}
                    to={`/result-entry?classId=${assignment.classId}&subjectId=${assignment.subjectId}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-primary/50 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-primary">
                          {assignment.class.name} {assignment.class.arm}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {assignment.subject.name}
                        </p>
                      </div>
                      <div className="bg-primary/5 p-2 rounded-full group-hover:bg-primary/10">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 flex items-center">
                      <span>Click to view scoresheet</span>
                      <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </Link >
                ))}
              </div >
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">You haven't been assigned to any classes yet.</p>
                <p className="text-sm text-gray-400 mt-1">Contact the administrator to get assigned.</p>
              </div>
            )}
          </div >
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {/* Quick Stats */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total Students</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{teacherStats?.totalStudents || 0}</p>
              </div>
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Active Classes</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{teacherStats?.activeClasses || 0}</p>
              </div>
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm text-gray-600">Current Session</p>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">{currentSession?.name || '...'}</p>
              </div>
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Quick Actions for Admin - More visible */}
        {user?.role === 'admin' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/dashboard/timetable" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all border-l-8 border-indigo-600 flex items-center gap-4">
              <div className="bg-indigo-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Timetable Management</h3>
                <p className="text-sm text-gray-600">Generate, view, and manage class schedules</p>
              </div>
            </Link>
          </div>
        )}
      </div >
    );
  }

  // Student Dashboard
  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Welcome Header with Photo */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-3 sm:p-6 rounded-lg shadow-lg">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
          {studentData?.photoUrl ? (
            <img
              src={`${API_BASE_URL}${studentData.photoUrl}`}
              alt="Student"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white flex items-center justify-center text-primary font-bold text-2xl sm:text-3xl border-4 border-white shadow-lg">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          )}
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
              Welcome, {user?.firstName}!
            </h1>
            <div className="flex flex-col mt-2 space-y-1">
              <span className="text-white/90 text-sm sm:text-base lg:text-lg">
                {studentData?.classModel?.name} {studentData?.classModel?.arm || ''}
              </span>
              <span className="text-white font-medium bg-white/20 px-3 py-1 rounded-full text-xs sm:text-sm w-fit mx-auto sm:mx-0">
                Admission No: {studentData?.admissionNumber || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notices Section for Student */}
      {notices.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-orange-500">
          <div className="p-4 bg-orange-50 border-b border-orange-100">
            <h3 className="font-bold text-orange-800 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
              School News
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {notices.map(notice => (
              <div key={notice.id} className="p-4 hover:bg-gray-50">
                <h4 className="font-semibold text-gray-900">{notice.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{notice.content}</p>
                <div className="mt-2 text-xs text-gray-400 flex justify-between">
                  <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                  <span>From: {notice.author?.firstName} {notice.author?.lastName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
      }



      {/* Personal Information Card */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
          <div>
            <p className="text-gray-600">Full Name</p>
            <p className="font-semibold break-words">{user?.firstName} {user?.lastName}</p>
          </div>
          <div>
            <p className="text-gray-600">Date of Birth</p>
            <p className="font-semibold">
              {studentData?.dateOfBirth
                ? new Date(studentData.dateOfBirth).toLocaleDateString()
                : 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Gender</p>
            <p className="font-semibold">{studentData?.gender || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-gray-600">Blood Group</p>
            <p className="font-semibold">{studentData?.bloodGroup || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-gray-600">Genotype</p>
            <p className="font-semibold">{studentData?.genotype || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-gray-600">Nationality</p>
            <p className="font-semibold">{studentData?.nationality || 'Not provided'}</p>
          </div>
        </div>
      </div>

      {/* Fee Status */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-3 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Fee Status</h2>
        {studentFeeRecord ? (
          <div className="grid grid-cols-1 gap-3 sm:gap-6">
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-100">
              <p className="text-xs sm:text-sm text-blue-600 mb-1">Expected Amount</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-900">₦{studentFeeRecord.expectedAmount?.toLocaleString() || '0'}</p>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-100">
              <p className="text-xs sm:text-sm text-green-600 mb-1">Total Paid</p>
              <p className="text-xl sm:text-2xl font-bold text-green-900">₦{studentFeeRecord.paidAmount?.toLocaleString() || '0'}</p>
            </div>
            <div className={`p-3 sm:p-4 rounded-lg border ${studentFeeRecord.balance > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`text-xs sm:text-sm mb-1 ${studentFeeRecord.balance > 0 ? 'text-red-600' : 'text-gray-600'}`}>Outstanding Balance</p>
              <p className={`text-xl sm:text-2xl font-bold ${studentFeeRecord.balance > 0 ? 'text-red-900' : 'text-gray-900'}`}>
                ₦{studentFeeRecord.balance?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <p className="text-sm">No fee records found for the current term.</p>
          </div>
        )}
      </div>


      {/* Recent Results */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Recent Performance</h2>
        {recentResults.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full px-4 sm:px-0">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grade</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentResults.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {result.subject?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-primary">
                        {result.totalScore?.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline - block px - 3 py - 1 rounded - full text - sm font - semibold ${getGradeColor(result.grade)} `}>
                          {result.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {result.positionInClass ? `#${result.positionInClass} ` : '--'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {result.totalScore >= 40 ? (
                          <span className="text-green-600 font-semibold">✓ Pass</span>
                        ) : (
                          <span className="text-red-600 font-semibold">✗ Fail</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No results available yet.</p>
          </div>
        )}
      </div>



      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        <Link
          to="/dashboard/term-report"
          className="bg-primary text-white p-6 rounded-lg shadow-md hover:brightness-90 transition-colors"
        >
          <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="font-bold mb-1">Term Report</h3>
          <p className="text-sm text-white/90">View your current term report card</p>
        </Link>

        <Link
          to="/dashboard/cumulative-report"
          className="bg-blue-600 text-white p-6 rounded-lg shadow-md hover:bg-blue-700 transition-colors"
        >
          <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="font-bold mb-1">Cumulative Report</h3>
          <p className="text-sm text-blue-100">Check your full session performance</p>
        </Link>

        <Link
          to="/dashboard/progressive-report"
          className="bg-purple-600 text-white p-6 rounded-lg shadow-md hover:bg-purple-700 transition-colors"
        >
          <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="font-bold mb-1">Analytics</h3>
          <p className="text-sm text-purple-100">View performance trends and graphs</p>
        </Link>
      </div>
    </div >
  );
};

export default Dashboard;
