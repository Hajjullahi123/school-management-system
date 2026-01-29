import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ProgressiveReport = () => {
  const { user } = useAuth();
  const [termId, setTermId] = useState('');
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selection states
  const [searchMode, setSearchMode] = useState('admission'); // 'admission', 'class'
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const { settings: schoolSettings } = useSchoolSettings();

  const weights = useMemo(() => ({
    assignment1: schoolSettings?.assignment1Weight || 5,
    assignment2: schoolSettings?.assignment2Weight || 5,
    test1: schoolSettings?.test1Weight || 10,
    test2: schoolSettings?.test2Weight || 10
    // exam: schoolSettings?.examWeight || 70 // Removed from Progressive Report
  }), [schoolSettings]);

  // Automatically select student for student role
  useEffect(() => {
    if (user?.role === 'student' && user?.student?.id) {
      setSelectedStudentId(user.student.id);
    }
  }, [user]);

  useEffect(() => {
    fetchTerms();
    if (user?.role !== 'student') {
      fetchClasses();
    }
  }, [user]);

  const fetchTerms = async () => {
    try {
      const response = await api.get('/api/terms');
      const data = await response.json();
      setTerms(data);
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      const data = await response.json();
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchClassStudents(selectedClassId);
    } else {
      setClassStudents([]);
    }
  }, [selectedClassId]);

  const fetchClassStudents = async (classId) => {
    try {
      const response = await api.get(`/api/students?classId=${classId}`);
      const data = await response.json();
      setClassStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchProgressiveReport = async () => {
    if (!termId) {
      alert('Please select a term');
      return;
    }

    let targetStudentId = selectedStudentId;

    setLoading(true);
    setError(null);
    try {
      // If searching by admission number, lookup first
      if (user?.role !== 'student' && searchMode === 'admission' && admissionNumber) {
        const lookupRes = await api.get(`/api/students/lookup?admissionNumber=${admissionNumber}`);

        if (!lookupRes.ok) {
          throw new Error('Student not found with this Admission Number');
        }

        const student = await lookupRes.json();
        targetStudentId = student.id;
      }

      if (!targetStudentId) {
        alert('Please select a student or enter a valid admission number');
        setLoading(false);
        return;
      }

      const response = await api.get(
        `/api/results?studentId=${targetStudentId}&termId=${termId}`
      );

      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          processProgressiveData(results);
        } else {
          alert('No results found for this student and term');
          setProgressData(null);
        }
      } else {
        const data = await response.json();
        if (response.status === 403 && data.error === 'Result Not Published') {
          setError('Results for your class have not been published yet.');
        } else {
          setError('Failed to fetch report.');
        }
        setProgressData(null);
      }
    } catch (error) {
      console.error('Error fetching progressive report:', error);
      setError(error.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const processProgressiveData = (results) => {
    // Calculate progressive averages
    const progressive = {
      afterAssignment1: calculateAverage(results, ['assignment1Score']),
      afterAssignment2: calculateAverage(results, ['assignment1Score', 'assignment2Score']),
      afterTest1: calculateAverage(results, ['assignment1Score', 'assignment2Score', 'test1Score']),
      afterTest2: calculateAverage(results, ['assignment1Score', 'assignment2Score', 'test1Score', 'test2Score']),
      // afterExam: calculateAverage(results, ['assignment1Score', 'assignment2Score', 'test1Score', 'test2Score', 'examScore']),
      subjects: results.map(r => ({
        name: r.subject?.name,
        assignment1: r.assignment1Score || 0,
        assignment2: r.assignment2Score || 0,
        test1: r.test1Score || 0,
        test2: r.test2Score || 0,
        // exam: r.examScore || 0, // Exclude Exam
        total: (r.assignment1Score || 0) + (r.assignment2Score || 0) + (r.test1Score || 0) + (r.test2Score || 0), // Calculate CA total only? Or keep total? The prompt implies removing exam column.
        grade: r.grade
      }))
    };
    setProgressData(progressive);
  };

  const calculateAverage = (results, scoreFields) => {
    const totals = results.map(result => {
      return scoreFields.reduce((sum, field) => sum + (result[field] || 0), 0);
    });
    const average = totals.reduce((a, b) => a + b, 0) / results.length;
    return average.toFixed(2);
  };

  const downloadPDF = () => {
    if (!progressData) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(20);
    doc.text(schoolSettings?.schoolName || 'School Name', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Progressive Report', pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    const date = new Date().toLocaleDateString();

    // Find Term Name
    const termName = terms.find(t => t.id == termId)?.name || 'Term';
    // Find Student Name
    let studentName = 'Student';
    if (user?.role === 'student') studentName = `${user.firstName} ${user.lastName}`;
    else if (classStudents.find(s => s.id == selectedStudentId)) {
      const s = classStudents.find(s => s.id == selectedStudentId);
      studentName = `${s.user.firstName} ${s.user.lastName} (${s.admissionNumber})`;
    }

    doc.text(`Student: ${studentName}`, 14, 35);
    doc.text(`Term: ${termName}`, 14, 40);
    doc.text(`Date: ${date}`, pageWidth - 14, 35, { align: 'right' });

    // Table
    const tableData = progressData.subjects.map(s => [
      s.name,
      s.assignment1.toFixed(1),
      s.assignment2.toFixed(1),
      s.test1.toFixed(1),
      s.test2.toFixed(1),
      s.total.toFixed(1)
    ]);

    doc.autoTable({
      startY: 45,
      head: [['Subject', 'Ass 1', 'Ass 2', 'Test 1', 'Test 2', 'Total CA']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [52, 152, 219] }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save(`progressive_report_${termName}_${studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Progressive Report</h1>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Term <span className="text-red-500">*</span>
            </label>
            <select
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">Select Term</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </div>

          {user?.role === 'student' ? (
            <div className="flex md:col-span-3 items-end">
              <button
                onClick={fetchProgressiveReport}
                disabled={!termId || loading}
                className="w-full bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400 font-medium"
              >
                {loading ? 'Generating...' : 'View My Progressive Report'}
              </button>
              {progressData && (
                <button
                  onClick={downloadPDF}
                  className="w-full mt-2 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 font-medium flex justify-center items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
              )}
            </div>
          ) : (
            <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ... (Admin/Teacher filters visible here) ... */}
              <div className="md:col-span-2 flex gap-4 mb-2">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="searchMode"
                    value="admission"
                    checked={searchMode === 'admission'}
                    onChange={(e) => setSearchMode(e.target.value)}
                  />
                  <span className="ml-2">By Admission No</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="searchMode"
                    value="class"
                    checked={searchMode === 'class'}
                    onChange={(e) => setSearchMode(e.target.value)}
                  />
                  <span className="ml-2">By Class</span>
                </label>
              </div>

              {searchMode === 'admission' ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admission Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={admissionNumber}
                      onChange={(e) => setAdmissionNumber(e.target.value)}
                      className="w-full border rounded-md px-3 py-2"
                      placeholder="e.g. 2024-SS1A-JD"
                    />
                    <button
                      onClick={fetchProgressiveReport}
                      disabled={loading}
                      className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400 whitespace-nowrap"
                    >
                      {loading ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} {cls.arm}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="w-full border rounded-md px-3 py-2"
                        disabled={!selectedClassId}
                      >
                        <option value="">Select Student</option>
                        {classStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.user.firstName} {student.user.lastName} ({student.admissionNumber})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={fetchProgressiveReport}
                        disabled={loading || !selectedStudentId}
                        className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400 whitespace-nowrap"
                      >
                        {loading ? 'Generating...' : 'Generate'}
                      </button>
                      {progressData && (
                        <button
                          onClick={downloadPDF}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                          title="Download PDF"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progressive Performance Chart */}
      {
        progressData && (
          <div className="space-y-6">
            {/* Average Progress Line */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Performance Progression</h3>
              <div className="h-80">
                <Line
                  data={{
                    labels: ['Assign 1', 'Assign 2', 'Test 1', 'Test 2'],
                    datasets: [
                      {
                        label: 'Cumulative Average',
                        data: [
                          progressData.afterAssignment1,
                          progressData.afterAssignment2,
                          progressData.afterTest1,
                          progressData.afterTest2
                        ],
                        fill: true,
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        tension: 0.3,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: 'rgba(59, 130, 246, 1)',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8,
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
                        title: {
                          display: true,
                          text: 'Average Score (%)'
                        }
                      },
                    },
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: function (context) {
                            return `Average: ${context.parsed.y}%`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Subject-wise Breakdown */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Subject-wise Progressive Scores</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left">Subject</th>
                      <th className="px-4 py-3 text-center">Assign 1<br />({weights.assignment1}%)</th>
                      <th className="px-4 py-3 text-center">Assign 2<br />({weights.assignment2}%)</th>
                      <th className="px-4 py-3 text-center">Test 1<br />({weights.test1}%)</th>
                      <th className="px-4 py-3 text-center">Test 2<br />({weights.test2}%)</th>
                      {/* <th className="px-4 py-3 text-center">Exam<br />({weights.exam}%)</th> */}
                      <th className="px-4 py-3 text-center font-bold">Total CA<br />(30%)</th>
                      {/* <th className="px-4 py-3 text-center">Grade</th> */}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {progressData.subjects.map((subject, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{subject.name}</td>
                        <td className="px-4 py-3 text-center">{subject.assignment1.toFixed(1)}</td>
                        <td className="px-4 py-3 text-center">{subject.assignment2.toFixed(1)}</td>
                        <td className="px-4 py-3 text-center">{subject.test1.toFixed(1)}</td>
                        <td className="px-4 py-3 text-center">{subject.test2.toFixed(1)}</td>
                        {/* <td className="px-4 py-3 text-center">{subject.exam.toFixed(1)}</td> */}
                        <td className="px-4 py-3 text-center font-bold text-primary">{subject.total.toFixed(1)}</td>
                        {/* <td className="px-4 py-3 text-center">
                        <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                          {subject.grade}
                        </span>
                      </td> */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-900">About Progressive Reports</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    This report shows how your average evolved after each assessment component throughout the term.
                    It helps track improvement patterns and identify areas needing more focus.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        !progressData && !loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            {error ? (
              <>
                <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Access Restricted</h3>
                <p className="text-gray-600 text-lg">{error}</p>
              </>
            ) : (
              <>
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-500 text-lg">Select a term and student to generate progressive report</p>
              </>
            )}
          </div>
        )
      }
    </div >
  );
};

export default ProgressiveReport;
