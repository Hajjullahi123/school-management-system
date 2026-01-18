// Deployment trigger: Bulk Result Upload UI Enhancement
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import CSVUploadForm from '../../components/CSVUploadForm';
import { saveAs } from 'file-saver';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useMemo } from 'react';
import { toast } from 'react-hot-toast';
export default function BulkResultUpload() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
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

  const getValue = (row, keywords) => {
    const rowKeys = Object.keys(row);
    const targetKey = rowKeys.find(key => {
      const normalizedKey = key.toLowerCase().trim();
      return keywords.some(kw => normalizedKey.includes(kw.toLowerCase()));
    });
    return targetKey ? row[targetKey] : '';
  };

  const handleUpload = (data) => {
    if (!selectedAssignment) return;

    // Transform and prepare Preview
    const preparedResults = data.map(row => {
      const scores = {
        assignment1: parseFloat(getValue(row, ['1st Assignment', 'Assignment 1', 'Ass 1'])) || 0,
        assignment2: parseFloat(getValue(row, ['2nd Assignment', 'Assignment 2', 'Ass 2'])) || 0,
        test1: parseFloat(getValue(row, ['1st Test', 'Test 1', 'CA 1'])) || 0,
        test2: parseFloat(getValue(row, ['2nd Test', 'Test 2', 'CA 2'])) || 0,
        exam: parseFloat(getValue(row, ['Exam', 'Examination'])) || 0
      };

      const total = Object.values(scores).reduce((a, b) => a + b, 0);

      let grade = '';
      if (schoolSettings?.gradingSystem) {
        try {
          const system = JSON.parse(schoolSettings.gradingSystem);
          const match = system.find(g => total >= g.min && total <= g.max);
          grade = match ? match.grade : 'F';
        } catch (e) {
          grade = total >= 70 ? 'A' : total >= 60 ? 'B' : total >= 50 ? 'C' : total >= 40 ? 'D' : 'F';
        }
      }

      return {
        admissionNumber: getValue(row, ['Admission', 'Reg No', 'Reg Number']),
        studentName: getValue(row, ['Name', 'Student Name', 'Full Name']),
        ...scores,
        total,
        grade
      };
    }).filter(r => r.admissionNumber);

    setPreviewData(preparedResults);
  };

  const finalizeUpload = async () => {
    if (!previewData || isSaving) return;

    try {
      setIsSaving(true);
      const response = await api.post('/api/bulk-upload/results', {
        results: previewData,
        termId: currentTerm.id,
        academicSessionId: currentSession.id,
        classId: selectedAssignment.classId,
        subjectId: selectedAssignment.subjectId
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResult(result);
        setPreviewData(null);
        toast.success(`Successfully processed ${result.successful.length + result.updated.length} records!`);
        fetchData(); // Refresh counts
      } else {
        toast.error(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Finalize error:', error);
      toast.error('Upload failed');
    } finally {
      setIsSaving(false);
    }
  };

  const validateRow = (row) => {
    const errors = [];

    if (!getValue(row, ['Admission', 'Reg No'])) {
      errors.push('Missing admission number');
    }

    const assignment1 = parseFloat(getValue(row, ['1st Assignment', 'Assignment 1', 'Ass 1']));
    const assignment2 = parseFloat(getValue(row, ['2nd Assignment', 'Assignment 2', 'Ass 2']));
    const test1 = parseFloat(getValue(row, ['1st Test', 'Test 1', 'CA 1']));
    const test2 = parseFloat(getValue(row, ['2nd Test', 'Test 2', 'CA 2']));
    const exam = parseFloat(getValue(row, ['Exam', 'Examination']));

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

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column: Subject Selection (1/3 width) */}
            <div className="lg:w-1/3">
              <div className="bg-white rounded-lg shadow sticky top-6">
                <div className="px-6 py-4 border-b bg-gray-50/50">
                  <h2 className="text-lg font-semibold">Your Subjects</h2>
                </div>
                <div className="p-4 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {assignments.length === 0 ? (
                    <p className="text-gray-500 italic p-4">No subjects assigned.</p>
                  ) : (
                    <div className="space-y-3">
                      {assignments.map((assignment, idx) => (
                        <div
                          key={idx}
                          className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${selectedAssignment === assignment
                            ? 'border-primary bg-primary/5 shadow-md transform scale-[1.02]'
                            : 'border-gray-100 hover:border-primary/30 hover:bg-gray-50'
                            }`}
                          onClick={() => setSelectedAssignment(assignment)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-gray-900 leading-tight">{assignment.subjectName}</h3>
                              <p className="text-xs font-medium text-primary mt-1 uppercase tracking-wider">{assignment.className}</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${assignment.recordedCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                {assignment.recordedCount}/{assignment.studentCount} Recorded
                              </span>
                              {assignment.recordedCount > 0 && (
                                <p className="text-[9px] font-black text-emerald-600 uppercase mt-1">Data Found</p>
                              )}
                            </div>
                          </div>

                          {assignment.recordedCount > 0 && assignment.recordedCount < assignment.studentCount && (
                            <div className="mt-3 w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full transition-all"
                                style={{ width: `${(assignment.recordedCount / assignment.studentCount) * 100}%` }}
                              />
                            </div>
                          )}

                          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadScoresheet(assignment);
                              }}
                              className={`text-[11px] font-bold flex items-center gap-1 px-2 py-1 rounded ${assignment.recordedCount > 0
                                ? 'text-primary bg-primary/10 hover:bg-primary/20'
                                : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                              title={assignment.recordedCount > 0 ? "Download scoresheet with existing records" : "Download empty template"}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              {assignment.recordedCount > 0 ? 'DOWNLOAD SCORES' : 'GET TEMPLATE'}
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAssignment(assignment);
                              }}
                              className={`text-[11px] font-bold flex items-center gap-1 px-2 py-1 rounded transition-colors ${selectedAssignment === assignment ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-primary/10'}`}
                            >
                              SELECT
                              {assignment.isCompleted && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Upload Form & Results (2/3 width) */}
            <div className="lg:w-2/3 space-y-6">
              {/* Upload Form Section */}
              <div className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 border-2 ${!selectedAssignment ? 'border-dashed border-gray-200' : 'border-primary/20'}`}>
                <div className={`px-6 py-5 border-b flex justify-between items-center ${selectedAssignment ? 'bg-primary/5' : 'bg-gray-50 text-gray-400'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedAssignment ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 leading-none">
                        {selectedAssignment
                          ? `Upload Results: ${selectedAssignment.subjectName}`
                          : 'Select Subject to Upload'
                        }
                      </h2>
                      <p className="text-xs mt-1 font-medium text-gray-500">
                        {selectedAssignment ? `${selectedAssignment.className} Scoresheet` : 'Choose from left column'}
                      </p>
                    </div>
                  </div>
                  {selectedAssignment && (
                    <button
                      onClick={() => setSelectedAssignment(null)}
                      className="text-xs font-bold text-gray-400 hover:text-red-500 flex items-center gap-1 uppercase tracking-tighter"
                    >
                      Clear ✕
                    </button>
                  )}
                </div>

                <div className="p-8">
                  {previewData ? (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="flex justify-between items-end border-b pb-4">
                        <div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Data Preview</h3>
                          <p className="text-xs font-bold text-slate-400">Verify scores before saving to database</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPreviewData(null)}
                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-rose-500 uppercase tracking-widest"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={finalizeUpload}
                            disabled={isSaving}
                            className={`px-6 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-all'}`}
                          >
                            {isSaving ? (
                              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {isSaving ? 'SAVING...' : 'FINALIZE & SAVE'}
                          </button>
                        </div>
                      </div>

                      {/* Grade Distribution Summary */}
                      <div className="grid grid-cols-5 gap-3">
                        {['A', 'B', 'C', 'D', 'F'].map(g => {
                          const count = previewData.filter(r => r.grade === g).length;
                          const pct = Math.round((count / previewData.length) * 100);
                          return (
                            <div key={g} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center">
                              <span className={`text-lg font-black ${g === 'F' ? 'text-rose-500' : 'text-primary'}`}>{g}</span>
                              <span className="text-[10px] font-black text-slate-400">{count} Students</span>
                              <div className="w-full bg-slate-200 h-1 mt-2 rounded-full overflow-hidden">
                                <div className={`h-full ${g === 'F' ? 'bg-rose-400' : 'bg-primary/50'}`} style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Scrollable Preview Table */}
                      <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto shadow-inner bg-slate-50/50">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-white border-b border-slate-100">
                            <tr>
                              <th className="p-3 font-black text-slate-500 uppercase">Student</th>
                              <th className="p-3 font-black text-slate-500 uppercase text-center">CA 1</th>
                              <th className="p-3 font-black text-slate-500 uppercase text-center">CA 2</th>
                              <th className="p-3 font-black text-slate-500 uppercase text-center">Exam</th>
                              <th className="p-3 font-black text-slate-500 uppercase text-center">Total</th>
                              <th className="p-3 font-black text-slate-500 uppercase text-center">Grade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {previewData.slice(0, 50).map((row, i) => (
                              <tr key={i} className="hover:bg-white transition-colors">
                                <td className="p-3">
                                  <p className="font-bold text-slate-900">{row.studentName || 'Unknown Student'}</p>
                                  <p className="text-[10px] text-slate-400 font-black">{row.admissionNumber}</p>
                                </td>
                                <td className="p-3 text-center text-slate-600 font-bold">{row.test1}</td>
                                <td className="p-3 text-center text-slate-600 font-bold">{row.test2}</td>
                                <td className="p-3 text-center text-slate-600 font-bold">{row.exam}</td>
                                <td className="p-3 text-center text-primary font-black">{row.total}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-1 rounded-md font-black text-[10px] ${row.grade === 'F' ? 'bg-rose-50 text-rose-500' : 'bg-primary/5 text-primary'}`}>
                                    {row.grade}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {previewData.length > 50 && (
                        <p className="text-center text-[10px] font-bold text-slate-400 italic">... and {previewData.length - 50} more students</p>
                      )}
                    </div>
                  ) : selectedAssignment ? (
                    <div className="space-y-8 animate-fadeIn">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 flex gap-4">
                        <div className="bg-white p-2 rounded-lg shadow-sm h-fit text-xl">
                          📂
                        </div>
                        <div className="text-sm">
                          <p className="text-blue-900 font-bold mb-1 underline">Instructions:</p>
                          <ul className="text-blue-800 space-y-1 list-disc list-inside font-medium opacity-90">
                            <li>Ensure you are using the template for <strong>{selectedAssignment.subjectName}</strong>.</li>
                            <li>Existing scores will be updated; new scores will be created.</li>
                            <li>After uploading, you will see a <strong>Preview Dashboard</strong> to verify data.</li>
                          </ul>
                        </div>
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
                    <div className="py-20 text-center space-y-4">
                      <div className="inline-block p-6 bg-slate-50 rounded-full grayscale opacity-50">
                        <svg className="h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div className="max-w-xs mx-auto">
                        <p className="text-slate-500 font-black text-lg uppercase tracking-tighter italic">No Subject Selected</p>
                        <p className="text-slate-400 text-xs mt-2 uppercase font-bold tracking-widest leading-loose">Select a subject from the left panel to begin the upload process</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Results Summary (Only shows on right side when data exists) */}
              {uploadResult && (
                <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-primary/10 animate-slideUp">
                  <div className="flex items-center gap-2 mb-6 border-b pb-4">
                    <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Upload Processed</h3>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <p className="text-xs font-bold text-green-600 uppercase">Created</p>
                      <p className="text-3xl font-black text-green-700">{uploadResult.successful.length}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <p className="text-xs font-bold text-blue-600 uppercase">Updated</p>
                      <p className="text-3xl font-black text-blue-700">{uploadResult.updated.length}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <p className="text-xs font-bold text-red-600 uppercase">Failed</p>
                      <p className="text-3xl font-black text-red-700">{uploadResult.failed.length}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {uploadResult.successful.length > 0 && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Recent Successes</h4>
                        <div className="max-h-40 overflow-y-auto text-sm space-y-2">
                          {uploadResult.successful.slice(0, 10).map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-2 rounded shadow-sm border border-gray-100">
                              <span className="font-bold text-gray-700">{item.studentName}</span>
                              <span className="bg-green-100 text-green-700 font-black px-2 py-0.5 rounded text-xs">{item.totalScore} ({item.grade})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {uploadResult.failed.length > 0 && (
                      <div className="p-4 bg-red-50/50 rounded-lg border border-red-100">
                        <h4 className="text-xs font-bold text-red-500 mb-3 uppercase tracking-widest">Error Log</h4>
                        <div className="max-h-40 overflow-y-auto text-sm space-y-2">
                          {uploadResult.failed.map((item, idx) => (
                            <div key={idx} className="bg-white p-2 rounded shadow-sm border border-red-200 flex flex-col">
                              <span className="font-black text-gray-800 text-xs">{item.data.admissionNumber}</span>
                              <span className="text-red-600 font-bold text-[11px] mt-0.5">{item.error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
