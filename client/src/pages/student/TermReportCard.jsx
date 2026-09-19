// Early Years Progress Layout Support v2026.09.13
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatDateVerbose } from '../../utils/formatters';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { downloadReportAsPdf } from '../../utils/reportPdfGenerator';

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

  // PDF download states
  const [downloading, setDownloading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfProgressLabel, setPdfProgressLabel] = useState('');
  const cancelPdfRef = useRef(false);

  // WhatsApp states
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const getStudentDisplayName = (student) => {
    if (!student) return 'Unknown Student';
    const fName = (student.user?.firstName || '').trim();
    const mName = (student.middleName || '').trim();
    const lName = (student.user?.lastName || '').trim();
    const legacyName = (student.name || '').trim();

    if (fName || lName) {
      return `${fName} ${mName} ${lName}`.replace(/\s+/g, ' ').trim();
    }
    return legacyName || mName || `Student (${student.admissionNumber || student.id})`;
  };

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
      } else if (termsArray.length > 0) {
        setSelectedTerm(termsArray[0].id.toString());
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
        const teacherClasses = classesArray.filter(c => Number(c.classTeacherId) === Number(user.id));
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
    const valNum = (score !== null && score !== undefined && !isNaN(parseFloat(score)) && parseFloat(score) > 0) ? parseFloat(score) : 3;
    const rounded = Math.round(valNum);
    return (
      <>
        {[5, 4, 3, 2, 1].map(val => (
          <td key={val} className="border border-black text-center w-6 h-6 font-black text-black">
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

  const printRef = useRef();

  const getDocumentTitle = () => {
    const term = terms.find(t => t.id.toString() === selectedTerm);
    const termName = term ? term.name.replace(/\s+/g, '_') : 'Term';
    
    if (bulkReports && bulkReports.length > 0) {
      const cls = classes.find(c => c.id.toString() === selectedClassId);
      const className = cls ? `${cls.name}_${cls.arm || ''}`.trim().replace(/\s+/g, '_') : 'Class';
      return `Bulk_Reports_${className}_${termName}`.replace(/[^a-zA-Z0-9_]/g, '');
    }
    
    if (reportData && reportData.student) {
      const studentName = getStudentDisplayName(reportData.student).replace(/\s+/g, '_');
      const admNo = (reportData.student.admissionNumber || '').replace(/[^a-zA-Z0-9]/g, '_');
      return `Report_Card_${studentName}_${admNo}_${termName}`.replace(/[^a-zA-Z0-9_]/g, '');
    }
    
    return `Report_Card_${termName}`;
  };

  const handleDownloadPDF = async () => {
    const list = bulkReports.length > 0 ? bulkReports : (reportData ? [reportData] : []);
    if (list.length === 0) return;

    setDownloading(true);
    setPdfProgress(15);
    setPdfProgressLabel('Compiling vector PDF...');
    cancelPdfRef.current = false;

    try {
      await downloadReportAsPdf({
        reports: list,
        schoolSettings,
        title: getDocumentTitle(),
        onProgress: (p, label) => {
          setPdfProgress(p);
          setPdfProgressLabel(label);
        },
        cancelRef: cancelPdfRef
      });
    } catch (err) {
      if (err.message !== 'Cancelled by user') {
        alert(err.message || 'Failed to download PDF');
      }
    } finally {
      setDownloading(false);
    }
  };

  const printReport = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const oldTitle = document.title;
    document.title = getDocumentTitle();
    window.print();
    document.title = oldTitle;
  };

  const sendWhatsApp = async (e) => {
    e.preventDefault();
    if (!whatsAppPhone) {
      alert('Phone number is required');
      return;
    }

    setSendingWhatsApp(true);
    try {
      const response = await api.post('/api/whatsapp/send-report', {
        studentId: reportData.student.id,
        termId: selectedTerm,
        customPhone: whatsAppPhone,
        origin: window.location.origin
      });

      const data = await response.json();

      if (response.ok) {
        if (data.success) {
          alert(data.message || 'Report card sent successfully via WhatsApp Bot!');
          setShowWhatsAppModal(false);
        } else if (data.code === 'BOT_NOT_CONFIGURED') {
          alert('WhatsApp bot not configured. Opening manual send URL...');
          setShowWhatsAppModal(false);
          // Launch wa.me manual link
          const waUrl = `https://api.whatsapp.com/send?phone=${data.parentPhone}&text=${encodeURIComponent(data.textMessage)}`;
          window.open(waUrl, '_blank');
        }
      } else {
        alert(data.error || 'Failed to send WhatsApp message');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to send WhatsApp message');
    } finally {
      setSendingWhatsApp(false);
    }
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
          
          {(reportData || bulkReports.length > 0) && (
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              {reportData && user?.role !== 'student' && user?.role !== 'parent' && (
                <button 
                  onClick={() => {
                    setWhatsAppPhone(reportData?.student?.parentPhone || '');
                    setShowWhatsAppModal(true);
                  }}
                  className="group/btn bg-[#25D366] text-white px-5 py-3 rounded-[20px] font-black uppercase tracking-widest text-xs shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-none"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.733-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.847.002-2.632-1.02-5.107-2.875-6.963C16.595 1.989 14.128 1.01 11.5 1.01c-5.448 0-9.882 4.414-9.885 9.851-.001 1.761.47 3.487 1.365 5.011l-.99 3.618 3.733-.979zm11.585-6.38c-.328-.164-1.942-.959-2.242-1.069-.3-.11-.518-.164-.736.164-.218.327-.847 1.069-1.038 1.287-.19.219-.382.245-.71.082-.328-.164-1.386-.511-2.64-1.63-1.053-.94-1.763-2.1-1.97-2.455-.207-.354-.022-.547.142-.71.147-.146.328-.382.492-.573.164-.19.218-.328.328-.546.11-.219.055-.41-.028-.573-.082-.164-.736-1.775-1.01-2.429-.267-.642-.56-.554-.736-.563-.17-.008-.367-.01-.563-.01-.196 0-.518.073-.79.364-.272.291-1.037 1.01-1.037 2.463 0 1.452 1.055 2.858 1.202 3.056.147.199 2.074 3.167 5.025 4.444.702.304 1.25.485 1.678.62.705.224 1.347.193 1.854.117.565-.084 1.942-.793 2.214-1.527.272-.735.272-1.363.19-1.5-.082-.137-.3-.219-.628-.383z"/>
                  </svg>
                  WhatsApp
                </button>
              )}
              <button 
                onClick={printReport} 
                className="group/btn bg-white hover:bg-emerald-50 text-slate-900 px-6 py-3.5 rounded-[20px] font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white"
              >
                <Printer className="w-4 h-4 text-emerald-600 transition-transform group-hover/btn:rotate-12" />
                Print / Save as PDF {bulkReports.length > 1 ? `(${bulkReports.length} Reports)` : ''}
              </button>
            </div>
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
                {terms.map(term => {
                  const sessionName = term.academicSession?.name || term.session || '';
                  return (
                    <option key={term.id} value={term.id.toString()}>
                      {term.name}{sessionName ? ` - ${sessionName}` : ''}{term.isCurrent ? ' ★ (Active Term)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {user?.role === 'student' || isParentView ? (
              <div className="md:col-span-2 flex flex-col sm:flex-row items-end gap-4">
                {isParentView && (
                  <div className="flex-1 w-full space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Selected Ward</label>
                    {classStudents.length === 1 ? (
                      <div className="w-full bg-slate-100 border-white rounded-2xl px-4 py-4 text-sm font-bold text-slate-700 shadow-inner">
                        {getStudentDisplayName(classStudents[0])}
                      </div>
                    ) : (
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                      >
                        <option value="">Select Student</option>
                        {classStudents.map(s => (
                          <option key={s.id} value={s.id}>{getStudentDisplayName(s)}</option>
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
                          <option value="all">-- GENERATE ENTIRE CLASS --</option>
                          {classStudents.map(s => <option key={s.id} value={s.id}>{getStudentDisplayName(s)}</option>)}
                        </select>
                      </div>
                      <button onClick={fetchReport} disabled={loading || !selectedStudentId} className="h-[54px] bg-primary text-white px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 disabled:bg-slate-200 transition-all">
                        {loading ? '...' : 'GENERATE'}
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
          <div ref={printRef} className="space-y-20 print:space-y-0">
            {(Array.isArray(bulkReports) && bulkReports.length > 0 ? bulkReports : [reportData]).map((data, idx) => {
            if (!data || !data.student) return null;

            const reportColor = data.reportSettings?.reportColorScheme || (data.schoolSettings || schoolSettings)?.reportColorScheme || (data.schoolSettings || schoolSettings)?.primaryColor;
            const reportFont = data.reportSettings?.reportFontFamily || (data.schoolSettings || schoolSettings)?.reportFontFamily || 'serif';
            const showPosition = data.reportSettings?.showPositionOnReport !== undefined ? data.reportSettings.showPositionOnReport : ((data.schoolSettings || schoolSettings)?.showPositionOnReport !== false);
            const showFees = data.reportSettings?.showFeesOnReport !== undefined ? data.reportSettings.showFeesOnReport : ((data.schoolSettings || schoolSettings)?.showFeesOnReport !== false);
            const showAttendance = ((data.schoolSettings || schoolSettings)?.showAttendanceOnReport !== false) && (data.reportSettings?.showAttendanceOnReport !== false);
            const layoutRawDB = (data.student?.classModel?.reportLayout && data.student.classModel.reportLayout.trim() !== '') ? data.student.classModel.reportLayout : ((data.reportSettings?.reportLayout && data.reportSettings.reportLayout.trim() !== '') ? data.reportSettings.reportLayout : ((data.schoolSettings || schoolSettings)?.reportLayout || 'classic'));
            const isEarlyYears = layoutRawDB.startsWith('early_years') || /early|nursery|kg|kindergarten|reception|playgroup|toddler|creche|pre-k|ركن|الركن|روضة|الروضة|تمهيدي|حضانة/i.test(data.student?.class || '');
            // Strip page-format suffix so layoutRaw never encodes the page count
            const layoutRaw = isEarlyYears ? 'early_years' : layoutRawDB;
            const layout = layoutRaw;
            const borderStyle = isEarlyYears ? 'border-0 print:border-0' : (layout === 'minimal' ? 'border-[2px] border-gray-400' : layout === 'modern' ? 'border-[6px] rounded-2xl' : 'border-[12px]');

            const domainSplit = splitDomains(data.psychomotorRatings);
            const gradeAnalysis = getGradeAnalysis(data.subjects || []);
            const termNumber = data.term?.number || data.academic?.termNumber;
            
            const studentPhoto = data.student?.user?.photoUrl || data.student?.photoUrl;
            const photoUri = studentPhoto ? (studentPhoto.startsWith('data:') || studentPhoto.startsWith('http') ? studentPhoto : `${API_BASE_URL}${studentPhoto}`) : null;

            return (
              <div key={idx} className="mb-20 last:mb-0 print:mb-0">
                {/* Mobile Scroll Hint */}
                <div className="md:hidden flex items-center justify-center gap-2 mb-4 text-primary font-bold text-xs uppercase tracking-widest animate-pulse no-print">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  Scroll to view full sheet
                </div>

                <div className="report-card-mobile-wrapper overflow-x-auto pb-8 print:overflow-visible">
                  <div className="report-card-scaler origin-top-left sm:origin-top scale-[0.45] xs:scale-[0.55] sm:scale-100 transition-transform duration-500 print:scale-100 print:transform-none">
                    <div key={idx} className={`relative bg-white text-black ${borderStyle} emerald-print-A4 mx-auto w-[210mm] max-w-full print:w-full print:max-w-full print:min-w-0 print:m-0 ${isEarlyYears ? 'p-0 print:p-0 my-0 print:my-0 shadow-none border-0 print:border-0' : 'p-8 print:p-0 my-8 print:my-0 shadow-2xl print:shadow-none'}`} style={{ fontFamily: reportFont, borderColor: (!isEarlyYears && layout !== 'minimal') ? reportColor : undefined, pageBreakAfter: bulkReports.length > 1 && idx < bulkReports.length - 1 ? 'always' : 'avoid', breakAfter: bulkReports.length > 1 && idx < bulkReports.length - 1 ? 'page' : 'avoid' }}>

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
                  {layout === 'early_years' ? (() => {
                    // Class-specific template suffix (e.g., early_years_1-page) wins over school-wide setting.
                    const classLayoutSuffix = (layoutRawDB && layoutRawDB.startsWith('early_years_')) ? layoutRawDB.replace('early_years_', '') : null;
                    let earlyYearsPageFormat = classLayoutSuffix || data.reportSettings?.earlyYearsPageFormat || (data.schoolSettings || schoolSettings)?.earlyYearsPageFormat || '3-page';
                    const page1Domains = allDomains.filter(d => (d.name || '').startsWith('01') || (d.name || '').startsWith('02') || (d.name || '').startsWith('03'));
                    const extraDomains = allDomains.filter(d => !(d.name || '').startsWith('01') && !(d.name || '').startsWith('02') && !(d.name || '').startsWith('03'));
                    
                    // If 3-page format is requested but student only has domains up to 03 (no 04+ extra domains), auto-adapt to 2-page format to prevent empty pages!
                    if (earlyYearsPageFormat === '3-page' && extraDomains.length === 0) {
                      earlyYearsPageFormat = '2-page';
                    }
                    const ss = data.schoolSettings || schoolSettings;
                    const logoUrl = ss?.logoUrl;
                    const logoUri = logoUrl ? (logoUrl.startsWith('data:') || logoUrl.startsWith('http') ? logoUrl : `${API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL}${logoUrl.startsWith('/') ? logoUrl : '/' + logoUrl}`) : null;
                    const studentPhoto = data.student?.user?.photoUrl || data.student?.photoUrl;
                    const photoUri = studentPhoto ? (studentPhoto.startsWith('data:') || studentPhoto.startsWith('http') ? studentPhoto : `${API_BASE_URL}${studentPhoto}`) : null;
                    const currentReportColor = reportColor || ss?.reportColorScheme || ss?.primaryColor || '#065f46';

                    if (earlyYearsPageFormat === '1-page') {
                      const halfLength = Math.ceil((allDomains || []).length / 2);
                      const leftDomains = (allDomains || []).slice(0, halfLength);
                      const rightDomains = (allDomains || []).slice(halfLength);
                      const verificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/term/${data.student?.id}/${selectedTerm || data.term?.id}` : '';

                      return (
                        <div className="bg-white border-4 p-5 sm:p-6 space-y-4 print:p-4 print:space-y-3.5 rounded-xl shadow-lg flex flex-col justify-between" style={{ borderColor: currentReportColor, minHeight: '282mm' }}>
                          <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                            {/* Header */}
                            <div className="grid grid-cols-[72px_1fr_72px] items-center gap-4 pb-2.5 border-b-2" style={{ borderColor: currentReportColor }}>
                              <div className="w-18 h-18 flex-shrink-0 flex items-center justify-center">
                                {logoUri ? (
                                  <img src={logoUri} alt="School Logo" className="w-full h-full object-contain" />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center text-[9px] text-gray-400 font-bold uppercase text-center p-0.5">No Logo</div>
                                )}
                              </div>
                              <div className="flex flex-col items-center justify-center text-center space-y-0.5 w-full mx-auto">
                                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider leading-tight text-center mx-auto" style={{ color: currentReportColor }}>
                                  {ss?.name || ss?.schoolName || 'AL-BAYYINAH BASIC / TAHFEEDH SCHOOL'}
                                </h1>
                                {ss?.motto && (
                                  <p className="text-xs font-black italic text-gray-700 uppercase tracking-wide text-center mx-auto">
                                    "{ss.motto}"
                                  </p>
                                )}
                                <p className="text-[10px] font-bold text-gray-600 leading-tight text-center mx-auto">
                                  {ss?.address || 'Kano, Nigeria'}
                                </p>
                              </div>
                              <div className="w-18 h-18 flex-shrink-0 flex items-center justify-center">
                                {photoUri ? (
                                  <img src={photoUri} alt="Student" className="w-16 h-18 object-cover rounded-lg border-2 border-gray-300 shadow-xs" />
                                ) : (
                                  <div className="w-16 h-18 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center text-[9px] text-gray-400 font-bold uppercase text-center p-0.5">Photo</div>
                                )}
                              </div>
                            </div>

                            {/* Title Banner */}
                            <div className="text-center py-1.5 font-black uppercase text-xs sm:text-sm tracking-widest text-white rounded-md shadow-xs flex items-center justify-center gap-2" style={{ backgroundColor: currentReportColor }}>
                              <span>✨</span>
                              <span>EARLY YEARS PROGRESS REPORT</span>
                              <span>✨</span>
                            </div>

                            {/* Student Info Grid */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[10.5px] font-bold uppercase grid grid-cols-3 gap-x-4 gap-y-1.5">
                              <div><span className="text-gray-500 font-semibold">NAME:</span> <span className="text-black font-black">{getStudentDisplayName(data.student)}</span></div>
                              <div><span className="text-gray-500 font-semibold">GENDER:</span> <span className="text-black">{data.student?.gender || '-'}</span></div>
                              <div><span className="text-gray-500 font-semibold">ADM NO:</span> <span className="text-black">{data.student?.admissionNumber || '-'}</span></div>
                              <div><span className="text-gray-500 font-semibold">CLASS:</span> <span className="text-black">{data.student?.class || '-'}</span></div>
                              <div><span className="text-gray-500 font-semibold">TERM:</span> <span className="text-black">{data.term?.session} - {data.term?.name}</span></div>
                              <div><span className="text-gray-500 font-semibold">ATTENDANCE:</span> <span className="text-black">{data.attendance?.present || 0}/{data.attendance?.total || 0} DAYS ({data.attendance?.percentage || 0}%)</span></div>
                            </div>

                            {/* Kindergarten Rating Legend / Scale */}
                            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2 text-[9.5px] sm:text-[10px] font-bold text-center uppercase tracking-wide flex justify-around items-center gap-1">
                              <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-black">5 / EX: EXCEEDING</span>
                              <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 border border-blue-300 font-black">4 / MT: MEETING</span>
                              <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-black">3 / DV: DEVELOPING</span>
                              <span className="px-2.5 py-1 rounded-md bg-orange-100 text-orange-900 border border-orange-300 font-black">2 / EM: EMERGING</span>
                              <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-900 border border-rose-300 font-black">1 / NT: NOT TAUGHT</span>
                            </div>

                            {/* 2-Column Domains Layout */}
                            <div className="grid grid-cols-2 gap-4 items-start">
                              {[leftDomains, rightDomains].map((colDomains, colIdx) => (
                                <div key={colIdx} className="space-y-3">
                                  {colDomains.map((domain, dIdx) => (
                                    <div key={dIdx} className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-xs">
                                      <div className="px-3 py-1.5 font-black uppercase text-[11px] sm:text-xs text-white flex justify-between items-center" style={{ backgroundColor: currentReportColor }}>
                                        <span>{domain.name}</span>
                                        <span className="text-[9px] font-mono tracking-widest opacity-90">5 4 3 2 1</span>
                                      </div>
                                      <div className="divide-y divide-gray-100">
                                        {(domain.skills || []).map((skill, sIdx) => {
                                          const score = Math.round(skill.score || 0);
                                          return (
                                            <div key={sIdx} className="py-1.5 px-3 flex justify-between items-center hover:bg-slate-50">
                                              <span className="font-bold text-slate-800 text-[10px] sm:text-[10.5px] leading-tight pr-2">{skill.name}</span>
                                              <div className="flex items-center gap-1 font-mono text-[9px] flex-shrink-0">
                                                {[5, 4, 3, 2, 1].map(val => (
                                                  <span key={val} className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] ${score === val ? 'font-black text-white shadow-xs' : 'text-gray-300'}`} style={{ backgroundColor: score === val ? currentReportColor : 'transparent' }}>
                                                    {score === val ? val : '·'}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>

                            {/* Comments Section */}
                            <div className="grid grid-cols-2 gap-3.5">
                              <div className="border border-emerald-300 bg-emerald-50/40 rounded-lg p-2.5 min-h-[52px] flex flex-col justify-center">
                                <p className="font-black text-[9px] uppercase mb-0.5 tracking-wider" style={{ color: currentReportColor }}>TEACHER'S COMMENT</p>
                                <p className="italic text-[9.5px] sm:text-[10px] font-medium text-slate-800 leading-snug">"{data.developmentPlan?.teacherComment || 'The student is an energetic and engaged learner who has made good progress this term.'}"</p>
                              </div>
                              <div className="border border-teal-300 bg-teal-50/40 rounded-lg p-2.5 min-h-[52px] flex flex-col justify-center">
                                <p className="font-black text-[9px] uppercase mb-0.5 tracking-wider" style={{ color: currentReportColor }}>HEAD TEACHER'S COMMENT</p>
                                <p className="italic text-[9.5px] sm:text-[10px] font-medium text-slate-800 leading-snug">"{data.developmentPlan?.headTeacherComment || 'Has shown encouraging progress this term. Should continue to practise consistently.'}"</p>
                              </div>
                            </div>
                          </div>

                          {/* Footer Block with Signatures & Bottom QR Code */}
                          <div className="pt-3 border-t-2 border-gray-200 space-y-2.5">
                            <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-6">
                              {/* QR Code at Bottom Left */}
                              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 p-2 rounded-lg">
                                <QRCodeSVG value={verificationUrl} size={50} level="H" includeMargin={false} />
                                <div className="text-[8px] font-bold text-gray-600 uppercase leading-tight pr-1">
                                  <p className="font-black text-black text-[8.5px]">Scan to Verify</p>
                                  <p className="text-gray-500">Authentic Record</p>
                                </div>
                              </div>

                              {/* Class Teacher Signature */}
                              <div className="text-center font-bold uppercase">
                                <p className="mb-4 text-[9.5px] text-gray-600">CLASS TEACHER SIGNATURE</p>
                                <div className="border-b border-gray-400 w-full mb-1"></div>
                                <p className="text-[8.5px] text-gray-500">DATE: ______________</p>
                              </div>

                              {/* Head Teacher Signature */}
                              <div className="text-center font-bold uppercase">
                                <p className="mb-4 text-[9.5px] text-gray-600">HEAD TEACHER SIGNATURE</p>
                                <div className="border-b border-gray-400 w-full mb-1"></div>
                                <p className="text-[8.5px] text-gray-500">DATE: ______________</p>
                              </div>
                            </div>

                            {/* Bottom Footer Info */}
                            <div className="flex justify-between items-center text-[8.5px] font-semibold text-gray-400 pt-1.5 border-t border-gray-200">
                              <span>Early Years Progress Report</span>
                              <span>Official Authenticated Record</span>
                              <span>Page 1 of 1</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (earlyYearsPageFormat === '2-page') {
                      return (
                        <div className="space-y-6">
                          {/* PAGE 1 */}
                          <div className="bg-white border-4 p-5 sm:p-6 space-y-3 print:p-4 print:space-y-2 rounded-xl flex flex-col justify-between min-h-[282mm] print:min-h-[285mm] w-full box-border print:break-after-page" style={{ borderColor: currentReportColor, pageBreakAfter: 'always', breakAfter: 'page' }}>
                            {/* Header */}
                            <div className="grid grid-cols-[96px_1fr_96px] items-center gap-4 mb-2 pb-2 border-b-2 border-black">
                              {/* Logo */}
                              <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
                                {logoUri ? (
                                  <img src={logoUri} alt="School Logo" className="w-full h-full object-contain" />
                                ) : (
                                  <div className="w-20 h-20 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-[10px] text-gray-400 font-bold uppercase text-center p-1">No Logo</div>
                                )}
                              </div>

                              {/* Center School Details */}
                              <div className="flex flex-col items-center justify-center text-center space-y-1 w-full mx-auto">
                                <h1 className="text-2xl font-black uppercase tracking-wider leading-tight text-center mx-auto" style={{ color: currentReportColor }}>
                                  {ss?.name || ss?.schoolName || 'AL-BAYYINAH BASIC / TAHFEEDH SCHOOL'}
                                </h1>
                                {ss?.motto && (
                                  <p className="text-xs font-black italic text-gray-800 uppercase tracking-wide text-center mx-auto">
                                    "{ss.motto}"
                                  </p>
                                )}
                                <p className="text-[11px] font-bold text-gray-700 leading-tight text-center mx-auto">
                                  {ss?.address || 'Kano, Nigeria'}
                                </p>
                                {(ss?.phone || ss?.email) && (
                                  <p className="text-[10px] font-bold text-gray-600 text-center mx-auto">
                                    {ss?.phone ? `TEL: ${ss.phone}` : ''} {ss?.phone && ss?.email ? ' | ' : ''} {ss?.email ? `EMAIL: ${ss.email}` : ''}
                                  </p>
                                )}
                                <div className="pt-1 text-center mx-auto">
                                  <h2 className="text-xs font-black uppercase tracking-widest text-white py-1 px-4 inline-block rounded shadow-sm" style={{ backgroundColor: currentReportColor }}>
                                    EARLY YEARS PROGRESS REPORT
                                  </h2>
                                </div>
                              </div>

                              {/* Student Photo */}
                              <div className="w-24 h-28 flex-shrink-0 flex items-center justify-center">
                                {photoUri ? (
                                  <img src={photoUri} alt="Student Photo" className="w-24 h-28 object-cover border-2 border-black rounded shadow-sm" />
                                ) : (
                                  <div className="w-24 h-28 bg-gray-100 border-2 border-black rounded flex items-center justify-center text-[10px] text-gray-400 font-bold uppercase">Photo</div>
                                )}
                              </div>
                            </div>

                            {/* Student Details Table */}
                            <table className="w-full border-2 border-black border-collapse text-xs font-bold uppercase">
                              <tbody>
                                <tr className="border-b border-black">
                                  <td className="border-r border-black p-1.5 w-[15%] bg-gray-100 font-black">STUDENT</td>
                                  <td className="border-r border-black p-1.5 w-[45%] font-black text-black">{getStudentDisplayName(data.student)}</td>
                                  <td className="border-r border-black p-1.5 w-[15%] bg-gray-100 font-black">CLASS</td>
                                  <td className="p-1.5 w-[25%] font-black text-black">{data.student?.class}</td>
                                </tr>
                                <tr className="border-b border-black">
                                  <td className="border-r border-black p-1.5 bg-gray-100 font-black">DATE OF BIRTH</td>
                                  <td className="border-r border-black p-1.5 font-bold">{formatDateVerbose(data.student?.dateOfBirth)}</td>
                                  <td className="border-r border-black p-1.5 bg-gray-100 font-black">SESSION</td>
                                  <td className="p-1.5 font-bold">{data.term?.session}</td>
                                </tr>
                                <tr>
                                  <td className="border-r border-black p-1.5 bg-gray-100 font-black">TERM</td>
                                  <td className="border-r border-black p-1.5 font-bold">{data.term?.name}</td>
                                  <td className="border-r border-black p-1.5 bg-gray-100 font-black">REPORT STATUS</td>
                                  <td className="p-1.5 font-black text-emerald-800">Published</td>
                                </tr>
                              </tbody>
                            </table>

                            {/* Attendance Summary */}
                            {data.attendance && (
                              <div className="border-2 border-black">
                                <div className="grid grid-cols-4 divide-x-2 divide-black text-center p-2">
                                  <div>
                                    <div className="text-xl font-black text-black">{data.attendance.present ?? 0}</div>
                                    <div className="text-[10px] font-black uppercase text-gray-700">DAYS PRESENT</div>
                                  </div>
                                  <div>
                                    <div className="text-xl font-black text-black">{data.attendance.absent ?? 0}</div>
                                    <div className="text-[10px] font-black uppercase text-gray-700">DAYS ABSENT</div>
                                  </div>
                                  <div>
                                    <div className="text-xl font-black text-black">{data.attendance.percentage}%</div>
                                    <div className="text-[10px] font-black uppercase text-gray-700">ATTENDANCE</div>
                                  </div>
                                  <div>
                                    <div className="text-xl font-black text-black">—</div>
                                    <div className="text-[10px] font-black uppercase text-gray-700">NEXT TERM</div>
                                  </div>
                                </div>
                              </div>
                            )}
                            <p className="text-xs font-black text-black">
                              Next term begins: <span className="underline">{data.term?.nextTermBegins ? formatDateVerbose(data.term.nextTermBegins) : '4 May 2026'}</span>
                            </p>

                            {/* Assessment Key Banner */}
                            <div>
                              <p className="text-xs font-black uppercase mb-1 text-black">ASSESSMENT KEY</p>
                              <div className="grid grid-cols-4 border-2 border-black divide-x-2 divide-black text-center p-1.5 text-xs font-black">
                                <div className="bg-emerald-100 p-1 text-emerald-900 border-r border-black">
                                  <span className="font-black text-sm block text-emerald-800">A</span>
                                  <span className="text-[10px] font-bold">Achieved Target</span>
                                </div>
                                <div className="bg-sky-100 p-1 text-sky-900 border-r border-black">
                                  <span className="font-black text-sm block text-sky-800">P</span>
                                  <span className="text-[10px] font-bold">Progressing Well</span>
                                </div>
                                <div className="bg-amber-100 p-1 text-amber-900 border-r border-black">
                                  <span className="font-black text-sm block text-amber-800">W</span>
                                  <span className="text-[10px] font-bold">Working Towards</span>
                                </div>
                                <div className="bg-slate-100 p-1 text-slate-700">
                                  <span className="font-black text-sm block text-slate-700">NA</span>
                                  <span className="text-[10px] font-bold">Not Applicable</span>
                                </div>
                              </div>
                            </div>

                            {/* Page 1 Domains (ALL Domains for 2-page) */}
                            {allDomains.map((domain, dIdx) => {
                              const headerColors = [
                                'bg-emerald-600 text-white',
                                'bg-indigo-600 text-white',
                                'bg-purple-600 text-white',
                                'bg-amber-600 text-white',
                                'bg-teal-600 text-white',
                                'bg-rose-600 text-white'
                              ];
                              const domainHeaderBg = headerColors[dIdx % headerColors.length];
                              return (
                                <div key={dIdx} className="border-2 border-black overflow-hidden shadow-xs">
                                  <div className={`px-3 py-1 font-black text-[11px] uppercase border-b-2 border-black flex justify-between items-center ${domainHeaderBg}`}>
                                    <span>{domain.name}</span>
                                    <span className="text-[9px] font-bold opacity-80">Domain {dIdx + 1}</span>
                                  </div>
                                  <table className="w-full border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-gray-100 border-b border-black text-[10px] font-black uppercase text-black">
                                        <th className="p-1 text-left border-r border-black">Learning outcome / skill</th>
                                        <th className="p-1 text-center w-16 border-r border-black">Current</th>
                                        <th className="p-1 text-center w-16 border-r border-black">Previous</th>
                                        <th className="p-1 text-center w-28">Progress</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(domain.skills || []).map((skill, sIdx) => {
                                        const curVal = (skill.current || 'A').toUpperCase();
                                        const prevVal = (skill.previous || 'A').toUpperCase();
                                        const progVal = (skill.progress || 'Maintained').trim();

                                        const renderGradeBadge = (val) => {
                                          if (val === 'A') return <span className="inline-block px-2 py-0.5 rounded font-black text-xs bg-emerald-500 text-white shadow-2xs">A</span>;
                                          if (val === 'P') return <span className="inline-block px-2 py-0.5 rounded font-black text-xs bg-sky-500 text-white shadow-2xs">P</span>;
                                          if (val === 'W') return <span className="inline-block px-2 py-0.5 rounded font-black text-xs bg-amber-500 text-white shadow-2xs">W</span>;
                                          return <span className="inline-block px-2 py-0.5 rounded font-black text-xs bg-slate-400 text-white">NA</span>;
                                        };

                                        const renderProgressBadge = (val) => {
                                          if (val.toLowerCase().includes('improv')) {
                                            return (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                <span className="font-black text-emerald-600">↑</span> Improved
                                              </span>
                                            );
                                          }
                                          if (val.toLowerCase().includes('maintain')) {
                                            return (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-sky-100 text-sky-800 border border-sky-300">
                                                <span className="font-black text-sky-600">→</span> Maintained
                                              </span>
                                            );
                                          }
                                          return (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-300">
                                              <span className="font-black text-amber-600">⚡</span> Needs Support
                                            </span>
                                          );
                                        };

                                        return (
                                          <tr key={sIdx} className="border-b border-gray-200 last:border-b-0 h-6 font-medium text-black text-[11px] hover:bg-gray-50/50">
                                            <td className="p-1 border-r border-black font-bold">{skill.name}</td>
                                            <td className="p-1 text-center border-r border-black">{renderGradeBadge(curVal)}</td>
                                            <td className="p-1 text-center border-r border-black">{renderGradeBadge(prevVal)}</td>
                                            <td className="p-1 text-center">{renderProgressBadge(progVal)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })}
                            <div className="flex justify-between text-[10px] text-gray-500 font-bold border-t pt-2">
                              <span>Early Years Assessment & Progress Report</span>
                              <span>Confidential School Record</span>
                              <span>Page 1 of 2</span>
                            </div>
                          </div>

                          {/* PAGE 2 */}
                          <div className="bg-white border-4 border-black p-5 sm:p-6 space-y-3 print:p-4 print:space-y-2 rounded-xl flex flex-col justify-between min-h-[282mm] print:min-h-[285mm] w-full box-border print:break-before-page" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
                            <div className="text-center border-b-2 border-black pb-2">
                              <h2 className="text-sm font-black uppercase tracking-wider text-black">EARLY YEARS PROGRESS REPORT</h2>
                            </div>

                            {/* PROGRESS AT A GLANCE TABLE */}
                            <div className="border-2 border-black overflow-hidden shadow-xs">
                              <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 text-white px-3 py-1 font-black text-xs uppercase tracking-wider flex justify-between items-center">
                                <span>PROGRESS AT A GLANCE</span>
                                <span className="text-[10px] font-bold text-pink-200">DEVELOPMENT SUMMARY</span>
                              </div>
                              <table className="w-full border-collapse text-xs">
                                <thead>
                                  <tr className="bg-gray-100 border-b-2 border-black font-black uppercase text-black text-[11px]">
                                    <th className="p-1.5 text-left w-1/4 border-r border-black">DEVELOPMENT AREA</th>
                                    <th className="p-1.5 text-left w-3/8 border-r border-black text-emerald-900">WHAT IS GOING WELL</th>
                                    <th className="p-1.5 text-left w-3/8 text-indigo-900">NEXT FOCUS & GOALS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(data.progressAtAGlance || [
                                    { area: 'Literacy', goingWell: 'Sound recognition, rhymes and reading direction.', nextFocus: 'Continue vocabulary and sentence development.' },
                                    { area: 'Numeracy', goingWell: 'Counting, number recognition and basic concepts.', nextFocus: 'Reinforce number concepts through daily practice.' },
                                    { area: 'Physical', goingWell: 'Fine-motor control, organised play and safety.', nextFocus: 'Maintain regular pencil, crayon and scissors activities.' },
                                    { area: 'Social / Emotional', goingWell: 'Self-control, confidence and participation.', nextFocus: 'Continue positive reinforcement and independence.' }
                                  ]).map((row, rIdx) => {
                                    const areaPillColors = [
                                      'bg-emerald-100 text-emerald-900 border-emerald-300',
                                      'bg-sky-100 text-sky-900 border-sky-300',
                                      'bg-purple-100 text-purple-900 border-purple-300',
                                      'bg-amber-100 text-amber-900 border-amber-300'
                                    ];
                                    return (
                                      <tr key={rIdx} className="border-b border-gray-300 last:border-b-0 font-medium text-black hover:bg-gray-50">
                                        <td className="p-1.5 border-r border-black font-black">
                                          <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-black ${areaPillColors[rIdx % areaPillColors.length]}`}>
                                            {row.area}
                                          </span>
                                        </td>
                                        <td className="p-1.5 border-r border-black bg-emerald-50/20">{row.goingWell}</td>
                                        <td className="p-1.5 bg-indigo-50/20">{row.nextFocus}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* TEACHER'S OVERALL COMMENT */}
                            <div className="space-y-1">
                              <p className="text-xs font-black uppercase text-black">TEACHER'S OVERALL COMMENT</p>
                              <div className="border-2 border-black p-3 text-xs italic font-medium leading-relaxed bg-gray-50 text-black">
                                "{data.developmentPlan?.teacherComment || 'The student is an energetic and engaged learner who has made clear progress during the term. She demonstrates strong performance in areas of interest and is developing confidence across literacy, numeracy and classroom activities.'}"
                              </div>
                            </div>

                            {/* SUBJECT / DEVELOPMENT COMMENTS */}
                            <div className="space-y-1">
                              <p className="text-xs font-black uppercase text-black">SUBJECT / DEVELOPMENT COMMENTS</p>
                              <table className="w-full border-2 border-black border-collapse text-xs">
                                <tbody>
                                  <tr className="border-b border-black">
                                    <td className="p-2 w-1/4 font-black border-r border-black bg-gray-100 uppercase text-black">LITERACY</td>
                                    <td className="p-2 italic text-black">{data.developmentPlan?.literacyComment || 'Recognises letter sounds confidently and is developing ability to use complete sentences and appropriate vocabulary.'}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-2 w-1/4 font-black border-r border-black bg-gray-100 uppercase text-black">NUMERACY</td>
                                    <td className="p-2 italic text-black">{data.developmentPlan?.numeracyComment || 'Demonstrates strong understanding of basic numeracy concepts and applies counting and number skills confidently.'}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* RECOMMENDED NEXT STEPS */}
                            <div className="space-y-1">
                              <p className="text-xs font-black uppercase text-black">RECOMMENDED NEXT STEPS</p>
                              <table className="w-full border-2 border-black border-collapse text-xs">
                                <thead>
                                  <tr className="bg-gray-100 border-b border-black font-black uppercase text-black text-[11px]">
                                    <th className="p-2 text-left w-1/2 border-r border-black">At School</th>
                                    <th className="p-2 text-left w-1/2">At Home</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="p-2 border-r border-black text-black">{data.developmentPlan?.atSchoolNextStep || 'Continue guided literacy and numeracy practice; reinforce independent classroom routines.'}</td>
                                    <td className="p-2 text-black">{data.developmentPlan?.atHomeNextStep || 'Read together, practise sounds and counting, and use everyday objects for sorting and number games.'}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* HEAD TEACHER'S COMMENT */}
                            <div className="space-y-1">
                              <p className="text-xs font-black uppercase text-black">HEAD TEACHER'S COMMENT</p>
                              <div className="border-2 border-black p-3 text-xs italic font-medium leading-relaxed bg-gray-50 text-black">
                                "{data.developmentPlan?.headTeacherComment || 'Has shown encouraging progress this term. Should continue to practise consistently and maintain a positive attitude toward learning.'}"
                              </div>
                            </div>

                            {/* Signatures */}
                            <div className="grid grid-cols-2 max-w-xl mx-auto gap-12 pt-4 text-center text-xs font-black uppercase text-black">
                              <div className="space-y-2">
                                <p>CLASS TEACHER</p>
                                <div className="border-b-2 border-black h-8 flex items-center justify-center">
                                  {data.student?.formMasterSignatureUrl && (
                                    <img src={data.student.formMasterSignatureUrl.startsWith('data:') || data.student.formMasterSignatureUrl.startsWith('http') ? data.student.formMasterSignatureUrl : `${API_BASE_URL}${data.student.formMasterSignatureUrl}`} alt="Teacher Signature" className="h-full w-auto mix-blend-multiply" />
                                  )}
                                </div>
                                <p className="text-[10px] font-normal">Date: ______________</p>
                              </div>
                              <div className="space-y-2">
                                <p>HEAD TEACHER</p>
                                <div className="border-b-2 border-black h-8 flex items-center justify-center">
                                  {data.term?.principalSignatureUrl && (
                                    <img src={data.term.principalSignatureUrl.startsWith('data:') || data.term.principalSignatureUrl.startsWith('http') ? data.term.principalSignatureUrl : `${API_BASE_URL}${data.term.principalSignatureUrl}`} alt="Principal Signature" className="h-full w-auto mix-blend-multiply" />
                                  )}
                                </div>
                                <p className="text-[10px] font-normal">Date: ______________</p>
                              </div>
                            </div>

                            <p className="text-[10px] text-gray-500 text-center pt-3 border-t border-gray-200">
                              Report integrity: Published reports should be locked against unauthorised changes. Assessment templates and rating schemes should be configurable by school administrators.
                            </p>

                            {/* DOCUMENT VERIFICATION FOOTER / QR CODE SCANNER */}
                            <div className="mt-2 border-t border-gray-200 pt-1 flex justify-between items-center bg-transparent">
                              <div className="flex items-center gap-3">
                                <div className="group/qr relative bg-white p-1 rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md">
                                  <QRCodeSVG 
                                    value={`${window.location.origin}/verify/term/${data.student?.id}/${selectedTerm}`}
                                    size={42}
                                    level="H"
                                    includeMargin={false}
                                    className="grayscale hover:grayscale-0 transition-all duration-500 cursor-help"
                                  />
                                </div>
                                <div className="space-y-0.5">
                                  <div className="text-[9px] font-black text-black flex items-center gap-1 uppercase tracking-tighter">
                                    <svg className="w-2.5 h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M2.166 4.9L10 1.55l7.834 3.35a1 1 0 01.583.912v5.188a10 10 0 01-5.188 8.163l-3.229 1.737a1 1 0 01-.912 0l-3.229-1.737A10 10 0 011.583 11V5.812a1 1 0 01.583-.912z" clipRule="evenodd" />
                                    </svg>
                                    DIGITALLY VERIFIED REPORT
                                  </div>
                                  <div className="text-[8px] font-bold text-black tracking-tight uppercase">Scan QR Code To Verify Authenticity</div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-[9px] font-black text-black uppercase tracking-tighter">Early Years Verification</div>
                                <div className="text-[8px] font-bold text-black uppercase">TERM: {data.term?.name?.toUpperCase()} • GEN: {formatDateVerbose(new Date())}</div>
                              </div>
                            </div>

                            <div className="flex justify-between text-[10px] text-gray-500 font-bold border-t pt-2">
                              <span>Early Years Assessment & Progress Report</span>
                              <span>Confidential School Record</span>
                              <span>Page 2 of 2</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                      {/* PAGE 1 */}
                      <div className="bg-white border-4 p-5 sm:p-6 space-y-3 print:p-4 print:space-y-2 rounded-xl flex flex-col justify-between min-h-[282mm] print:min-h-[285mm] w-full box-border" style={{ borderColor: currentReportColor }}>
                        {/* Header */}
                        <div className="grid grid-cols-[96px_1fr_96px] items-center gap-4 mb-2 pb-2 border-b-2 border-black">
                          {/* Logo */}
                          <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
                            {logoUri ? (
                              <img src={logoUri} alt="School Logo" className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-20 h-20 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-[10px] text-gray-400 font-bold uppercase text-center p-1">No Logo</div>
                            )}
                          </div>

                          {/* Center School Details */}
                          <div className="flex flex-col items-center justify-center text-center space-y-1 w-full mx-auto">
                            <h1 className="text-2xl font-black uppercase tracking-wider leading-tight text-center mx-auto" style={{ color: currentReportColor }}>
                              {ss?.name || ss?.schoolName || schoolSettings?.schoolName || 'AL-BAYYINAH BASIC / TAHFEEDH SCHOOL'}
                            </h1>
                            {ss?.motto && (
                              <p className="text-xs font-black italic text-gray-800 uppercase tracking-wide text-center mx-auto">
                                "{ss.motto}"
                              </p>
                            )}
                            <p className="text-[11px] font-bold text-gray-700 leading-tight text-center mx-auto">
                              {ss?.address || schoolSettings?.address || 'Kano, Nigeria'}
                            </p>
                            {(ss?.phone || ss?.email || schoolSettings?.phone || schoolSettings?.email) && (
                              <p className="text-[10px] font-bold text-gray-600 text-center mx-auto">
                                {(ss?.phone || schoolSettings?.phone) ? `TEL: ${ss?.phone || schoolSettings?.phone}` : ''} {(ss?.phone || schoolSettings?.phone) && (ss?.email || schoolSettings?.email) ? ' | ' : ''} {(ss?.email || schoolSettings?.email) ? `EMAIL: ${ss?.email || schoolSettings?.email}` : ''}
                              </p>
                            )}
                            <div className="pt-1 text-center mx-auto">
                              <h2 className="text-xs font-black uppercase tracking-widest text-white py-1 px-4 inline-block rounded shadow-sm" style={{ backgroundColor: currentReportColor }}>
                                EARLY YEARS PROGRESS REPORT
                              </h2>
                            </div>
                          </div>

                          {/* Student Photo */}
                          <div className="w-24 h-28 flex-shrink-0 flex items-center justify-center">
                            {photoUri ? (
                              <img src={photoUri} alt="Student Photo" className="w-24 h-28 object-cover border-2 border-black rounded shadow-sm" />
                            ) : (
                              <div className="w-24 h-28 bg-gray-100 border-2 border-black rounded flex items-center justify-center text-[10px] text-gray-400 font-bold uppercase">Photo</div>
                            )}
                          </div>
                        </div>

                        {/* Student Details Table */}
                        <table className="w-full border-2 border-black border-collapse text-xs font-bold uppercase">
                          <tbody>
                            <tr className="border-b border-black">
                              <td className="border-r border-black p-1.5 w-[15%] bg-gray-100 font-black">STUDENT</td>
                              <td className="border-r border-black p-1.5 w-[45%] font-black text-black">{getStudentDisplayName(data.student)}</td>
                              <td className="border-r border-black p-1.5 w-[15%] bg-gray-100 font-black">CLASS</td>
                              <td className="p-1.5 w-[25%] font-black text-black">{data.student?.class}</td>
                            </tr>
                            <tr className="border-b border-black">
                              <td className="border-r border-black p-1.5 bg-gray-100 font-black">DATE OF BIRTH</td>
                              <td className="border-r border-black p-1.5 font-bold">{formatDateVerbose(data.student?.dateOfBirth)}</td>
                              <td className="border-r border-black p-1.5 bg-gray-100 font-black">SESSION</td>
                              <td className="p-1.5 font-bold">{data.term?.session}</td>
                            </tr>
                            <tr>
                              <td className="border-r border-black p-1.5 bg-gray-100 font-black">TERM</td>
                              <td className="border-r border-black p-1.5 font-bold">{data.term?.name}</td>
                              <td className="border-r border-black p-1.5 bg-gray-100 font-black">REPORT STATUS</td>
                              <td className="p-1.5 font-black text-emerald-800">Published</td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Attendance Summary */}
                        {data.attendance && (
                          <div className="border-2 border-black">
                            <div className="grid grid-cols-4 divide-x-2 divide-black text-center p-2">
                              <div>
                                <div className="text-xl font-black text-black">{data.attendance.present ?? 0}</div>
                                <div className="text-[10px] font-black uppercase text-gray-700">DAYS PRESENT</div>
                              </div>
                              <div>
                                <div className="text-xl font-black text-black">{data.attendance.absent ?? 0}</div>
                                <div className="text-[10px] font-black uppercase text-gray-700">DAYS ABSENT</div>
                              </div>
                              <div>
                                <div className="text-xl font-black text-black">{data.attendance.percentage}%</div>
                                <div className="text-[10px] font-black uppercase text-gray-700">ATTENDANCE</div>
                              </div>
                              <div>
                                <div className="text-xl font-black text-black">—</div>
                                <div className="text-[10px] font-black uppercase text-gray-700">NEXT TERM</div>
                              </div>
                            </div>
                          </div>
                        )}
                        <p className="text-xs font-black text-black">
                          Next term begins: <span className="underline">{data.term?.nextTermBegins ? formatDateVerbose(data.term.nextTermBegins) : '4 May 2026'}</span>
                        </p>

                        {/* Assessment Key Banner */}
                        <div>
                          <p className="text-xs font-black uppercase mb-1 text-black">ASSESSMENT KEY</p>
                          <div className="grid grid-cols-4 border-2 border-black divide-x-2 divide-black text-center p-1.5 text-xs font-black">
                            <div className="bg-emerald-100 p-1 text-emerald-900 border-r border-black">
                              <span className="font-black text-sm block text-emerald-800">A</span>
                              <span className="text-[10px] font-bold">Achieved Target</span>
                            </div>
                            <div className="bg-sky-100 p-1 text-sky-900 border-r border-black">
                              <span className="font-black text-sm block text-sky-800">P</span>
                              <span className="text-[10px] font-bold">Progressing Well</span>
                            </div>
                            <div className="bg-amber-100 p-1 text-amber-900 border-r border-black">
                              <span className="font-black text-sm block text-amber-800">W</span>
                              <span className="text-[10px] font-bold">Working Towards</span>
                            </div>
                            <div className="bg-slate-100 p-1 text-slate-700">
                              <span className="font-black text-sm block text-slate-700">NA</span>
                              <span className="text-[10px] font-bold">Not Applicable</span>
                            </div>
                          </div>
                        </div>

                        {/* Page 1 Domains (01, 02 & 03) */}
                        {(data.earlyYearsDomains || []).filter(d => (d.name || '').startsWith('01') || (d.name || '').startsWith('02') || (d.name || '').startsWith('03')).map((domain, dIdx) => {
                          const headerColors = [
                            'bg-emerald-600 text-white',
                            'bg-indigo-600 text-white'
                          ];
                          const domainHeaderBg = headerColors[dIdx % headerColors.length];
                          return (
                            <div key={dIdx} className="border-2 border-black overflow-hidden shadow-xs">
                              <div className={`px-3 py-1 font-black text-xs uppercase border-b-2 border-black flex justify-between items-center ${domainHeaderBg}`}>
                                <span>{domain.name}</span>
                                <span className="text-[9px] font-bold opacity-80">Domain {dIdx + 1}</span>
                              </div>
                              <table className="w-full border-collapse text-xs">
                                <thead>
                                  <tr className="bg-gray-100 border-b border-black text-[11px] font-black uppercase text-black">
                                    <th className="p-1.5 text-left border-r border-black">Learning outcome / skill</th>
                                    <th className="p-1.5 text-center w-20 border-r border-black">Current</th>
                                    <th className="p-1.5 text-center w-20 border-r border-black">Previous</th>
                                    <th className="p-1.5 text-center w-28">Progress</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(domain.skills || []).map((skill, sIdx) => {
                                    const curVal = (skill.current || 'A').toUpperCase();
                                    const prevVal = (skill.previous || 'A').toUpperCase();
                                    const progVal = (skill.progress || 'Maintained').trim();

                                    const renderGradeBadge = (val) => {
                                      if (val === 'A') return <span className="inline-block px-2 py-0.5 rounded font-black text-xs bg-emerald-500 text-white shadow-2xs">A</span>;
                                      if (val === 'P') return <span className="inline-block px-2 py-0.5 rounded font-black text-xs bg-sky-500 text-white shadow-2xs">P</span>;
                                      if (val === 'W') return <span className="inline-block px-2 py-0.5 rounded font-black text-xs bg-amber-500 text-white shadow-2xs">W</span>;
                                      return <span className="inline-block px-2 py-0.5 rounded font-black text-xs bg-slate-400 text-white">NA</span>;
                                    };

                                    const renderProgressBadge = (val) => {
                                      if (val.toLowerCase().includes('improv')) {
                                        return (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                                            <span className="font-black text-emerald-600">↑</span> Improved
                                          </span>
                                        );
                                      }
                                      if (val.toLowerCase().includes('maintain')) {
                                        return (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-sky-100 text-sky-800 border border-sky-300">
                                            <span className="font-black text-sky-600">→</span> Maintained
                                          </span>
                                        );
                                      }
                                      return (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-300">
                                          <span className="font-black text-amber-600">⚡</span> Needs Support
                                        </span>
                                      );
                                    };

                                    return (
                                      <tr key={sIdx} className="border-b border-gray-200 last:border-b-0 h-6 font-medium text-black hover:bg-gray-50/50">
                                        <td className="p-1.5 border-r border-black font-bold">{skill.name}</td>
                                        <td className="p-1.5 text-center border-r border-black">{renderGradeBadge(curVal)}</td>
                                        <td className="p-1.5 text-center border-r border-black">{renderGradeBadge(prevVal)}</td>
                                        <td className="p-1.5 text-center">{renderProgressBadge(progVal)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                        <div className="flex justify-between text-[10px] text-gray-500 font-bold border-t pt-2">
                          <span>Early Years Assessment & Progress Report</span>
                          <span>Confidential School Record</span>
                          <span>Page 1 of 3</span>
                        </div>
                      </div>

                      {/* PAGE 2 */}
                      <div className="bg-white border-4 border-black p-5 sm:p-6 space-y-3 print:p-4 print:space-y-2 rounded-xl flex flex-col justify-between min-h-[282mm] print:min-h-[285mm] w-full box-border print:break-before-page" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
                        <div className="text-center border-b-2 border-black pb-2">
                          <h2 className="text-sm font-black uppercase tracking-wider text-black">EARLY YEARS PROGRESS REPORT</h2>
                        </div>

                        {/* Page 2 Domains (03, 04, 05+) */}
                        {extraDomains.map((domain, dIdx) => {
                          const headerColors = [
                            'bg-purple-600 text-white',
                            'bg-amber-600 text-white',
                            'bg-teal-600 text-white',
                            'bg-rose-600 text-white'
                          ];
                          const domainHeaderBg = headerColors[dIdx % headerColors.length];
                          return (
                            <div key={dIdx} className="border-2 border-black overflow-hidden shadow-xs">
                              <div className={`px-3 py-1 font-black text-xs uppercase border-b-2 border-black flex justify-between items-center ${domainHeaderBg}`}>
                                <span>{domain.name}</span>
                                <span className="text-[9px] font-bold opacity-80">Domain {dIdx + 3}</span>
                              </div>
                              <table className="w-full border-collapse text-xs">
                                <thead>
                                  <tr className="bg-gray-100 border-b border-black text-[11px] font-black uppercase text-black">
                                    <th className="p-1.5 text-left border-r border-black">Learning outcome / skill</th>
                                    <th className="p-1.5 text-center w-20 border-r border-black">Current</th>
                                    <th className="p-1.5 text-center w-20 border-r border-black">Previous</th>
                                    <th className="p-1.5 text-center w-28">Progress</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(domain.skills || []).map((skill, sIdx) => {
                                    const curVal = (skill.current || 'A').toUpperCase();
                                    const prevVal = (skill.previous || 'A').toUpperCase();
                                    const progVal = (skill.progress || 'Maintained').trim();

                                    const renderGradeBadge = (val) => {
                                      if (val === 'A') return <span className="inline-block px-2 py-0.5 rounded font-black text-xs bg-emerald-500 text-white shadow-2xs">A</span>;
                                      if (val === 'P') return <span className="inline-block px-2 py-0.5 rounded font-black text-xs bg-sky-500 text-white shadow-2xs">P</span>;
                                      if (val === 'W') return <span className="inline-block px-2 py-0.5 rounded font-black text-xs bg-amber-500 text-white shadow-2xs">W</span>;
                                      return <span className="inline-block px-2 py-0.5 rounded font-black text-xs bg-slate-400 text-white">NA</span>;
                                    };

                                    const renderProgressBadge = (val) => {
                                      if (val.toLowerCase().includes('improv')) {
                                        return (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                                            <span className="font-black text-emerald-600">↑</span> Improved
                                          </span>
                                        );
                                      }
                                      if (val.toLowerCase().includes('maintain')) {
                                        return (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-sky-100 text-sky-800 border border-sky-300">
                                            <span className="font-black text-sky-600">→</span> Maintained
                                          </span>
                                        );
                                      }
                                      return (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-300">
                                          <span className="font-black text-amber-600">⚡</span> Needs Support
                                        </span>
                                      );
                                    };

                                    return (
                                      <tr key={sIdx} className="border-b border-gray-200 last:border-b-0 h-6 font-medium text-black hover:bg-gray-50/50">
                                        <td className="p-1.5 border-r border-black font-bold">{skill.name}</td>
                                        <td className="p-1.5 text-center border-r border-black">{renderGradeBadge(curVal)}</td>
                                        <td className="p-1.5 text-center border-r border-black">{renderGradeBadge(prevVal)}</td>
                                        <td className="p-1.5 text-center">{renderProgressBadge(progVal)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}

                        {/* PROGRESS AT A GLANCE TABLE */}
                        <div className="border-2 border-black overflow-hidden">
                          <div className="bg-black text-white px-3 py-1 font-black text-xs uppercase tracking-wider">
                            PROGRESS AT A GLANCE
                          </div>
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-gray-100 border-b border-black font-black uppercase text-black text-[11px]">
                                <th className="p-1.5 text-left w-1/4 border-r border-black">AREA</th>
                                <th className="p-1.5 text-left w-3/8 border-r border-black">WHAT IS GOING WELL</th>
                                <th className="p-1.5 text-left w-3/8">NEXT FOCUS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(data.progressAtAGlance || [
                                { area: 'Literacy', goingWell: 'Sound recognition, rhymes and reading direction.', nextFocus: 'Continue vocabulary and sentence development.' },
                                { area: 'Numeracy', goingWell: 'Counting, number recognition and basic concepts.', nextFocus: 'Reinforce number concepts through daily practice.' },
                                { area: 'Physical', goingWell: 'Fine-motor control, organised play and safety.', nextFocus: 'Maintain regular pencil, crayon and scissors activities.' },
                                { area: 'Social / Emotional', goingWell: 'Self-control, confidence and participation.', nextFocus: 'Continue positive reinforcement and independence.' }
                              ]).map((row, rIdx) => (
                                <tr key={rIdx} className="border-b border-black last:border-b-0 font-medium text-black">
                                  <td className="p-1.5 border-r border-black font-black">{row.area}</td>
                                  <td className="p-1.5 border-r border-black">{row.goingWell}</td>
                                  <td className="p-1.5">{row.nextFocus}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 font-bold border-t pt-2">
                          <span>Early Years Assessment & Progress Report</span>
                          <span>Confidential School Record</span>
                          <span>Page 2 of 3</span>
                        </div>
                      </div>

                      {/* PAGE 3 */}
                      <div className="bg-white border-4 border-black p-5 sm:p-6 space-y-3 print:p-4 print:space-y-2 rounded-xl flex flex-col justify-between min-h-[282mm] print:min-h-[285mm] w-full box-border print:break-before-page" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
                        <div className="text-center border-b-2 border-black pb-2">
                          <h2 className="text-sm font-black uppercase tracking-wider text-black">COMMENTS & DEVELOPMENT PLAN</h2>
                        </div>

                        {/* TEACHER'S OVERALL COMMENT */}
                        <div className="space-y-1">
                          <p className="text-xs font-black uppercase text-black">TEACHER'S OVERALL COMMENT</p>
                          <div className="border-2 border-black p-3 text-xs italic font-medium leading-relaxed bg-gray-50 text-black">
                            "{data.developmentPlan?.teacherComment || 'The student is an energetic and engaged learner who has made clear progress during the term. She demonstrates strong performance in areas of interest and is developing confidence across literacy, numeracy and classroom activities.'}"
                          </div>
                        </div>

                        {/* SUBJECT / DEVELOPMENT COMMENTS */}
                        <div className="space-y-1">
                          <p className="text-xs font-black uppercase text-black">SUBJECT / DEVELOPMENT COMMENTS</p>
                          <table className="w-full border-2 border-black border-collapse text-xs">
                            <tbody>
                              <tr className="border-b border-black">
                                <td className="p-2 w-1/4 font-black border-r border-black bg-gray-100 uppercase text-black">LITERACY</td>
                                <td className="p-2 italic text-black">{data.developmentPlan?.literacyComment || 'Recognises letter sounds confidently and is developing ability to use complete sentences and appropriate vocabulary.'}</td>
                              </tr>
                              <tr>
                                <td className="p-2 w-1/4 font-black border-r border-black bg-gray-100 uppercase text-black">NUMERACY</td>
                                <td className="p-2 italic text-black">{data.developmentPlan?.numeracyComment || 'Demonstrates strong understanding of basic numeracy concepts and applies counting and number skills confidently.'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* RECOMMENDED NEXT STEPS */}
                        <div className="space-y-1">
                          <p className="text-xs font-black uppercase text-black">RECOMMENDED NEXT STEPS</p>
                          <table className="w-full border-2 border-black border-collapse text-xs">
                            <thead>
                              <tr className="bg-gray-100 border-b border-black font-black uppercase text-black text-[11px]">
                                <th className="p-2 text-left w-1/2 border-r border-black">At School</th>
                                <th className="p-2 text-left w-1/2">At Home</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="p-2 border-r border-black text-black">{data.developmentPlan?.atSchoolNextStep || 'Continue guided literacy and numeracy practice; reinforce independent classroom routines.'}</td>
                                <td className="p-2 text-black">{data.developmentPlan?.atHomeNextStep || 'Read together, practise sounds and counting, and use everyday objects for sorting and number games.'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* HEAD TEACHER'S COMMENT */}
                        <div className="space-y-1">
                          <p className="text-xs font-black uppercase text-black">HEAD TEACHER'S COMMENT</p>
                          <div className="border-2 border-black p-3 text-xs italic font-medium leading-relaxed bg-gray-50 text-black">
                            "{data.developmentPlan?.headTeacherComment || 'Has shown encouraging progress this term. Should continue to practise consistently and maintain a positive attitude toward learning.'}"
                          </div>
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-2 max-w-xl mx-auto gap-12 pt-6 text-center text-xs font-black uppercase text-black">
                          <div className="space-y-2">
                            <p>CLASS TEACHER</p>
                            <div className="border-b-2 border-black h-8 flex items-center justify-center">
                              {data.student?.formMasterSignatureUrl && (
                                <img src={data.student.formMasterSignatureUrl.startsWith('data:') || data.student.formMasterSignatureUrl.startsWith('http') ? data.student.formMasterSignatureUrl : `${API_BASE_URL}${data.student.formMasterSignatureUrl}`} alt="Teacher Signature" className="h-full w-auto mix-blend-multiply" />
                              )}
                            </div>
                            <p className="text-[10px] font-normal">Date: ______________</p>
                          </div>
                          <div className="space-y-2">
                            <p>HEAD TEACHER</p>
                            <div className="border-b-2 border-black h-8 flex items-center justify-center">
                              {data.term?.principalSignatureUrl && (
                                <img src={data.term.principalSignatureUrl.startsWith('data:') || data.term.principalSignatureUrl.startsWith('http') ? data.term.principalSignatureUrl : `${API_BASE_URL}${data.term.principalSignatureUrl}`} alt="Principal Signature" className="h-full w-auto mix-blend-multiply" />
                              )}
                            </div>
                            <p className="text-[10px] font-normal">Date: ______________</p>
                          </div>
                        </div>

                        <p className="text-[10px] text-gray-500 text-center pt-3 border-t border-gray-200">
                          Report integrity: Published reports should be locked against unauthorised changes. Assessment templates and rating schemes should be configurable by school administrators.
                        </p>

                        {/* DOCUMENT VERIFICATION FOOTER / QR CODE SCANNER */}
                        <div className="mt-2 border-t border-gray-200 pt-1 flex justify-between items-center bg-transparent">
                          <div className="flex items-center gap-3">
                            <div className="group/qr relative bg-white p-1 rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md">
                              <QRCodeSVG 
                                value={`${window.location.origin}/verify/term/${data.student?.id}/${selectedTerm}`}
                                size={42}
                                level="H"
                                includeMargin={false}
                                className="grayscale hover:grayscale-0 transition-all duration-500 cursor-help"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <div className="text-[9px] font-black text-black flex items-center gap-1 uppercase tracking-tighter">
                                <svg className="w-2.5 h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M2.166 4.9L10 1.55l7.834 3.35a1 1 0 01.583.912v5.188a10 10 0 01-5.188 8.163l-3.229 1.737a1 1 0 01-.912 0l-3.229-1.737A10 10 0 011.583 11V5.812a1 1 0 01.583-.912z" clipRule="evenodd" />
                                </svg>
                                DIGITALLY VERIFIED REPORT
                              </div>
                              <div className="text-[8px] font-bold text-black tracking-tight uppercase">Scan QR Code To Verify Authenticity</div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[9px] font-black text-black uppercase tracking-tighter">Early Years Verification</div>
                            <div className="text-[8px] font-bold text-black uppercase">TERM: {data.term?.name?.toUpperCase()} • GEN: {formatDateVerbose(new Date())}</div>
                          </div>
                        </div>

                        <div className="flex justify-between text-[10px] text-gray-500 font-bold border-t pt-2">
                          <span>Early Years Assessment & Progress Report</span>
                          <span>Confidential School Record</span>
                          <span>Page 3 of 3</span>
                        </div>
                      </div>
                    </div>
                    );
                  })() : (
                    <>
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
                      <h1 className="text-2xl font-black uppercase tracking-wider leading-none mb-1" style={{ color: '#000000' }}>
                        {schoolSettings?.schoolName || 'SCHOOL NAME'}
                      </h1>
                      <p className="text-xs font-black italic text-gray-800 mb-1 uppercase tracking-normal w-full text-center">{schoolSettings?.schoolMotto || 'Excellence and Dedication'}</p>
                      <p className="text-[9px] font-black text-gray-600 max-w-[500px] leading-tight text-center">{schoolSettings?.address || 'School Address Location'} | TEL: {schoolSettings?.phone || '000'} | Email: {schoolSettings?.email || 'email@school.com'}</p>

                      <div className="mt-1 border-b-2 inline-block px-4 pb-0" style={{ borderColor: reportColor }}>
                        <h2 className="text-lg font-black uppercase tracking-wider">
                          {layout === 'early_years' ? 'EARLY YEARS PROGRESS REPORT' : `${data.term?.name?.toUpperCase()} PERFORMANCE REPORT`}
                        </h2>
                      </div>
                    </div>

                    <div className="w-24 h-28 border-2 border-black bg-gray-50 flex-shrink-0 relative overflow-hidden">
                      {photoUri ? (
                        <img src={photoUri} alt="Student" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-center p-1 font-bold text-gray-300">PHOTO</div>
                      )}
                    </div>
                  </div>

                  {/* STUDENT INFO TABLE */}
                  {layout === 'modern' ? (
                    <div className="grid grid-cols-3 gap-2 text-[10px] uppercase font-bold">
                         <div className="bg-slate-200 p-2 rounded-xl border border-slate-300">
                           <p className="text-[8px] text-black font-black mb-0.5">FULL NAME</p>
                           <p className="text-xs break-words leading-tight text-black font-black">{getStudentDisplayName(data.student)}</p>
                         </div>
                         <div className="bg-slate-200 p-2 rounded-xl border border-slate-300">
                           <p className="text-[8px] text-black font-black mb-0.5">ADMISSION NO</p>
                           <p className="text-xs text-black font-black">{data.student?.admissionNumber}</p>
                         </div>
                         <div className="bg-slate-200 p-2 rounded-xl border border-slate-300">
                           <p className="text-[8px] text-black font-black mb-0.5">DATE OF BIRTH</p>
                           <p className="text-xs text-black font-black">{data.student?.dateOfBirth ? formatDateVerbose(data.student.dateOfBirth) : 'N/A'}</p>
                         </div>
                         <div className="bg-slate-200 p-2 rounded-xl border border-slate-300">
                           <p className="text-[8px] text-black font-black mb-0.5">CLASS LEVEL</p>
                           <p className="text-xs text-black font-black">{data.student?.class}</p>
                         </div>
                         <div className="bg-slate-200 p-2 rounded-xl border border-slate-300">
                           <p className="text-[8px] text-black font-black mb-0.5">AGE / GENDER</p>
                           <p className="text-xs text-black font-black">{data.student?.age || '-'} / {data.student?.gender || '-'}</p>
                         </div>
                         {showAttendance && (
                         <div className="bg-slate-200 p-2 rounded-xl border border-slate-300">
                           <p className="text-[8px] text-black font-black mb-0.5">ATTENDANCE</p>
                           <p className="text-xs text-black font-black">{data.attendance?.present}/{data.attendance?.total}</p>
                         </div>
                         )}
                    </div>
                  ) : (
                    <table className="w-full border-2 border-black border-collapse text-sm font-bold uppercase">
                      <tbody>
                        <tr className="border-b border-black">
                          <td className="border-r border-black p-1 w-[12%] text-[9px]">NAME:</td>
                          <td className="border-r border-black p-1 w-[43%] font-black text-black">{getStudentDisplayName(data.student)}</td>
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
                          <td className="p-0.5">{data.student?.dateOfBirth ? formatDateVerbose(data.student.dateOfBirth) : 'N/A'}</td>
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

                  {/* EARLY YEARS DOMAINS & SKILLS EVALUATION */}
                  {layout === 'early_years' && data.earlyYearsDomains && data.earlyYearsDomains.length > 0 && (
                    <div className="space-y-1.5 mb-2 text-[10px]">
                      <div className="bg-black text-white text-center font-bold py-1 text-xs uppercase tracking-wider border-2 border-black" style={{ backgroundColor: '#000000' }}>
                        EARLY YEARS DEVELOPMENTAL DOMAINS & SKILLS EVALUATION
                      </div>
                      <div className="grid grid-cols-2 gap-2 items-start">
                        {data.earlyYearsDomains.map((domain, dIdx) => (
                          <div key={dIdx} className="border-2 border-black">
                            <div className="bg-gray-200 px-2 py-0.5 font-black uppercase text-[9px] border-b border-black flex justify-between items-center">
                              <span>{domain.name}</span>
                              <span className="text-[7.5px] font-mono">5  4  3  2  1</span>
                            </div>
                            <table className="w-full border-collapse text-[9px]">
                              <tbody>
                                {(domain.skills || []).map((skill, sIdx) => (
                                  <tr key={sIdx} className="border-b border-black last:border-b-0 h-4">
                                    <td className="px-1 py-0.5 font-bold uppercase truncate border-r border-black">{skill.name}</td>
                                    {renderRatingTicks(skill.score)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ACADEMIC SECTION */}
                  <div className="grid grid-cols-[68%_31%] gap-2 items-stretch">
                    {/* LEFT: COGNITIVE */}
                    <div className="space-y-0 text-[10px] md:text-sm h-full flex flex-col">
                      <div className="bg-black text-white text-center font-bold py-1 text-base border-2 border-b-0 border-black" style={{ backgroundColor: '#000000' }}>
                        COGNITIVE DOMAIN PERFORMANCE
                      </div>
                      {(() => {
                        const wA1 = data.term?.weights?.assignment1 !== undefined && data.term?.weights?.assignment1 !== null ? Number(data.term.weights.assignment1) : 5;
                        const wA2 = data.term?.weights?.assignment2 !== undefined && data.term?.weights?.assignment2 !== null ? Number(data.term.weights.assignment2) : 5;
                        const wT1 = data.term?.weights?.test1 !== undefined && data.term?.weights?.test1 !== null ? Number(data.term.weights.test1) : 10;
                        const wT2 = data.term?.weights?.test2 !== undefined && data.term?.weights?.test2 !== null ? Number(data.term.weights.test2) : 10;
                        const wEx = data.term?.weights?.exam !== undefined && data.term?.weights?.exam !== null ? Number(data.term.weights.exam) : 70;
                        const subs = data.subjects || [];

                        return (
                          <table className="w-full border-2 border-black border-collapse">
                            <thead>
                              <tr className="bg-gray-200">
                                <th className="border border-black p-0.5 text-left">SUBJECTS</th>
                                {wA1 > 0 && <th className="border border-black p-0.5 text-center w-6 text-[7px] leading-tight">1ST CA<br />{wA1}</th>}
                                {wA2 > 0 && <th className="border border-black p-0.5 text-center w-6 text-[7px] leading-tight">2ND CA<br />{wA2}</th>}
                                {wT1 > 0 && <th className="border border-black p-0.5 text-center w-6 text-[7px] leading-tight">1ST TST<br />{wT1}</th>}
                                {wT2 > 0 && <th className="border border-black p-0.5 text-center w-6 text-[7px] leading-tight">2ND TST<br />{wT2}</th>}
                                {wEx > 0 && <th className="border border-black p-0.5 text-center w-8">EXM<br />{wEx}</th>}
                                <th className="border border-black p-0.5 text-center w-8 font-black">TOT<br />100</th>
                                <th className="border border-black p-0.5 text-center w-6">GRD</th>
                                {showPosition && <th className="border border-black p-0.5 text-center w-6 text-[7px]">POS</th>}
                                <th className="border border-black p-0.5 text-left px-1 text-[8px]">REMARKS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subs.map((sub, i) => (
                                <tr key={i} className="font-bold uppercase h-5">
                                  <td className="border border-black px-1 leading-tight text-[11px] font-black">{sub.isEmpty ? '\u00A0' : (sub.name || '')}</td>
                                  {wA1 > 0 && <td className="border border-black text-center text-[10px]">{sub.isEmpty ? '' : (sub.assignment1 !== null && sub.assignment1 !== undefined ? sub.assignment1 : '')}</td>}
                                  {wA2 > 0 && <td className="border border-black text-center text-[10px]">{sub.isEmpty ? '' : (sub.assignment2 !== null && sub.assignment2 !== undefined ? sub.assignment2 : '')}</td>}
                                  {wT1 > 0 && <td className="border border-black text-center text-[10px]">{sub.isEmpty ? '' : (sub.test1 !== null && sub.test1 !== undefined ? sub.test1 : '')}</td>}
                                  {wT2 > 0 && <td className="border border-black text-center text-[10px]">{sub.isEmpty ? '' : (sub.test2 !== null && sub.test2 !== undefined ? sub.test2 : '')}</td>}
                                  {wEx > 0 && <td className="border border-black text-center text-[10px]">{sub.isEmpty ? '' : (sub.exam !== null && sub.exam !== undefined ? sub.exam : '')}</td>}
                                  <td className="border border-black text-center bg-gray-50 text-[10px] font-black">{sub.isEmpty ? '' : (sub.total !== null && sub.total !== undefined ? sub.total.toFixed(0) : '')}</td>
                                  <td className="border border-black text-center text-[10px] font-black">{sub.isEmpty ? '' : (sub.grade || '')}</td>
                                  {showPosition && <td className="border border-black text-center text-[10px]">{sub.isEmpty ? '' : (sub.position || '')}</td>}
                                  <td className="border border-black px-1 text-[8px] leading-tight italic font-medium">{sub.isEmpty ? '' : (sub.remark || '')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
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
                      {layout === 'early_years' ? (
                        <div className="p-2 text-[9px] bg-gray-50/50 leading-tight flex flex-col justify-center font-bold text-black">
                          <p className="font-black border-b border-black mb-1 uppercase text-[9.5px]">Early Years Rating Scale</p>
                          <div className="grid grid-cols-1 gap-0.5 text-[8.5px]">
                            <div>5: Mastered / Excellent</div>
                            <div>4: Good Progress / Above Avg</div>
                            <div>3: Developing / Satisfactory</div>
                            <div>2: Emerging / Needs Practice</div>
                            <div>1: Needs Support</div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 text-[9.5px] bg-gray-50/50 leading-tight flex flex-col justify-center">
                          <p className="font-black border-b border-black mb-1 uppercase text-black text-[10px]">Grading Legend</p>
                          <div className="grid grid-cols-2 gap-x-2 font-bold text-black">
                            {(() => {
                              try {
                                const scales = JSON.parse(schoolSettings?.gradingSystem || '[]');
                                return scales.sort((a, b) => b.min - a.min).map(s => (
                                  <span key={s.grade} className={s.grade === 'F' ? 'text-red-600 font-black' : 'text-black'}>{s.grade}: {s.min}-{s.max || 100}</span>
                                ));
                              } catch (e) {
                                return <span className="text-black">Legend could not be loaded</span>;
                              }
                            })()}
                          </div>
                          <p className="mt-1 border-t border-black/10 pt-1 text-[9px] font-bold text-black">5: Exceptional, 4: Commendable, 3: Satisfactory, 2: Fair, 1: Poor</p>
                        </div>
                      )}

                      {/* POSITION & AVG */}
                      <div className="p-0 flex flex-col">
                        <div className="bg-emerald-800 text-white text-[11px] font-bold text-center py-0.5 uppercase tracking-tighter" style={{ backgroundColor: reportColor }}>Status Summary</div>
                        <div className="bg-white flex-1 grid grid-cols-2 divide-x divide-black/10">
                          {showPosition && (
                          <div className="flex flex-col items-center justify-center p-1">
                            <span className="text-[9px] text-black uppercase font-black">Position</span>
                            <span className="text-sm font-black italic text-black">{data.termPosition || '-'} / {data.totalStudents || '-'}</span>
                          </div>
                          )}
                          <div className="flex flex-col items-center justify-center p-1">
                            <span className="text-[9px] text-black uppercase font-black">Average</span>
                            <span className="text-sm font-black italic text-black">{data.termAverage !== null && data.termAverage !== undefined ? `${data.termAverage.toFixed(1)}%` : '-'}</span>
                          </div>
                        </div>

                        {/* PASS/FAIL SUMMARY SECTION */}
                        {data.passFailSummary?.show && (
                          <div className="border-t border-black grid grid-cols-2 divide-x divide-black/10 bg-white items-center py-0.5">
                             <div className="flex items-center justify-between px-2 h-full">
                                <span className="text-[9px] font-black text-black uppercase">Passed</span>
                                <span className="text-[11px] font-black text-emerald-700">{data.passFailSummary.totalPassed}</span>
                             </div>
                             <div className="flex items-center justify-between px-2 h-full">
                                <span className="text-[9px] font-black text-black uppercase">Failed</span>
                                <span className="text-[11px] font-black text-red-600">{data.passFailSummary.totalFailed}</span>
                             </div>
                          </div>
                        )}

                        <div className="border-t border-black p-1 flex items-center justify-between bg-emerald-50" style={{ backgroundColor: `${reportColor}10` }}>
                          <span className="text-xs font-black uppercase text-black">Overall Grade:</span>
                          <span className="text-xl font-black text-emerald-800" style={{ color: reportColor }}>{data.overallGrade}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center border-2 border-black rounded-lg bg-gray-100 font-mono text-[9px] uppercase tracking-[0.2em] text-black relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      </div>
                      <span className="z-10 bg-white px-2 font-black text-black text-[9px]">Official Result Certification</span>
                      <div className="absolute inset-x-0 h-[1px] bg-black/20"></div>
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
                          <p className="text-[9px] font-black text-black uppercase">Arrears (Opening)</p>
                          <p className={`text-sm font-black ${data.feeSummary.openingBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            ₦{data.feeSummary.openingBalance?.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-black uppercase">Current Term Fee</p>
                          <p className="text-sm font-black text-gray-900">
                            ₦{data.feeSummary.currentTermFee?.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-black uppercase">Total Paid</p>
                          <p className="text-sm font-black text-emerald-700">
                            ₦{data.feeSummary.totalPaid?.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-black uppercase">Outstanding Balance</p>
                          <p className={`text-lg font-black leading-none ${data.feeSummary.grandTotal > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                            ₦{data.feeSummary.grandTotal?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="px-3 pb-1 text-[8.5px] text-center font-bold text-black border-t border-black/10 pt-0.5">
                        Note: Full payment is required for continued portal access.
                      </div>
                    </div>
                  )}

                  {/* REMARKS SECTION */}
                  <div className="border-2 border-black bg-white rounded-lg overflow-hidden mt-2">
                    <div className="grid grid-cols-2 divide-x-2 divide-black">
                      <div className="p-2 space-y-1">
                        <p className="text-xs font-black uppercase text-black">Form Master's Remark</p>
                        <p className="text-xs font-medium italic leading-none min-h-[25px] flex items-center text-black">
                          "{data.formMasterRemark || 'No specific remark recorded.'}"
                        </p>
                        <div className="pt-1 border-t border-black/10 flex justify-between items-center">
                          <span className="text-[10px] font-black text-black">Name: {data.student?.formMaster || '......................'}</span>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-[8px] font-bold text-black">VERIFIED</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        <p className="text-xs font-black uppercase text-black">Principal's Remark</p>
                        <p className="text-xs font-medium italic leading-none min-h-[25px] flex items-center text-black">
                          "{data.principalRemark || 'Satisfactory result. Keep striving for excellence.'}"
                        </p>
                        <div className="pt-1 border-t border-black/10 flex justify-between items-center text-[10px] font-black text-black">
                          <div>
                            <span className="mr-1 text-black font-black">Term Ends:</span>
                            <span className="underline font-black text-black">{data.term?.endDate ? formatDateVerbose(data.term.endDate) : '....................'}</span>
                          </div>
                          <div>
                            <span className="mr-1 text-black font-black">Next Term Begins:</span>
                            <span className="underline font-black text-black">{data.term?.nextTermBegins ? formatDateVerbose(data.term.nextTermBegins) : '....................'}</span>
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
                          <span className="font-signature italic text-lg text-black">{data.student?.formMaster}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-black block uppercase text-black">CLASS TEACHER'S SIGNATURE</span>
                    </div>
                    <div className="space-y-1 text-center">
                      <div className="border-b-2 border-black py-0.5 min-h-[20px] flex items-center justify-center">
                        {data.term?.principalSignatureUrl ? (
                          <img src={data.term.principalSignatureUrl.startsWith('data:') || data.term.principalSignatureUrl.startsWith('http') ? data.term.principalSignatureUrl : `${API_BASE_URL}${data.term.principalSignatureUrl}`} alt="Principal Signature" className="h-[40px] w-auto mix-blend-multiply" />
                        ) : (
                          <span className="text-[9px] text-black font-bold underline decoration-dotted">FOR OFFICIAL USE - PRINCIPAL</span>
                        )}
                      </div>
                      <span className="text-[10px] font-black block uppercase text-black">PRINCIPAL'S SIGNATURE</span>
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
                        <div className="text-[9px] font-black text-black flex items-center gap-1 uppercase tracking-tighter">
                          <svg className="w-2.5 h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2.166 4.9L10 1.55l7.834 3.35a1 1 0 01.583.912v5.188a10 10 0 01-5.188 8.163l-3.229 1.737a1 1 0 01-.912 0l-3.229-1.737A10 10 0 011.583 11V5.812a1 1 0 01.583-.912z" clipRule="evenodd" />
                          </svg>
                          DIGITALLY VERIFIED REPORT
                        </div>
                        <div className="text-[8px] font-bold text-black tracking-tight uppercase">Authentic Educational Credential</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[9px] font-black text-black uppercase tracking-tighter">Academic Status</div>
                      <div className="text-[8px] font-bold text-black uppercase">TERM: {data.term?.name?.toUpperCase()} • GEN: {formatDateVerbose(new Date())}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
})}
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-12 mb-8 print:hidden">
            <button 
              onClick={printReport} 
              className="group/btn bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-emerald-500"
            >
              <Printer className="w-5 h-5 transition-transform group-hover/btn:rotate-12" />
              Print / Save as PDF {bulkReports.length > 1 ? `(${bulkReports.length} Reports)` : ''}
            </button>
            {reportData && user?.role !== 'student' && user?.role !== 'parent' && (
              <button
                onClick={() => setShowWhatsAppModal(true)}
                className="group/btn bg-[#25D366] text-white hover:bg-[#20ba5a] px-8 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
            )}
          </div>
        </>
      )}

  <style>{`
    @media screen and (max-width: 640px) {
      .report-card-mobile-wrapper {
         min-height: auto !important;
         padding-bottom: 0px !important;
      }
      .report-card-scaler {
         width: 210mm;
         margin-left: 0;
         transform-origin: top left;
      }
      @media screen and (max-width: 400px) { 
        .report-card-scaler { 
          transform: scale(0.42); 
          margin-bottom: calc((0.42 - 1) * 297mm) !important;
        } 
      }
      @media screen and (min-width: 401px) and (max-width: 500px) { 
        .report-card-scaler { 
          transform: scale(0.52); 
          margin-bottom: calc((0.52 - 1) * 297mm) !important;
        } 
      }
      @media screen and (min-width: 501px) and (max-width: 639px) { 
        .report-card-scaler { 
          transform: scale(0.7); 
          margin-bottom: calc((0.70 - 1) * 297mm) !important;
        } 
      }
    }
    
    @media print {
      .report-card-scaler { 
        transform: none !important; 
        width: auto !important;
        margin: 0 !important;
        margin-bottom: 0 !important;
      }
      .report-card-mobile-wrapper {
        overflow: visible !important;
        padding: 0 !important;
      }
    }

    /* Disable scale, transitions, and animations when generating PDF to prevent scaled-down screenshotting */
    body.is-generating-pdf * {
      transition: none !important;
      animation: none !important;
    }
    body.is-generating-pdf .report-card-scaler {
      transform: none !important;
      scale: none !important;
      width: auto !important;
      margin: 0 !important;
      margin-bottom: 0 !important;
    }
    body.is-generating-pdf .report-card-mobile-wrapper {
       overflow: visible !important;
       padding: 0 !important;
    }
    body.is-generating-pdf .impersonation-banner {
      display: none !important;
    }
  `}</style>

      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] print:hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.733-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.847.002-2.632-1.02-5.107-2.875-6.963C16.595 1.989 14.128 1.01 11.5 1.01c-5.448 0-9.882 4.414-9.885 9.851-.001 1.761.47 3.487 1.365 5.011l-.99 3.618 3.733-.979zm11.585-6.38c-.328-.164-1.942-.959-2.242-1.069-.3-.11-.518-.164-.736.164-.218.327-.847 1.069-1.038 1.287-.19.219-.382.245-.71.082-.328-.164-1.386-.511-2.64-1.63-1.053-.94-1.763-2.1-1.97-2.455-.207-.354-.022-.547.142-.71.147-.146.328-.382.492-.573.164-.19.218-.328.328-.546.11-.219.055-.41-.028-.573-.082-.164-.736-1.775-1.01-2.429-.267-.642-.56-.554-.736-.563-.17-.008-.367-.01-.563-.01-.196 0-.518.073-.79.364-.272.291-1.037 1.01-1.037 2.463 0 1.452 1.055 2.858 1.202 3.056.147.199 2.074 3.167 5.025 4.444.702.304 1.25.485 1.678.62.705.224 1.347.193 1.854.117.565-.084 1.942-.793 2.214-1.527.272-.735.272-1.363.19-1.5-.082-.137-.3-.219-.628-.383z"/>
                </svg>
                WhatsApp to Parent
              </h3>
              <button onClick={() => setShowWhatsAppModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={sendWhatsApp} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Recipient Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 08031234567 or 2348031234567"
                  value={whatsAppPhone}
                  onChange={(e) => setWhatsAppPhone(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all text-slate-800"
                  required
                />
                <p className="text-xs text-slate-500">
                  Enter the parent's WhatsApp number. If the school WhatsApp bot is enabled and configured, it will send automatically. Otherwise, it will launch manual send via WhatsApp Web/app.
                </p>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingWhatsApp}
                  className="px-6 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold rounded-xl transition-all shadow-md text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {sendingWhatsApp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                      Sending...
                    </>
                  ) : (
                    'Send Report'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
</div>
);
};

export default TermReportCard;
