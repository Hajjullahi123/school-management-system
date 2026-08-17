import { saveAs } from 'file-saver';
import { safeDocumentDownload, saveBlobAsFile } from '../../utils/mobileDownload';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useReactToPrint } from 'react-to-print';
import { Printer, Settings as SettingsIcon, Save } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDateVerbose } from '../../utils/formatters';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { pdf } from '@react-pdf/renderer';
import { ReportCardPDFDocument } from '../../components/reports/ReportCardPDFDocument';

const BulkReportDownload = () => {
  const { user } = useAuth();
  const { settings: schoolSettings } = useSchoolSettings();
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [startAdmission, setStartAdmission] = useState('');
  const [endAdmission, setEndAdmission] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const componentRef = useRef();
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfProgressLabel, setPdfProgressLabel] = useState('');
  const cancelPdfRef = useRef(false);

  useEffect(() => {
    fetchClasses();
    fetchTerms();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      const data = await response.json();
      const classesArray = Array.isArray(data) ? data : [];

      if (user.role === 'teacher') {
        const teacherClasses = classesArray.filter(c => Number(c.classTeacherId) === Number(user.id));
        setClasses(teacherClasses);
        if (teacherClasses.length === 1) {
          setSelectedClass(teacherClasses[0].id.toString());
        }
      } else {
        setClasses(classesArray);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
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

  useEffect(() => {
    const fetchClassStudents = async () => {
      if (!selectedClass) {
        setClassStudents([]);
        return;
      }
      setLoadingStudents(true);
      try {
        const response = await api.get(`/api/students?classId=${selectedClass}`);
        if (response.ok) {
          const data = await response.json();
          const sortedStudents = (Array.isArray(data) ? data : []).map(student => ({
            ...student,
            name: `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim()
          })).sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          setClassStudents(sortedStudents);
        }
      } catch (error) {
        console.error('Error fetching class students:', error);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchClassStudents();
  }, [selectedClass]);

  const fetchReports = async () => {
    if (!selectedClass || !selectedTerm) {
      alert('Please select both class and term');
      return;
    }

    setLoading(true);
    try {
      let endpoint = `/api/reports/bulk/${selectedClass}/${selectedTerm}`;
      const params = new URLSearchParams();

      if (startAdmission) params.append('startAdmission', startAdmission);
      if (endAdmission) params.append('endAdmission', endAdmission);

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const response = await api.get(endpoint);

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      alert('Failed to load reports: ' + error.message);
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

  const getDocumentTitle = () => {
    let title = 'Bulk_Reports';
    if (selectedClass && selectedTerm) {
      const classData = classes.find(c => c.id.toString() === selectedClass.toString());
      const className = classData ? `${classData.name}${classData.arm ? '_' + classData.arm : ''}` : 'Class';
      const termName = terms.find(t => t.id.toString() === selectedTerm.toString())?.name || 'Term';
      title = `${className}_${termName}_Bulk_Reports`;
    }
    return title.replace(/[^a-zA-Z0-9]/g, '_');
  };

  const handlePrint = () => {
    const printContent = componentRef.current;
    if (!printContent || reports.length === 0) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Please allow pop-ups to print bulk reports.');
      // Fallback to in-page print
      const oldTitle = document.title;
      document.title = getDocumentTitle();
      window.print();
      document.title = oldTitle;
      return;
    }

    const title = getDocumentTitle();

    // Collect stylesheets from the current page
    const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(link => link.outerHTML).join('\n');
    let inlineStyles = '';
    document.querySelectorAll('style').forEach(tag => {
      inlineStyles += tag.innerHTML + '\n';
    });

    // Clone the report container (static HTML, no React overhead)
    const clone = printContent.cloneNode(true);
    clone.querySelectorAll('.report-card-scaler').forEach(scaler => {
      scaler.style.transform = 'none';
      scaler.classList.remove('scale-[0.45]', 'scale-[0.55]');
    });
    clone.querySelectorAll('.report-card-mobile-wrapper').forEach(wrapper => {
      wrapper.style.height = 'auto';
      wrapper.style.overflow = 'visible';
    });
    clone.querySelectorAll('.no-print, .print-hidden').forEach(el => el.remove());

    printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      ${linkTags}
      <style>
        ${inlineStyles}
        @page { size: A4; margin: 0 !important; }
        html, body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        nav, header, footer, .sidebar, .no-print, .print-hidden { display: none !important; }
        .report-card-scaler { transform: none !important; }
        .report-card-mobile-wrapper { height: auto !important; overflow: visible !important; }
      </style>
    </head><body></body></html>`);
    printWindow.document.close();
    printWindow.document.body.appendChild(clone);

    // Wait for stylesheets and images, then trigger print
    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => { try { printWindow.close(); } catch(e) {} }, 1500);
    };

    const images = Array.from(printWindow.document.querySelectorAll('img'));
    if (images.length === 0) {
      setTimeout(triggerPrint, 800);
    } else {
      let loaded = 0;
      let triggered = false;
      const onImgReady = () => {
        loaded++;
        if (loaded >= images.length && !triggered) {
          triggered = true;
          setTimeout(triggerPrint, 500);
        }
      };
      images.forEach(img => {
        if (img.complete) onImgReady();
        else { img.onload = onImgReady; img.onerror = onImgReady; }
      });
      // Fallback timeout in case images stall
      setTimeout(() => { if (!triggered) { triggered = true; triggerPrint(); } }, 8000);
    }
  };

  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleCancelPdf = () => {
    cancelPdfRef.current = true;
  };
  const handleDownloadPDF = async () => {
    if (reports.length === 0 || downloadingPDF) return;
    setDownloadingPDF(true);
    setPdfProgress(20);
    setPdfProgressLabel('Generating Native Vector PDF...');
    cancelPdfRef.current = false;

    try {
      const title = getDocumentTitle();

      // Ultra-fast vector PDF generation in pure memory
      const blob = await pdf(
        <ReportCardPDFDocument reports={reports} schoolSettings={schoolSettings} />
      ).toBlob();

      if (cancelPdfRef.current) throw new Error('Cancelled by user');

      setPdfProgress(90);
      setPdfProgressLabel('Saving file to device...');

      const fileName = `${title}.pdf`;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        saveBlobAsFile(blob, fileName, true);
      } else {
        saveAs(blob, fileName);
      }

      setPdfProgress(100);
      setPdfProgressLabel('Download Complete!');
    } catch (err) {
      console.error('Bulk Vector PDF generation error:', err);
      if (err.message !== 'Cancelled by user') {
        alert('Direct PDF generation failed. Using print fallback...');
        handlePrint();
      }
    } finally {
      setTimeout(() => {
        setDownloadingPDF(false);
        setPdfProgress(0);
        setPdfProgressLabel('');
        cancelPdfRef.current = false;
      }, 1000);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Section - Glassmorphism (Synced with Single Report) */}
      <div className="relative group overflow-hidden rounded-[32px] p-1 bg-gradient-to-br from-indigo-600 via-primary to-emerald-600 shadow-2xl print:hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative bg-white/5 backdrop-blur-sm p-6 sm:p-8 rounded-[31px] text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="min-w-0 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Mass Production Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter italic mb-1 uppercase text-white">Bulk Report Download</h1>
            <p className="text-xs sm:text-sm text-white/70 font-medium tracking-wide">High-Volume Academic Distribution System</p>
          </div>
          
          {reports.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              {downloadingPDF ? (
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-[24px] border border-white/20 min-w-[280px]">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] font-black text-white/80 uppercase tracking-widest">Generating PDF</span>
                      <span className="text-xs font-black text-white">{pdfProgress}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-400 h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${pdfProgress}%` }}></div>
                    </div>
                    <p className="text-[8px] text-white/60 font-bold mt-1 truncate">{pdfProgressLabel}</p>
                  </div>
                  <button 
                    onClick={handleCancelPdf} 
                    className="text-white/70 hover:text-red-300 transition-colors p-1.5 rounded-lg hover:bg-white/10 flex-shrink-0"
                    title="Cancel"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleDownloadPDF} 
                  className="group/btn bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 border border-emerald-500"
                >
                  <span>💾</span>
                  Download PDF Bundle
                </button>
              )}
              <button 
                onClick={handlePrint} 
                disabled={downloadingPDF}
                className="group/btn bg-white text-primary px-6 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-3 border border-white"
              >
                <Printer className="w-5 h-5 transition-transform group-hover/btn:rotate-12" />
                Print All {reports.length} Reports
              </button>
            </div>
          )}
        </div>
      </div>

      {user.role === 'teacher' && classes.length === 0 ? (
        <div className="bg-white p-12 rounded-[32px] shadow-2xl text-center border border-slate-100 print:hidden mb-6 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-50"></div>
          <div className="w-24 h-24 bg-amber-100 rounded-[28px] flex items-center justify-center mx-auto mb-6 relative">
            <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight relative">Access Restricted</h3>
          <p className="text-slate-500 mt-2 font-medium max-w-sm mx-auto relative text-sm">Form Master permission is required for mass report generation.</p>
        </div>
      ) : (
        <>
          {/* Filters (Synced Styling) */}
          <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-xl border border-slate-100 mb-6 print:hidden">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 ml-2">Configuration & Range Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Target Grade</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-primary transition-all"
                  disabled={user.role === 'teacher' && classes.length === 1}
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name} {cls.arm || ''}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Target Term</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full bg-slate-50 border-white rounded-2xl px-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-primary transition-all"
                >
                  <option value="">Select Academic Term</option>
                  {terms.map(term => <option key={term.id} value={term.id}>{term.name} - {term.academicSession?.name}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-8 p-6 bg-slate-50/50 border border-slate-100 rounded-3xl">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Optional: Optimization Range</h4>
                {loadingStudents && <span className="text-[8px] text-primary font-black uppercase tracking-widest animate-pulse">Syncing Roster...</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Start Boundary</label>
                  <select
                    value={startAdmission}
                    onChange={(e) => setStartAdmission(e.target.value)}
                    className="w-full bg-white border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
                    disabled={loadingStudents || classStudents.length === 0}
                  >
                    <option value="">-- All Students --</option>
                    {classStudents.map(student => <option key={`start-${student.id}`} value={student.admissionNumber}>{student.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">End Boundary</label>
                  <select
                    value={endAdmission}
                    onChange={(e) => setEndAdmission(e.target.value)}
                    className="w-full bg-white border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
                    disabled={loadingStudents || classStudents.length === 0}
                  >
                    <option value="">-- End of Roster --</option>
                    {classStudents.map(student => <option key={`end-${student.id}`} value={student.admissionNumber}>{student.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={fetchReports}
              disabled={!selectedClass || !selectedTerm || loading}
              className="mt-8 bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 transition-all w-full sm:w-auto"
            >
              {loading ? 'Processing Analytics...' : 'Initialize Mass Generation'}
            </button>
          </div>

          {!loading && reports.length === 0 && selectedClass && selectedTerm && (
            <div className="bg-white p-16 rounded-[32px] shadow-xl text-center border border-slate-100 no-print">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No records match the current boundary filters</p>
            </div>
          )}

          {/* Optimized Report Container */}
          <div className="print-container mt-8" ref={componentRef}>
            {reports.map((data, idx) => {
              if (!data || !data.student) return null;

              const reportColor = data.reportSettings?.reportColorScheme || schoolSettings?.reportColorScheme || schoolSettings?.primaryColor;
              const reportFont = data.reportSettings?.reportFontFamily || schoolSettings?.reportFontFamily || 'serif';
              const showPosition = data.reportSettings?.showPositionOnReport !== undefined ? data.reportSettings.showPositionOnReport : (schoolSettings?.showPositionOnReport !== false);
              const showFees = data.reportSettings?.showFeesOnReport !== undefined ? data.reportSettings.showFeesOnReport : (schoolSettings?.showFeesOnReport !== false);
              const showAttendance = (schoolSettings?.showAttendanceOnReport !== false) && (data.reportSettings?.showAttendanceOnReport !== false);
              const layout = data.reportSettings?.reportLayout || schoolSettings?.reportLayout || 'classic';
              const borderStyle = layout === 'minimal' ? 'border-[2px] border-gray-400' : layout === 'modern' ? 'border-[6px] rounded-2xl' : 'border-[12px]';

              return (
                <div key={idx} className="mb-8 md:mb-20 print:mb-0 last:mb-0">
                  {/* Mobile Scroll Hint (Synced with Single Report) */}
                  <div className="md:hidden flex items-center justify-center gap-2 mb-4 text-primary font-bold text-xs uppercase tracking-widest animate-pulse no-print">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    Swipe to view full sheet
                  </div>

                  <div className="report-card-mobile-wrapper overflow-hidden pb-2 md:pb-8 print:overflow-visible" style={{ height: typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(297mm * 0.45 + 2rem)' : 'auto' }}>
                    <div className="report-card-scaler origin-top-left sm:origin-top scale-[0.45] xs:scale-[0.55] sm:scale-100 transition-transform duration-500 print:scale-100 print:transform-none">
                      <div key={idx} className={`relative bg-white p-8 print:p-0 my-0 sm:my-8 print:my-0 shadow-2xl print:shadow-none text-black ${borderStyle} emerald-print-A4 mx-auto w-[210mm] min-w-[210mm] break-after-page`} style={{ fontFamily: reportFont, borderColor: layout !== 'minimal' ? reportColor : undefined }}>

                        {/* PROTECTION WATERMARK */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.06] select-none rotate-12 overflow-hidden">
                          <div className="text-[100px] font-black uppercase text-gray-900 leading-[0.8] text-center">
                            {schoolSettings?.schoolName || 'OFFICIAL RESULT'}<br />
                            {schoolSettings?.schoolName || 'OFFICIAL RESULT'}<br />
                            {schoolSettings?.schoolName || 'OFFICIAL RESULT'}<br />
                            {schoolSettings?.schoolName || 'OFFICIAL RESULT'}
                          </div>
                        </div>

                        <div className="relative z-10 space-y-3 print:space-y-2">
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
                            <div className="grid grid-cols-3 gap-2 text-[10px] uppercase font-bold">
                              <div className="bg-slate-200 p-2 rounded-xl border border-slate-300">
                                <p className="text-[8px] text-black font-black mb-0.5">FULL NAME</p>
                                <p className="text-xs break-words leading-tight text-black font-black">{data.student?.name}</p>
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
                                  <td className="border-r border-black p-0.5 w-[12%] text-[9px]">NAME:</td>
                                  <td className="border-r border-black p-0.5 w-[43%] font-black text-black">{data.student?.name}</td>
                                  <td className="border-r border-black p-0.5 w-[15%] text-[9px]">GENDER:</td>
                                  <td className="p-0.5 w-[30%]">{data.student?.gender}</td>
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
                                    <th className="border border-black p-0.5 text-center w-6 text-[7px]">GRD</th>
                                    {showPosition && <th className="border border-black p-0.5 text-center w-6 text-[7px]">POS</th>}
                                    <th className="border border-black p-0.5 text-left px-1 text-[8px]">REMARKS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const subs = data.subjects || [];
                                    return subs.map((sub, i) => (
                                      <tr key={i} className="font-bold uppercase h-5">
                                        <td className="border border-black px-1 leading-tight text-[11px] font-black">{sub.isEmpty ? '\u00A0' : (sub.name || '')}</td>
                                        <td className="border border-black text-center text-[10px]">{sub.isEmpty ? '' : (sub.assignment1 !== null && sub.assignment1 !== undefined ? sub.assignment1 : '')}</td>
                                        <td className="border border-black text-center text-[10px]">{sub.isEmpty ? '' : (sub.assignment2 !== null && sub.assignment2 !== undefined ? sub.assignment2 : '')}</td>
                                        <td className="border border-black text-center text-[10px]">{sub.isEmpty ? '' : (sub.test1 !== null && sub.test1 !== undefined ? sub.test1 : '')}</td>
                                        <td className="border border-black text-center text-[10px]">{sub.isEmpty ? '' : (sub.test2 !== null && sub.test2 !== undefined ? sub.test2 : '')}</td>
                                        <td className="border border-black text-center text-[10px]">{sub.isEmpty ? '' : (sub.exam !== null && sub.exam !== undefined ? sub.exam : '')}</td>
                                        <td className="border border-black text-center bg-gray-50 text-[10px] font-black">{sub.isEmpty ? '' : (sub.total !== null && sub.total !== undefined ? sub.total.toFixed(0) : '')}</td>
                                        <td className="border border-black text-center text-[10px] font-black">{sub.isEmpty ? '' : (sub.grade || '')}</td>
                                        {showPosition && <td className="border border-black text-center text-[10px]">{sub.isEmpty ? '' : (sub.position || '')}</td>}
                                        <td className="border border-black px-1 text-[8px] leading-tight italic font-medium">{sub.isEmpty ? '' : (sub.remark || '')}</td>
                                      </tr>
                                    ));
                                  })()}
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
                                      <tr key={i} className="h-4">
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
                                        <p className="text-[9px] text-black uppercase font-black">Average</p>
                                        <p className="text-sm font-black italic text-black">{data.termAverage ? `${data.termAverage.toFixed(1)}%` : '-'}</p>
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
                          {data.feeSummary && (
                            <div className="border-2 border-black bg-emerald-50/30 rounded-lg overflow-hidden mt-2" style={{ backgroundColor: `${reportColor}05` }}>
                              <div className="bg-emerald-800 text-white text-xs font-bold text-center py-0.5 uppercase tracking-widest" style={{ backgroundColor: reportColor }}>
                                Financial Standing & Fee Status
                              </div>
                              <div className="p-1.5 grid grid-cols-4 gap-2 text-center divide-x divide-black/10">
                                <div className="space-y-1">
                                  <p className="text-[9px] font-black text-black uppercase">Arrears (Opening)</p>
                                  <p className={`text-sm font-black ${data.feeSummary.openingBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                    ₦{data.feeSummary.openingBalance?.toLocaleString() || '0'}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[9px] font-black text-black uppercase">Current Term Fee</p>
                                  <p className="text-sm font-black text-gray-900">
                                    ₦{data.feeSummary.currentTermFee?.toLocaleString() || '0'}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[9px] font-black text-black uppercase">Total Paid</p>
                                  <p className="text-sm font-black text-emerald-700">
                                    ₦{data.feeSummary.totalPaid?.toLocaleString() || '0'}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[9px] font-black text-black uppercase">Outstanding Balance</p>
                                  <p className={`text-lg font-black leading-none ${data.feeSummary.grandTotal > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                    ₦{data.feeSummary.grandTotal?.toLocaleString() || '0'}
                                  </p>
                                </div>
                              </div>
                              <div className="px-3 pb-2 text-[8.5px] text-center font-bold text-black border-t border-black/10 pt-1">
                                Note: Full payment of all outstanding balances is required for continued access to student portal and future term results.
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
                          <div className="mt-0.5 grid grid-cols-2 gap-8 items-end p-1">
                            <div className="space-y-1 text-center">
                              <div className="border-b-2 border-black py-0.5 min-h-[20px] flex items-center justify-center">
                                {data.student?.formMasterSignatureUrl ? (
                                  <img src={data.student.formMasterSignatureUrl.startsWith('data:') || data.student.formMasterSignatureUrl.startsWith('http') ? data.student.formMasterSignatureUrl : `${API_BASE_URL}${data.student.formMasterSignatureUrl}`} alt="Teacher Signature" className="h-[35px] w-auto mix-blend-multiply" />
                                ) : (
                                  <span className="font-signature italic text-lg text-black">{data.student?.formMaster || 'Form Master'}</span>
                                )}
                              </div>
                              <span className="text-[10px] font-black block uppercase text-black tracking-tight">CLASS TEACHER'S SIGNATURE</span>
                            </div>
                            <div className="space-y-1 text-center">
                              <div className="border-b-2 border-black py-0.5 min-h-[20px] flex items-center justify-center">
                                {data.term?.principalSignatureUrl ? (
                                  <img src={data.term.principalSignatureUrl.startsWith('data:') || data.term.principalSignatureUrl.startsWith('http') ? data.term.principalSignatureUrl : `${API_BASE_URL}${data.term.principalSignatureUrl}`} alt="Principal Signature" className="h-[40px] w-auto mix-blend-multiply" />
                                ) : (
                                  <span className="text-[9px] text-black font-bold underline decoration-dotted">FOR OFFICIAL USE - PRINCIPAL</span>
                                )}
                              </div>
                              <span className="text-[10px] font-black block uppercase text-black tracking-tight">PRINCIPAL'S SIGNATURE</span>
                            </div>
                          </div>

                          {/* DOCUMENT VERIFICATION FOOTER */}
                          <div className="mt-2 border-t border-gray-200 pt-1 flex justify-between items-center bg-transparent">
                            <div className="flex items-center gap-4">
                              <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-100">
                                <QRCodeSVG 
                                  value={`${window.location.origin}/verify/term/${data.student?.id}/${selectedTerm}`}
                                  size={45}
                                  level="H"
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
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {reports.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8 print:hidden">
              {downloadingPDF ? (
                <div className="flex items-center gap-3 bg-slate-100 px-6 py-4 rounded-[24px] border border-slate-200 min-w-[300px] w-full sm:w-auto">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Generating PDF</span>
                      <span className="text-xs font-black text-slate-800">{pdfProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${pdfProgress}%` }}></div>
                    </div>
                    <p className="text-[8px] text-slate-400 font-bold mt-1 truncate">{pdfProgressLabel}</p>
                  </div>
                  <button 
                    onClick={handleCancelPdf} 
                    className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 flex-shrink-0"
                    title="Cancel PDF Generation"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleDownloadPDF} 
                  className="group/btn bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 border border-emerald-500 w-full sm:w-auto"
                >
                  <span>💾</span>
                  Download PDF Bundle
                </button>
              )}
              <button 
                onClick={handlePrint} 
                disabled={downloadingPDF}
                className="group/btn bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3 border border-slate-800 w-full sm:w-auto"
              >
                <Printer className="w-5 h-5 transition-transform group-hover/btn:rotate-12" />
                Print All {reports.length} Reports
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BulkReportDownload;

