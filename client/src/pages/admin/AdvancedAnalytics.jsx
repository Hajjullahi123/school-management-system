import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { Line, Bar, Radar, Pie } from 'react-chartjs-2';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
  const [studentPrediction, setStudentPrediction] = useState(null);
  const [subjects, setSubjects] = useState([]);

  // Student Selection States
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [showStudentList, setShowStudentList] = useState(false);

  useEffect(() => {
    fetchSubjects();
    if (user?.role === 'teacher') {
      fetchTeacherClass();
    } else {
      fetchOverviewData();
      fetchStudents();
      fetchClasses();
    }
  }, [user]);

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

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      // Fetch subject comparison
      const subjectRes = await api.get('/api/advanced-analytics/subject/comparison/all');
      if (subjectRes.ok) {
        setSubjectComparison(await subjectRes.json());
      }

      // Fetch class comparison
      const classRes = await api.get('/api/advanced-analytics/class/comparison/all');
      if (classRes.ok) {
        setClassComparison(await classRes.json());
      }

      // Fetch at-risk students
      const riskRes = await api.get('/api/advanced-analytics/ai/at-risk-students');
      if (riskRes.ok) {
        setAtRiskStudents(await riskRes.json());
      }
    } catch (error) {
      console.error('Error fetching overview data:', error);
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
    const doc = new jsPDF();
    const schoolName = schoolSettings?.schoolName || 'School';

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`${schoolName} - Analytics Overview`, 14, 20);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // Quick Stats
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Summary Statistics', 14, 38);

    const avgPerformance = subjectComparison.length > 0
      ? (subjectComparison.reduce((sum, s) => sum + parseFloat(s.average), 0) / subjectComparison.length).toFixed(1)
      : 0;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Subjects: ${subjectComparison.length}`, 14, 46);
    doc.text(`Total Classes: ${classComparison.length}`, 14, 52);
    doc.text(`At-Risk Students: ${atRiskStudents.length}`, 14, 58);
    doc.text(`Average Performance: ${avgPerformance}%`, 14, 64);

    // Subject Performance Table
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Subject Performance', 14, 74);

    doc.autoTable({
      startY: 78,
      head: [['Subject', 'Students', 'Average', 'Pass Rate', 'Status']],
      body: subjectComparison.map(s => [
        s.subjectName,
        s.students,
        `${s.average}%`,
        `${s.passRate}%`,
        parseFloat(s.average) >= 70 ? 'Excellent' :
          parseFloat(s.average) >= 60 ? 'Good' :
            parseFloat(s.average) >= 50 ? 'Fair' : 'Needs Attention'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Class Performance Table
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Class Performance', 14, finalY);

    doc.autoTable({
      startY: finalY + 4,
      head: [['Class', 'Students', 'Average', 'Pass Rate', 'Rank']],
      body: classComparison.map((c, idx) => [
        c.className,
        c.students,
        `${c.average}%`,
        `${c.passRate}%`,
        `#${idx + 1}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }
    });

    doc.save(`${schoolName}_Analytics_Overview_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportSubjectsPDF = () => {
    const doc = new jsPDF();
    const schoolName = schoolSettings?.schoolName || 'School';

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`${schoolName} - Subject Analysis`, 14, 20);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    doc.autoTable({
      startY: 35,
      head: [['Subject', 'Students', 'Average', 'Pass Rate', 'Status']],
      body: subjectComparison.map(s => [
        s.subjectName,
        s.students,
        `${s.average}%`,
        `${s.passRate}%`,
        parseFloat(s.average) >= 70 ? 'Excellent' :
          parseFloat(s.average) >= 60 ? 'Good' :
            parseFloat(s.average) >= 50 ? 'Fair' : 'Needs Attention'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      bodyStyles: { fontSize: 9 }
    });

    doc.save(`${schoolName}_Subject_Analysis_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportSubjectsExcel = () => {
    const schoolName = schoolSettings?.schoolName || 'School';
    const data = subjectComparison.map(s => ({
      'Subject': s.subjectName,
      'Students': s.students,
      'Average (%)': parseFloat(s.average),
      'Pass Rate (%)': parseFloat(s.passRate),
      'Status': parseFloat(s.average) >= 70 ? 'Excellent' :
        parseFloat(s.average) >= 60 ? 'Good' :
          parseFloat(s.average) >= 50 ? 'Fair' : 'Needs Attention'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Subject Analysis');

    XLSX.writeFile(wb, `${schoolName}_Subject_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportClassesPDF = () => {
    const doc = new jsPDF();
    const schoolName = schoolSettings?.schoolName || 'School';

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`${schoolName} - Class Comparison`, 14, 20);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    doc.autoTable({
      startY: 35,
      head: [['Rank', 'Class', 'Students', 'Average', 'Pass Rate']],
      body: classComparison.map((c, idx) => [
        `#${idx + 1}`,
        c.className,
        c.students,
        `${c.average}%`,
        `${c.passRate}%`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      bodyStyles: { fontSize: 9 }
    });

    doc.save(`${schoolName}_Class_Comparison_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportClassesExcel = () => {
    const schoolName = schoolSettings?.schoolName || 'School';
    const data = classComparison.map((c, idx) => ({
      'Rank': idx + 1,
      'Class': c.className,
      'Students': c.students,
      'Average (%)': parseFloat(c.average),
      'Pass Rate (%)': parseFloat(c.passRate)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Class Comparison');

    XLSX.writeFile(wb, `${schoolName}_Class_Comparison_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportAtRiskPDF = () => {
    const doc = new jsPDF();
    const schoolName = schoolSettings?.schoolName || 'School';

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`${schoolName} - At-Risk Students`, 14, 20);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Total At-Risk: ${atRiskStudents.length}`, 14, 34);

    // Prepare data with recommendations
    const tableData = atRiskStudents.map(s => [
      s.name,
      s.class,
      s.admissionNumber || 'N/A',
      `${s.averageScore}%`,
      s.riskLevel,
      `${s.trend > 0 ? '↑' : '↓'} ${Math.abs(s.trend)}%`,
      s.recommendations ? s.recommendations.join('; ') : 'N/A'
    ]);

    doc.autoTable({
      startY: 40,
      head: [['Name', 'Class', 'Adm. No', 'Average', 'Risk', 'Trend', 'Recommendations']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [249, 115, 22] },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        6: { cellWidth: 60 }
      }
    });

    doc.save(`${schoolName}_At_Risk_Students_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportAtRiskExcel = () => {
    const schoolName = schoolSettings?.schoolName || 'School';
    const data = atRiskStudents.map(s => ({
      'Name': s.name,
      'Class': s.class,
      'Admission Number': s.admissionNumber || 'N/A',
      'Average (%)': parseFloat(s.averageScore),
      'Risk Level': s.riskLevel,
      'Trend': `${s.trend > 0 ? '↑' : '↓'} ${Math.abs(s.trend)}%`,
      'Recommendations': s.recommendations ? s.recommendations.join('; ') : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'At-Risk Students');

    XLSX.writeFile(wb, `${schoolName}_At_Risk_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Chart configurations
  const subjectChartData = {
    labels: subjectComparison.map(s => s.subjectName),
    datasets: [{
      label: 'Average Score',
      data: subjectComparison.map(s => parseFloat(s.average)),
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2
    }]
  };

  const classChartData = {
    labels: classComparison.map(c => c.className),
    datasets: [{
      label: 'Class Average',
      data: classComparison.map(c => parseFloat(c.average)),
      backgroundColor: 'rgba(16, 185, 129, 0.5)',
      borderColor: 'rgb(16, 185, 129)',
      borderWidth: 2
    }]
  };

  const studentRadarData = studentAnalytics?.subjectBreakdown ? {
    labels: studentAnalytics.subjectBreakdown.map(s => s.subject),
    datasets: [{
      label: 'Performance',
      data: studentAnalytics.subjectBreakdown.map(s => parseFloat(s.average)),
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      borderColor: 'rgb(139, 92, 246)',
      borderWidth: 2
    }]
  } : null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
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

      {/* Subjects Tab */}
      {activeTab === 'subjects' && !loading && (
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
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{subject.subjectName}</td>
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
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
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
      )}

      {/* Classes Tab */}
      {activeTab === 'classes' && !loading && (
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
      )}

      {/* At Risk Tab */}
      {activeTab === 'risks' && !loading && (
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalytics;
