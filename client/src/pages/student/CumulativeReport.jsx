import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const CumulativeReport = () => {
  const { user } = useAuth();
  const { settings: schoolSettings } = useSchoolSettings();
  const [reportData, setReportData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  // Selection states
  const [searchMode, setSearchMode] = useState('admission'); // 'admission', 'class'
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(false);

  // Automatically select student for student role
  useEffect(() => {
    if (user?.role === 'student' && user?.student?.id) {
      setSelectedStudentId(user.student.id);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
    if (user?.role !== 'student') {
      fetchClasses();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/api/academic-sessions');
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
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

  const fetchCumulativeReport = async () => {
    if (!selectedSession) {
      alert('Please select an academic session');
      return;
    }

    let targetStudentId = selectedStudentId;

    setLoading(true);
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
        `/api/reports/cumulative/${targetStudentId}/${selectedSession}`
      );

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        const error = await response.json();
        if (response.status === 403 && error.error === 'Result Not Published') {
          setReportData(null);
          alert(error.message); // Or use a nicer UI element if preferred
        } else {
          alert(`Error: ${error.error || 'Failed to fetch report'}`);
          setReportData(null);
        }
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      alert(error.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const calculateSessionAverage = () => {
    if (!reportData?.termResults || reportData.termResults.length === 0) return 0;
    const termAverages = reportData.termResults.map(term => term.termAverage || 0);
    return (termAverages.reduce((a, b) => a + b, 0) / termAverages.length).toFixed(2);
  };

  const getPromotionStatus = () => {
    const avg = parseFloat(calculateSessionAverage());
    return avg >= 40 ? 'PROMOTED' : 'REPEAT';
  };

  const getPromotionColor = () => {
    return getPromotionStatus() === 'PROMOTED' ? 'text-green-600' : 'text-red-600';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-bold text-gray-900">Cumulative Report (3 Terms)</h1>
        {reportData && (
          <button
            onClick={handlePrint}
            className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Session <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">Select Session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
          </div>

          {user?.role === 'student' ? (
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={fetchCumulativeReport}
                disabled={!selectedSession || loading}
                className="w-full bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400"
              >
                {loading ? 'Generating...' : 'View My Cumulative Report'}
              </button>
            </div>
          ) : user?.role === 'parent' ? (
            <div className="col-span-2 grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Child
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Choose your child</option>
                  {classStudents.map((ward) => (
                    <option key={ward.id} value={ward.id}>
                      {ward.user.firstName} {ward.user.lastName} ({ward.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  onClick={fetchCumulativeReport}
                  disabled={loading || !selectedStudentId || !selectedSession}
                  className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400 w-full md:w-auto"
                >
                  {loading ? 'Generating...' : 'View Report'}
                </button>
              </div>
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
                      onClick={fetchCumulativeReport}
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
                        onClick={fetchCumulativeReport}
                        disabled={loading || !selectedStudentId}
                        className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400 whitespace-nowrap"
                      >
                        {loading ? 'Generating...' : 'Generate'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Report Display */}
      {reportData && (
        <div className="bg-white shadow-lg print:shadow-none" id="printable-report">
          {/* Header */}
          <div className="p-8 border-b-4 border-primary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {schoolSettings.logoUrl && (
                  <img
                    src={schoolSettings.logoUrl}
                    alt="School Logo"
                    className="h-20 w-20 rounded-lg object-contain"
                  />
                )}
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">{schoolSettings.schoolName || 'School Name'}</h2>
                  <p className="text-sm text-gray-600">{schoolSettings.schoolMotto || 'Excellence in Education'}</p>
                  {schoolSettings.schoolAddress && (
                    <p className="text-xs text-gray-500 mt-1">{schoolSettings.schoolAddress}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Academic Session: {reportData.session?.name}
                  </p>
                </div>
              </div>
              {reportData.student?.photoUrl && (
                <img
                  src={`${API_BASE_URL}${reportData.student.photoUrl}`}
                  alt="Student"
                  className="w-24 h-24 rounded-lg object-cover border-2 border-gray-300"
                />
              )}
            </div>
          </div>

          {/* Student Info */}
          <div className="p-6 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">CUMULATIVE REPORT CARD</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Name:</span>
                <p className="font-semibold text-gray-900">
                  {reportData.student?.user?.firstName} {reportData.student?.user?.lastName}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Admission No:</span>
                <p className="font-semibold text-gray-900">{reportData.student?.admissionNumber}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Class:</span>
                <p className="font-semibold text-gray-900">
                  {reportData.student?.classModel?.name} {reportData.student?.classModel?.arm || ''}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Gender:</span>
                <p className="font-semibold text-gray-900">{reportData.student?.gender || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Term-by-Term Results */}
          <div className="p-6">
            <h4 className="font-semibold text-lg mb-4 text-gray-800">Session Performance Summary</h4>

            {reportData.termResults?.map((term, index) => (
              <div key={index} className="mb-6">
                <h5 className="font-medium text-md mb-3 text-primary border-b pb-2">
                  {term.termName} (Average: {term.termAverage?.toFixed(2) || 'N/A'}%)
                </h5>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left">Subject</th>
                        <th className="px-4 py-2 text-center">Total</th>
                        <th className="px-4 py-2 text-center">Grade</th>
                        <th className="px-4 py-2 text-center">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {term.results?.map((result, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2">{result.subject?.name}</td>
                          <td className="px-4 py-2 text-center font-semibold">
                            {result.totalScore?.toFixed(1)}
                          </td>
                          <td className="px-4 py-2 text-center font-semibold text-primary">
                            {result.grade}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {result.positionInClass || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Overall Summary */}
          <div className="p-6 bg-gray-50 border-t-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Session Average</p>
                <p className="text-2xl font-bold text-primary">{calculateSessionAverage()}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Number of Terms</p>
                <p className="text-2xl font-bold text-gray-800">{reportData.termResults?.length || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Subjects</p>
                <p className="text-2xl font-bold text-gray-800">
                  {reportData.termResults?.[0]?.results?.length || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Promotion Status</p>
                <p className={`text-2xl font-bold ${getPromotionColor()}`}>
                  {getPromotionStatus()}
                </p>
              </div>
            </div>
          </div>

          {/* Remarks & Signatures */}
          <div className="p-6 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Form Master's Remarks:</p>
                <div className="border rounded p-3 min-h-[60px] bg-gray-50">
                  <p className="text-sm text-gray-600 italic">
                    {getPromotionStatus() === 'PROMOTED'
                      ? 'Congratulations! The student has been promoted to the next class.'
                      : 'The student needs improvement. More dedication required.'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Principal's Signature:</p>
                <div className="border rounded p-3 min-h-[60px] bg-gray-50"></div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-primary text-white text-center text-sm">
            <p>© {new Date().getFullYear()} {schoolSettings.schoolName || 'School Management System'} - {schoolSettings.schoolMotto || 'Excellence in Education'}</p>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!reportData && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-lg">Select a session and student to generate cumulative report</p>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          #printable-report { box-shadow: none; }
        }
      `}</style>
    </div>
  );
};

export default CumulativeReport;
