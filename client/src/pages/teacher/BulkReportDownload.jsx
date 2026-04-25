import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDateVerbose } from '../../utils/formatters';

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
        const teacherClasses = classesArray.filter(c => c.classTeacherId === user.id);
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

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Bulk_Reports`,
    pageStyle: `
      @media print {
        @page { size: A4; margin: 0 !important; }
        body { background: white !important; margin: 0; padding: 0; }
        .emerald-print-A4 {
          width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          padding: 10mm !important;
          margin: 0 auto !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          page-break-after: always !important;
        }
        table { border-collapse: collapse !important; width: 100% !important; }
        td, th { border: 1px solid black !important; padding: 1px !important; }
        * { box-sizing: border-box !important; }
        .no-print { display: none !important; }
      }
      * { box-sizing: border-box !important; }
      .border-black { border-color: black !important; }
    `
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Report Card Download</h1>
      </div>

      {user.role === 'teacher' && classes.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center no-print border border-gray-200">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">Access Restricted</h3>
          <p className="text-gray-600 mt-2">You are not assigned as a Form Master for any class. Report generation is restricted to Form Masters only.</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow no-print border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">
              {user.role === 'teacher' && classes.length === 1
                ? `Academic Report Generation: ${classes[0].name} ${classes[0].arm || ''}`
                : "Select Class and Term"}
            </h3>
            <div className={`grid grid-cols-1 ${user.role === 'teacher' && classes.length === 1 ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-4`}>
              {!(user.role === 'teacher' && classes.length === 1) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                  >
                    <option value="">Select a class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} {cls.arm || ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Academic Term</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Select a term</option>
                  {terms.map(term => (
                    <option key={term.id} value={term.id}>
                      {term.name} - {term.academicSession?.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-blue-900">Optional: Filter by Student Range</h4>
                {loadingStudents && <span className="text-xs text-blue-600 font-medium animate-pulse">Loading students...</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Student</label>
                  <select
                    value={startAdmission}
                    onChange={(e) => setStartAdmission(e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                    disabled={loadingStudents || classStudents.length === 0}
                  >
                    <option value="">-- Select Start Student --</option>
                    {classStudents.map(student => (
                      <option key={`start-${student.id}`} value={student.admissionNumber}>
                        {student.name} ({student.admissionNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Student</label>
                  <select
                    value={endAdmission}
                    onChange={(e) => setEndAdmission(e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                    disabled={loadingStudents || classStudents.length === 0}
                  >
                    <option value="">-- Select End Student --</option>
                    {classStudents.map(student => (
                      <option key={`end-${student.id}`} value={student.admissionNumber}>
                        {student.name} ({student.admissionNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Leave blank to download all students in the class
              </p>
            </div>

            <button
              onClick={fetchReports}
              disabled={!selectedClass || !selectedTerm || loading}
              className="mt-4 bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400 font-bold shadow"
            >
              {loading ? 'Loading...' : 'Load Reports'}
            </button>
          </div>

          {/* Action Bar */}
          {reports.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow no-print flex justify-between items-center border border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-emerald-800">Reports Ready for Printing</h3>
                <p className="text-sm text-gray-600">{reports.length} student(s) loaded successfully.</p>
              </div>
              <button
                onClick={handlePrint}
                className="bg-emerald-600 text-white px-8 py-3 rounded-md hover:bg-emerald-700 font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Printer size={20} />
                Print All Reports Now
              </button>
            </div>
          )}

          {!loading && reports.length === 0 && selectedClass && selectedTerm && (
            <div className="bg-white p-12 rounded-lg shadow text-center no-print">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-gray-600">No reports found for the selected criteria</p>
            </div>
          )}

          {/* EXACT COPY: Report Card Print Container (Hidden on screen unless printing, or we can show them as preview) */}
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
                <div key={idx} className={`relative bg-white p-6 print:p-0 my-8 print:my-0 shadow-2xl print:shadow-none text-black ${borderStyle} print:emerald-print-A4 mx-auto w-[210mm] min-w-[210mm] break-after-page`} style={{ fontFamily: reportFont, borderColor: layout !== 'minimal' ? reportColor : undefined }}>

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
                              {data.term?.number === 3 && (
                                <>
                                  <th className="border border-black p-0.5 text-center w-6 text-[7px]">T1</th>
                                  <th className="border border-black p-0.5 text-center w-6 text-[7px]">T2</th>
                                  <th className="border border-black p-0.5 text-center w-8 text-[7px] font-bold">CUM</th>
                                </>
                              )}
                              <th className="border border-black p-0.5 text-center w-6 text-[7px]">GRD</th>
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
                                {data.term?.number === 3 && (
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
                              <span className="text-[8px] text-gray-400 uppercase font-black">Average</span>
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
                    {data.feeSummary && (
                      <div className="border-2 border-black bg-emerald-50/30 rounded-lg overflow-hidden mt-2" style={{ backgroundColor: `${reportColor}05` }}>
                        <div className="bg-emerald-800 text-white text-xs font-bold text-center py-0.5 uppercase tracking-widest" style={{ backgroundColor: reportColor }}>
                          Financial Standing & Fee Status
                        </div>
                        <div className="p-1.5 grid grid-cols-4 gap-2 text-center divide-x divide-black/10">
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-gray-500 uppercase">Arrears (Opening)</p>
                            <p className={`text-sm font-black ${data.feeSummary.openingBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                              ₦{data.feeSummary.openingBalance?.toLocaleString() || '0'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-gray-500 uppercase">Current Term Fee</p>
                            <p className="text-sm font-black text-gray-900">
                              ₦{data.feeSummary.currentTermFee?.toLocaleString() || '0'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-gray-500 uppercase">Total Paid</p>
                            <p className="text-sm font-black text-emerald-700">
                              ₦{data.feeSummary.totalPaid?.toLocaleString() || '0'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-gray-500 uppercase">Outstanding Balance</p>
                            <p className={`text-lg font-black leading-none ${data.feeSummary.grandTotal > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                              ₦{data.feeSummary.grandTotal?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </div>
                        <div className="px-3 pb-2 text-[8px] text-center italic text-gray-500 border-t border-black/5 pt-1">
                          Note: Full payment of all outstanding balances is required for continued access to student portal and future term results.
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
                              <span className="underline font-black">{data.term?.endDate ? formatDateVerbose(data.term.endDate) : '....................'}</span>
                            </div>
                            <div>
                              <span className="mr-1">Next Term Begins:</span>
                              <span className="underline font-black">{data.term?.nextTermBegins ? formatDateVerbose(data.term.nextTermBegins) : '....................'}</span>
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
                            <span className="font-signature italic text-lg opacity-30">{data.student?.formMaster || 'Form Master'}</span>
                          )}
                        </div>
                        <span className="text-[8px] font-black block uppercase text-gray-600 tracking-tight">CLASS TEACHER'S SIGNATURE</span>
                      </div>
                      <div className="space-y-1 text-center">
                        <div className="border-b-2 border-black py-0.5 min-h-[20px] flex items-center justify-center">
                          {data.term?.principalSignatureUrl ? (
                            <img src={data.term.principalSignatureUrl.startsWith('data:') || data.term.principalSignatureUrl.startsWith('http') ? data.term.principalSignatureUrl : `${API_BASE_URL}${data.term.principalSignatureUrl}`} alt="Principal Signature" className="h-[40px] w-auto mix-blend-multiply" />
                          ) : (
                            <span className="text-[8px] text-gray-300 italic opacity-50 underline decoration-dotted">FOR OFFICIAL USE - PRINCIPAL</span>
                          )}
                        </div>
                        <span className="text-[8px] font-black block uppercase text-gray-600 tracking-tight">PRINCIPAL'S SIGNATURE</span>
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
                        <div className="text-[7px] font-bold text-gray-400 uppercase">TERM: {data.term?.name?.toUpperCase()} • GEN: {formatDateVerbose(new Date())}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </>
      )}
    </div>
  );
};

export default BulkReportDownload;
