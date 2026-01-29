import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { Line, Bar, Radar, Pie } from 'react-chartjs-2';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import * as AnalyticsExports from '../../utils/analyticsExports';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import Skeleton from '../../components/common/Skeleton';
import InterventionModal from '../../components/analytics/InterventionModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdvancedAnalytics = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const { settings: schoolSettings } = useSchoolSettings();

  // Data states
  const [subjectComparison, setSubjectComparison] = useState([]);
  const [classComparison, setClassComparison] = useState([]);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentAnalytics, setStudentAnalytics] = useState(null);
  const [subjectAnalytics, setSubjectAnalytics] = useState(null);
  const [studentPrediction, setStudentPrediction] = useState(null);
  const [subjects, setSubjects] = useState([]);

  // Term Selection States
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('current');

  const [heatmapData, setHeatmapData] = useState(null);

  // Intervention State
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [selectedStudentForIntervention, setSelectedStudentForIntervention] = useState(null);

  // Student Selection States
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [showStudentList, setShowStudentList] = useState(false);

  useEffect(() => {
    fetchTerms();
    fetchSubjects();
    if (user?.role === 'teacher') {
      fetchTeacherClass();
    } else {
      fetchOverviewData();
      fetchStudents();
      fetchClasses();
    }
  }, [user]);

  // Re-fetch data when term changes
  useEffect(() => {
    if (selectedTerm && user) {
      if (user?.role === 'teacher') {
        fetchTeacherClass();
      } else if (activeTab === 'heatmap') {
        fetchHeatmapData();
      } else {
        fetchOverviewData();
      }
    }
  }, [selectedTerm]);

  useEffect(() => {
    if (activeTab === 'heatmap' && selectedTerm) {
      fetchHeatmapData();
    }
  }, [activeTab]);

  useEffect(() => {
    // Filter students based on class and search query
    let filtered = students;

    if (selectedClass) {
      filtered = filtered.filter(s => s.classModel?.id === parseInt(selectedClass));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        (s.user?.firstName?.toLowerCase() || '').includes(query) ||
        (s.user?.lastName?.toLowerCase() || '').includes(query) ||
        (s.admissionNumber?.toLowerCase() || '').includes(query)
      );
    }

    setFilteredStudents(filtered);
  }, [selectedClass, searchQuery, students]);

  const fetchClasses = async () => {
    try {
      if (user?.role === 'teacher') {
        // Teachers fetch their specific class via fetchTeacherClass
        // This function is already called in the main useEffect for teachers
        return;
      }
      const response = await api.get('/api/classes');
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchTeacherClass = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/classes/my-class');
      if (response.ok) {
        const classData = await response.json();
        setClasses([classData]);
        setSelectedClass(classData.id);

        // Fetch class specific data
        const overviewRes = await api.get(`/api/advanced-analytics/class/${classData.id}/overview`);
        if (overviewRes.ok) {
          // Adapt class overview to match dashboard overview structure where possible or use separate state
          // For simplicity, we might just load students for this class
        }
        // Set students for this class
        if (classData.students) {
          setStudents(classData.students);
        }

        // Fetch At Risk for this class
        const atRiskRes = await api.get(`/api/advanced-analytics/ai/at-risk-students?classId=${classData.id}`);
        if (atRiskRes.ok) {
          setAtRiskStudents(await atRiskRes.json());
        }

      } else {
        // Handle case where teacher has no class
        console.log("No class assigned");
      }
    } catch (error) {
      console.error('Error fetching teacher class:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/api/students');
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
        setFilteredStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/api/subjects');
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await api.get('/api/academic-sessions');
      if (response.ok) {
        const sessions = await response.json();
        // Flatten terms from all sessions
        const allTerms = sessions.flatMap(session =>
          session.terms.map(term => ({
            ...term,
            sessionName: session.name,
            fullName: `${session.name} - ${term.name}`
          }))
        );
        setTerms(allTerms);

        // Find current term
        const currentTerm = allTerms.find(t => t.isCurrent);
        if (currentTerm) {
          setSelectedTerm(currentTerm.id.toString());
        } else if (allTerms.length > 0) {
          setSelectedTerm(allTerms[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      // Build query params
      const termParam = selectedTerm !== 'current' && selectedTerm ? `?termId=${selectedTerm}` : '';

      const [subjectRes, classRes, riskRes] = await Promise.all([
        api.get(`/api/advanced-analytics/subject/comparison/all${termParam}`),
        api.get(`/api/advanced-analytics/class/comparison/all${termParam}`),
        api.get(`/api/advanced-analytics/ai/at-risk-students${termParam}`)
      ]);

      if (subjectRes.ok) {
        const data = await subjectRes.json();
        setSubjectComparison(Array.isArray(data) ? data : []);
      }
      if (classRes.ok) {
        const data = await classRes.json();
        setClassComparison(Array.isArray(data) ? data : []);
      }
      if (riskRes.ok) {
        const data = await riskRes.json();
        setAtRiskStudents(Array.isArray(data) ? data : []);
      }

    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeatmapData = async () => {
    setLoading(true);
    try {
      const termParam = selectedTerm !== 'current' && selectedTerm ? `?termId=${selectedTerm}` : '';
      const response = await api.get(`/api/advanced-analytics/heatmap${termParam}`);
      if (response.ok) {
        setHeatmapData(await response.json());
      }
    } catch (error) {
      console.error('Error fetching heatmap:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectDetails = async (subjectId) => {
    setLoading(true);
    try {
      const termParam = selectedTerm !== 'current' && selectedTerm ? `?termId=${selectedTerm}` : '';
      const response = await api.get(`/api/advanced-analytics/subject/${subjectId}${termParam}`);
      if (response.ok) {
        setSubjectAnalytics(await response.json());
        setActiveTab('subject-detail');
      }
    } catch (error) {
      console.error('Error fetching subject details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAnalytics = async (studentId) => {
    if (!studentId) return;

    setLoading(true);
    try {
      // Comprehensive analytics
      const analyticsRes = await api.get(`/api/advanced-analytics/student/${studentId}/comprehensive`);
      if (analyticsRes.ok) {
        setStudentAnalytics(await analyticsRes.json());
      }

      // Predictions
      const predictionRes = await api.get(`/api/advanced-analytics/student/${studentId}/predictions`);
      if (predictionRes.ok) {
        setStudentPrediction(await predictionRes.json());
      }
    } catch (error) {
      console.error('Error fetching student analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Export Functions
  const exportOverviewPDF = () => {
    AnalyticsExports.exportOverviewPDF(schoolSettings, subjectComparison, classComparison, atRiskStudents);
  };

  const exportSubjectsPDF = () => {
    AnalyticsExports.exportSubjectsPDF(schoolSettings, subjectComparison);
  };

  const exportSubjectsExcel = () => {
    AnalyticsExports.exportSubjectsExcel(schoolSettings, subjectComparison);
  };

  const exportClassesPDF = () => {
    AnalyticsExports.exportClassesPDF(schoolSettings, classComparison);
  };

  const exportClassesExcel = () => {
    AnalyticsExports.exportClassesExcel(schoolSettings, classComparison);
  };

  const exportAtRiskPDF = () => {
    AnalyticsExports.exportAtRiskPDF(schoolSettings, atRiskStudents);
  };

  const exportAtRiskExcel = () => {
    AnalyticsExports.exportAtRiskExcel(schoolSettings, atRiskStudents);
  };

  // Chart configurations
  const subjectChartData = {
    labels: Array.isArray(subjectComparison) ? subjectComparison.map(s => s.subjectName) : [],
    datasets: [{
      label: 'Average Score',
      data: Array.isArray(subjectComparison) ? subjectComparison.map(s => parseFloat(s.average)) : [],
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2
    }]
  };

  const classChartData = {
    labels: Array.isArray(classComparison) ? classComparison.map(c => c.className) : [],
    datasets: [{
      label: 'Class Average',
      data: Array.isArray(classComparison) ? classComparison.map(c => parseFloat(c.average)) : [],
      backgroundColor: 'rgba(16, 185, 129, 0.5)',
      borderColor: 'rgb(16, 185, 129)',
      borderWidth: 2
    }]
  };

  const studentRadarData = studentAnalytics?.subjectBreakdown && Array.isArray(studentAnalytics.subjectBreakdown) ? {
    labels: studentAnalytics.subjectBreakdown.map(s => s.subject),
    datasets: [{
      label: 'Performance',
      data: studentAnalytics.subjectBreakdown.map(s => parseFloat(s.average)),
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      borderColor: 'rgb(139, 92, 246)',
      borderWidth: 2
    }]
  } : null;

  const getTermId = () => {
    if (selectedTerm && selectedTerm !== 'current') return parseInt(selectedTerm);
    const current = terms.find(t => t.isActive || t.isCurrent); // handle both flags just in case
    return current ? current.id : null;
  };

  const getCurrentSessionId = () => {
    // Attempt to get session ID from current term or fallback
    const termId = getTermId();
    const term = terms.find(t => t.id === termId);
    return term ? term.academicSessionId : null;
  };

  const handleLogIntervention = (student) => {
    setSelectedStudentForIntervention(student);
    setShowInterventionModal(true);
  };

  const handleSaveIntervention = async (data) => {
    setLoading(true);
    try {
      const termId = getTermId();
      const sessionId = getCurrentSessionId();

      if (!termId || !sessionId) {
        alert('Could not identify current term/session. Please select a specific term.');
        setLoading(false);
        return;
      }

      const response = await api.post('/api/interventions', {
        studentId: selectedStudentForIntervention.id,
        termId: termId,
        academicSessionId: sessionId,
        ...data
      });

      if (response.ok) {
        setShowInterventionModal(false);
        setSelectedStudentForIntervention(null);
        alert('Intervention logged successfully');
        // Optionally refresh data
      } else {
        alert('Failed to save intervention');
      }
    } catch (error) {
      console.error('Error saving intervention:', error);
      alert('Error saving intervention');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'heatmap', label: 'Heatmap' },
    { id: 'subjects', label: 'Subjects' },
    { id: 'students', label: 'Students' },
    { id: 'classes', label: 'Classes' },
    { id: 'risks', label: 'At Risk' }
  ];

  const teacherTabs = [
    { id: 'overview', label: 'Class Overview' },
    { id: 'students', label: 'My Students' },
    { id: 'risks', label: 'At Risk' }
  ];

  const visibleTabs = user?.role === 'teacher' ? teacherTabs : tabs;

  const AnalyticsSkeleton = ({ type }) => {
    if (type === 'overview') {
      return (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-md">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md h-96">
              <Skeleton className="h-6 w-48 mb-6" />
              <div className="flex items-end gap-4 h-64 px-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="w-full rounded-t-lg" style={{ height: `${Math.random() * 80 + 20}%` }} />
                ))}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md h-96">
              <Skeleton className="h-6 w-48 mb-6" />
              <div className="flex items-end gap-4 h-64 px-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="w-full rounded-t-lg" style={{ height: `${Math.random() * 80 + 20}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'heatmap') {
      return (
        <div className="bg-white p-6 rounded-lg shadow-md overflow-hidden">
          <Skeleton className="h-6 w-64 mb-6" />
          <div className="grid grid-cols-12 gap-2 mb-4">
            <Skeleton className="h-8 col-span-2" />
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 col-span-1" />)}
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Skeleton className="h-10 col-span-2" />
                {[1, 2, 3, 4, 5].map(j => <Skeleton key={j} className="h-10 col-span-1" />)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Table Skeleton (Subjects, Classes, Students)
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <Skeleton className="h-6 w-64 mb-6" />
        <div className="space-y-4">
          <div className="flex gap-4 mb-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 flex-1" />)}
          </div>
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {user?.role === 'teacher'
              ? `${schoolSettings?.schoolName || 'School'} Class Analytics`
              : `${schoolSettings?.schoolName || 'School'} Advanced Analytics`}
          </h1>
          <p className="text-gray-600">
            {user?.role === 'teacher'
              ? 'Deep insights into your class performance'
              : 'AI-powered insights for school-wide performance'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Term Selector */}
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="block w-48 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
          >
            <option value="current">Current Term</option>
            {terms.map(term => (
              <option key={term.id} value={term.id}>{term.fullName}</option>
            ))}
          </select>

          {/* Export Buttons */}
          {!loading && (
            <div className="flex gap-2">
              {activeTab === 'overview' && (
                <button
                  onClick={exportOverviewPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold">Export PDF</span>
                </button>
              )}

              {activeTab === 'subjects' && (
                <>
                  <button
                    onClick={exportSubjectsPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-semibold">Export PDF</span>
                  </button>
                  <button
                    onClick={exportSubjectsExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-semibold">Export Excel</span>
                  </button>
                </>
              )}

              {activeTab === 'classes' && (
                <>
                  <button
                    onClick={exportClassesPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-semibold">Export PDF</span>
                  </button>
                  <button
                    onClick={exportClassesExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-semibold">Export Excel</span>
                  </button>
                </>
              )}

              {activeTab === 'risks' && (
                <>
                  <button
                    onClick={exportAtRiskPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-semibold">Export PDF</span>
                  </button>
                  <button
                    onClick={exportAtRiskExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-semibold">Export Excel</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm mb-6 w-fit">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && loading && <AnalyticsSkeleton type="overview" />}
      {activeTab === 'overview' && !loading && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
              <p className="text-sm opacity-90">Total Subjects</p>
              <p className="text-4xl font-bold mt-2">{subjectComparison.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
              <p className="text-sm opacity-90">Total Classes</p>
              <p className="text-4xl font-bold mt-2">{classComparison.length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
              <p className="text-sm opacity-90">At-Risk Students</p>
              <p className="text-4xl font-bold mt-2">{atRiskStudents.length}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-lg shadow-lg">
              <p className="text-sm opacity-90">Avg Performance</p>
              <p className="text-4xl font-bold mt-2">
                {subjectComparison.length > 0
                  ? (subjectComparison.reduce((sum, s) => sum + parseFloat(s.average), 0) / subjectComparison.length).toFixed(1)
                  : 0}%
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Performance Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-4">Subject Performance Overview</h3>
              {subjectComparison.length > 0 ? (
                <Bar data={subjectChartData} options={{ responsive: true, maintainAspectRatio: true }} />
              ) : (
                <p className="text-gray-500 text-center py-8">No data available</p>
              )}
            </div>

            {/* Class Performance Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-4">Class Performance Comparison</h3>
              {classComparison.length > 0 ? (
                <Bar data={classChartData} options={{ responsive: true, maintainAspectRatio: true }} />
              ) : (
                <p className="text-gray-500 text-center py-8">No data available</p>
              )}
            </div>
          </div>

          {/* At-Risk Students Preview */}
          {atRiskStudents.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-4 text-orange-600">⚠️ Students Needing Attention</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {atRiskStudents.slice(0, 6).map((student, idx) => (
                  <div key={idx} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900">{student.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${student.riskLevel === 'High' ? 'bg-red-100 text-red-700' :
                        student.riskLevel === 'Medium' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                        {student.riskLevel} Risk
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{student.class}</p>
                    <p className="text-sm text-gray-600 mt-1">Avg: {student.averageScore}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Heatmap Tab */}
      {activeTab === 'heatmap' && (
        loading ? <AnalyticsSkeleton type="heatmap" /> : (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Class × Subject Performance Matrix</h3>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span> 70%+ Excellent</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></span> 60-69% Good</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></span> 50-59% Fair</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span> &lt;50% Critical</span>
                </div>
              </div>

              {heatmapData && heatmapData.classes.length > 0 && heatmapData.subjects.length > 0 ? (
                <div className="w-full">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 z-10 bg-gray-50">Class</th>
                        {heatmapData.subjects.map(subject => (
                          <th key={subject.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap min-w-[100px]">
                            {subject.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {heatmapData.classes.map(cls => (
                        <tr key={cls.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 sticky left-0 z-10 bg-white border-r">
                            {cls.name}
                          </td>
                          {heatmapData.subjects.map(subject => {
                            const key = `${cls.id}-${subject.id}`;
                            const cell = heatmapData.data[key];
                            return (
                              <td key={subject.id} className="px-1 py-1 text-center">
                                {cell ? (
                                  <div
                                    className={`w-full h-10 flex items-center justify-center rounded cursor-help transition-all ${cell.average >= 70 ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                      cell.average >= 60 ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                                        cell.average >= 50 ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                                          'bg-red-100 text-red-800 hover:bg-red-200'
                                      }`}
                                    title={`${cls.name} - ${subject.name}: ${cell.average}% (${cell.count} students)`}
                                  >
                                    <span className="font-semibold text-sm">{cell.average}</span>
                                  </div>
                                ) : (
                                  <div className="w-full h-10 bg-gray-50 rounded flex items-center justify-center text-gray-400 text-xs">
                                    -
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No specific class/subject data available for this term.</p>
              )}
            </div>
          </div>
        )
      )}

      {/* Subjects Tab */}
      {activeTab === 'subjects' && (
        loading ? <AnalyticsSkeleton type="table" /> : (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-4">Subject-wise Performance Analysis</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Students</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Average</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pass Rate</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subjectComparison.map((subject, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600 cursor-pointer hover:underline" onClick={() => fetchSubjectDetails(subject.subjectId)}>
                          {subject.subjectName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">{subject.students}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`font-bold ${subject.average >= 70 ? 'text-green-600' :
                            subject.average >= 60 ? 'text-blue-600' :
                              subject.average >= 50 ? 'text-yellow-600' :
                                'text-red-600'
                            }`}>
                            {subject.average}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">{subject.passRate}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {parseFloat(subject.average) >= 70 ? (
                            <span className="text-green-600">✓ Excellent</span>
                          ) : parseFloat(subject.average) >= 60 ? (
                            <span className="text-blue-600">→ Good</span>
                          ) : parseFloat(subject.average) >= 50 ? (
                            <span className="text-yellow-600">⚡ Fair</span>
                          ) : (
                            <span className="text-red-600">⚠ Needs Attention</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))
      }

      {/* Subject Detail View */}
      {
        activeTab === 'subject-detail' && subjectAnalytics && !loading && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setActiveTab('subjects')}
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                ← Back to Subjects
              </button>
              <h2 className="text-2xl font-bold">{subjectAnalytics.subjectName} Analysis</h2>
            </div>

            {/* Subject Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{subjectAnalytics.statistics?.average || 0}%</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm text-gray-600">Highest Score</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{subjectAnalytics.statistics?.highest || 0}%</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm text-gray-600">Lowest Score</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{subjectAnalytics.statistics?.lowest || 0}%</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm text-gray-600">Pass Rate</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{subjectAnalytics.statistics?.passRate || 0}%</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-4">Student Performance List</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grade</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rank</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subjectAnalytics.students?.sort((a, b) => b.score - a.score).map((student, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {student.class}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center font-bold">
                          {student.score}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${student.score >= 70 ? 'bg-green-100 text-green-800' :
                            student.score >= 60 ? 'bg-blue-100 text-blue-800' :
                              student.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                            {student.grade || (
                              student.score >= 70 ? 'A' :
                                student.score >= 60 ? 'B' :
                                  student.score >= 50 ? 'C' : 'F'
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                          #{idx + 1}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      }

      {/* Students Tab */}
      {activeTab === 'students' && loading && <AnalyticsSkeleton type="table" />}
      {
        activeTab === 'students' && !loading && (
          <div className="space-y-6">
            {/* Student Search */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-xl font-bold mb-4">Find Student</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Class Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Class</label>
                  {user?.role !== 'teacher' && (
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="">All Classes</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name} {cls.arm}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Student Search Input */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search Name/Admin No</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowStudentList(true);
                    }}
                    onFocus={() => setShowStudentList(true)}
                    placeholder="Enter name..."
                    className="w-full border rounded-md px-3 py-2"
                  />

                  {/* Dropdown Results */}
                  {showStudentList && filteredStudents.length > 0 && (
                    <div className="absolute z-10 w-full bg-white bg-opacity-100 border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                      {filteredStudents.map(student => (
                        <div
                          key={student.id}
                          onClick={() => {
                            setSelectedStudent(student.id);
                            setSearchQuery(`${student.user.firstName} ${student.user.lastName}`);
                            setShowStudentList(false);
                            fetchStudentAnalytics(student.id);
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        >
                          <p className="font-semibold">{student.user.firstName} {student.user.lastName}</p>
                          <p className="text-xs text-gray-500">{student.admissionNumber} • {student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : ''}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manual ID Input (Fallback) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Or Enter ID Manually</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      placeholder="ID"
                      className="flex-1 border rounded-md px-3 py-2"
                    />
                    <button
                      onClick={() => fetchStudentAnalytics(selectedStudent)}
                      className="bg-primary text-white px-4 py-2 rounded-md hover:brightness-90"
                    >
                      Go
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Results */}
            {studentAnalytics && (
              <div className="space-y-6">
                {/* Student Info */}
                <div className="bg-gradient-to-r from-primary to-primary/90 text-white p-6 rounded-lg shadow-lg">
                  <h3 className="text-2xl font-bold">{studentAnalytics.student.name}</h3>
                  <p className="mt-1">{studentAnalytics.student.class} • {studentAnalytics.student.admissionNumber}</p>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <p className="text-sm text-gray-600">Current Average</p>
                    <p className="text-3xl font-bold text-primary mt-2">{studentAnalytics.overallPerformance.currentAverage}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <p className="text-sm text-gray-600">Highest Score</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{studentAnalytics.overallPerformance.highest}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <p className="text-sm text-gray-600">Lowest Score</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">{studentAnalytics.overallPerformance.lowest}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <p className="text-sm text-gray-600">Total Subjects</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{studentAnalytics.overallPerformance.totalSubjects}</p>
                  </div>
                </div>

                {/* Radar Chart */}
                {studentRadarData && (
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4">Subject Proficiency Radar</h3>
                    <div className="max-w-2xl mx-auto">
                      <Radar data={studentRadarData} />
                    </div>
                  </div>
                )}

                {/* AI Prediction */}
                {studentPrediction && studentPrediction.overallPrediction && (
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-purple-900 mb-4">🤖 AI Performance Prediction</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-purple-700">Next Term Predicted Average</p>
                        <p className="text-4xl font-bold text-purple-900 mt-2">{studentPrediction.overallPrediction}%</p>
                        <p className="text-sm text-purple-600 mt-1">Confidence: {studentPrediction.confidence}%</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <p className="font-semibold text-gray-900 mb-2">Recommendation:</p>
                        <p className="text-sm text-gray-700">{studentPrediction.recommendation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      }

      {/* Classes Tab */}
      {
        activeTab === 'classes' && (
          loading ? <AnalyticsSkeleton type="table" /> : (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">Class Performance Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Students</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Average</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pass Rate</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rank</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {classComparison.map((cls, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{cls.className}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">{cls.students}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`font-bold ${cls.average >= 70 ? 'text-green-600' :
                              cls.average >= 60 ? 'text-blue-600' :
                                cls.average >= 50 ? 'text-yellow-600' :
                                  'text-red-600'
                              }`}>
                              {cls.average}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">{cls.passRate}%</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                              idx === 1 ? 'bg-gray-100 text-gray-800' :
                                idx === 2 ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                              }`}>
                              #{idx + 1}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )
      }

      {/* At Risk Tab */}
      {activeTab === 'risks' && loading && <AnalyticsSkeleton type="table" />}
      {
        activeTab === 'risks' && !loading && (
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-800">
                <strong>⚠️ Intervention Needed:</strong> {atRiskStudents.length} students have been identified as needing immediate attention.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {atRiskStudents.map((student, idx) => (
                <div key={idx} className={`bg-white border-l-4 rounded-lg shadow-md p-6 ${student.riskLevel === 'High' ? 'border-red-500' :
                  student.riskLevel === 'Medium' ? 'border-orange-500' :
                    'border-yellow-500'
                  }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{student.name}</h4>
                      <p className="text-sm text-gray-600">{student.class} • {student.admissionNumber}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${student.riskLevel === 'High' ? 'bg-red-100 text-red-700' :
                      student.riskLevel === 'Medium' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                      {student.riskLevel} Risk
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Average Score</p>
                      <p className="text-xl font-bold text-red-600">{student.averageScore}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Trend</p>
                      <p className={`text-xl font-bold ${parseFloat(student.trend) < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                        {student.trend > 0 ? '↑' : '↓'} {Math.abs(student.trend)}%
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Recommended Actions:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {student.recommendations.map((rec, i) => (
                        <li key={i}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => handleLogIntervention(student)}
                    className="mt-3 w-full px-4 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm font-medium transition-colors border border-blue-200"
                  >
                    Log Intervention
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      }
      <InterventionModal
        isOpen={showInterventionModal}
        onClose={() => setShowInterventionModal(false)}
        student={selectedStudentForIntervention}
        onSave={handleSaveIntervention}
        loading={loading}
      />
    </div >
  );
};

export default AdvancedAnalytics;
