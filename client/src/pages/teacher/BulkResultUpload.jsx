import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import CSVUploadForm from '../../components/CSVUploadForm';
import { saveAs } from 'file-saver';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useMemo } from 'react';
export default function BulkResultUpload() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const { settings: schoolSettings } = useSchoolSettings();

  const weights = useMemo(() => ({
    assignment1: schoolSettings?.assignment1Weight || 5,
    assignment2: schoolSettings?.assignment2Weight || 5,
    test1: schoolSettings?.test1Weight || 10,
    test2: schoolSettings?.test2Weight || 10,
    exam: schoolSettings?.examWeight || 70
  }), [schoolSettings]);

  const headers = useMemo(() => ({
    assignment1: `1st Assignment (${weights.assignment1})`,
    assignment2: `2nd Assignment (${weights.assignment2})`,
    test1: `1st Test (${weights.test1})`,
    test2: `2nd Test (${weights.test2})`,
    exam: `Examination (${weights.exam})`
  }), [weights]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get current term and session
      const [termsRes, sessionsRes] = await Promise.all([
        api.get('/api/terms'),
        api.get('/api/academic-sessions')
      ]);

      const terms = await termsRes.json();
      const sessions = await sessionsRes.json();

      const activeTerm = terms.find(t => t.isCurrent);
      const activeSession = sessions.find(s => s.isCurrent);

      setCurrentTerm(activeTerm);
      setCurrentSession(activeSession);

      if (activeTerm && activeSession && user) {
        // Fetch teacher's scoresheets
        // api helper handles token injection automatically
        const scoresheetRes = await api.get(
          `/api/scoresheet/teacher/${user.id}?termId=${activeTerm.id}&academicSessionId=${activeSession.id}`
        );

        const data = await scoresheetRes.json();
        setAssignments(data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const downloadScoresheet = async (assignment) => {
    // Also select the assignment when downloading
    setSelectedAssignment(assignment);

    try {
      const token = localStorage.getItem('token');
      // Ensure specific selection IDs are defined
      if (!currentTerm?.id || !currentSession?.id) {
        alert("Term or Session missing.");
        return;
      }

      console.log(`Downloading for Class: ${assignment.classId}, Subject: ${assignment.subjectId}`);

      const response = await api.get(
        `/api/scoresheet/class/${assignment.classId}/subject/${assignment.subjectId}?termId=${currentTerm.id}&academicSessionId=${currentSession.id}`
      );

      if (response.ok) {
        const blob = await response.blob();
        saveAs(blob, assignment.filename);
      } else {
        const text = await response.text();
        console.error('Download failed:', text);
        alert("Failed to download scoresheet. Server responded with error.");
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading scoresheet: ' + error.message);
    }
  };

  const handleUpload = async (data) => {
    if (!selectedAssignment) {
      alert('Please select an assignment first');
      return;
    }

    try {
      // Transform CSV data to API format
      const results = data.map(row => ({
        admissionNumber: row['Admission Number'],
        assignment1: row[headers.assignment1] || '',
        assignment2: row[headers.assignment2] || '',
        test1: row[headers.test1] || '',
        test2: row[headers.test2] || '',
        exam: row[headers.exam] || ''
      }));

      const response = await api.post('/api/bulk-upload/results', {
        results,
        termId: currentTerm.id,
        academicSessionId: currentSession.id,
        classId: selectedAssignment.classId,
        subjectId: selectedAssignment.subjectId
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResult(result);
        alert(`Upload complete! ${result.successful.length} created, ${result.updated.length} updated, ${result.failed.length} failed.`);
      } else {
        alert(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    }
  };

  const validateRow = (row) => {
    const errors = [];

    if (!row['Admission Number']) {
      errors.push('Missing admission number');
    }

    // Support both old hardcoded headers and new dynamic ones for backwards compatibility during transition
    const assignment1 = parseFloat(row[headers.assignment1] || row['1st Assignment (5)']);
    const assignment2 = parseFloat(row[headers.assignment2] || row['2nd Assignment (5)']);
    const test1 = parseFloat(row[headers.test1] || row['1st Test (10)']);
    const test2 = parseFloat(row[headers.test2] || row['2nd Test (10)']);
    const exam = parseFloat(row[headers.exam] || row['Examination (70)']);

    if (assignment1 && (assignment1 < 0 || assignment1 > weights.assignment1)) {
      errors.push(`1st Assignment must be 0-${weights.assignment1}`);
    }
    if (assignment2 && (assignment2 < 0 || assignment2 > weights.assignment2)) {
      errors.push(`2nd Assignment must be 0-${weights.assignment2}`);
    }
    if (test1 && (test1 < 0 || test1 > weights.test1)) {
      errors.push(`1st Test must be 0-${weights.test1}`);
    }
    if (test2 && (test2 < 0 || test2 > weights.test2)) {
      errors.push(`2nd Test must be 0-${weights.test2}`);
    }
    if (exam && (exam < 0 || exam > weights.exam)) {
      errors.push(`Exam must be 0-${weights.exam}`);
    }

    return errors;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Bulk Result Upload</h1>

      {!currentTerm || !currentSession ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No active term or session found. Please contact the administrator.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">
              <strong>Current Session:</strong> {currentSession.name} | <strong>Term:</strong> {currentTerm.name}
            </p>
          </div>

          {/* Assignment Selection */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Your Subjects</h2>
            </div>
            <div className="p-6">
              {assignments.length === 0 ? (
                <p className="text-gray-500">No subjects assigned to you.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {assignments.map((assignment, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${selectedAssignment === assignment
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-primary/50'
                        }`}
                      onClick={() => setSelectedAssignment(assignment)}
                    >
                      <h3 className="font-semibold">{assignment.subjectName}</h3>
                      <p className="text-sm text-gray-600">{assignment.className}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {assignment.studentCount} students
                      </p>
                      <div className="mt-3 flex gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadScoresheet(assignment);
                          }}
                          className="text-sm font-medium text-primary hover:text-primary-dark flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Download Template
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAssignment(assignment);
                          }}
                          className={`text-sm font-medium flex items-center gap-1 ${selectedAssignment === assignment ? 'text-secondary' : 'text-gray-500 hover:text-primary'}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Upload Results
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upload Form Section */}
          <div className={`bg-white rounded-lg shadow mt-8 overflow-hidden transition-all duration-300 ${!selectedAssignment ? 'ring-1 ring-gray-200' : 'ring-2 ring-primary ring-offset-4'}`}>
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedAssignment
                    ? `Upload Results: ${selectedAssignment.subjectName} - ${selectedAssignment.className}`
                    : 'Upload Results'
                  }
                </h2>
                {!selectedAssignment && (
                  <p className="text-sm text-gray-500">Please select a subject from the list above to start uploading</p>
                )}
              </div>
              {selectedAssignment && (
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="p-6">
              {selectedAssignment ? (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Instructions:</strong><br />
                      1. Fill the downloaded Excel template for <strong>{selectedAssignment.subjectName}</strong>.<br />
                      2. Save it as <strong>CSV (Comma delimited)</strong>.<br />
                      3. Upload the CSV file below.
                    </p>
                  </div>

                  <CSVUploadForm
                    onUpload={handleUpload}
                    expectedHeaders={[
                      'Admission Number',
                      'Student Name',
                      headers.assignment1,
                      headers.assignment2,
                      headers.test1,
                      headers.test2,
                      headers.exam
                    ]}
                    validateRow={validateRow}
                  />
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p>Choose a subject from "Your Subjects" above to enable upload</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Results */}
          {uploadResult && (
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Upload Results</h3>

              {uploadResult.successful.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-green-700 mb-2">
                    ✓ {uploadResult.successful.length} Created
                  </h4>
                  <div className="max-h-40 overflow-y-auto text-sm text-gray-600">
                    {uploadResult.successful.slice(0, 5).map((item, idx) => (
                      <div key={idx}>
                        {item.studentName} - {item.totalScore} ({item.grade})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadResult.updated.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-blue-700 mb-2">
                    ↻ {uploadResult.updated.length} Updated
                  </h4>
                </div>
              )}

              {uploadResult.failed.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2">
                    ✗ {uploadResult.failed.length} Failed
                  </h4>
                  <div className="max-h-40 overflow-y-auto text-sm text-red-600">
                    {uploadResult.failed.map((item, idx) => (
                      <div key={idx}>
                        {item.data.admissionNumber}: {item.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
