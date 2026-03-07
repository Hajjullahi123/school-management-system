import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useReactToPrint } from 'react-to-print';

// Make sure you have API_BASE_URL defined or imported here if using image URLs
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ProgressiveReport = () => {
  const { user } = useAuth();
  const [termId, setTermId] = useState('');
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selection states
  const [searchMode, setSearchMode] = useState('admission');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const { settings: schoolSettings } = useSchoolSettings();
  const componentRef = useRef();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isParentView = queryParams.get('view') === 'parent' || user?.role === 'parent';

  const weights = {
    assignment1: schoolSettings?.assignment1Weight || 5,
    assignment2: schoolSettings?.assignment2Weight || 5,
    test1: schoolSettings?.test1Weight || 10,
    test2: schoolSettings?.test2Weight || 10
  };

  useEffect(() => {
    if (user?.role === 'student' && user?.student?.id) {
      setSelectedStudentId(user.student.id);
    } else if (user?.role === 'teacher') {
      setSearchMode('bulk');
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const studentIdParam = params.get('studentId');
    if (studentIdParam && isParentView) {
      setSelectedStudentId(studentIdParam);
      setSearchMode('class');
    }
  }, [location, isParentView]);

  useEffect(() => {
    fetchTerms();
    if (isParentView) {
      fetchMyWards();
    } else if (user?.role !== 'student') {
      fetchClasses();
    }
  }, [user, isParentView]);

  const fetchMyWards = async () => {
    try {
      const response = await api.get('/api/parents/my-wards');
      const data = await response.json();
      setClassStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching wards:', error);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await api.get('/api/terms');
      const data = await response.json();
      const termsArray = Array.isArray(data) ? data : [];
      setTerms(termsArray);
      const currentTerm = termsArray.find(t => t.isCurrent);
      if (currentTerm) {
        setTermId(currentTerm.id.toString());
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      const data = await response.json();
      const classesArray = Array.isArray(data) ? data : [];
      if (user?.role === 'teacher') {
        const teacherClasses = classesArray.filter(c => c.classTeacherId === user.id);
        setClasses(teacherClasses);
        if (teacherClasses.length === 1) {
          setSelectedClassId(teacherClasses[0].id.toString());
        }
      } else {
        setClasses(classesArray);
      }
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

  const fetchReport = async () => {
    if (!termId) { alert('Please select a term'); return; }

    setLoading(true);
    setError(null);
    setReports([]);

    try {
      if (searchMode === 'bulk') {
        if (!selectedClassId) { alert('Please select a class for bulk generation.'); setLoading(false); return; }
        const response = await api.get(`/api/reports/bulk-progressive/${selectedClassId}/${termId}`);
        if (!response.ok) throw new Error('Failed to generate bulk reports');
        const data = await response.json();
        if (data.reports && data.reports.length > 0) {
          // inject top-level schoolSettings into every individual report
          const ss = data.schoolSettings;
          setReports(data.reports.map(r => ({ ...r, schoolSettings: ss || r.schoolSettings })));
        } else {
          setError('No students or results found for this class and term.');
        }
      } else {
        let targetStudentId = selectedStudentId;

        if (user?.role !== 'student' && searchMode === 'admission' && admissionNumber) {
          const lookupRes = await api.get(`/api/students/lookup?admissionNumber=${admissionNumber}`);
          if (!lookupRes.ok) throw new Error('Student not found with this Admission Number');
          const student = await lookupRes.json();
          targetStudentId = student.id;
        }

        if (!targetStudentId) { alert('Please select a student or enter a valid admission number'); setLoading(false); return; }

        const response = await api.get(`/api/reports/progressive-enhanced/${targetStudentId}/${termId}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || errData.error || 'Failed to fetch report');
        }
        const data = await response.json();
        setReports([data]);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error fetching report. Ensure results are published.');
    } finally {
      setLoading(false);
    }
  };

  const getSuffix = (n) => {
    if (!n || n === 'N/A') return '';
    const j = n % 10, k = n % 100;
    if (j == 1 && k != 11) { return n + "st"; }
    if (j == 2 && k != 12) { return n + "nd"; }
    if (j == 3 && k != 13) { return n + "rd"; }
    return n + "th";
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Progressive_Reports_${terms.find(t => t.id.toString() === termId)?.name || 'Term'}`,
  });

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Progressive Reports (Open Day)</h1>
        {reports.length > 0 && (
          <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            Print {reports.length > 1 ? 'All Reports' : 'Report'}
          </button>
        )}
      </div>

      {user?.role === 'teacher' && classes.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center border border-gray-200 print:hidden mb-6">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Access Restricted</h3>
          <p className="text-gray-600 mt-2">You are not assigned as a Form Master for any class. The report card section is reserved for Form Masters and Administrators.</p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Term *</label>
              <select value={termId} onChange={(e) => setTermId(e.target.value)} className="w-full border rounded-md px-3 py-2">
                <option value="">Select Term</option>
                {terms.map(t => (
                  <option key={t.id} value={t.id}>{t.name} - {t.academicSession?.name}</option>
                ))}
              </select>
            </div>

            {user?.role === 'student' ? (
              <div className="flex items-end">
                <button
                  onClick={fetchReport} disabled={loading}
                  className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400"
                >
                  {loading ? 'Generating...' : 'View My Report'}
                </button>
              </div>
            ) : isParentView ? (
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Ward</label>
                  <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="w-full border rounded-md px-3 py-2">
                    <option value="">Select Ward</option>
                    {classStudents.map(student => (
                      <option key={student.id} value={student.id}>{student.user.firstName} {student.user.lastName}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={fetchReport} disabled={loading}
                  className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400"
                >
                  {loading ? 'Generating...' : 'View Report'}
                </button>
              </div>
            ) : (
              <div className="col-span-1 md:col-span-2 space-y-4">
                {user?.role !== 'teacher' && (
                  <div className="flex gap-4 mb-2">
                    <label className="inline-flex items-center">
                      <input type="radio" value="admission" checked={searchMode === 'admission'} onChange={(e) => setSearchMode(e.target.value)} />
                      <span className="ml-2">By Admission No</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" value="class" checked={searchMode === 'class'} onChange={(e) => setSearchMode(e.target.value)} />
                      <span className="ml-2">By Class Student</span>
                    </label>
                    <label className="inline-flex items-center block">
                      <input type="radio" value="bulk" checked={searchMode === 'bulk'} onChange={(e) => setSearchMode(e.target.value)} />
                      <span className="ml-2 font-semibold">Bulk Print (Whole Class)</span>
                    </label>
                  </div>
                )}
                {user?.role === 'teacher' && (
                  <div className="flex gap-4 mb-2">
                    <label className="inline-flex items-center">
                      <input type="radio" value="class" checked={searchMode === 'class'} onChange={(e) => setSearchMode(e.target.value)} />
                      <span className="ml-2">Single Student</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" value="bulk" checked={searchMode === 'bulk'} onChange={(e) => setSearchMode(e.target.value)} />
                      <span className="ml-2 font-semibold">Bulk Print (Whole Class)</span>
                    </label>
                  </div>
                )}

                {searchMode === 'admission' && user?.role !== 'teacher' ? (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Admission Number *</label>
                      <input type="text" value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="e.g. 2024-SS1A-JD" />
                    </div>
                    <button onClick={fetchReport} disabled={loading} className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400">Generate</button>
                  </div>
                ) : (
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                      <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full border rounded-md px-3 py-2">
                        <option value="">Select Class</option>
                        {classes.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                      </select>
                    </div>
                    {searchMode === 'class' && (
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                        <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="w-full border rounded-md px-3 py-2" disabled={!selectedClassId}>
                          <option value="">Select Student</option>
                          {classStudents.map(student => (<option key={student.id} value={student.id}>{student.user.firstName} {student.user.lastName}</option>))}
                        </select>
                      </div>
                    )}
                    <button onClick={fetchReport} disabled={loading} className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400">
                      {loading ? 'Generating...' : searchMode === 'bulk' ? 'Generate Bulk Reports' : 'Generate'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>}

      {reports.length > 0 && (
        <div className="hidden lg:block bg-gray-50 p-6 rounded-lg text-sm text-gray-500 text-center mb-6 max-w-5xl mx-auto">
          (Previewing {reports.length} report{reports.length > 1 ? 's' : ''} below. Use the Print button to print all).
        </div>
      )}

      {reports.length > 0 && (
        <div className="print-safe-area relative bg-gray-200 p-2 sm:p-8 rounded" style={{ overflowX: 'auto' }}>
          <div ref={componentRef} className="print-container">
            {reports.map((data, index) => {
              const ss = data.schoolSettings || schoolSettings;
              const logoUri = ss?.logoUrl
                ? (ss.logoUrl.startsWith('http') || ss.logoUrl.startsWith('data:') ? ss.logoUrl : `${API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL}${ss.logoUrl.startsWith('/') ? ss.logoUrl : '/' + ss.logoUrl}`)
                : null;

              return (
                <div key={data.student.id} className="report-card-page bg-white mx-auto shadow-2xl relative overflow-hidden" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box', pageBreakAfter: index < reports.length - 1 ? 'always' : 'auto' }}>

                  {logoUri && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-0">
                      <img src={logoUri} alt="Watermark" className="w-[500px] h-[500px] object-contain" />
                    </div>
                  )}

                  <div className="relative z-10 print-safe-content font-sans text-gray-900 border-4 border-double border-gray-800 p-4 min-h-[265mm] flex flex-col">

                    <div className="flex items-center justify-between border-b-[3px] border-emerald-800 pb-4 mb-6" style={{ borderColor: ss?.primaryColor || '#065f46' }}>
                      {logoUri ? (
                        <img src={logoUri} alt="School Logo" className="w-24 h-24 object-contain" />
                      ) : (
                        <div className="w-24 h-24 bg-gray-200 flex items-center justify-center rounded-full text-xs text-gray-500">No Logo</div>
                      )}
                      <div className="text-center flex-1 px-4">
                        <h1 className="text-3xl font-black uppercase mb-1 tracking-wider text-emerald-800" style={{ color: ss?.primaryColor || '#065f46' }}>{ss?.name || 'School Name'}</h1>
                        <p className="text-sm font-semibold text-gray-700 uppercase">{ss?.address || 'School Address'}</p>
                        <p className="text-xs text-gray-600 mb-2">{ss?.phone} | {ss?.email}</p>
                        <div className="inline-block bg-emerald-800 text-white px-6 py-1.5 rounded-full font-bold uppercase tracking-widest text-sm shadow-sm" style={{ backgroundColor: ss?.primaryColor || '#065f46' }}>
                          PROGRESSIVE REPORT
                        </div>
                      </div>
                      {data.student.photoUrl ? (
                        <img src={data.student.photoUrl.startsWith('http') || data.student.photoUrl.startsWith('data:') ? data.student.photoUrl : `${API_BASE_URL}${data.student.photoUrl}`} alt="Student" className="w-24 h-28 object-cover border-2 border-gray-300 rounded shadow-sm" />
                      ) : (
                        <div className="w-24 h-28 bg-gray-100 flex items-center justify-center border-2 border-gray-300 rounded text-xs text-gray-400">Photo</div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-2 border-black mb-6 divide-y divide-black lg:divide-y-0 lg:divide-x bg-gray-50/50">
                      <div className="col-span-2 lg:col-span-2 p-2 border-b lg:border-b-0 border-black flex flex-col justify-center">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Name of Student</p>
                        <p className="font-bold text-sm uppercase">{data.student.name}</p>
                      </div>
                      <div className="p-2 border-b lg:border-b-0 border-r border-black flex flex-col justify-center">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Admission Number</p>
                        <p className="font-bold text-sm">{data.student.admissionNumber}</p>
                      </div>
                      <div className="p-2 border-b lg:border-b-0 border-black flex flex-col justify-center">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Class</p>
                        <p className="font-bold text-sm">{data.student.class}</p>
                      </div>

                      <div className="p-2 border-r border-black flex flex-col justify-center bg-white">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Term</p>
                        <p className="font-bold text-sm">{data.term.name}</p>
                      </div>
                      <div className="p-2 border-r border-black flex flex-col justify-center bg-white">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Academic Session</p>
                        <p className="font-bold text-sm">{data.term.session}</p>
                      </div>
                      <div className="p-2 border-r border-black flex flex-col justify-center bg-white">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Overall CA Score</p>
                        <p className="font-black text-sm text-emerald-800" style={{ color: ss?.primaryColor || '#065f46' }}>{data.performance.totalScore} / {(weights.assignment1 + weights.assignment2 + weights.test1 + weights.test2) * data.subjects.length}</p>
                      </div>
                      <div className="p-2 border-black flex flex-col justify-center bg-white">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Position in Class</p>
                        <p className="font-black text-sm text-emerald-800" style={{ color: ss?.primaryColor || '#065f46' }}>{getSuffix(data.performance.position)} Out of {data.performance.outOf}</p>
                      </div>
                    </div>

                    <div className="flex-1">
                      <table className="w-full border-collapse border-2 border-black mb-6 text-xs bg-white">
                        <thead>
                          <tr className="bg-emerald-800 text-white uppercase text-[10px] tracking-wider" style={{ backgroundColor: ss?.primaryColor || '#065f46' }}>
                            <th className="border border-black p-2 text-left w-1/4">Subjects</th>
                            <th className="border border-black p-1 text-center font-normal px-2">Ass. 1<br /><span className="text-[8px] opacity-75">({weights.assignment1})</span></th>
                            <th className="border border-black p-1 text-center font-normal px-2">Ass. 2<br /><span className="text-[8px] opacity-75">({weights.assignment2})</span></th>
                            <th className="border border-black p-1 text-center font-normal px-2">Test 1<br /><span className="text-[8px] opacity-75">({weights.test1})</span></th>
                            <th className="border border-black p-1 text-center font-normal px-2">Test 2<br /><span className="text-[8px] opacity-75">({weights.test2})</span></th>
                            <th className="border border-black p-2 text-center bg-black/20 font-bold w-16">Total<br /><span className="text-[8px] opacity-75">({weights.assignment1 + weights.assignment2 + weights.test1 + weights.test2})</span></th>
                            <th className="border border-black p-2 text-center w-20">Class Avg</th>
                            <th className="border border-black p-2 text-center font-bold">Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.subjects?.map((sub, i) => (
                            <tr key={i} className="hover:bg-gray-50 border-b border-gray-300">
                              <td className="border-x border-black p-2 font-bold text-gray-800 uppercase text-[11px]">{sub.subject.name}</td>
                              <td className="border-x border-gray-400 p-2 text-center">{sub.assignment1Score ?? '-'}</td>
                              <td className="border-x border-gray-400 p-2 text-center">{sub.assignment2Score ?? '-'}</td>
                              <td className="border-x border-gray-400 p-2 text-center">{sub.test1Score ?? '-'}</td>
                              <td className="border-x border-gray-400 p-2 text-center">{sub.test2Score ?? '-'}</td>
                              <td className="border-x border-black p-2 text-center font-bold bg-gray-100 text-sm text-emerald-800" style={{ color: ss?.primaryColor || '#065f46' }}>{sub.totalScore ?? '-'}</td>
                              <td className="border-x border-gray-400 p-2 text-center italic text-gray-600">{sub.averageInClass ? sub.averageInClass.toFixed(1) : '-'}</td>
                              <td className="border-x border-black p-2 text-center font-black text-emerald-800 bg-emerald-50/50">{getSuffix(sub.position)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-auto">
                      <div className="border border-black h-fit">
                        <div className="bg-gray-200 border-b border-black p-1 text-center font-bold uppercase text-[10px] tracking-wider">Attendance Profile</div>
                        <div className="grid grid-cols-3 divide-x divide-black p-2 text-center">
                          <div>
                            <p className="text-[9px] uppercase text-gray-500 mb-1">Days Present</p>
                            <p className="font-bold text-sm">{data.attendance.daysPresent}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase text-gray-500 mb-1">Days Absent</p>
                            <p className="font-bold text-sm text-red-600">{data.attendance.daysAbsent}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase text-gray-500 mb-1">Total Days</p>
                            <p className="font-bold text-sm">{data.attendance.totalDays}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 items-end justify-between px-4 pb-2">
                        <div className="text-center w-1/2">
                          <div className="h-10 border-b border-black mb-1 flex items-end justify-center">
                            {data.student?.formMasterSignatureUrl ? (
                              <img src={data.student.formMasterSignatureUrl.startsWith('http') || data.student.formMasterSignatureUrl.startsWith('data:') ? data.student.formMasterSignatureUrl : `${API_BASE_URL}${data.student.formMasterSignatureUrl}`} alt="Teacher Signature" className="h-8 object-contain mix-blend-multiply" />
                            ) : <span className="text-[8px] text-gray-300">No Signature Uploaded</span>}
                          </div>
                          <p className="text-[9px] uppercase font-bold text-gray-600">Form Master's Signature</p>
                          <p className="text-[8px] text-gray-400">{data.student.formMaster}</p>
                        </div>

                        <div className="text-center w-1/2">
                          <div className="h-10 border-b border-black mb-1 flex items-end justify-center">
                            {data.term?.principalSignatureUrl ? (
                              <img src={data.term.principalSignatureUrl.startsWith('http') || data.term.principalSignatureUrl.startsWith('data:') ? data.term.principalSignatureUrl : `${API_BASE_URL}${data.term.principalSignatureUrl}`} alt="Principal Signature" className="h-10 object-contain mix-blend-multiply" />
                            ) : <span className="text-[8px] text-gray-300">No Signature Uploaded</span>}
                          </div>
                          <p className="text-[9px] uppercase font-bold text-gray-600">Principal's Signature</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <style>{`
          @media print {
            body { background: white !important; margin: 0; padding: 0; }
            .print-safe-area { background: white !important; padding: 0 !important; }
            .print-container { width: 100% !important; margin: 0 !important; background: white !important; }
            .report-card-page {
              width: 100% !important; height: auto !important; min-height: 297mm;
              padding: 5mm !important; margin: 0 !important;
              box-shadow: none !important; break-after: page;
            }
            .print-safe-content {
              border: 3px solid black !important;
            }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}</style>
        </div>
      )}
    </div>
  );
};

export default ProgressiveReport;
