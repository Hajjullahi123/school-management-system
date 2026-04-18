import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';

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
      const wards = Array.isArray(data) ? data : [];
      setClassStudents(wards);
      if (wards.length === 1) {
        setSelectedStudentId(wards[0].id.toString());
      }
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
    <div className="space-y-6 max-h-[calc(100vh-180px)] overflow-y-auto pr-2 pb-10" style={{
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      {/* Hide scrollbar but keep functionality */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header Section - Glassmorphism */}
      <div className="relative group overflow-hidden rounded-[32px] p-1 bg-gradient-to-br from-emerald-600 via-teal-500 to-primary shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative bg-white/5 backdrop-blur-sm p-6 sm:p-8 rounded-[31px] text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="min-w-0 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Academic Monitoring</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter italic mb-1 uppercase">Progressive Reports</h1>
            <p className="text-xs sm:text-sm text-white/70 font-medium tracking-wide">Continuous Assessment & Open Day Analytics</p>
          </div>
          
          {reports.length > 0 && (
            <button 
              onClick={handlePrint} 
              className="group/btn bg-white text-emerald-900 px-6 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-white"
            >
              <svg className="w-5 h-5 transition-transform group-hover/btn:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Master {reports.length > 1 ? 'Bundle' : 'Report'}
            </button>
          )}
        </div>
      </div>

      {user?.role === 'teacher' && classes.length === 0 ? (
        <div className="bg-white p-12 rounded-[32px] shadow-2xl text-center border border-slate-100 print:hidden mb-6 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-50"></div>
          <div className="w-24 h-24 bg-amber-100 rounded-[28px] flex items-center justify-center mx-auto mb-6 relative">
            <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight relative">Access Restricted</h3>
          <p className="text-slate-500 mt-2 font-medium max-w-sm mx-auto relative">You are not assigned as a Form Master. The report section is restricted to class teachers and admins.</p>
        </div>
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-xl border border-slate-100 mb-6 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Academic Term</label>
              <select 
                value={termId} 
                onChange={(e) => setTermId(e.target.value)} 
                className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
              >
                <option value="">Select Target Term</option>
                {terms.map(t => (
                  <option key={t.id} value={t.id}>{t.name} - {t.academicSession?.name}</option>
                ))}
              </select>
            </div>

            {user?.role === 'student' ? (
              <button
                onClick={fetchReport} 
                disabled={loading || !termId}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 transition-all"
              >
                {loading ? 'Initializing Analytics...' : 'View My Progressive Stats'}
              </button>
            ) : isParentView ? (
              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Selected Ward</label>
                  {classStudents.length === 1 ? (
                    <div className="w-full bg-slate-100 border-white rounded-2xl px-4 py-4 text-sm font-bold text-slate-700 shadow-inner">
                      {classStudents[0].user.firstName} {classStudents[0].user.lastName}
                    </div>
                  ) : (
                    <select 
                      value={selectedStudentId} 
                      onChange={(e) => setSelectedStudentId(e.target.value)} 
                      className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                    >
                      <option value="">Choose Ward</option>
                      {classStudents.map(student => (
                        <option key={student.id} value={student.id}>{student.user.firstName} {student.user.lastName}</option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  onClick={fetchReport} 
                  disabled={loading || !termId || !selectedStudentId}
                  className="bg-primary text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:bg-slate-200 transition-all"
                >
                  {loading ? 'Fetching...' : 'View Report'}
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
                      {mode === 'admission' ? 'By ID' : mode === 'class' ? 'Single' : 'Bulk Generation'}
                    </label>
                  ))}
                </div>

                {searchMode === 'admission' ? (
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Admission Number</label>
                      <input 
                        type="text" 
                        value={admissionNumber} 
                        onChange={(e) => setAdmissionNumber(e.target.value)} 
                        className="w-full bg-slate-50 border-white rounded-2xl px-5 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-emerald-500 transition-all" 
                        placeholder="FORMAT: 2024-SS1A-XXX" 
                      />
                    </div>
                    <button 
                      onClick={fetchReport} 
                      disabled={loading || !termId}
                      className="bg-primary text-white h-[54px] px-10 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:bg-slate-200 transition-all"
                    >
                      {loading ? 'Searching...' : 'GENERATE'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Target Class</label>
                      <select 
                        value={selectedClassId} 
                        onChange={(e) => setSelectedClassId(e.target.value)} 
                        className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-emerald-500 transition-all"
                      >
                        <option value="">Choose Class</option>
                        {classes.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                      </select>
                    </div>
                    {searchMode === 'class' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Student Profile</label>
                        <select 
                          value={selectedStudentId} 
                          onChange={(e) => setSelectedStudentId(e.target.value)} 
                          className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-emerald-500 transition-all" 
                          disabled={!selectedClassId}
                        >
                          <option value="">Select Student</option>
                          {classStudents.map(student => (<option key={student.id} value={student.id}>{student.user.firstName} {student.user.lastName}</option>))}
                        </select>
                      </div>
                    )}
                    <button 
                      onClick={fetchReport} 
                      disabled={loading || !termId || !selectedClassId || (searchMode === 'class' && !selectedStudentId)}
                      className={`h-[54px] rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 disabled:bg-slate-200 transition-all px-8 ${searchMode === 'bulk' ? 'bg-orange-600 text-white' : 'bg-primary text-white'}`}
                    >
                      {loading ? 'Processing...' : searchMode === 'bulk' ? 'Generate Class Bundle' : 'Generate'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-700 p-6 rounded-[24px] mb-6 border-2 border-rose-100 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-black uppercase tracking-widest text-xs italic">{error}</span>
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <div className="lg:block bg-slate-900/5 backdrop-blur-md p-5 rounded-[24px] text-[10px] font-black text-slate-500 text-center mb-6 uppercase tracking-[0.2em]">
          Master View: <span className="text-slate-900">{reports.length} Prepared Document{reports.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {reports.length > 0 && (
        <div className="print-safe-area relative bg-slate-100/50 backdrop-blur-xl p-4 sm:p-10 rounded-[40px] shadow-inner border border-white" style={{ overflowX: 'auto' }}>
          <div ref={componentRef} className="print-container">
            {reports.map((data, index) => {
              const ss = data.schoolSettings || schoolSettings;
              const rs = data.reportSettings || {};
              const reportColor = rs.reportColorScheme || ss?.reportColorScheme || ss?.primaryColor || '#065f46';
              const reportFont = rs.reportFontFamily || ss?.reportFontFamily || 'sans-serif';
              const showPosition = rs.showPositionOnReport !== undefined ? rs.showPositionOnReport : ss?.showPositionOnReport !== false;
              const logoUri = ss?.logoUrl
                ? (ss.logoUrl.startsWith('http') || ss.logoUrl.startsWith('data:') ? ss.logoUrl : `${API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL}${ss.logoUrl.startsWith('/') ? ss.logoUrl : '/' + ss.logoUrl}`)
                : null;

              return (
                <div key={data.student.id} className="report-card-page bg-white mx-auto shadow-2xl relative overflow-hidden" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box', pageBreakAfter: index < reports.length - 1 ? 'always' : 'auto', fontFamily: reportFont }}>

                  {logoUri && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-0">
                      <img src={logoUri} alt="Watermark" className="w-[500px] h-[500px] object-contain" />
                    </div>
                  )}

                  <div className="relative z-10 print-safe-content font-sans text-gray-900 border-4 border-double border-gray-800 p-4 min-h-[265mm] flex flex-col">

                    <div className="flex items-center justify-between border-b-[3px] border-emerald-800 pb-4 mb-6" style={{ borderColor: reportColor }}>
                      {logoUri ? (
                        <img src={logoUri} alt="School Logo" className="w-24 h-24 object-contain" />
                      ) : (
                        <div className="w-24 h-24 bg-gray-200 flex items-center justify-center rounded-full text-xs text-gray-500">No Logo</div>
                      )}
                      <div className="text-center flex-1 px-4">
                        <h1 className="text-3xl font-black uppercase mb-1 tracking-wider text-emerald-800" style={{ color: reportColor }}>{ss?.name || 'School Name'}</h1>
                        <p className="text-sm font-semibold text-gray-700 uppercase">{ss?.address || 'School Address'}</p>
                        <p className="text-xs text-gray-600 mb-2">{ss?.phone} | {ss?.email}</p>
                        <div className="inline-block bg-emerald-800 text-white px-6 py-1.5 rounded-full font-bold uppercase tracking-widest text-sm shadow-sm" style={{ backgroundColor: reportColor }}>
                          PROGRESSIVE REPORT
                        </div>
                      </div>
                      {(() => {
                        const photo = data.student.user?.photoUrl || data.student.photoUrl;
                        return photo ? (
                          <img src={photo.startsWith('http') || photo.startsWith('data:') ? photo : `${API_BASE_URL}${photo}`} alt="Student" className="w-24 h-28 object-cover border-2 border-gray-300 rounded shadow-sm" />
                        ) : (
                          <div className="w-24 h-28 bg-gray-100 flex items-center justify-center border-2 border-gray-300 rounded text-xs text-gray-400">Photo</div>
                        );
                      })()}
                    </div>

                    {rs.reportLayout === 'modern' ? (
                      <div className="grid grid-cols-4 gap-2 text-[10px] uppercase font-bold mb-6">
                        <div className="col-span-1 bg-gray-50/50 p-2 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                          {(() => {
                            const photo = data.student.user?.photoUrl || data.student.photoUrl;
                            return photo ? (
                              <img src={photo.startsWith('http') || photo.startsWith('data:') ? photo : `${API_BASE_URL}${photo}`} className="w-20 h-20 rounded-full object-cover border-2 shadow-sm" style={{ borderColor: reportColor }} alt="Student" />
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-[8px] text-gray-400">NO PHOTO</div>
                            );
                          })()}
                        </div>
                        <div className="col-span-3 grid grid-cols-2 gap-2">
                           <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                             <p className="text-[8px] text-gray-400 mb-0.5">FULL NAME</p>
                             <p className="text-xs truncate font-black" style={{ color: reportColor }}>{data.student.name}</p>
                           </div>
                           <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                             <p className="text-[8px] text-gray-400 mb-0.5">ADMISSION NO</p>
                             <p className="text-xs font-black">{data.student.admissionNumber}</p>
                           </div>
                           <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                             <p className="text-[8px] text-gray-400 mb-0.5">CLASS / SESSION</p>
                             <p className="text-xs font-bold">{data.student.class} | {data.term.session}</p>
                           </div>
                           <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                             <p className="text-[8px] text-gray-400 mb-0.5">POS / STATUS</p>
                             <div className="flex justify-between items-center pr-2">
                               <p className="text-xs font-bold">{showPosition ? `${getSuffix(data.performance.position)} / ${data.performance.outOf}` : 'HIDDEN'}</p>
                               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                             </div>
                           </div>
                        </div>
                      </div>
                    ) : (
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
                          <p className="font-black text-sm text-emerald-800" style={{ color: reportColor }}>{data.performance.totalScore} / {(weights.assignment1 + weights.assignment2 + weights.test1 + weights.test2) * data.subjects.length}</p>
                        </div>
                        <div className="p-2 border-black flex flex-col justify-center bg-white">
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Position in Class</p>
                          {showPosition && (
                          <p className="font-black text-sm text-emerald-800" style={{ color: reportColor }}>{getSuffix(data.performance.position)} Out of {data.performance.outOf}</p>
                          )}
                          {!showPosition && (
                          <p className="font-bold text-sm text-gray-400 italic">Hidden</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex-1">
                      <table className="w-full border-collapse border-2 border-black mb-6 text-xs bg-white">
                        <thead>
                          <tr className="bg-emerald-800 text-white uppercase text-[10px] tracking-wider" style={{ backgroundColor: ss?.reportColorScheme || ss?.primaryColor || '#065f46' }}>
                            <th className="border border-black p-2 text-left w-1/4">Subjects</th>
                            <th className="border border-black p-1 text-center font-normal px-2">Ass. 1<br /><span className="text-[8px] opacity-75">({weights.assignment1})</span></th>
                            <th className="border border-black p-1 text-center font-normal px-2">Ass. 2<br /><span className="text-[8px] opacity-75">({weights.assignment2})</span></th>
                            <th className="border border-black p-1 text-center font-normal px-2">Test 1<br /><span className="text-[8px] opacity-75">({weights.test1})</span></th>
                            <th className="border border-black p-1 text-center font-normal px-2">Test 2<br /><span className="text-[8px] opacity-75">({weights.test2})</span></th>
                            <th className="border border-black p-2 text-center bg-black/20 font-bold w-16">Total<br /><span className="text-[8px] opacity-75">({weights.assignment1 + weights.assignment2 + weights.test1 + weights.test2})</span></th>
                            <th className="border border-black p-2 text-center w-20">Class Avg</th>
                            {showPosition && <th className="border border-black p-2 text-center font-bold">Position</th>}
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
                              <td className="border-x border-black p-2 text-center font-bold bg-gray-100 text-sm text-emerald-800" style={{ color: reportColor }}>{sub.totalScore ?? '-'}</td>
                              <td className="border-x border-gray-400 p-2 text-center italic text-gray-600">{sub.averageInClass ? sub.averageInClass.toFixed(1) : '-'}</td>
                              {showPosition && <td className="border-x border-black p-2 text-center font-black text-emerald-800 bg-emerald-50/50">{getSuffix(sub.position)}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-auto">
                      {showAttendance && (
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
                      )}

                      <div className="flex gap-4 items-end justify-between px-4 pb-0">
                        <div className="text-center w-1/2">
                          <div className="h-10 border-b border-black mb-1 flex items-end justify-center">
                            {data.student?.formMasterSignatureUrl ? (
                              <img src={data.student.formMasterSignatureUrl.startsWith('http') || data.student.formMasterSignatureUrl.startsWith('data:') ? data.student.formMasterSignatureUrl : `${API_BASE_URL}${data.student.formMasterSignatureUrl}`} alt="Teacher Signature" className="h-[40px] object-contain mix-blend-multiply" />
                            ) : <span className="font-signature italic text-lg leading-none">{data.student?.formMaster || 'Teacher'}</span>}
                          </div>
                          <p className="text-[9px] uppercase font-bold text-gray-600">Form Master's Signature</p>
                        </div>

                        <div className="text-center w-1/2">
                          <div className="h-10 border-b border-black mb-1 flex items-end justify-center">
                            {ss?.principalSignatureUrl ? (
                              <img src={ss.principalSignatureUrl.startsWith('http') || ss.principalSignatureUrl.startsWith('data:') ? ss.principalSignatureUrl : `${API_BASE_URL}${ss.principalSignatureUrl}`} alt="Principal Signature" className="h-[50px] object-contain mix-blend-multiply" />
                            ) : <span className="text-[8px] text-gray-300 italic opacity-50 underline decoration-dotted">FOR OFFICIAL USE - PRINCIPAL</span>}
                          </div>
                          <p className="text-[9px] uppercase font-bold text-gray-600">Principal's Signature</p>
                        </div>
                      </div>
                    </div>

                    {/* DOCUMENT VERIFICATION FOOTER */}
                    <div className="mt-auto border-t border-gray-200 pt-3 flex justify-between items-center bg-transparent">
                      <div className="flex items-center gap-4">
                        <div className="group/qr relative bg-white p-1 rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md">
                          <QRCodeSVG 
                            value={`${window.location.origin}/verify/progressive/${data.student.id}/${data.term.id}`}
                            size={45}
                            level="H"
                            includeMargin={false}
                            className="grayscale hover:grayscale-0 transition-all duration-500 cursor-help"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[8px] font-black text-slate-900 flex items-center gap-1 uppercase tracking-tighter">
                            <svg className="w-2.5 h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M2.166 4.9L10 1.55l7.834 3.35a1 1 0 01.583.912v5.188a10 10 0 01-5.188 8.163l-3.229 1.737a1 1 0 01-.912 0l-3.229-1.737A10 10 0 011.583 11V5.812a1 1 0 01.583-.912z" clipRule="evenodd" />
                            </svg>
                            DIGITALLY VERIFIED PROGRESSIVE REPORT
                          </div>
                          <div className="text-[7px] font-bold text-gray-400 tracking-tight uppercase">Continuous Assessment Audit Trail</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[8px] font-black text-slate-900 uppercase tracking-tighter">Academic Tracking</div>
                        <div className="text-[7px] font-bold text-gray-400">{data.term.name.toUpperCase()} • GEN: {new Date().toLocaleDateString('en-GB')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <style>{`
          @media print {
            @page { 
              size: A4; 
              margin: 0; 
            }
            body { background: white !important; margin: 0; padding: 0; }
            .print-safe-area { background: white !important; padding: 0 !important; }
            .print-container { width: 100% !important; margin: 0 !important; background: white !important; }
            .report-card-page {
              width: 210mm !important; 
              height: 297mm !important;
              max-height: 297mm !important;
              overflow: hidden !important;
              padding: 8mm !important; 
              margin: 0 auto !important;
              box-sizing: border-box !important;
              box-shadow: none !important; 
              page-break-after: always !important;
              break-after: page !important;
              background: white !important;
            }
            .print-safe-content {
              border: 3px solid black !important;
              height: 100% !important;
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
