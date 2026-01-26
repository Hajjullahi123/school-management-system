import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const ResultEntry = () => {
  const { user, isDemo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { settings: schoolSettings } = useSchoolSettings();

  // Assessment Weights
  const weights = useMemo(() => ({
    assignment1: schoolSettings?.assignment1Weight || 5,
    assignment2: schoolSettings?.assignment2Weight || 5,
    test1: schoolSettings?.test1Weight || 10,
    test2: schoolSettings?.test2Weight || 10,
    exam: schoolSettings?.examWeight || 70
  }), [schoolSettings]);

  // Data States
  const [academicSessions, setAcademicSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);

  // Selection States
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Result Data States
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: '' }

  // Initial Data Fetch
  useEffect(() => {
    fetchAcademicSessions();

    if (user?.role === 'teacher') {
      fetchTeacherAssignments();
    } else {
      fetchClasses();
      fetchSubjects();
    }

    // Parse URL params for pre-selection (e.g. from Dashboard)
    const params = new URLSearchParams(location.search);
    const classIdParam = params.get('classId');
    const subjectIdParam = params.get('subjectId');
    const sessionIdParam = params.get('sessionId');
    const termIdParam = params.get('termId');

    if (classIdParam) setSelectedClass(classIdParam);
    if (subjectIdParam) setSelectedSubject(subjectIdParam);
    if (sessionIdParam) setSelectedSession(sessionIdParam);
    if (termIdParam) setSelectedTerm(termIdParam);
  }, [location, user]);

  // Fetch Students & Results when criteria are met
  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm) {
      fetchStudentsAndResults();
    } else {
      setStudents([]);
      setResults({});
    }
  }, [selectedClass, selectedSubject, selectedTerm]);

  // Fetch Terms when Session selected
  useEffect(() => {
    if (selectedSession) {
      fetchTerms(selectedSession);
    }
  }, [selectedSession]);

  // --- Data Fetching Functions ---

  const fetchAcademicSessions = async () => {
    try {
      const response = await api.get('/api/academic-sessions');
      const data = await response.json();
      setAcademicSessions(data);
      // Auto-select current session if not already set
      if (!selectedSession) {
        const current = data.find(s => s.isCurrent);
        if (current) setSelectedSession(current.id);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchTerms = async (sessionId) => {
    try {
      const response = await api.get(`/api/terms?sessionId=${sessionId}`);
      const data = await response.json();
      setTerms(data);
      // Auto-select current term if not already set
      if (!selectedTerm) {
        const current = data.find(t => t.isCurrent);
        if (current) setSelectedTerm(current.id);
      }
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

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/api/subjects');
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchTeacherAssignments = async () => {
    try {
      const response = await api.get(`/api/teacher-assignments/teacher/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setTeacherAssignments(data);
      }
    } catch (error) {
      console.error('Error fetching teacher assignments:', error);
    }
  };

  const fetchStudentsAndResults = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch Students
      const studentsResponse = await api.get(`/api/classes/${selectedClass}`);
      if (!studentsResponse.ok) {
        throw new Error(`Failed to fetch students: ${studentsResponse.statusText}`);
      }
      const classData = await studentsResponse.json();

      // Sort students alphabetically
      const loadedStudents = (classData.students || []).sort((a, b) => {
        const nameA = `${a.user?.firstName} ${a.user?.lastName}`.toLowerCase();
        const nameB = `${b.user?.firstName} ${b.user?.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setStudents(loadedStudents);

      // 2. Fetch Existing Results
      const resultsResponse = await api.get(
        `/api/results/class/${selectedClass}/subject/${selectedSubject}/term/${selectedTerm}`
      );
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const resultsMap = {};
        resultsData.forEach(r => resultsMap[r.studentId] = r);
        setResults(resultsMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMsg(error.message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Computed Dropdown Options (Dynamic Filtering) ---

  const filteredClasses = useMemo(() => {
    // Admin sees all classes
    if (user?.role !== 'teacher') return classes;

    // Teacher sees filtered list
    let relevant = teacherAssignments;

    // If Subject is selected, show only classes assigned for that subject
    if (selectedSubject) {
      relevant = relevant.filter(ta => ta.subject.id === parseInt(selectedSubject));
    }

    // Deduplicate
    const unique = [];
    const seen = new Set();
    relevant.forEach(ta => {
      if (ta.class && !seen.has(ta.class.id)) {
        seen.add(ta.class.id);
        unique.push(ta.class);
      }
    });

    return unique.sort((a, b) => a.name.localeCompare(b.name));
  }, [user, classes, teacherAssignments, selectedSubject]);

  const filteredSubjects = useMemo(() => {
    // Admin sees all subjects
    if (user?.role !== 'teacher') return subjects;

    // Teacher sees filtered list
    let relevant = teacherAssignments;

    // If Class is selected, show only subjects assigned for that class
    if (selectedClass) {
      relevant = relevant.filter(ta => ta.class.id === parseInt(selectedClass));
    }

    // Deduplicate
    const unique = [];
    const seen = new Set();
    relevant.forEach(ta => {
      if (ta.subject && !seen.has(ta.subject.id)) {
        seen.add(ta.subject.id);
        unique.push(ta.subject);
      }
    });

    return unique.sort((a, b) => a.name.localeCompare(b.name));
  }, [user, subjects, teacherAssignments, selectedClass]);

  // --- Handlers ---

  const handleScoreChange = (studentId, field, value) => {
    // 1. Strict Validation
    let numValue = value === '' ? null : parseFloat(value);

    if (numValue !== null) {
      const limits = {
        assignment1Score: weights.assignment1,
        assignment2Score: weights.assignment2,
        test1Score: weights.test1,
        test2Score: weights.test2,
        examScore: weights.exam
      };

      if (limits[field] !== undefined) {
        if (numValue < 0 || numValue > limits[field]) {
          setNotification({
            type: 'error',
            message: `Invalid Score: Maximum for ${field.replace('Score', '')} is ${limits[field]}`
          });
          // Auto-hide error
          setTimeout(() => setNotification(null), 3000);
          return; // REJECT the change
        }
      }
    }

    setResults(prev => {
      const current = prev[studentId] || {};
      const updated = { ...current, [field]: numValue };

      // Auto-calculate total and grade
      const val = (k) => updated[k] || 0;

      const total =
        val('assignment1Score') +
        val('assignment2Score') +
        val('test1Score') +
        val('test2Score') +
        val('examScore');

      updated.totalScore = total;
      updated.grade = getGrade(total);

      return { ...prev, [studentId]: updated };
    });
  };

  const getGrade = (score) => {
    if (schoolSettings?.gradingSystem) {
      try {
        const scale = JSON.parse(schoolSettings.gradingSystem);
        const found = scale.find(s => score >= s.min && score <= (s.max || 100));
        return found ? found.grade : 'F';
      } catch (e) {
        console.error('Error parsing grading system in ResultEntry');
      }
    }

    // Fallback
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 45) return 'D';
    if (score >= 40) return 'E';
    return 'F';
  };

  const getScoreColor = (score, max) => {
    if (score == null) return '';
    const pct = (score / max) * 100;
    if (pct >= 70) return 'text-green-600 font-bold';
    if (pct >= 50) return 'text-blue-600';
    if (pct < 40) return 'text-red-600 font-bold';
    return 'text-gray-800';
  };

  const handleSave = async () => {
    setSaving(true);
    setNotification(null);
    try {
      const resultsToSave = students.map(s => ({
        studentId: s.id,
        ...results[s.id]
      })).filter(r => r.totalScore !== undefined); // Only save records with at least some data logic? 
      // Actually backend upsert handles partials, but we usually want to send rows that have been touched.
      // Better filter: rows that have at least one score field not null.

      if (resultsToSave.length === 0) {
        setNotification({ type: 'error', message: 'No results to save.' });
        setSaving(false);
        return;
      }

      const response = await api.post('/api/results/batch-entry', {
        academicSessionId: parseInt(selectedSession),
        termId: parseInt(selectedTerm),
        classId: parseInt(selectedClass),
        subjectId: parseInt(selectedSubject),
        results: resultsToSave
      });

      const data = await response.json();
      if (response.ok) {
        setNotification({ type: 'success', message: `Successfully saved ${data.success || resultsToSave.length} results!` });
        // Refresh data to be sure
        fetchStudentsAndResults();
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Save error:', error);
      setNotification({ type: 'error', message: error.message || 'Error saving results' });
    } finally {
      setSaving(false);
      // Auto-hide notification
      setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded shadow-lg text-white font-medium transition-opacity ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
          {notification.message}
          <button onClick={() => setNotification(null)} className="ml-4 opacity-75 hover:opacity-100 font-bold">✕</button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Result Entry</h1>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || students.length === 0 || isDemo}
            className={`${isDemo ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:brightness-90'} text-white px-6 py-2 rounded-md disabled:opacity-50 flex items-center shadow-sm`}
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {isDemo ? 'Save Restricted (Demo)' : 'Save Results'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters Card */}
      {!new URLSearchParams(location.search).get('classId') && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Academic Session</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full border rounded-md px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Select Session</option>
                {academicSessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.name} {session.isCurrent && '(Current)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full border rounded-md px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Select Term</option>
                {terms.map(term => (
                  <option key={term.id} value={term.id}>
                    {term.name} {term.isCurrent && '(Current)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full border rounded-md px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-primary outline-none"
                disabled={filteredClasses.length === 0}
              >
                <option value="">Select Class</option>
                {filteredClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.arm || ''}
                  </option>
                ))}
              </select>
              {user?.role === 'teacher' && filteredClasses.length === 0 && (
                <p className="text-xs text-red-500 mt-1">No classes assigned.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full border rounded-md px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-primary outline-none"
                disabled={filteredSubjects.length === 0}
              >
                <option value="">Select Subject</option>
                {filteredSubjects.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
              {user?.role === 'teacher' && filteredSubjects.length === 0 && (
                <p className="text-xs text-red-500 mt-1">No subjects assigned.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Excel Download Section */}
      {selectedClass && selectedSubject && selectedTerm && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Offline Result Entry
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Download the <strong>Protected Excel Sheet</strong>, fill grades offline, and perform Bulk Upload.
                <br />
                <span className="text-xs text-orange-600">Note: Only score cells are editable. Inputs are validated.</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const response = await api.get(`/api/scoresheet/class/${selectedClass}/subject/${selectedSubject}?termId=${selectedTerm}&academicSessionId=${selectedSession}`);
                    if (!response.ok) throw new Error('Download failed');

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Scoresheet_Class${selectedClass}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    setNotification({ type: 'success', message: 'Excel Scoresheet downloaded.' });
                    setTimeout(() => setNotification(null), 3000);
                  } catch (error) {
                    console.error('Download error:', error);
                    setNotification({ type: 'error', message: 'Failed to download.' });
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow flex items-center gap-2 text-sm font-medium"
              >
                Download Excel Template
              </button>
              <button
                onClick={() => navigate('/dashboard/bulk-result-upload')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow flex items-center gap-2 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Go to Bulk Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="bg-yellow-50 p-4 rounded text-xs font-mono border border-yellow-200 shadow-sm flex flex-col md:flex-row justify-between">
        <div>
          <span className="font-bold text-yellow-800">Debug Info:</span>
          <span className="ml-2 text-yellow-900">Class ID: {selectedClass || 'None'}</span>
          <span className="ml-2 text-yellow-900">Subject ID: {selectedSubject || 'None'}</span>
          <span className="ml-2 text-yellow-900">Students: {students.length}</span>
        </div>
        <div>
          {errorMsg && <span className="text-red-600 font-bold">Error: {errorMsg}</span>}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading student data...</p>
        </div>
      ) : students.length > 0 ? (
        <div className="bg-white rounded-lg shadow ring-1 ring-black ring-opacity-5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-primary/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider sticky left-0 bg-primary/5 z-10 border-b border-primary/10">
                    Student Name
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-primary uppercase tracking-wider">
                    Assgn 1<br /><span className="text-primary text-[10px]">({weights.assignment1}%)</span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-primary uppercase tracking-wider">
                    Assgn 2<br /><span className="text-primary text-[10px]">({weights.assignment2}%)</span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-primary uppercase tracking-wider">
                    Test 1<br /><span className="text-primary text-[10px]">({weights.test1}%)</span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-primary uppercase tracking-wider">
                    Test 2<br /><span className="text-primary text-[10px]">({weights.test2}%)</span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-primary uppercase tracking-wider">
                    Exam<br /><span className="text-primary text-[10px]">({weights.exam}%)</span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-primary uppercase tracking-wider bg-primary/10">
                    Total<br /><span className="text-primary text-[10px]">(100%)</span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-primary uppercase tracking-wider bg-primary/10">
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student, index) => {
                  const studentResult = results[student.id] || {};
                  return (
                    <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800 sticky left-0 border-r" style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                        {student.user?.firstName} {student.user?.lastName}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="0"
                          max={weights.assignment1}
                          step="0.5"
                          value={studentResult.assignment1Score ?? ''}
                          onChange={(e) => handleScoreChange(student.id, 'assignment1Score', e.target.value)}
                          disabled={isDemo}
                          className={`w-16 border border-gray-300 rounded px-1 py-1 text-center text-sm focus:ring-primary focus:border-primary ${isDemo ? 'bg-gray-50' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="0"
                          max={weights.assignment2}
                          step="0.5"
                          value={studentResult.assignment2Score ?? ''}
                          onChange={(e) => handleScoreChange(student.id, 'assignment2Score', e.target.value)}
                          disabled={isDemo}
                          className={`w-16 border border-gray-300 rounded px-1 py-1 text-center text-sm focus:ring-primary focus:border-primary ${isDemo ? 'bg-gray-50' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="0"
                          max={weights.test1}
                          step="0.5"
                          value={studentResult.test1Score ?? ''}
                          onChange={(e) => handleScoreChange(student.id, 'test1Score', e.target.value)}
                          disabled={isDemo}
                          className={`w-16 border border-gray-300 rounded px-1 py-1 text-center text-sm focus:ring-primary focus:border-primary ${isDemo ? 'bg-gray-50' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="0"
                          max={weights.test2}
                          step="0.5"
                          value={studentResult.test2Score ?? ''}
                          onChange={(e) => handleScoreChange(student.id, 'test2Score', e.target.value)}
                          disabled={isDemo}
                          className={`w-16 border border-gray-300 rounded px-1 py-1 text-center text-sm focus:ring-primary focus:border-primary ${isDemo ? 'bg-gray-50' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="0"
                          max={weights.exam}
                          step="0.5"
                          value={studentResult.examScore ?? ''}
                          onChange={(e) => handleScoreChange(student.id, 'examScore', e.target.value)}
                          disabled={isDemo}
                          className={`w-20 border-2 border-gray-300 rounded px-2 py-1 text-center font-medium focus:ring-primary focus:border-primary ${isDemo ? 'bg-gray-50' : ''}`}
                        />
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-center font-bold text-lg bg-primary/5 border-l ${getScoreColor(studentResult.totalScore, 100)}`}>
                        {studentResult.totalScore?.toFixed(1) || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center font-bold text-lg bg-primary/5">
                        <span className={`px-3 py-1 rounded-full text-sm ${studentResult.grade === 'A' ? 'bg-green-100 text-green-800' :
                          studentResult.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                            studentResult.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                              studentResult.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                                studentResult.grade === 'F' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                          }`}>
                          {studentResult.grade || '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : selectedClass && selectedSubject && selectedTerm ? (
        <div className="bg-white p-16 rounded-lg shadow-sm border border-gray-100 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">No students found</h3>
          <p className="mt-1 text-gray-500">There are no students assigned to this class yet.</p>
        </div>
      ) : (
        <div className="bg-white p-16 rounded-lg shadow-sm border border-gray-100 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">Select Criteria</h3>
          <p className="mt-1 text-gray-500">Please select Session, Term, Class, and Subject to start entering results.</p>
        </div>
      )}
    </div>
  );
};

export default ResultEntry;
