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

    setLoading(true);
    setError('');

    try {
      if (searchMode === 'admission' && admissionNumber) {
        const lookupRes = await api.get(`/api/students/lookup?admissionNumber=${admissionNumber}`);
        if (!lookupRes.ok) throw new Error('Student not found with this Admission Number');
        const student = await lookupRes.json();
        targetStudentId = student.id;
      }

      if (!targetStudentId) {
        throw new Error('Please select a student');
      }

      const response = await api.get(`/api/report-card/${targetStudentId}/${selectedTerm}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch report card');
      }

      const data = await response.json();
      setReportData(data);
      toast.success('Report card generated successfully');
    } catch (error) {
      console.error('Error fetching report card:', error);
      setError(error.message);
      setReportData(null);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    if (!emailAddress) {
      toast.error('Please enter an email address');
      return;
    }

    const smtpConfig = localStorage.getItem('smtpConfig');
    if (!smtpConfig) {
      setShowEmailConfig(true);
      toast.error('Please configure email settings first');
      return;
    }

    setSendingEmail(true);
    try {
      const response = await api.post('/api/email/send-report', {
        to: emailAddress,
        subject: `Report Card - ${reportData.student.name} - ${reportData.academic.term} ${reportData.academic.session}`,
        reportData,
        smtpConfig: JSON.parse(smtpConfig)
      });

      if (!response.ok) throw new Error('Failed to send email');

      toast.success('Email sent successfully!');
      setShowEmailModal(false);
      setEmailAddress('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header Area */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Terminal Report Card</h1>
          <p className="text-gray-500 mt-1">Generate and manage official student performance records.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowEmailConfig(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Email Config
          </button>
        </div>
      </div>

      {/* Control Panel - Hidden when printing */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:hidden transition-all hover:shadow-md">
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Search Settings */}
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Search Preference</label>
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button
                  onClick={() => setSearchMode('class')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${searchMode === 'class' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  By Class
                </button>
                <button
                  onClick={() => setSearchMode('admission')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${searchMode === 'admission' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  By Admission
                </button>
              </div>
            </div>

            {/* Academic Selects */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Academic Session</label>
                <select
                  value={selectedSession}
                  onChange={(e) => {
                    setSelectedSession(e.target.value);
                    fetchTerms(e.target.value);
                  }}
                  className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary focus:border-primary transition-all shadow-sm border"
                >
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name} {s.isCurrent ? '(Current)' : ''}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Term</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary focus:border-primary transition-all shadow-sm border"
                >
                  <option value="">Select Term</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.isCurrent ? '(Current)' : ''}</option>)}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchReportCard}
                  disabled={loading}
                  className="w-full bg-primary text-white py-2.5 px-6 rounded-xl font-bold hover:brightness-110 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Result
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
              {searchMode === 'class' ? (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Class</label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary transition-all border"
                    >
                      <option value="">Select Class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.arm || ''}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Student</label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary transition-all border"
                      disabled={!selectedClassId}
                    >
                      <option value="">Choose a Student</option>
                      {classStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.user.firstName} {s.user.lastName} ({s.admissionNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Admission Number</label>
                  <input
                    type="text"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    placeholder="Enter admission number (e.g. 2024/001)"
                    className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-2.5 focus:ring-primary transition-all border"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {reportData && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Action Toolbar */}
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

          {/* THE ACTUAL RESULT SHEET */}
          <div id="result-sheet" className="bg-white p-12 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden print:p-0 print:shadow-none print:border-0">

            {/* Background Branding Elements */}
            <div className="absolute top-0 right-0 p-4 opacity-5 print:opacity-10 pointer-events-none">
              <svg className="w-64 h-64" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99z" />
              </svg>
            </div>

            {/* School Header */}
            <div className="flex flex-col items-center border-b-4 border-double border-primary pb-8 mb-8">
              <div className="flex justify-between w-full mb-6">
                <div className="w-32 h-32 flex items-center justify-center">
                  {schoolSettings?.logoUrl ? (
                    <img src={schoolSettings.logoUrl} alt="School Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 text-center px-8">
                  <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tight mb-2">
                    {schoolSettings?.schoolName || 'DARUL QUR\'AN ACADEMY'}
                  </h2>
                  <p className="text-primary font-bold italic text-lg mb-2">
                    {schoolSettings?.schoolMotto || 'Excellence in Academic and Character'}
                  </p>
                  <p className="text-gray-600 font-medium max-w-lg mx-auto leading-tight">
                    {schoolSettings?.address || '123 Educational Blvd, Metropolis'}
                  </p>
                  <p className="text-gray-500 font-medium mt-1">
                    Tel: {schoolSettings?.phone || '0800 123 4567'} | Email: {schoolSettings?.email || 'info@school.com'}
                  </p>
                </div>
                <div className="w-32 h-40 border-2 border-gray-200 rounded-lg overflow-hidden relative shadow-inner bg-gray-50 flex flex-col items-center justify-center">
                  {reportData.student.photoUrl ? (
                    <img src={reportData.student.photoUrl} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-2">
                      <svg className="w-12 h-12 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">Place Photo Here</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-primary text-white px-12 py-2 rounded-full font-black uppercase tracking-[0.2em] text-lg shadow-md">
                Terminal Progress Report
              </div>
            </div>

            {/* Student & Session Info */}
            <div className="grid grid-cols-3 gap-6 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-400 uppercase">Student Profile</p>
                <h3 className="text-xl font-bold text-gray-900">{reportData.student.name}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Admission ID</p>
                    <p className="font-bold text-primary">{reportData.student.admissionNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Gender</p>
                    <p className="font-bold">{reportData.student.gender || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-x border-gray-200 px-6">
                <p className="text-sm font-bold text-gray-400 uppercase">Class & Placement</p>
                <h3 className="text-xl font-bold text-gray-900">{reportData.student.class}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Position</p>
                    <p className="font-bold text-primary text-xl">
                      {reportData.summary.position} <span className="text-xs text-gray-400 font-normal">of {reportData.summary.totalInClass}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Term Avg</p>
                    <p className="font-bold text-xl">{reportData.summary.average}%</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pl-6">
                <p className="text-sm font-bold text-gray-400 uppercase">Academic Period</p>
                <h3 className="text-xl font-bold text-gray-900">{reportData.academic.session}</h3>
                <p className="font-bold text-primary">{reportData.academic.term}</p>
                <div className="bg-white p-2 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Attendance:</span>
                  <span className="font-bold text-sm">{reportData.attendance.present} / {reportData.attendance.total} days</span>
                </div>
              </div>
            </div>

            {/* Cognitive Domain Performance Table */}
            <div className="mb-8">
              <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-primary rounded-full"></span>
                ACADEMIC PERFORMANCE (COGNITIVE DOMAIN)
              </h4>
              <table className="w-full border-collapse border-2 border-gray-300 rounded-xl overflow-hidden shadow-sm">
                <thead className="bg-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                  <tr>
                    <th className="border border-gray-300 px-4 py-3 text-left w-64">Subject Title</th>
                    <th className="border border-gray-300 px-2 py-3 text-center">CA 1 (5)</th>
                    <th className="border border-gray-300 px-2 py-3 text-center">CA 2 (5)</th>
                    <th className="border border-gray-300 px-2 py-3 text-center">Test 1 (10)</th>
                    <th className="border border-gray-300 px-2 py-3 text-center">Test 2 (10)</th>
                    <th className="border border-gray-300 px-2 py-3 text-center">Exam (70)</th>
                    <th className="border border-gray-300 px-2 py-3 text-center bg-gray-200 text-gray-900">Total (100)</th>
                    <th className="border border-gray-300 px-2 py-3 text-center">Grade</th>
                    <th className="border border-gray-300 px-4 py-3 text-center">Remark</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-800">
                  {reportData.results.map((res, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="border border-gray-200 px-4 py-3 font-bold">{res.subject}</td>
                      <td className="border border-gray-200 px-2 py-3 text-center">{res.assignment1 ?? '-'}</td>
                      <td className="border border-gray-200 px-2 py-3 text-center">{res.assignment2 ?? '-'}</td>
                      <td className="border border-gray-200 px-2 py-3 text-center">{res.test1 ?? '-'}</td>
                      <td className="border border-gray-200 px-2 py-3 text-center">{res.test2 ?? '-'}</td>
                      <td className="border border-gray-200 px-2 py-3 text-center">{res.exam ?? '-'}</td>
                      <td className="border border-gray-200 px-2 py-3 text-center font-black bg-gray-50 text-primary">{Math.round(res.total)}</td>
                      <td className="border border-gray-200 px-2 py-3 text-center font-bold">
                        <span className={`inline-block w-8 py-1 rounded-md ${res.grade === 'A' ? 'bg-green-100 text-green-700' :
                            res.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                              res.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                          }`}>
                          {res.grade}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center italic text-xs font-medium">{res.remark}</td>
                    </tr>
                  ))}
                  {/* Summary Row */}
                  <tr className="bg-primary text-white">
                    <td className="border border-primary-dark px-4 py-3 font-black text-right uppercase">Termly Aggregates</td>
                    <td colSpan={5} className="border border-primary-dark"></td>
                    <td className="border border-primary-dark px-2 py-3 text-center font-black text-lg">{reportData.summary.totalScore}</td>
                    <td className="border border-primary-dark px-2 py-3 text-center font-black text-lg">{reportData.summary.overallGrade}</td>
                    <td className="border border-primary-dark px-4 py-3 text-center font-black uppercase text-xs">{reportData.summary.status}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Psychomotor & Affective Domains + Grading Key */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-6 bg-primary rounded-full"></span>
                  AFFECTIVE & PSYCHOMOTOR SKILLS
                </h4>
                <div className="grid grid-cols-1 gap-2 border-2 border-gray-200 rounded-xl p-4 bg-gray-50/30">
                  {reportData.extras.psychomotorRatings.map((rat, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-gray-100 pb-1 last:border-0">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">{rat.name}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(v => (
                          <div
                            key={v}
                            className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold border ${rat.score === v ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-300 border-gray-200'}`}
                          >
                            {v}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-800 uppercase mb-2">Psychomotor Rating Key:</p>
                  <div className="flex gap-4 text-[9px] text-blue-700 font-bold justify-between">
                    <span>5: EXCELLENT / MAINTAINS HIGHEST STANDARDS</span>
                    <span>1: POOR / NEEDS SERIOUS IMPROVEMENT</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-6 bg-primary rounded-full"></span>
                  GRADING & PERFORMANCE SCALE
                </h4>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="border-2 border-gray-200 rounded-xl overflow-hidden h-fit">
                    <table className="w-full text-[10px]">
                      <thead className="bg-gray-100 font-bold">
                        <tr>
                          <th className="p-2 border-b">Marks</th>
                          <th className="p-2 border-b">Grade</th>
                          <th className="p-2 border-b">Remark</th>
                        </tr>
                      </thead>
                      <tbody className="text-center font-medium">
                        <tr><td className="p-1.5 border-b">70 - 100</td><td className="p-1.5 border-b font-bold">A</td><td className="p-1.5 border-b">Distinction</td></tr>
                        <tr><td className="p-1.5 border-b">60 - 69</td><td className="p-1.5 border-b font-bold">B</td><td className="p-1.5 border-b">Very Good</td></tr>
                        <tr><td className="p-1.5 border-b">50 - 59</td><td className="p-1.5 border-b font-bold">C</td><td className="p-1.5 border-b">Good</td></tr>
                        <tr><td className="p-1.5 border-b">45 - 49</td><td className="p-1.5 border-b font-bold">D</td><td className="p-1.5 border-b">Pass</td></tr>
                        <tr><td className="p-1.5 border-b">40 - 44</td><td className="p-1.5 border-b font-bold">E</td><td className="p-1.5 border-b">Strong Pass</td></tr>
                        <tr><td className="p-1.5">00 - 39</td><td className="p-1.5 font-bold text-red-600">F</td><td className="p-1.5">Fail</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gray-900 text-white p-4 rounded-xl shadow-lg transform rotate-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Overall Assessment</p>
                      <h5 className="text-2xl font-black">{reportData.summary.average}% <span className="text-sm font-normal text-gray-300">AVERAGE</span></h5>
                      <div className="w-full bg-white/20 h-2 rounded-full mt-2 overflow-hidden">
                        <div className="bg-white h-full" style={{ width: `${reportData.summary.average}%` }}></div>
                      </div>
                    </div>
                    <div className="bg-white border-2 border-dashed border-gray-300 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Principal's Final Verdict</p>
                      <p className={`text-xl font-black ${reportData.summary.status === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>{reportData.summary.status}</p>
                      <p className="text-[9px] text-gray-500 font-medium leading-tight mt-1">Status decided based on terminal average cut-off of 40%.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Remarks Area */}
            <div className="space-y-4 mb-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t-2 border-gray-100">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-black text-gray-900 italic uppercase">Form Master's Remark:</p>
                    <div className="min-h-[60px] p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium relative italic">
                      "{reportData.extras.formMasterRemark || 'No specific remark recorded for this term.'}"
                    </div>
                  </div>
                  <div className="flex justify-between items-end pt-4">
                    <div className="text-center w-full max-w-[200px]">
                      <div className="border-b-2 border-gray-300 mb-2"></div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Class Teacher's Signature</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-black text-gray-900 italic uppercase">Principal / Headmaster's Verdict:</p>
                    <div className="min-h-[60px] p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium relative italic">
                      "{reportData.extras.principalRemark || 'Satisfactory academic performance this period.'}"
                    </div>
                  </div>
                  <div className="flex justify-between items-end pt-4">
                    <div className="text-center w-full max-w-[200px]">
                      <div className="border-b-2 border-gray-300 mb-2"></div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Principal's Signature & Stamp</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Information */}
            <div className="bg-gray-900 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Resumption Notice</p>
                <p className="text-lg font-black italic">Next Term Begins: {reportData.academic.nextTermBegins ? new Date(reportData.academic.nextTermBegins).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'To Be Announced'}</p>
              </div>
              <div className="flex flex-col items-center md:items-end">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Validation Data</p>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs font-bold tracking-widest leading-none">ID: {reportData.student.admissionNumber.slice(-8)}</p>
                    <p className="text-[9px] text-gray-400">Gen: {new Date().toLocaleTimeString()}</p>
                  </div>
                  {/* Placeholder for QR Code if ever implemented */}
                  <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center p-1">
                    <svg className="w-full h-full text-white/20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Footer Tag */}
            <div className="mt-4 text-center print:block hidden">
              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.3em]">This is a computer generated result and does not strictly require a physical stamp unless requested.</p>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 transform animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Email Result</h2>
              <button onClick={() => setShowEmailModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Guardian's Email Address</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    placeholder="parent@example.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="w-full rounded-xl border-gray-200 bg-gray-50 p-3 pl-12 focus:ring-primary focus:border-primary transition-all border font-medium"
                  />
                </div>
              </div>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailAddress}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
              >
                {sendingEmail ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : 'Send Official Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Configuration Modal */}
      {showEmailConfig && (
        <EmailConfig
          onClose={() => setShowEmailConfig(false)}
          onSave={() => setShowEmailConfig(false)}
        />
      )}

      {/* Specialized Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4;
            margin: 1cm !important;
          }
          .max-w-7xl {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #result-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          /* Ensure backgrounds print */
          .bg-primary {
            background-color: #1e40af !important;
            -webkit-print-color-adjust: exact;
          }
          .text-white {
            color: white !important;
            -webkit-print-color-adjust: exact;
          }
          .bg-gray-900 {
            background-color: #111827 !important;
            -webkit-print-color-adjust: exact;
          }
          .bg-gray-50 {
            background-color: #f9fafb !important;
            -webkit-print-color-adjust: exact;
          }
          .border-primary {
            border-color: #1e40af !important;
            -webkit-print-color-adjust: exact;
          }
          .text-primary {
            color: #1e40af !important;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default ReportCard;
