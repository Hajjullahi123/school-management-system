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
      setSessions(data);
      if (data.length > 0) {
        const current = data.find(s => s.isCurrent) || data[0];
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
      setTerms(data);
      if (data.length > 0) {
        const current = data.find(t => t.isCurrent) || data[0];
        setSelectedTerm(current.id);
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      setClasses(await response.json());
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
      const response = await api.get(`/api/report-card/${targetStudentId}/${selectedTerm}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch report card');
      }
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const processRatings = (ratings) => {
    const defaultAffective = [
      'Punctuality', 'Neatness', 'Politeness', 'Honesty', 'Relationship with others',
      'Cooperation', 'Leadership', 'Self Control', 'Attentiveness', 'Reliability', 'Perseverance'
    ];
    const defaultPsychomotor = [
      'Handwriting', 'Games/Sports', 'Crafts', 'Musical Skills', 'Drawing/Painting',
      'Verbal Communication', 'Fluency in Speech', 'Physical Agility'
    ];

    let combined = [...(ratings || [])];

    if (combined.length < 18) {
      [...defaultAffective, ...defaultPsychomotor].forEach(name => {
        if (combined.length < 22 && !combined.find(r => r.name.toLowerCase() === name.toLowerCase())) {
          combined.push({ name, score: '-' });
        }
      });
    }

    return combined;
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
              className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary transition-all border"
            >
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name} {s.isCurrent ? '(Current)' : ''}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Select Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary transition-all border"
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
                  className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary transition-all border"
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
                    className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary transition-all border disabled:opacity-50"
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
                  className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary transition-all border"
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[210mm] mx-auto">
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
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none rotate-12 overflow-hidden">
              <div className="text-[100px] font-black uppercase text-gray-900 leading-[0.8] text-center">
                {schoolSettings?.schoolName || 'OFFICIAL RESULT'}<br />
                {schoolSettings?.schoolName || 'OFFICIAL RESULT'}<br />
                {schoolSettings?.schoolName || 'OFFICIAL RESULT'}<br />
                {schoolSettings?.schoolName || 'OFFICIAL RESULT'}
              </div>
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-start gap-4 border-b-4 border-double border-emerald-800 pb-6" style={{ borderColor: schoolSettings?.primaryColor }}>
                <div className="w-28 h-28 flex-shrink-0">
                  {schoolSettings?.logoUrl && (
                    <img src={schoolSettings.logoUrl} alt="Logo" className="w-full h-full object-contain object-left" />
                  )}
                </div>

                <div className="flex-1 text-center">
                  <h1 className="text-3xl font-black uppercase tracking-tight text-emerald-900" style={{ color: schoolSettings?.primaryColor }}>
                    {schoolSettings?.schoolName || 'SCHOOL NAME'}
                  </h1>
                  <p className="text-primary font-bold italic text-sm mb-1" style={{ color: schoolSettings?.primaryColor }}>
                    {schoolSettings?.schoolMotto || 'Excellence and Dedication'}
                  </p>
                  <p className="text-xs font-bold text-gray-600 leading-tight">
                    {schoolSettings?.address || 'School Address Location'}
                  </p>
                  <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase">
                    TEL: {schoolSettings?.phone} | EMAIL: {schoolSettings?.email}
                  </p>
                  <div className="mt-4 bg-emerald-800 text-white inline-block px-10 py-1.5 rounded-full font-black uppercase tracking-widest text-sm shadow-md" style={{ backgroundColor: schoolSettings?.primaryColor }}>
                    Terminal Report Card
                  </div>
                </div>

                <div className="w-24 h-32 border-2 border-black bg-gray-50 rounded overflow-hidden shadow-inner flex flex-col items-center justify-center relative">
                  {reportData.student.photoUrl ? (
                    <img src={reportData.student.photoUrl.startsWith('http') ? reportData.student.photoUrl : `${API_BASE_URL}${reportData.student.photoUrl}`} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-[10px] text-gray-300 font-bold uppercase p-2 text-center">PHOTO</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border-2 border-black">
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <p className="font-bold text-gray-500">STUDENT NAME:</p>
                  <p className="font-black text-emerald-800" style={{ color: schoolSettings?.primaryColor }}>{reportData.student.name}</p>
                  <p className="font-bold text-gray-500">ADMISSION NO:</p>
                  <p className="font-black">{reportData.student.admissionNumber}</p>
                  <p className="font-bold text-gray-500">CLASS:</p>
                  <p className="font-black">{reportData.student.class}</p>
                  <p className="font-bold text-gray-500">CLUB:</p>
                  <p className="font-black">{reportData.student.clubs || 'JETS CLUB'}</p>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-xs border-l-2 border-black pl-4">
                  <p className="font-bold text-gray-500">SESSION:</p>
                  <p className="font-black">{reportData.academic.session}</p>
                  <p className="font-bold text-gray-500">TERM:</p>
                  <p className="font-black uppercase">{reportData.academic.term}</p>
                  <p className="font-bold text-gray-500">DATE OF BIRTH:</p>
                  <p className="font-black">{reportData.student.dob ? new Date(reportData.student.dob).toLocaleDateString() : 'N/A'}</p>
                  <p className="font-bold text-gray-500">AGE:</p>
                  <p className="font-black">{reportData.student.age || '-'}</p>
                </div>
              </div>

              <div className="space-y-0 text-[10px] md:text-sm">
                <table className="w-full border-collapse border-2 border-black">
                  <thead className="bg-gray-200 text-[10px] font-bold uppercase text-gray-800">
                    <tr>
                      <th className="border border-black px-4 py-2 text-left w-64">Subject Title</th>
                      <th className="border border-black px-1 py-1 text-center w-8">CA<br />40</th>
                      <th className="border border-black px-1 py-1 text-center w-8">EXM<br />60</th>
                      <th className="border border-black px-1 py-1 text-center w-10 bg-gray-300">TOT<br />100</th>
                      {reportData.academic.termNumber === 3 && (
                        <>
                          <th className="border border-black px-1 py-1 text-center w-8 text-[8px]">T1</th>
                          <th className="border border-black px-1 py-1 text-center w-8 text-[8px]">T2</th>
                          <th className="border border-black px-1 py-1 text-center w-10 text-[8px] bg-gray-300">CUM</th>
                        </>
                      )}
                      <th className="border border-black px-1 py-1 text-center w-8">GRD</th>
                      <th className="border border-black px-1 py-1 text-center w-8">POS</th>
                      <th className="border border-black px-2 py-1 text-left italic text-[9px]">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs uppercase font-bold">
                    {reportData.results.map((res, i) => (
                      <tr key={i} className="h-8">
                        <td className="border border-black px-4 font-bold">{res.subject}</td>
                        <td className="border border-black text-center">{(res.assignment1 || 0) + (res.assignment2 || 0) + (res.test1 || 0) + (res.test2 || 0)}</td>
                        <td className="border border-black text-center">{res.exam || '0'}</td>
                        <td className="border border-black text-center bg-gray-50">{Math.round(res.total)}</td>
                        {reportData.academic.termNumber === 3 && (
                          <>
                            <td className="border border-black text-center">{res.term1Score ?? '-'}</td>
                            <td className="border border-black text-center">{res.term2Score ?? '-'}</td>
                            <td className="border border-black text-center bg-gray-50">{res.cumulativeAverage?.toFixed(1) ?? '-'}</td>
                          </>
                        )}
                        <td className="border border-black text-center">{res.grade}</td>
                        <td className="border border-black text-center">{res.position}</td>
                        <td className="border border-black px-2 italic text-[9px] leading-tight font-medium ml-1">{res.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-[60%_40%] gap-4 items-stretch">
                <div className="space-y-4 flex flex-col justify-between h-full">
                  <div className="border-2 border-black p-3 rounded-xl bg-gray-50/50 flex-1 flex flex-col">
                    <h5 className="text-[10px] font-black uppercase mb-2 border-b border-black pb-1">Non-Cognitive Evaluation</h5>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 flex-1">
                      {processRatings(reportData.extras.psychomotorRatings).map((rat, i) => (
                        <div key={i} className="flex justify-between items-center text-[9px]">
                          <span className="font-bold uppercase truncate pr-2">{rat.name}</span>
                          <span className="font-black text-emerald-800" style={{ color: schoolSettings?.primaryColor }}>{rat.score || '-'} / 5</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="border-2 border-black p-2 bg-white relative">
                      <p className="text-[10px] font-black underline italic uppercase mb-1 leading-none">Form Master's Remark:</p>
                      <p className="text-sm font-serif italic min-h-[30px] flex items-center leading-tight">"{reportData.extras.formMasterRemark || 'Performance is encouraging.'}"</p>
                    </div>
                    <div className="border-2 border-black p-2 bg-white relative">
                      <p className="text-[10px] font-black underline italic uppercase mb-1 leading-none">Principal's Remark:</p>
                      <p className="text-sm font-serif italic min-h-[30px] flex items-center leading-tight">"{reportData.extras.principalRemark || 'Satisfactory academic performance.'}"</p>
                    </div>
                  </div>
                </div>

                <div className="h-full flex flex-col justify-between">
                  <div className="border-2 border-black rounded-xl overflow-hidden shadow-md h-full flex flex-col">
                    <div className="bg-emerald-800 text-white text-center p-1 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: schoolSettings?.primaryColor }}>Final Assessment</div>
                    <div className="p-4 bg-gray-50 space-y-4 flex-1 flex flex-col justify-center">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-gray-500">TOTAL SCORE:</span>
                        <span className="text-lg font-black">{Math.round(reportData.summary.totalScore)}</span>
                      </div>
                      <div className="flex justify-between items-end border-t border-gray-200 pt-3">
                        <span className="text-[10px] font-bold text-gray-500">AVERAGE:</span>
                        <span className="text-2xl font-black">{reportData.summary.average}%</span>
                      </div>
                      <div className="flex justify-between items-end border-t border-gray-200 pt-3">
                        <span className="text-[10px] font-bold text-gray-500">CLASS POSITION:</span>
                        <span className="font-black text-lg">{reportData.summary.position} <span className="text-[10px] font-normal text-gray-400">OF {reportData.summary.totalInClass}</span></span>
                      </div>
                      <div className="flex justify-between items-center border-t-2 border-emerald-800 pt-3" style={{ borderTopColor: schoolSettings?.primaryColor }}>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase">Decision:</span>
                        <span className={`text-xl font-black ${reportData.summary.status === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>{reportData.summary.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-black grid grid-cols-[30%_70%] gap-8 items-end">
                <div className="flex flex-col items-start">
                  <div className="w-28 h-6 bg-white border-b border-gray-300 flex items-end gap-[0.5px] opacity-30 grayscale">
                    {[...Array(50)].map((_, i) => (
                      <div key={i} className="bg-black" style={{ height: '100%', width: (i % 7 === 0 ? '2px' : '1px') }}></div>
                    ))}
                  </div>
                  <p className="text-[6px] font-mono mt-0.5 font-bold uppercase tracking-widest opacity-40">
                    {reportData.student.admissionNumber}-{selectedTerm?.toString().slice(-4)}
                  </p>
                  <div className="text-center pt-8 w-full">
                    <div className="border-b border-black w-full mb-1"></div>
                    <p className="text-[9px] font-bold">TEACHER'S SIGNATURE</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-4 text-[10px] font-bold uppercase justify-end">
                    <p>Next Term Begins: <span className="underline">{reportData.academic.nextTermBegins ? new Date(reportData.academic.nextTermBegins).toLocaleDateString() : '....................'}</span></p>
                  </div>
                  <div className="text-center pt-8">
                    <p className="text-[8px] italic text-gray-400 mb-8 uppercase">STAMP & SIGNATURE HERE</p>
                    <div className="border-b-2 border-emerald-800 w-3/4 mx-auto mb-1" style={{ borderColor: schoolSettings?.primaryColor }}></div>
                    <p className="text-[9px] font-black uppercase text-emerald-800" style={{ color: schoolSettings?.primaryColor }}>Principal's Signature</p>
                  </div>
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
