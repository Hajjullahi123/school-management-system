import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { QRCodeSVG } from 'qrcode.react';

const TermReportCard = () => {
  const { user } = useAuth();
  const { settings: schoolSettings } = useSchoolSettings();
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [classes, setClasses] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [bulkReports, setBulkReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selection states
  const [searchMode, setSearchMode] = useState('admission'); // 'admission', 'class'
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isParentView = queryParams.get('view') === 'parent' || user?.role === 'parent';

  // Automatically select student for student role
  useEffect(() => {
    if (user?.role === 'student' && user?.student?.id) {
      setSelectedStudentId(user.student.id);
      if (user.student.admissionNumber) {
        setAdmissionNumber(user.student.admissionNumber);
      }
    } else if (user?.role === 'teacher') {
      setSearchMode('class');
    }
  }, [user]);

  // Handle direct navigation from Parent Dashboard
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const studentIdParam = params.get('studentId');
    if (studentIdParam && user?.role === 'parent') {
      setSelectedStudentId(studentIdParam);
      setSearchMode('class'); // Ensure it's in a mode that uses selectedStudentId
    }
  }, [location, user]);

  // Trigger fetch if student and term are auto-selected
  useEffect(() => {
    if (selectedStudentId && selectedTerm && (isParentView || user?.role === 'student')) {
      fetchReport();
    }
  }, [selectedStudentId, selectedTerm, isParentView]);

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
        setSelectedTerm(currentTerm.id.toString());
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
      setClassStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchReport = async () => {
    if (!selectedTerm) {
      alert('Please select a term');
      return;
    }

    setLoading(true);
    setReportData(null);
    setBulkReports([]);
    setError(null);

    try {
      // BULK MODE: All Students in Class
      if (searchMode === 'class' && selectedClassId && selectedStudentId === 'all') {
        const response = await api.get(`/api/reports/bulk/${selectedClassId}/${selectedTerm}`);

        if (!response.ok) {
          throw new Error('Failed to generate bulk reports');
        }

        const data = await response.json();

        if (!data || !data.reports || !Array.isArray(data.reports) || data.reports.length === 0) {
          alert('No results found for any student in this class.');
        } else {
          setBulkReports(data.reports);
        }
        setLoading(false);
        return;
      }

      // SINGLE MODE
      let targetStudentId = selectedStudentId;

      if (user?.role === 'student') {
        targetStudentId = user.studentProfile?.id || user.student?.id;
      }

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
        `/api/reports/term/${targetStudentId}/${selectedTerm}`
      );

      // Parse JSON once
      let data;
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (isJson) {
        data = await response.json();
      }

      if (response.status === 403) {
        if (data && data.error === 'Result Not Published') {
          setReportData(null);
          throw new Error(data.message || 'Results have not been published for this term yet.');
        }
      }

      if (!response.ok) {
        let errorMessage = 'Failed to fetch report';
        if (data) {
          errorMessage = data.message || data.error || errorMessage;
        }
        throw new Error(errorMessage);
      }

      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
      let msg = error.message || 'Failed to load report';
      if (msg.includes('Not Published')) {
        msg = "Results have not been published for this term yet.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const calculateCA = (subject) => {
    return (subject.assignment1 || 0) + (subject.assignment2 || 0) + (subject.test1 || 0) + (subject.test2 || 0);
  };

  const getGradeAnalysis = (subjects) => {
    const analysis = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    subjects.forEach(sub => {
      const grade = sub.grade || 'F';
      if (analysis[grade] !== undefined) analysis[grade]++;
    });
    return analysis;
  };

  const renderRatingTicks = (score) => {
    const rounded = Math.round(score);
    return (
      <>
        {[5, 4, 3, 2, 1].map(val => (
          <td key={val} className="border border-black text-center w-6 h-6">
            {rounded === val ? '✔' : ''}
          </td>
        ))}
      </>
    );
  };

  const splitDomains = (ratings) => {
    const defaultAffective = [
      'Punctuality', 'Neatness', 'Politeness', 'Honesty', 'Relationship with others',
      'Cooperation', 'Leadership', 'Self Control', 'Attentiveness', 'Reliability', 'Perseverance'
    ];
    const defaultPsychomotor = [
      'Handwriting', 'Games/Sports', 'Crafts', 'Musical Skills', 'Drawing/Painting',
      'Verbal Communication', 'Fluency in Speech', 'Physical Agility'
    ];

    if (!ratings || ratings.length === 0) {
      return {
        affective: defaultAffective.map(name => ({ name, score: null })),
        psychomotor: defaultPsychomotor.map(name => ({ name, score: null }))
      };
    }

    const mid = Math.ceil(ratings.length / 2);
    let affective = [...ratings.slice(0, mid)];
    let psychomotor = [...ratings.slice(mid)];

    // Ensure we have a decent number of domains to fill space
    defaultAffective.forEach(name => {
      if (affective.length < 12 && !affective.find(a => a.name.toLowerCase() === name.toLowerCase())) {
        affective.push({ name, score: null });
      }
    });

    defaultPsychomotor.forEach(name => {
      if (psychomotor.length < 10 && !psychomotor.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        psychomotor.push({ name, score: null });
      }
    });

    return { affective, psychomotor };
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">


      {/* Header Section - Glassmorphism */}
      <div className="relative group overflow-hidden rounded-[32px] p-1 bg-gradient-to-br from-indigo-600 via-primary to-emerald-600 shadow-2xl print:hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative bg-white/5 backdrop-blur-sm p-6 sm:p-8 rounded-[31px] text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="min-w-0 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Academic Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter italic mb-1 uppercase text-white">Term Report Cards</h1>
            <p className="text-xs sm:text-sm text-white/70 font-medium tracking-wide">Secure Student Performance & Analytics</p>
          </div>
          
          {reportData && (
            <button 
              onClick={printReport} 
              className="group/btn bg-white text-primary px-6 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-white"
            >
              <svg className="w-5 h-5 transition-transform group-hover/btn:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Master Report
            </button>
          )}
        </div>
      </div>

      {/* Filter Section (Hidden on Print) */}
      {user?.role === 'teacher' && classes.length === 0 ? (
        <div className="bg-white p-12 rounded-[32px] shadow-2xl text-center border border-slate-100 print:hidden mb-6 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-50"></div>
          <div className="w-24 h-24 bg-amber-100 rounded-[28px] flex items-center justify-center mx-auto mb-6 relative">
            <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight relative">Access Restricted</h3>
          <p className="text-slate-500 mt-2 font-medium max-w-sm mx-auto relative text-sm">Form Master permission is required to access primary term reports.</p>
        </div>
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-xl border border-slate-100 mb-6 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Select Target Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-primary transition-all cursor-pointer"
              >
                <option value="">Select Academic Term</option>
                {terms.map(term => (
                  <option key={term.id} value={term.id}>
                    {term.name} - {term.academicSession?.name}
                  </option>
                ))}
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
                        className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                      >
                        <option value="">Select Student</option>
                        {classStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.user.firstName} {s.user.lastName}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                <button
                  onClick={fetchReport}
                  disabled={!selectedTerm || !selectedStudentId || loading}
                  className="bg-slate-900 text-white h-[54px] px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 transition-all w-full sm:w-auto"
                >
                  {loading ? 'Initializing Analytics...' : isParentView ? 'Fetch Report' : 'View My Profile'}
                </button>
              </div>
            ) : (
              <div className="col-span-1 md:col-span-2 space-y-6 pt-4 border-t border-slate-50">
                <div className="flex flex-wrap gap-4">
                  {(user?.role !== 'teacher' ? ['admission', 'class'] : ['class']).map(mode => (
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
                      {mode === 'admission' ? 'By ID' : 'By Class Student'}
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
                        className="w-full bg-slate-50 border-white rounded-2xl px-5 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-primary transition-all font-mono"
                        placeholder="FORMAT: 2024-SS1A-XXX"
                      />
                    </div>
                    <button onClick={fetchReport} disabled={loading} className="bg-primary text-white h-[54px] px-10 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:bg-slate-200 transition-all">
                      {loading ? 'SEARCHING...' : 'GENERATE'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Target Grade</label>
                      <select 
                        value={selectedClassId} 
                        onChange={(e) => setSelectedClassId(e.target.value)} 
                        className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-primary transition-all"
                      >
                        <option value="">Select Level</option>
                        {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name} {cls.arm}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Student Name</label>
                        <select 
                          value={selectedStudentId} 
                          onChange={(e) => setSelectedStudentId(e.target.value)} 
                          className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-primary transition-all" 
                          disabled={!selectedClassId}
                        >
                          <option value="">Choose Student</option>
                          <option value="all">-- COLLECT ENTIRE CLASS --</option>
                          {classStudents.map(s => <option key={s.id} value={s.id}>{s.user.firstName} {s.user.lastName}</option>)}
                        </select>
                      </div>
                      <button onClick={fetchReport} disabled={loading || !selectedStudentId} className="h-[54px] bg-primary text-white px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 disabled:bg-slate-200 transition-all">
                        {loading ? '...' : 'COLLECT'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 font-bold text-center print:hidden">{error}</div>}

      {/* Report Card Display */}
      {(reportData || bulkReports.length > 0) && (
        <>
          {(Array.isArray(bulkReports) && bulkReports.length > 0 ? bulkReports : [reportData]).map((data, idx) => {
            if (!data || !data.student) return null;

            const reportColor = data.reportSettings?.reportColorScheme || (data.schoolSettings || schoolSettings)?.reportColorScheme || (data.schoolSettings || schoolSettings)?.primaryColor;
            const reportFont = data.reportSettings?.reportFontFamily || (data.schoolSettings || schoolSettings)?.reportFontFamily || 'serif';
            const showPosition = data.reportSettings?.showPositionOnReport !== undefined ? data.reportSettings.showPositionOnReport : ((data.schoolSettings || schoolSettings)?.showPositionOnReport !== false);
            const showFees = data.reportSettings?.showFeesOnReport !== undefined ? data.reportSettings.showFeesOnReport : ((data.schoolSettings || schoolSettings)?.showFeesOnReport !== false);
            const showAttendance = data.reportSettings?.showAttendanceOnReport !== undefined ? data.reportSettings.showAttendanceOnReport : ((data.schoolSettings || schoolSettings)?.showAttendanceOnReport !== false);
            const layout = data.reportSettings?.reportLayout || (data.schoolSettings || schoolSettings)?.reportLayout || 'classic';
            const borderStyle = layout === 'minimal' ? 'border-[2px] border-gray-400' : layout === 'modern' ? 'border-[6px] rounded-2xl' : 'border-[12px]';

            const domainSplit = splitDomains(data.psychomotorRatings);
            const gradeAnalysis = getGradeAnalysis(data.subjects || []);
            const termNumber = data.term?.number || data.academic?.termNumber;

            return (
              <div key={idx} className="mb-12 last:mb-0">
                {/* Mobile Scroll Hint */}
                <div className="md:hidden flex items-center justify-center gap-2 mb-4 text-primary font-bold text-xs uppercase tracking-widest animate-pulse no-print">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  Scroll to view full sheet
                </div>

                <div className="report-card-mobile-wrapper overflow-x-auto pb-8 print:overflow-visible">
                  <div className="report-card-scaler origin-top-left sm:origin-top scale-[0.45] xs:scale-[0.55] sm:scale-100 transition-transform duration-500">
                    <div key={idx} className={`relative bg-white p-8 print:p-0 my-8 print:my-0 shadow-2xl print:shadow-none text-black ${borderStyle} print:emerald-print-A4 mx-auto w-[210mm] min-w-[210mm]`} style={{ fontFamily: reportFont, borderColor: layout !== 'minimal' ? reportColor : undefined }}>

                {/* PROTECTION WATERMARK */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] rotate-[-35deg] overflow-hidden z-0 print:opacity-[0.05]">
                    {schoolSettings?.logoUrl && (
                      <img 
                        src={schoolSettings.logoUrl.startsWith('data:') || schoolSettings.logoUrl.startsWith('http') ? schoolSettings.logoUrl : `${API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL}${schoolSettings.logoUrl.startsWith('/') ? schoolSettings.logoUrl : '/' + schoolSettings.logoUrl}`} 
                        alt="" 
                        className="w-[800px] h-auto grayscale filter blur-[1px]" 
                      />
                    )}
                </div>

                <div className="relative z-10 space-y-2 print:space-y-1">
                  {/* HEAD SECTION */}
                  <div className="grid grid-cols-[96px_1fr_96px] items-start gap-4 mb-2">
                    <div className="w-24 h-24 flex-shrink-0">
                      {schoolSettings?.logoUrl && (
                        <img
                          src={schoolSettings.logoUrl.startsWith('data:') || schoolSettings.logoUrl.startsWith('http') ? schoolSettings.logoUrl : `${API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL}${schoolSettings.logoUrl.startsWith('/') ? schoolSettings.logoUrl : '/' + schoolSettings.logoUrl}`}
                          alt="Logo"
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>

                    <div className="text-center flex flex-col items-center justify-center">
                      <h1 className="text-2xl font-black uppercase tracking-wider leading-none text-emerald-900 mb-1" style={{ color: reportColor }}>
                        {schoolSettings?.schoolName || 'SCHOOL NAME'}
                      </h1>
                      <p className="text-xs font-black italic text-gray-800 mb-1 uppercase tracking-normal w-full text-center">{schoolSettings?.schoolMotto || 'Excellence and Dedication'}</p>
                      <p className="text-[9px] font-black text-gray-600 max-w-[500px] leading-tight text-center">{schoolSettings?.address || 'School Address Location'} | TEL: {schoolSettings?.phone || '000'} | Email: {schoolSettings?.email || 'email@school.com'}</p>

                      <div className="mt-1 border-b-2 inline-block px-4 pb-0" style={{ borderColor: reportColor }}>
                        <h2 className="text-lg font-black uppercase tracking-wider">
                          {data.term?.name?.toUpperCase()} PERFORMANCE REPORT
                        </h2>
                      </div>
                    </div>

                    <div className="w-24 h-28 border-2 border-black bg-gray-50 flex-shrink-0 relative overflow-hidden">
                      {(() => {
                        const photo = data.student?.user?.photoUrl || data.student?.photoUrl;
                        return photo ? (
                          <img src={photo.startsWith('data:') || photo.startsWith('http') ? photo : `${API_BASE_URL}${photo}`} alt="Student" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-center p-1 font-bold text-gray-300">PHOTO</div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* STUDENT INFO TABLE */}
                  {layout === 'modern' ? (
                    <div className="grid grid-cols-4 gap-2 text-[10px] uppercase font-bold">
                      <div className="col-span-1 bg-gray-50 p-2 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                        {photoUri ? (
                          <img src={photoUri} className="w-16 h-16 rounded-full object-cover border-2 shadow-sm" style={{ borderColor: reportColor }} alt="Student" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-[8px] text-gray-400">NO PHOTO</div>
                        )}
                      </div>
                      <div className="col-span-3 grid grid-cols-3 gap-2">
                         <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                           <p className="text-[8px] text-gray-400 mb-0.5">FULL NAME</p>
                           <p className="text-xs truncate text-emerald-800" style={{ color: reportColor }}>{data.student?.name}</p>
                         </div>
                         <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                           <p className="text-[8px] text-gray-400 mb-0.5">ADMISSION NO</p>
                           <p className="text-xs">{data.student?.admissionNumber}</p>
                         </div>
                         <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                           <p className="text-[8px] text-gray-400 mb-0.5">DATE OF BIRTH</p>
                           <p className="text-xs">{data.student?.dateOfBirth ? new Date(data.student.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                         </div>
                         <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                           <p className="text-[8px] text-gray-400 mb-0.5">CLASS LEVEL</p>
                           <p className="text-xs">{data.student?.class}</p>
                         </div>
                         <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                           <p className="text-[8px] text-gray-400 mb-0.5">AGE / GENDER</p>
                           <p className="text-xs">{data.student?.age || '-'} / {data.student?.gender || '-'}</p>
                         </div>
                         {showAttendance && (
                         <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                           <p className="text-[8px] text-gray-400 mb-0.5">ATTENDANCE</p>
                           <p className="text-xs text-emerald-700" style={{ color: reportColor }}>{data.attendance?.present}/{data.attendance?.total}</p>
                         </div>
                         )}
                      </div>
                    </div>
                  ) : (
                    <table className="w-full border-2 border-black border-collapse text-sm font-bold uppercase">
                      <tbody>
                        <tr className="border-b border-black">
                          <td className="border-r border-black p-1 w-[12%] text-[9px]">NAME:</td>
                          <td className="border-r border-black p-1 w-[43%] font-black text-black">{data.student?.name}</td>
                          <td className="border-r border-black p-1 w-[15%] text-[9px]">GENDER:</td>
                          <td className="p-1 w-[30%]">{data.student?.gender}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black p-0.5">CLASS:</td>
                          <td className="border-r border-black p-0.5">{data.student?.class}</td>
                          <td className="border-r border-black p-0.5">SESSION:</td>
                          <td className="p-0.5">{data.term?.session}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black p-0.5">ADM NO:</td>
                          <td className="border-r border-black p-0.5">{data.student?.admissionNumber}</td>
                          <td className="border-r border-black p-0.5">D.O.B:</td>
                          <td className="p-0.5">{data.student?.dateOfBirth ? new Date(data.student.dateOfBirth).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                        <tr className="border-b border-black">
                          <td className="border-r border-black p-0.5">AGE:</td>
                          <td className="border-r border-black p-0.5">{data.student?.age || '-'}</td>
                          <td className="border-r border-black p-0.5">CLUB:</td>
                          <td className="p-0.5">{data.student?.clubs !== 'None Assigned' ? data.student?.clubs : 'N/A'}</td>
                        </tr>
                        {showAttendance && (
                        <tr>
                          <td className="border-r border-black p-1">ATTENDANCE:</td>
                          <td className="border-r border-black p-1 font-black text-black">{data.attendance?.present} / {data.attendance?.total} DAYS ({data.attendance?.percentage}%)</td>
                          <td className="border-r border-black p-1">TERM:</td>
                          <td className="p-1">{data.term?.name}</td>
                        </tr>
                        )}
                        {!showAttendance && (
                        <tr>
                          <td className="border-r border-black p-1">TERM:</td>
                          <td className="p-1" colSpan="3">{data.term?.name}</td>
                        </tr>
                        )}
                      </tbody>
                    </table>
                  )}

                  {/* ACADEMIC SECTION */}
                  <div className="grid grid-cols-[68%_31%] gap-2 items-stretch">
                    {/* LEFT: COGNITIVE */}
                    <div className="space-y-0 text-[10px] md:text-sm h-full flex flex-col">
                      <div className="bg-emerald-800 text-white text-center font-bold py-1 text-base border-2 border-b-0 border-black" style={{ backgroundColor: reportColor }}>
                        COGNITIVE DOMAIN PERFORMANCE
                      </div>
                      <table className="w-full border-2 border-black border-collapse">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="border border-black p-0.5 text-left">SUBJECTS</th>
                            <th className="border border-black p-0.5 text-center w-6 text-[7px] leading-tight">1ST CA<br />{data.term?.weights?.assignment1 || 5}</th>
                            <th className="border border-black p-0.5 text-center w-6 text-[7px] leading-tight">2ND CA<br />{data.term?.weights?.assignment2 || 5}</th>
                            <th className="border border-black p-0.5 text-center w-6 text-[7px] leading-tight">1ST TST<br />{data.term?.weights?.test1 || 10}</th>
                            <th className="border border-black p-0.5 text-center w-6 text-[7px] leading-tight">2ND TST<br />{data.term?.weights?.test2 || 10}</th>
                            <th className="border border-black p-0.5 text-center w-8">EXM<br />{data.term?.weights?.exam || 70}</th>
                            <th className="border border-black p-0.5 text-center w-8 font-black">TOT<br />100</th>
                            {termNumber === 3 && (
                              <>
                                <th className="border border-black p-0.5 text-center w-6 text-[7px]">T1</th>
                                <th className="border border-black p-0.5 text-center w-6 text-[7px]">T2</th>
                                <th className="border border-black p-0.5 text-center w-8 text-[7px] font-bold">CUM</th>
                              </>
                            )}
                            <th className="border border-black p-0.5 text-center w-6">GRD</th>
                            {showPosition && <th className="border border-black p-0.5 text-center w-6 text-[7px]">POS</th>}
                            <th className="border border-black p-0.5 text-left px-1 text-[8px]">REMARKS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.subjects || []).map((sub, i) => (
                            <tr key={i} className="font-bold uppercase h-5">
                              <td className="border border-black px-1 leading-tight text-[11px] font-black">{sub.name}</td>
                              <td className="border border-black text-center text-[10px]">{sub.assignment1 || '0'}</td>
                              <td className="border border-black text-center text-[10px]">{sub.assignment2 || '0'}</td>
                              <td className="border border-black text-center text-[10px]">{sub.test1 || '0'}</td>
                              <td className="border border-black text-center text-[10px]">{sub.test2 || '0'}</td>
                              <td className="border border-black text-center text-[10px]">{sub.exam || '0'}</td>
                              <td className="border border-black text-center bg-gray-50 text-[10px] font-black">{sub.total?.toFixed(0)}</td>
                              {termNumber === 3 && (
                                <>
                                  <td className="border border-black text-center text-[9px]">{sub.term1Score ?? '0'}</td>
                                  <td className="border border-black text-center text-[9px]">{sub.term2Score ?? '0'}</td>
                                  <td className="border border-black text-center bg-gray-50 text-[9px] font-bold">{sub.cumulativeAverage?.toFixed(1) ?? '0'}</td>
                                </>
                              )}
                              <td className="border border-black text-center text-[10px] font-black">{sub.grade}</td>
                              {showPosition && <td className="border border-black text-center text-[10px]">{sub.position}</td>}
                              <td className="border border-black px-1 text-[8px] leading-tight italic font-medium">{sub.remark}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* RIGHT: DOMAINS */}
                    <div className="flex flex-col h-full gap-2">
                      {/* AFFECTIVE & PSYCHOMOTOR Mapped from improved API */}
                      <div className="flex-1 flex flex-col min-h-0">
                        <table className="w-full border-2 border-black border-collapse text-[10px] flex-1">
                          <thead className="bg-gray-200 uppercase font-bold">
                            <tr>
                              <th className="border-b border-r border-black text-left px-1 py-0.5">BEHAVIORAL DOMAINS</th>
                              <th className="border-b border-black w-5">5</th>
                              <th className="border-b border-black w-5">4</th>
                              <th className="border-b border-black w-5">3</th>
                              <th className="border-b border-black w-5">2</th>
                              <th className="border-b border-black w-5">1</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(data.psychomotorRatings || []).map((item, i) => (
                              <tr key={i} className="h-4">
                                <td className="border border-black px-1 truncate font-bold uppercase">{item.name}</td>
                                {renderRatingTicks(item.score)}
                              </tr>
                            ))}
                            {/* Fill empty spaces if needed */}
                            {Array.from({ length: Math.max(0, 9 - (data.psychomotorRatings?.length || 0)) }).map((_, i) => (
                              <tr key={`empty-${i}`} className="h-4">
                                <td className="border border-black px-1 font-bold text-gray-200 italic">-</td>
                                <td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* SUMMARY & GRADING KEY */}
                  <div className="grid grid-cols-[62%_37%] gap-2 mt-1">
                    <div className="grid grid-cols-[60%_40%] gap-0 border-2 border-black rounded-lg overflow-hidden divide-x-2 divide-black">
                      {/* DYNAMIC GRADE INFO */}
                      <div className="p-2 text-[9px] bg-gray-50/50 leading-tight flex flex-col justify-center">
                        <p className="font-black border-b border-black mb-1 uppercase text-gray-500 text-[8px]">Grading Legend</p>
                        <div className="grid grid-cols-2 gap-x-2 font-bold">
                          {(() => {
                            try {
                              const scales = JSON.parse(schoolSettings?.gradingSystem || '[]');
                              return scales.sort((a, b) => b.min - a.min).map(s => (
                                <span key={s.grade} className={s.grade === 'F' ? 'text-red-600' : ''}>{s.grade}: {s.min}-{s.max || 100}</span>
                              ));
                            } catch (e) {
                              return <span>Legend could not be loaded</span>;
                            }
                          })()}
                        </div>
                        <p className="mt-1 border-t border-black/10 pt-1 text-[8px] italic">5: Exceptional, 4: Commendable, 3: Satisfactory, 2: Fair, 1: Poor</p>
                      </div>

                      {/* POSITION & AVG */}
                      <div className="p-0 flex flex-col">
                        <div className="bg-emerald-800 text-white text-[11px] font-bold text-center py-0.5 uppercase tracking-tighter" style={{ backgroundColor: reportColor }}>Status Summary</div>
                        <div className="bg-white flex-1 grid grid-cols-2 divide-x divide-black/10">
                          {showPosition && (
                          <div className="flex flex-col items-center justify-center p-1">
                            <span className="text-[7px] text-gray-400 uppercase font-black">Position</span>
                            <span className="text-sm font-black italic">{data.termPosition || '-'} / {data.totalStudents || '-'}</span>
                          </div>
                          )}
                          <div className="flex flex-col items-center justify-center p-1">
                            <span className="text-[7px] text-gray-400 uppercase font-black">Average</span>
                            <span className="text-sm font-black italic">{data.termAverage?.toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* PASS/FAIL SUMMARY SECTION */}
                        {data.passFailSummary?.show && (
                          <div className="border-t border-black grid grid-cols-2 divide-x divide-black/10 bg-white items-center py-0.5">
                             <div className="flex items-center justify-between px-2 h-full">
                                <span className="text-[7px] font-black text-gray-400 uppercase">Passed</span>
                                <span className="text-[10px] font-black text-emerald-700">{data.passFailSummary.totalPassed}</span>
                             </div>
                             <div className="flex items-center justify-between px-2 h-full">
                                <span className="text-[7px] font-black text-gray-400 uppercase">Failed</span>
                                <span className="text-[10px] font-black text-red-600">{data.passFailSummary.totalFailed}</span>
                             </div>
                          </div>
                        )}

                        <div className="border-t border-black p-1 flex items-center justify-between bg-emerald-50" style={{ backgroundColor: `${reportColor}10` }}>
                          <span className="text-[10px] font-black uppercase text-gray-500">Overall Grade:</span>
                          <span className="text-lg font-black text-emerald-800" style={{ color: reportColor }}>{data.overallGrade}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center border-2 border-black rounded-lg bg-gray-50/50 font-mono text-[7px] uppercase tracking-[0.3em] text-gray-700 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      </div>
                      <span className="z-10 bg-white px-2 font-black">Official Result Certification</span>
                      <div className="absolute inset-x-0 h-[1px] bg-gray-200"></div>
                    </div>
                  </div>

                  {/* FINANCIAL STANDING SECTION */}
                  {showFees && data.feeSummary && (
                    <div className="border-2 border-black bg-emerald-50/30 rounded-lg overflow-hidden mt-2" style={{ backgroundColor: `${reportColor}05` }}>
                      <div className="bg-emerald-800 text-white text-xs font-bold text-center py-0.5 uppercase tracking-widest" style={{ backgroundColor: reportColor }}>
                        Financial Standing & Fee Status
                      </div>
                      <div className="p-1.5 px-3 grid grid-cols-4 gap-2 text-center divide-x divide-black/10">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-gray-500 uppercase">Arrears (Opening)</p>
                          <p className={`text-sm font-black ${data.feeSummary.openingBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            ₦{data.feeSummary.openingBalance?.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-gray-500 uppercase">Current Term Fee</p>
                          <p className="text-sm font-black text-gray-900">
                            ₦{data.feeSummary.currentTermFee?.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-gray-500 uppercase">Total Paid</p>
                          <p className="text-sm font-black text-emerald-700">
                            ₦{data.feeSummary.totalPaid?.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-gray-500 uppercase">Outstanding Balance</p>
                          <p className={`text-lg font-black leading-none ${data.feeSummary.grandTotal > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                            ₦{data.feeSummary.grandTotal?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="px-3 pb-1 text-[7px] text-center italic text-gray-500 border-t border-black/5 pt-0.5">
                        Note: Full payment is required for continued portal access.
                      </div>
                    </div>
                  )}

                  {/* REMARKS SECTION */}
                  <div className="border-2 border-black bg-white rounded-lg overflow-hidden mt-2">
                    <div className="grid grid-cols-2 divide-x-2 divide-black">
                      <div className="p-2 space-y-1">
                        <p className="text-[10px] font-black uppercase text-gray-500">Form Master's Remark</p>
                        <p className="text-xs font-medium italic leading-none min-h-[25px] flex items-center">
                          "{data.formMasterRemark || 'No specific remark recorded.'}"
                        </p>
                        <div className="pt-1 border-t border-black/10 flex justify-between items-center">
                          <span className="text-[9px] font-bold">Name: {data.student?.formMaster || '......................'}</span>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-[7px] font-mono text-gray-400">VERIFIED</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        <p className="text-[10px] font-black uppercase text-gray-500">Principal's Remark</p>
                        <p className="text-xs font-medium italic leading-none min-h-[25px] flex items-center">
                          "{data.principalRemark || 'Satisfactory result. Keep striving for excellence.'}"
                        </p>
                        <div className="pt-1 border-t border-black/10 flex justify-between items-center text-[9px] font-bold">
                          <div>
                            <span className="mr-1">Term Ends:</span>
                            <span className="underline font-black">{data.term?.endDate ? new Date(data.term.endDate).toLocaleDateString() : '....................'}</span>
                          </div>
                          <div>
                            <span className="mr-1">Next Term Begins:</span>
                            <span className="underline font-black">{data.term?.nextTermBegins ? new Date(data.term.nextTermBegins).toLocaleDateString() : '....................'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SIGNATURES & VERIFICATION */}
                  <div className="mt-1 grid grid-cols-2 gap-8 items-end p-1">
                    <div className="space-y-1 text-center">
                      <div className="border-b-2 border-black py-0.5 min-h-[20px] flex items-center justify-center">
                        {data.student?.formMasterSignatureUrl ? (
                          <img src={data.student.formMasterSignatureUrl.startsWith('data:') || data.student.formMasterSignatureUrl.startsWith('http') ? data.student.formMasterSignatureUrl : `${API_BASE_URL}${data.student.formMasterSignatureUrl}`} alt="Teacher Signature" className="h-[35px] w-auto mix-blend-multiply" />
                        ) : (
                          <span className="font-signature italic text-lg">{data.student?.formMaster}</span>
                        )}
                      </div>
                      <span className="text-[8px] font-black block uppercase text-gray-600">CLASS TEACHER'S SIGNATURE</span>
                    </div>
                    <div className="space-y-1 text-center">
                      <div className="border-b-2 border-black py-0.5 min-h-[20px] flex items-center justify-center">
                        {data.term?.principalSignatureUrl ? (
                          <img src={data.term.principalSignatureUrl.startsWith('data:') || data.term.principalSignatureUrl.startsWith('http') ? data.term.principalSignatureUrl : `${API_BASE_URL}${data.term.principalSignatureUrl}`} alt="Principal Signature" className="h-[40px] w-auto mix-blend-multiply" />
                        ) : (
                          <span className="text-[8px] text-gray-300 italic opacity-50 underline decoration-dotted">FOR OFFICIAL USE - PRINCIPAL</span>
                        )}
                      </div>
                      <span className="text-[8px] font-black block uppercase text-gray-600">PRINCIPAL'S SIGNATURE</span>
                    </div>
                  </div>

                  {/* DOCUMENT VERIFICATION FOOTER */}
                  <div className="mt-2 border-t border-gray-200 pt-1 flex justify-between items-center bg-transparent">
                    <div className="flex items-center gap-4">
                      <div className="group/qr relative bg-white p-1 rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md">
                        <QRCodeSVG 
                          value={`${window.location.origin}/verify/term/${data.student?.id}/${selectedTerm}`}
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
                          DIGITALLY VERIFIED REPORT
                        </div>
                        <div className="text-[7px] font-bold text-gray-400 tracking-tight uppercase">Authentic Educational Credential</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[8px] font-black text-slate-900 uppercase tracking-tighter">Academic Status</div>
                      <div className="text-[7px] font-bold text-gray-400">TERM: {data.term?.name?.toUpperCase()} • GEN: {new Date().toLocaleDateString('en-GB')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </>
)}

  <style>{`
    @media (max-width: 640px) {
      .report-card-mobile-wrapper {
         min-height: 500px;
         padding-bottom: 40px;
      }
      .report-card-scaler {
         width: 210mm;
         margin-left: 0;
      }
      @media (max-width: 400px) { .report-card-scaler { transform: scale(0.42); } }
      @media (min-width: 401px) and (max-width: 500px) { .report-card-scaler { transform: scale(0.52); } }
      @media (min-width: 501px) and (max-width: 639px) { .report-card-scaler { transform: scale(0.7); } }
    }
    
    @media print {
      .report-card-scaler { 
        transform: none !important; 
        width: auto !important;
        margin: 0 !important;
      }
      .report-card-mobile-wrapper {
        overflow: visible !important;
        padding: 0 !important;
      }
    }
  `}</style>
</div>
);
};

export default TermReportCard;
