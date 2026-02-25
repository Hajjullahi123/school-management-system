import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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

  const location = useLocation();

  // Automatically select student for student role
  useEffect(() => {
    if (user?.role === 'student' && user?.student?.id) {
      setSelectedStudentId(user.student.id);
    }
  }, [user]);

  // Handle direct navigation from Parent Dashboard
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const studentIdParam = params.get('studentId');
    if (studentIdParam && user?.role === 'parent') {
      setSelectedStudentId(studentIdParam);
      setSearchMode('class');
    }
  }, [location, user]);

  useEffect(() => {
    fetchSessions();
    if (user?.role === 'parent') {
      fetchMyWards();
    } else if (user?.role !== 'student') {
      fetchClasses();
    }
  }, [user]);

  const fetchMyWards = async () => {
    try {
      const response = await api.get('/api/parents/my-wards');
      const data = await response.json();
      setClassStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching wards:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get('/api/academic-sessions');
      const data = await response.json();
      const sessionsArray = Array.isArray(data) ? data : [];
      setSessions(sessionsArray);
      const currentSession = sessionsArray.find(s => s.isCurrent);
      if (currentSession) {
        setSelectedSession(currentSession.id.toString());
      }
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

          {user?.role === 'student' || user?.role === 'parent' ? (
            <div className="md:col-span-2 flex items-end gap-4">
              {user?.role === 'parent' && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
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
              )}
              <button
                onClick={fetchCumulativeReport}
                disabled={!selectedSession || !selectedStudentId || loading}
                className="bg-primary text-white px-8 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400 w-full md:w-auto font-bold shadow"
              >
                {loading ? 'Generating...' : user?.role === 'parent' ? 'View Report' : 'View My Cumulative Report'}
              </button>
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
        <div className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none no-scrollbar overflow-x-auto print:overflow-visible">
          <div id="result-sheet" className="relative bg-white p-8 print:p-4 shadow-2xl print:shadow-none print:break-after-page text-black font-serif border-[12px] border-emerald-800 print:emerald-border-A4">

            <div className="relative z-10 space-y-3 print:space-y-2">
              {/* HEAD SECTION */}
              <div className="flex justify-between items-start gap-4">
                <div className="w-24 h-24 flex-shrink-0">
                  {schoolSettings?.logoUrl && (
                    <img
                      src={schoolSettings.logoUrl.startsWith('data:') || schoolSettings.logoUrl.startsWith('http') ? schoolSettings.logoUrl : `${API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL}${schoolSettings.logoUrl.startsWith('/') ? schoolSettings.logoUrl : '/' + schoolSettings.logoUrl}`}
                      alt="Logo"
                      className="w-full h-full object-contain object-left"
                    />
                  )}
                </div>

                <div className="flex-1 text-center">
                  <h1 className="text-2xl font-extrabold uppercase tracking-wider leading-tight text-emerald-900" style={{ color: schoolSettings?.primaryColor }}>
                    {schoolSettings?.schoolName || 'SCHOOL NAME'}
                  </h1>
                  <p className="text-sm font-bold italic text-gray-700">{schoolSettings?.schoolMotto || 'Excellence and Dedication'}</p>
                  <p className="text-xs font-bold">{schoolSettings?.address || 'School Address Location'}, TEL: {schoolSettings?.phone || '000000'}, Email: {schoolSettings?.email || 'email@school.com'}</p>

                  <div className="mt-4 border-b-2 border-emerald-800 inline-block px-4 pb-1">
                    <h2 className="text-lg font-bold uppercase tracking-wide">
                      ANNUAL CUMULATIVE PERFORMANCE REPORT
                    </h2>
                  </div>
                </div>

                <div className="w-24 h-24 border-2 border-emerald-800 flex-shrink-0 bg-gray-50 flex items-center justify-center overflow-hidden">
                  {reportData.student?.photoUrl ? (
                    <img
                      src={`${API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL}${reportData.student.photoUrl.startsWith('/') ? reportData.student.photoUrl : '/' + reportData.student.photoUrl}`}
                      className="w-full h-full object-cover"
                      alt="Student"
                    />
                  ) : (
                    <span className="text-[10px] text-gray-400 font-bold uppercase">PASSPORT</span>
                  )}
                </div>
              </div>

              {/* STUDENT BIO INFO */}
              <div className="grid grid-cols-4 border-2 border-black divide-x-2 divide-black text-[10px] font-bold uppercase bg-gray-50 uppercase">
                <div className="p-1.5"><span className="text-gray-500">NAME:</span> {reportData.student?.name}</div>
                <div className="p-1.5"><span className="text-gray-500">ADM NO:</span> {reportData.student?.admissionNumber}</div>
                <div className="p-1.5"><span className="text-gray-500">CLASS:</span> {reportData.student?.class}</div>
                <div className="p-1.5"><span className="text-gray-500">SESSION:</span> {reportData.session?.name}</div>
              </div>

              {/* CUMULATIVE SCORE TABLE */}
              <div className="border-2 border-black rounded-sm overflow-hidden">
                <table className="w-full text-[10px] uppercase font-bold text-center border-collapse">
                  <thead className="bg-emerald-800 text-white border-b-2 border-black">
                    <tr className="divide-x divide-white/20">
                      <th className="p-2 text-left w-[35%] bg-emerald-900 border-r-2 border-black">SUBJECT</th>
                      <th className="p-2 w-[12%]">1st TERM</th>
                      <th className="p-2 w-[12%]">2nd TERM</th>
                      <th className="p-2 w-[12%]">3rd TERM</th>
                      <th className="p-2 w-[15%] bg-emerald-700">ANNUAL AVG</th>
                      <th className="p-2 w-[14%] bg-gray-900 border-l border-white/20">GRADE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {reportData.subjects?.map((sub, idx) => (
                      <tr key={idx} className={`${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'} divide-x divide-gray-300`}>
                        <td className="p-1.5 text-left pl-3 font-extrabold border-r-2 border-black">{sub.name}</td>
                        <td className="p-1.5">{sub.term1 || '-'}</td>
                        <td className="p-1.5">{sub.term2 || '-'}</td>
                        <td className="p-1.5">{sub.term3 || '-'}</td>
                        <td className="p-1.5 font-black bg-gray-50">{sub.average?.toFixed(1) || '0.0'}</td>
                        <td className={`p-1.5 font-black ${sub.grade === 'F' ? 'text-red-600' : 'text-emerald-900'}`}>
                          {sub.grade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* TOTALS ROW */}
                  <tfoot className="border-t-2 border-black bg-gray-200 divide-x divide-black">
                    <tr className="font-black">
                      <td className="p-2 text-right pr-6 uppercase border-r-2 border-black">ANNUAL PERFORMANCE SUMMARY</td>
                      <td className="p-2" colSpan={3}>
                        <div className="flex justify-around text-xs">
                          <span>AVERAGE: {reportData.overallAverage?.toFixed(2)}%</span>
                        </div>
                      </td>
                      <td className="p-2 bg-emerald-900 text-white text-xs border-l-2 border-black" colSpan={2}>
                        OVERALL GRADE: {reportData.overallGrade}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* PROMOTION & SUMMARY */}
              <div className="grid grid-cols-[65%_34%] gap-2 mt-1">
                <div className="border-2 border-black rounded-lg p-3 bg-gray-50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-gray-600">PROMOTION STATUS:</span>
                    <span className={`text-lg font-black italic tracking-widest ${reportData.isPromoted ? 'text-emerald-700' : 'text-red-600'}`}>
                      {reportData.nextClass?.toUpperCase() || 'RESULT PENDING'}
                    </span>
                  </div>
                  <div className="border-t border-gray-300 pt-2">
                    <span className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">PRINCIPAL'S REMARK:</span>
                    <p className="text-xs font-black italic leading-tight text-emerald-900">
                      {reportData.overallRemark}
                    </p>
                  </div>
                </div>

                <div className="border-2 border-black rounded-lg p-3 bg-gray-100 flex flex-col justify-center text-center">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2">OFFICIAL SEAL / STAMP</h4>
                  <div className="w-16 h-16 border-2 border-dashed border-gray-400 rounded-full mx-auto flex items-center justify-center opacity-30">
                    <span className="text-[8px] font-black">STAMP HERE</span>
                  </div>
                </div>
              </div>

              {/* SIGNATURES SECTION */}
              <div className="mt-4 grid grid-cols-2 gap-8 items-end p-2 print:mt-2">
                <div className="space-y-2 text-center">
                  <div className="border-b-2 border-black font-signature italic text-lg py-1 min-h-[30px]">
                    {reportData.student?.formMaster}
                  </div>
                  <span className="text-[9px] font-black block uppercase text-gray-600">CLASS TEACHER</span>
                </div>

                <div className="space-y-2 text-center">
                  <div className="border-b-2 border-black font-signature italic text-lg py-1 min-h-[30px]">
                    {/* Placeholder for Principal Signature */}
                  </div>
                  <span className="text-[9px] font-black block uppercase text-gray-600">PRINCIPAL'S SIGNATURE</span>
                </div>
              </div>

              {/* FOOTER VERIFICATION */}
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center opacity-60">
                <div className="text-[8px] font-bold text-gray-500 flex items-center gap-1 italic">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.9L10 1.55l7.834 3.35a1 1 0 01.583.912v5.188a10 10 0 01-5.188 8.163l-3.229 1.737a1 1 0 01-.912 0l-3.229-1.737A10 10 0 011.583 11V5.812a1 1 0 01.583-.912z" clipRule="evenodd" />
                  </svg>
                  VALID FOR ACADEMIC SESSION: {reportData.session?.name}
                </div>
                <div className="text-[8px] font-bold text-gray-400">
                  DATE GENERATED: {new Date().toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!reportData && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center no-print">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-lg font-medium">Select a session and student to generate their Annual Cumulative Report</p>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 5mm; }
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .min-h-screen { background: white !important; padding: 0 !important; }
          .max-w-[210mm] { max-width: 100% !important; margin: 0 !important; width: 100% !important; }
          .emerald-border-A4 { border: 8px solid #065f46 !important; -webkit-print-color-adjust: exact; }
          table { border-collapse: collapse !important; width: 100% !important; }
          td, th { border: 1px solid black !important; padding: 4px !important; }
          * { box-sizing: border-box !important; }
          .bg-emerald-800 { background-color: #065f46 !important; -webkit-print-color-adjust: exact; }
          .bg-emerald-900 { background-color: #064e3b !important; -webkit-print-color-adjust: exact; }
          .bg-gray-900 { background-color: #111827 !important; -webkit-print-color-adjust: exact; }
          .bg-gray-200 { background-color: #e5e7eb !important; -webkit-print-color-adjust: exact; }
          .bg-gray-100 { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
          .bg-gray-50 { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; }
        }
        
        * { box-sizing: border-box !important; }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default CumulativeReport;
