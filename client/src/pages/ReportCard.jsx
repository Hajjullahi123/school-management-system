import React, { useState, useEffect } from 'react';
import EmailConfig from '../components/EmailConfig';
import { api, API_BASE_URL } from '../api';
import useSchoolSettings from '../hooks/useSchoolSettings';
import { toast } from '../utils/toast';

const ReportCard = () => {
  const { settings: schoolSettings } = useSchoolSettings();
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classStudents, setClassStudents] = useState([]);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Selection states
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchMode, setSearchMode] = useState('class'); // 'admission', 'class'
  const [admissionNumber, setAdmissionNumber] = useState('');

  // Email states
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchClasses();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/api/academic-sessions');
      const data = await res.json();
      const sessionsArray = Array.isArray(data) ? data : [];
      setSessions(sessionsArray);
      if (sessionsArray.length > 0) {
        const current = sessionsArray.find(s => s.isCurrent) || sessionsArray[0];
        setSelectedSession(current.id);
        fetchTerms(current.id);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchTerms = async (sessionId) => {
    try {
      const res = await api.get(`/api/terms?sessionId=${sessionId}`);
      const data = await res.json();
      const termsArray = Array.isArray(data) ? data : [];
      setTerms(termsArray);
      if (termsArray.length > 0) {
        const current = termsArray.find(t => t.isCurrent) || termsArray[0];
        setSelectedTerm(current.id);
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      const data = await response.json();
      setClasses(Array.isArray(data) ? data : []);
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

  const fetchReportCard = async () => {
    if (!selectedTerm) {
      toast.error('Please select a term');
      return;
    }

    let targetStudentId = selectedStudentId;

    if (searchMode === 'admission') {
      if (!admissionNumber) {
        toast.error('Please enter an admission number');
        return;
      }
      try {
        const res = await api.get(`/api/students/lookup?admissionNumber=${admissionNumber}`);
        if (!res.ok) {
          toast.error('Student not found');
          return;
        }
        const student = await res.json();
        targetStudentId = student.id;
      } catch (error) {
        toast.error('Error looking up student');
        return;
      }
    }

    if (!targetStudentId) {
      toast.error('Please select a student');
      return;
    }

    setLoading(true);
    setReportData(null);
    setError('');

    try {
      const response = await api.get(`/api/reports/term/${targetStudentId}/${selectedTerm}`);

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Failed to fetch report card');
      }

      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
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

  const handlePrint = () => {
    window.print();
  };

  const sendEmail = async (e) => {
    e.preventDefault();
    if (!emailAddress) {
      toast.error('Email address is required');
      return;
    }

    setSendingEmail(true);
    try {
      const response = await api.post('/api/reports/email-report', {
        studentId: reportData.student.id,
        termId: selectedTerm,
        email: emailAddress
      });

      if (response.ok) {
        toast.success('Report card emailed successfully');
        setShowEmailModal(false);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to send email');
      }
    } catch (error) {
      toast.error('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 bg-gray-50/50 min-h-screen">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 print:hidden space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Generate Terminal Report</h1>
            <p className="text-gray-500 text-sm font-medium">Configure session and term to fetch student results</p>
          </div>
          <div className="flex bg-gray-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setSearchMode('class')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${searchMode === 'class' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
            >
              Class Search
            </button>
            <button
              onClick={() => setSearchMode('admission')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${searchMode === 'admission' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
            >
              Direct Lookup
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Academic Session</label>
            <select
              value={selectedSession}
              onChange={(e) => {
                setSelectedSession(e.target.value);
                fetchTerms(e.target.value);
              }}
              className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary transition-all border outline-none"
            >
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name} {s.isCurrent ? '(Current)' : ''}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Select Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary transition-all border outline-none"
            >
              <option value="">-- Select Term --</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.isCurrent ? '(Active)' : ''}</option>)}
            </select>
          </div>

          {searchMode === 'class' ? (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Choose Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary transition-all border outline-none"
                >
                  <option value="">-- All Classes --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.arm}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Select Student</label>
                <div className="flex gap-2">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    disabled={!selectedClassId}
                    className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary transition-all border disabled:opacity-50 outline-none"
                  >
                    <option value="">-- Choose Student --</option>
                    {classStudents.map(s => <option key={s.id} value={s.id}>{s.user.firstName} {s.user.lastName} ({s.admissionNumber})</option>)}
                  </select>
                  <button
                    onClick={fetchReportCard}
                    disabled={loading || !selectedStudentId}
                    className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : null}
                    Generate
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="md:col-span-2 flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Admission Number</label>
                <input
                  type="text"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  placeholder="Enter admission number (e.g. 2024/001)"
                  className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary transition-all border outline-none"
                />
              </div>
              <button
                onClick={fetchReportCard}
                disabled={loading || !admissionNumber}
                className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-50"
              >
                Lookup Result
              </button>
            </div>
          )}
        </div>
      </div>

      {reportData && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[210mm] mx-auto pb-10">
          <div className="flex justify-end gap-3 print:hidden">
            <button
              onClick={() => setShowEmailModal(true)}
              className="bg-white border text-gray-700 px-6 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email to Parent
            </button>
            <button
              onClick={handlePrint}
              className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:brightness-110 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Result
            </button>
          </div>

          <div id="result-sheet" className="relative bg-white p-8 print:p-4 shadow-2xl print:shadow-none print:break-after-page text-black font-serif border-[12px] border-emerald-800 print:emerald-border">
            {/* PROTECTION WATERMARK */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.06] select-none rotate-12 overflow-hidden">
              <div className="text-[100px] font-black uppercase text-gray-900 leading-[0.8] text-center">
                {schoolSettings?.schoolName || 'OFFICIAL RESULT'}<br />
                {schoolSettings?.schoolName || 'OFFICIAL RESULT'}<br />
                {schoolSettings?.schoolName || 'OFFICIAL RESULT'}<br />
                {schoolSettings?.schoolName || 'OFFICIAL RESULT'}
              </div>
            </div>

            <div className="relative z-10 space-y-5">
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
                  <h1 className="text-3xl font-extrabold uppercase tracking-wider leading-tight text-emerald-900" style={{ color: schoolSettings?.primaryColor }}>
                    {schoolSettings?.schoolName || 'SCHOOL NAME'}
                  </h1>
                  <p className="text-sm font-bold italic text-gray-700">{schoolSettings?.schoolMotto || 'Excellence and Dedication'}</p>
                  <p className="text-xs font-bold">{schoolSettings?.address || 'School Address Location'}, TEL: {schoolSettings?.phone || '000000'}, Email: {schoolSettings?.email || 'email@school.com'}</p>

                  <div className="mt-4 border-b-2 border-emerald-800 inline-block px-4 pb-1">
                    <h2 className="text-xl font-bold uppercase tracking-wide">
                      {reportData.term?.name?.toUpperCase()} PERFORMANCE REPORT
                    </h2>
                  </div>
                </div>

                <div className="w-24 h-28 border-2 border-black bg-gray-50 flex-shrink-0 relative overflow-hidden">
                  {reportData.student?.photoUrl ? (
                    <img src={reportData.student.photoUrl.startsWith('http') ? reportData.student.photoUrl : `${API_BASE_URL}${reportData.student.photoUrl}`} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-center p-1 font-bold text-gray-300">PHOTO</div>
                  )}
                </div>
              </div>

              {/* STUDENT INFO TABLE */}
              <table className="w-full border-2 border-black border-collapse text-xs font-bold uppercase">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 w-1/6">NAME:</td>
                    <td className="border-r border-black p-1 w-2/3 text-emerald-800 font-black" style={{ color: schoolSettings?.primaryColor }}>{reportData.student?.name}</td>
                    <td className="border-r border-black p-1 w-1/6">GENDER:</td>
                    <td className="p-1">{reportData.student?.gender}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1">CLASS:</td>
                    <td className="border-r border-black p-1">{reportData.student?.class}</td>
                    <td className="border-r border-black p-1">SESSION:</td>
                    <td className="p-1">{reportData.term?.session}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1">ADM NO:</td>
                    <td className="border-r border-black p-1">{reportData.student?.admissionNumber}</td>
                    <td className="border-r border-black p-1">D.O.B:</td>
                    <td className="p-1">{reportData.student?.dateOfBirth ? new Date(reportData.student.dateOfBirth).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1">AGE:</td>
                    <td className="border-r border-black p-1">{reportData.student?.age || '-'}</td>
                    <td className="border-r border-black p-1">CLUB:</td>
                    <td className="p-1">{reportData.student?.clubs !== 'None Assigned' ? reportData.student?.clubs : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1">ATTENDANCE:</td>
                    <td className="border-r border-black p-1 text-emerald-700 font-bold" style={{ color: schoolSettings?.primaryColor }}>{reportData.attendance?.present} / {reportData.attendance?.total} DAYS ({reportData.attendance?.percentage}%)</td>
                    <td className="border-r border-black p-1">TERM:</td>
                    <td className="p-1">{reportData.term?.name}</td>
                  </tr>
                </tbody>
              </table>

              {/* ACADEMIC SECTION */}
              <div className="grid grid-cols-[68%_31%] gap-2 items-stretch">
                {/* LEFT: COGNITIVE */}
                <div className="space-y-0 text-[10px] md:text-sm h-full flex flex-col">
                  <div className="bg-emerald-800 text-white text-center font-bold py-1 text-sm border-2 border-b-0 border-black" style={{ backgroundColor: schoolSettings?.primaryColor }}>
                    COGNITIVE DOMAIN PERFORMANCE
                  </div>
                  <table className="w-full border-2 border-black border-collapse">
                    <thead>
                      <tr className="bg-gray-100 uppercase text-[8px] font-bold">
                        <th className="border border-black px-2 py-1 text-left">Subject</th>
                        <th className="border border-black px-1 py-1 text-center w-6">1CA<br />{reportData.term?.weights?.assignment1 || 5}</th>
                        <th className="border border-black px-1 py-1 text-center w-6">2CA<br />{reportData.term?.weights?.assignment2 || 5}</th>
                        <th className="border border-black px-1 py-1 text-center w-6">1TS<br />{reportData.term?.weights?.test1 || 10}</th>
                        <th className="border border-black px-1 py-1 text-center w-6">2TS<br />{reportData.term?.weights?.test2 || 10}</th>
                        <th className="border border-black px-1 py-1 text-center w-8">EXM<br />{reportData.term?.weights?.exam || 70}</th>
                        <th className="border border-black px-1 py-1 text-center w-8 font-black">TOT<br />100</th>
                        {reportData.term?.number === 3 && (
                          <>
                            <th className="border border-black px-1 py-1 text-center w-6 text-[7px]">T1</th>
                            <th className="border border-black px-1 py-1 text-center w-6 text-[7px]">T2</th>
                            <th className="border border-black px-1 py-1 text-center w-8 text-[7px] font-bold">CUM</th>
                          </>
                        )}
                        <th className="border border-black px-1 py-1 text-center w-6">GRD</th>
                        <th className="border border-black px-1 py-1 text-center w-6">POS</th>
                        <th className="border border-black px-2 py-1 text-left italic text-[8px]">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="text-[10px] uppercase font-bold">
                      {(reportData.subjects || []).map((sub, i) => (
                        <tr key={i} className="h-6">
                          <td className="border border-black px-2 font-black leading-tight">{sub.name}</td>
                          <td className="border border-black text-center">{sub.assignment1 || '0'}</td>
                          <td className="border border-black text-center">{sub.assignment2 || '0'}</td>
                          <td className="border border-black text-center">{sub.test1 || '0'}</td>
                          <td className="border border-black text-center">{sub.test2 || '0'}</td>
                          <td className="border border-black text-center">{sub.exam || '0'}</td>
                          <td className="border border-black text-center bg-gray-50 font-black">{sub.total?.toFixed(0)}</td>
                          {reportData.term?.number === 3 && (
                            <>
                              <td className="border border-black text-center">{sub.term1Score ?? '0'}</td>
                              <td className="border border-black text-center">{sub.term2Score ?? '0'}</td>
                              <td className="border border-black text-center bg-gray-50 font-bold">{sub.cumulativeAverage?.toFixed(1) ?? '0'}</td>
                            </>
                          )}
                          <td className="border border-black text-center font-black">{sub.grade}</td>
                          <td className="border border-black text-center">{sub.position}</td>
                          <td className="border border-black px-2 italic text-[8px] leading-tight font-medium">{sub.remark}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* RIGHT: DOMAINS */}
                <div className="flex flex-col h-full gap-2">
                  <div className="flex-1 flex flex-col min-h-0">
                    <table className="w-full border-2 border-black border-collapse text-[10px] flex-1">
                      <thead className="bg-gray-200 uppercase font-bold sticky top-0">
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
                        {(reportData.psychomotorRatings || []).map((item, i) => (
                          <tr key={i} className="h-5">
                            <td className="border border-black px-1 truncate font-bold uppercase">{item.name}</td>
                            {renderRatingTicks(item.score)}
                          </tr>
                        ))}
                        {Array.from({ length: Math.max(0, 18 - (reportData.psychomotorRatings?.length || 0)) }).map((_, i) => (
                          <tr key={`empty-${i}`} className="h-5">
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
              <div className="grid grid-cols-[68%_31%] gap-2 mt-2">
                <div className="grid grid-cols-2 gap-0 border-2 border-black rounded-lg overflow-hidden divide-x-2 divide-black">
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

                  <div className="flex flex-col">
                    <div className="bg-emerald-800 text-white text-center py-0.5 text-[9px] font-bold uppercase tracking-widest" style={{ backgroundColor: schoolSettings?.primaryColor }}>Performance Summary</div>
                    <div className="bg-gray-50 flex-1 grid grid-cols-2 divide-x divide-black/10 items-center">
                      <div className="text-center p-1">
                        <p className="text-[7px] text-gray-400 uppercase font-black">Average</p>
                        <p className="text-sm font-black italic">{reportData.termAverage?.toFixed(1)}%</p>
                      </div>
                      <div className="text-center p-1">
                        <p className="text-[7px] text-gray-400 uppercase font-black">Position</p>
                        <p className="text-sm font-black italic">{reportData.termPosition} / {reportData.totalStudents}</p>
                      </div>
                    </div>
                    <div className="border-t border-black p-1 flex justify-between items-center bg-gray-100 px-3">
                      <span className="text-[8px] font-black text-gray-500 uppercase">Grade:</span>
                      <span className="text-lg font-black" style={{ color: schoolSettings?.primaryColor }}>{reportData.overallGrade || 'F'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center border-2 border-black rounded-lg bg-gray-50/50 font-mono text-[7px] uppercase tracking-[0.3em] text-gray-300 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                  <span className="z-10 bg-white px-2">Official Result Certification</span>
                  <div className="absolute inset-x-0 h-[1px] bg-gray-200"></div>
                </div>
              </div>

              {/* REMARKS SECTION */}
              <div className="border-2 border-black bg-white rounded-xl overflow-hidden mt-4">
                <div className="grid grid-cols-2 divide-x-2 divide-black">
                  <div className="p-3 space-y-1">
                    <p className="text-[10px] font-black uppercase text-gray-500">Form Master's Remark</p>
                    <p className="text-xs font-medium italic leading-snug min-h-[40px] flex items-center">
                      "{reportData.formMasterRemark || 'Performance is encouraging.'}"
                    </p>
                    <div className="pt-1 border-t border-black/10 flex justify-between items-center">
                      <span className="text-[9px] font-bold">Name: {reportData.student?.formMaster || '......................'}</span>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[7px] font-mono text-gray-400">VERIFIED</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-[10px] font-black uppercase text-gray-500">Principal's Remark</p>
                    <p className="text-xs font-medium italic leading-snug min-h-[40px] flex items-center">
                      "{reportData.principalRemark || 'Satisfactory academic performance.'}"
                    </p>
                    <div className="pt-1 border-t border-black/10 flex justify-between items-center text-[9px] font-bold">
                      <span>Next Term Begins:</span>
                      <span className="underline font-black">{reportData.term?.nextTermBegins ? new Date(reportData.term.nextTermBegins).toLocaleDateString() : '....................'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SIGNATURES & VERIFICATION */}
              <div className="mt-8 grid grid-cols-3 gap-8 items-end p-2">
                <div className="space-y-2">
                  <div className="w-full h-8 bg-white border-b border-gray-300 flex items-end gap-[0.5px] opacity-20 grayscale">
                    {[...Array(60)].map((_, i) => (
                      <div key={i} className="bg-black" style={{ height: (i % 8 === 0 ? '100%' : '80%'), width: (i % 5 === 0 ? '2px' : '1px') }}></div>
                    ))}
                  </div>
                  <p className="text-[7px] font-mono font-bold uppercase tracking-[0.2em] text-gray-400">
                    Verification ID: {reportData.student?.admissionNumber?.replace('/', '-')}-{selectedTerm?.toString().slice(-4)}
                  </p>
                </div>

                <div className="text-center relative">
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none">
                    <svg width="60" height="60" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                      <text x="50" y="45" textAnchor="middle" fontSize="8" fontWeight="bold">OFFICIAL</text>
                      <text x="50" y="55" textAnchor="middle" fontSize="10" fontWeight="black">SEAL</text>
                    </svg>
                  </div>
                  <div className="border-b-2 border-black w-full mb-1 opacity-80"></div>
                  <p className="text-[10px] font-black uppercase">Teacher's Signature</p>
                  <p className="text-[8px] text-gray-400 uppercase mt-0.5">Automated Seal</p>
                </div>

                <div className="text-center relative">
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 opacity-30 pointer-events-none">
                    <svg width="80" height="80" viewBox="0 0 100 100" style={{ color: schoolSettings?.primaryColor }}>
                      <path d="M20 50 Q 50 10, 80 50 T 20 80" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                      <text x="50" y="52" textAnchor="middle" fontSize="6" fontWeight="bold" transform="rotate(-15 50 50)">CERTIFIED OFFICIAL</text>
                    </svg>
                  </div>
                  <div className="border-b-2 border-emerald-800 w-full mb-1" style={{ borderColor: schoolSettings?.primaryColor }}></div>
                  <p className="text-[10px] font-black uppercase text-emerald-800" style={{ color: schoolSettings?.primaryColor }}>Principal's Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Email Report Card</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={sendEmail} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Recipient Email</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full rounded-2xl border-gray-200 bg-gray-50/50 p-4 focus:ring-primary transition-all border outline-none font-medium"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={sendingEmail}
                className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/25 hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
              >
                {sendingEmail ? 'Sending...' : 'Send Report'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body { background: white !important; margin: 0; padding: 0; }
          .min-h-screen { background: white !important; padding: 0 !important; }
          .max-w-[210mm] { max-width: 100% !important; margin: 0 !important; width: 100% !important; }
          .print\\:break-after-page { break-after: page !important; }
          .emerald-border { border: 20px solid #065f46 !important; -webkit-print-color-adjust: exact; }
          table { border-collapse: collapse !important; width: 100% !important; }
          td, th { border: 1px solid black !important; }
          * { box-sizing: border-box !important; }
          .bg-emerald-800 { background-color: #065f46 !important; -webkit-print-color-adjust: exact; }
          .bg-gray-200 { background-color: #e5e7eb !important; -webkit-print-color-adjust: exact; }
          .bg-gray-300 { background-color: #d1d5db !important; -webkit-print-color-adjust: exact; }
          .bg-gray-100 { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
          .bg-gray-50 { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; }
        }
        * { box-sizing: border-box !important; }
      `}</style>
    </div>
  );
};

export default ReportCard;
