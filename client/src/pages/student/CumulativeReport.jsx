import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useReactToPrint } from 'react-to-print';

const CumulativeReport = () => {
  const { user } = useAuth();
  const { settings: schoolSettings } = useSchoolSettings();
  const [reportData, setReportData] = useState(null);   // single report
  const [bulkReports, setBulkReports] = useState([]);   // bulk reports array
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [searchMode, setSearchMode] = useState('admission'); // 'admission', 'class', 'bulk'
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const printRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isParentView = queryParams.get('view') === 'parent' || user?.role === 'parent';

  useEffect(() => {
    if (user?.role === 'student' && user?.student?.id) {
      setSelectedStudentId(user.student.id);
    } else if (user?.role === 'teacher') {
      setSearchMode('class');
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
    fetchSessions();
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
      const wards = Array.isArray(data) ? data : [];
      setClassStudents(wards);
      if (wards.length === 1) {
        setSelectedStudentId(wards[0].id.toString());
      }
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
      if (currentSession) setSelectedSession(currentSession.id.toString());
    } catch (error) {
      console.error('Error fetching sessions:', error);
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
        if (teacherClasses.length === 1) setSelectedClassId(teacherClasses[0].id.toString());
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

  const fetchCumulativeReport = async () => {
    if (!selectedSession) { alert('Please select an academic session'); return; }
    setLoading(true);
    setError(null);
    setReportData(null);
    setBulkReports([]);

    try {
      // BULK mode
      if (searchMode === 'bulk') {
        if (!selectedClassId) { alert('Please select a class for bulk generation.'); setLoading(false); return; }
        const response = await api.get(`/api/reports/bulk-cumulative/${selectedClassId}/${selectedSession}`);
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to generate bulk cumulative reports');
        }
        const data = await response.json();
        if (data.reports && data.reports.length > 0) {
          setBulkReports(data.reports);
        } else {
          setError('No students or results found for this class and session.');
        }
        return;
      }

      // SINGLE mode
      let targetStudentId = selectedStudentId;
      if (user?.role !== 'student' && searchMode === 'admission' && admissionNumber) {
        const lookupRes = await api.get(`/api/students/lookup?admissionNumber=${admissionNumber}`);
        if (!lookupRes.ok) throw new Error('Student not found with this Admission Number');
        const student = await lookupRes.json();
        targetStudentId = student.id;
      }
      if (!targetStudentId) { alert('Please select a student or enter a valid admission number'); setLoading(false); return; }

      const response = await api.get(`/api/reports/cumulative/${targetStudentId}/${selectedSession}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        const err = await response.json();
        if (response.status === 403 && err.error === 'Result Not Published') {
          setError(err.message);
        } else {
          setError(err.error || 'Failed to fetch report');
        }
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setError(err.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const buildLogoUrl = (logoUrl) => {
    if (!logoUrl) return null;
    if (logoUrl.startsWith('data:') || logoUrl.startsWith('http')) return logoUrl;
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${base}${logoUrl.startsWith('/') ? logoUrl : '/' + logoUrl}`;
  };

  const buildPhotoUrl = (photoUrl) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('data:') || photoUrl.startsWith('http')) return photoUrl;
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${base}${photoUrl.startsWith('/') ? photoUrl : '/' + photoUrl}`;
  };

  // Renders a single report card — works for single or bulk
  const renderCard = (data, index, total) => {
    const ss = data.schoolSettings || schoolSettings;
    const logoUri = buildLogoUrl(ss?.logoUrl);
    const photoUri = buildPhotoUrl(data.student?.user?.photoUrl || data.student?.photoUrl);
    const isLast = index === total - 1;
    const reportColor = ss?.reportColorScheme || ss?.primaryColor;
    const reportFont = ss?.reportFontFamily || 'serif';
    const layout = ss?.reportLayout || 'classic';
    const borderStyle = layout === 'minimal' ? 'border-[2px] border-gray-400' : layout === 'modern' ? 'border-[6px] rounded-2xl' : 'border-[12px]';

    return (
      <div
        key={data.student?.id || index}
        className={`relative bg-white p-8 print:p-4 shadow-2xl print:shadow-none text-black ${borderStyle} print:emerald-border-A4`}
        style={{ pageBreakAfter: !isLast ? 'always' : 'auto', breakAfter: !isLast ? 'page' : 'auto', fontFamily: reportFont, borderColor: layout !== 'minimal' ? reportColor : undefined }}
      >
        <div className="relative z-10 space-y-3 print:space-y-2">
          {/* HEADER */}
          <div className="flex justify-between items-start gap-4">
            <div className="w-24 h-24 flex-shrink-0">
              {logoUri ? (
                <img src={logoUri} alt="Logo" className="w-full h-full object-contain object-left" />
              ) : (
                <div className="w-full h-full border-2 border-emerald-800 rounded-full flex items-center justify-center text-[9px] text-gray-400 font-bold uppercase">No Logo</div>
              )}
            </div>

            <div className="flex-1 text-center">
              <h1 className="text-2xl font-extrabold uppercase tracking-wider leading-tight text-emerald-900" style={{ color: reportColor }}>
                {ss?.name || 'SCHOOL NAME'}
              </h1>
              <p className="text-sm font-bold italic text-gray-700">{ss?.motto || 'Excellence and Dedication'}</p>
              <p className="text-xs font-bold">{ss?.address || 'School Address'}, TEL: {ss?.phone || '---'}, Email: {ss?.email || '---'}</p>
              <div className="mt-4 border-b-2 inline-block px-4 pb-1" style={{ borderColor: reportColor }}>
                <h2 className="text-lg font-bold uppercase tracking-wide">ANNUAL CUMULATIVE PERFORMANCE REPORT</h2>
              </div>
            </div>

            <div className="w-24 h-24 border-2 border-emerald-800 flex-shrink-0 bg-gray-50 flex items-center justify-center overflow-hidden">
              {photoUri ? (
                <img src={photoUri} className="w-full h-full object-cover" alt="Student" />
              ) : (
                <span className="text-[10px] text-gray-400 font-bold uppercase">PASSPORT</span>
              )}
            </div>
          </div>

          {/* STUDENT BIO */}
          <div className="grid grid-cols-4 border-2 border-black divide-x-2 divide-black text-[10px] font-bold uppercase bg-gray-50">
            <div className="p-1.5"><span className="text-gray-500">NAME:</span> {data.student?.name}</div>
            <div className="p-1.5"><span className="text-gray-500">ADM NO:</span> {data.student?.admissionNumber}</div>
            <div className="p-1.5"><span className="text-gray-500">CLASS:</span> {data.student?.class}</div>
            <div className="p-1.5"><span className="text-gray-500">SESSION:</span> {data.session?.name}</div>
          </div>

          {/* CUMULATIVE SCORE TABLE */}
          <div className="border-2 border-black rounded-sm overflow-hidden">
            <table className="w-full text-[10px] uppercase font-bold text-center border-collapse">
              <thead className="bg-emerald-800 text-white border-b-2 border-black" style={{ backgroundColor: reportColor }}>
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
                {data.subjects?.map((sub, idx) => (
                  <tr key={idx} className={`${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'} divide-x divide-gray-300`}>
                    <td className="p-1.5 text-left pl-3 font-extrabold border-r-2 border-black">{sub.name}</td>
                    <td className="p-1.5">{sub.term1 || '-'}</td>
                    <td className="p-1.5">{sub.term2 || '-'}</td>
                    <td className="p-1.5">{sub.term3 || '-'}</td>
                    <td className="p-1.5 font-black bg-gray-50">{sub.average?.toFixed(1) || '0.0'}</td>
                    <td className={`p-1.5 font-black ${sub.grade === 'F' ? 'text-red-600' : 'text-emerald-900'}`}>{sub.grade}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-black bg-gray-200 divide-x divide-black">
                <tr className="font-black">
                  <td className="p-2 text-right pr-6 uppercase border-r-2 border-black">ANNUAL PERFORMANCE SUMMARY</td>
                  <td className="p-2" colSpan={3}>
                    <div className="flex justify-around text-xs">
                      <span>AVERAGE: {data.overallAverage?.toFixed(2)}%</span>
                    </div>
                  </td>
                  <td className="p-2 text-white text-xs border-l-2 border-black" colSpan={2} style={{ backgroundColor: reportColor || '#064e3b' }}>
                    OVERALL GRADE: {data.overallGrade}
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
                <span className={`text-lg font-black italic tracking-widest ${data.isPromoted ? 'text-emerald-700' : 'text-red-600'}`}>
                  {data.nextClass?.toUpperCase() || 'RESULT PENDING'}
                </span>
              </div>
              <div className="border-t border-gray-300 pt-2">
                <span className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">PRINCIPAL'S REMARK:</span>
                <p className="text-xs font-black italic leading-tight text-emerald-900">{data.overallRemark}</p>
              </div>
            </div>
            <div className="border-2 border-black rounded-lg p-3 bg-gray-100 flex flex-col justify-center text-center">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2">OFFICIAL SEAL / STAMP</h4>
              <div className="w-16 h-16 border-2 border-dashed border-gray-400 rounded-full mx-auto flex items-center justify-center opacity-30">
                <span className="text-[8px] font-black">STAMP HERE</span>
              </div>
            </div>
          </div>

          {/* SIGNATURES */}
          <div className="mt-4 grid grid-cols-2 gap-8 items-end p-2 print:mt-2">
            <div className="space-y-2 text-center">
              <div className="border-b-2 border-black py-1 min-h-[30px] flex items-center justify-center">
                {data.student?.formMasterSignatureUrl ? (
                  <img src={buildPhotoUrl(data.student.formMasterSignatureUrl)} alt="Teacher Signature" className="h-[40px] w-auto mix-blend-multiply" />
                ) : (
                  <span className="font-signature italic text-lg">{data.student?.formMaster}</span>
                )}
              </div>
              <span className="text-[9px] font-black block uppercase text-gray-600">CLASS TEACHER'S SIGNATURE</span>
            </div>
            <div className="space-y-2 text-center">
              <div className="border-b-2 border-black py-1 min-h-[30px] flex items-center justify-center">
                {data.session?.principalSignatureUrl ? (
                  <img src={buildPhotoUrl(data.session.principalSignatureUrl)} alt="Principal Signature" className="h-[50px] w-auto mix-blend-multiply" />
                ) : (
                  <span className="text-[8px] text-gray-300">No Signature Uploaded</span>
                )}
              </div>
              <span className="text-[9px] font-black block uppercase text-gray-600">PRINCIPAL'S SIGNATURE</span>
            </div>
          </div>

          {/* FOOTER */}
          <div className="pt-2 border-t border-gray-200 flex justify-between items-center opacity-60">
            <div className="text-[8px] font-bold text-gray-500 flex items-center gap-1 italic">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.9L10 1.55l7.834 3.35a1 1 0 01.583.912v5.188a10 10 0 01-5.188 8.163l-3.229 1.737a1 1 0 01-.912 0l-3.229-1.737A10 10 0 011.583 11V5.812a1 1 0 01.583-.912z" clipRule="evenodd" />
              </svg>
              VALID FOR ACADEMIC SESSION: {data.session?.name}
            </div>
            <div className="text-[8px] font-bold text-gray-400">DATE GENERATED: {new Date().toLocaleDateString('en-GB')}</div>
          </div>
        </div>
      </div>
    );
  };

  const hasReports = reportData || bulkReports.length > 0;
  const allReports = bulkReports.length > 0 ? bulkReports : (reportData ? [reportData] : []);

  return (
    <div className="space-y-6 max-h-[calc(100vh-180px)] overflow-y-auto pr-2 pb-10" style={{
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      {/* Hide scrollbar but keep functionality */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header Section - Glassmorphism */}
      <div className="relative group overflow-hidden rounded-[32px] p-1 bg-gradient-to-br from-indigo-600 via-primary to-emerald-600 shadow-2xl no-print">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative bg-white/5 backdrop-blur-sm p-6 sm:p-8 rounded-[31px] text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="min-w-0 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mb-3">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Annual Performance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter italic mb-1 uppercase text-white">Cumulative Reports</h1>
            <p className="text-xs sm:text-sm text-white/70 font-medium tracking-wide">Three-Term Holistic Academic Summary</p>
          </div>
          
          {hasReports && (
            <button 
              onClick={handlePrint} 
              className="group/btn bg-white text-primary px-6 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-white"
            >
              <svg className="w-5 h-5 transition-transform group-hover/btn:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Master {bulkReports.length > 1 ? 'Bundle' : 'Report'}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {user?.role === 'teacher' && classes.length === 0 ? (
        <div className="bg-white p-12 rounded-[32px] shadow-2xl text-center border border-slate-100 no-print group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-50"></div>
          <div className="w-24 h-24 bg-amber-100 rounded-[28px] flex items-center justify-center mx-auto mb-6 relative">
            <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight relative">Access Restricted</h3>
          <p className="text-slate-500 mt-2 font-medium max-w-sm mx-auto relative text-sm">Form Master permission required to access cumulative annual reports.</p>
        </div>
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-xl border border-slate-100 mb-6 no-print">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Academic Session</label>
              <select 
                value={selectedSession} 
                onChange={(e) => setSelectedSession(e.target.value)} 
                className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="">Select Target Session</option>
                {sessions.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>

            {user?.role === 'student' || isParentView ? (
              <div className="md:col-span-2 flex flex-col sm:flex-row items-end gap-4">
                {isParentView && (
                  <div className="flex-1 w-full space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Selected Ward</label>
                    {classStudents.length === 1 ? (
                      <div className="w-full bg-slate-100 border-white rounded-2xl px-4 py-4 text-sm font-bold text-slate-700 shadow-inner">
                        {classStudents[0].user.firstName} {classStudents[0].user.lastName}
                      </div>
                    ) : (
                      <select 
                        value={selectedStudentId} 
                        onChange={(e) => setSelectedStudentId(e.target.value)} 
                        className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="">Choose Ward</option>
                        {classStudents.map((ward) => (
                          <option key={ward.id} value={ward.id}>{ward.user.firstName} {ward.user.lastName}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                <button 
                  onClick={fetchCumulativeReport} 
                  disabled={!selectedSession || !selectedStudentId || loading}
                  className="bg-slate-900 text-white h-[54px] px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 transition-all w-full sm:w-auto"
                >
                  {loading ? 'Analyzing Data...' : isParentView ? 'Fetch Report' : 'View Cumulative Insights'}
                </button>
              </div>
            ) : (
              <div className="col-span-1 md:col-span-2 space-y-6 pt-4 border-t border-slate-50">
                <div className="flex flex-wrap gap-4">
                  {(user?.role !== 'teacher' ? ['admission', 'class', 'bulk'] : ['class', 'bulk']).map(mode => (
                    <label 
                      key={mode}
                      className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all cursor-pointer font-black text-[10px] uppercase tracking-widest ${searchMode === mode ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
                    >
                      <input 
                        type="radio" 
                        className="hidden" 
                        value={mode} 
                        checked={searchMode === mode} 
                        onChange={(e) => setSearchMode(e.target.value)} 
                      />
                      {mode === 'admission' ? 'By ID' : mode === 'class' ? 'Single' : 'Bulk Collection'}
                    </label>
                  ))}
                </div>

                {searchMode === 'admission' && user?.role !== 'teacher' ? (
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Admission Number</label>
                      <input 
                        type="text" 
                        value={admissionNumber} 
                        onChange={(e) => setAdmissionNumber(e.target.value)} 
                        className="w-full bg-slate-50 border-white rounded-2xl px-5 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-indigo-500 transition-all font-mono" 
                        placeholder="ENTER STUDENT ID" 
                      />
                    </div>
                    <button 
                      onClick={fetchCumulativeReport} 
                      disabled={loading || !selectedSession} 
                      className="bg-primary text-white h-[54px] px-10 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:bg-slate-200 transition-all"
                    >
                      {loading ? 'Searching...' : 'GENERATE'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Target Class</label>
                      <select 
                        value={selectedClassId} 
                        onChange={(e) => setSelectedClassId(e.target.value)} 
                        className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        <option value="">Select Level</option>
                        {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
                      </select>
                    </div>
                    {searchMode !== 'bulk' && (
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Student Name</label>
                        <select 
                          value={selectedStudentId} 
                          onChange={(e) => setSelectedStudentId(e.target.value)} 
                          className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-indigo-500 transition-all" 
                          disabled={!selectedClassId}
                        >
                          <option value="">Choose Student</option>
                          {classStudents.map((student) => (
                            <option key={student.id} value={student.id}>{student.user.firstName} {student.user.lastName}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button 
                      onClick={fetchCumulativeReport} 
                      disabled={loading || !selectedClassId || !selectedSession || (searchMode !== 'bulk' && !selectedStudentId)} 
                      className={`h-[54px] rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 disabled:bg-slate-200 transition-all px-8 ${searchMode === 'bulk' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-primary text-white'}`}
                    >
                      {loading ? 'Processing...' : searchMode === 'bulk' ? `Collect all Reports` : 'Generate'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md no-print">{error}</div>}

      {/* Bulk info bar */}
      {bulkReports.length > 1 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 flex justify-between items-center no-print">
          <span className="text-emerald-800 font-semibold">✅ {bulkReports.length} reports generated. Click "Print All" to print.</span>
        </div>
      )}

      {/* Report(s) Display */}
      {hasReports && (
        <div className="max-w-[210mm] mx-auto no-scrollbar overflow-x-auto print:overflow-visible">
          <div ref={printRef} className="print-container">
            {allReports.map((data, idx) => renderCard(data, idx, allReports.length))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasReports && !loading && !error && (
        <div className="bg-white rounded-lg shadow p-12 text-center no-print">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-lg font-medium">Select a session and student to generate their Annual Cumulative Report</p>
        </div>
      )}

      <style>{`
        @media print {
          @page { 
            size: A4; 
            margin: 0; 
          }
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .min-h-screen { background: white !important; padding: 0 !important; }
          
          .emerald-border-A4 { 
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            margin: 0 auto !important;
            padding: 8mm !important;
            box-sizing: border-box !important;
            border: 6px solid #065f46 !important; 
            -webkit-print-color-adjust: exact; 
          }

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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default CumulativeReport;
