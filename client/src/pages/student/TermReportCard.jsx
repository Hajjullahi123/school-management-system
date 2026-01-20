import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';

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

  // Automatically select student for student role
  useEffect(() => {
    if (user?.role === 'student' && user?.student?.id) {
      setSelectedStudentId(user.student.id);
      if (user.student.admissionNumber) {
        setAdmissionNumber(user.student.admissionNumber);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchTerms();
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
      setClassStudents(data);
    } catch (error) {
      console.error('Error fetching wards:', error);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await api.get('/api/terms');
      const data = await response.json();
      setTerms(data);
      const currentTerm = data.find(t => t.isCurrent);
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

      if (user?.role === 'teacher') {
        const teacherClasses = data.filter(c => c.classTeacherId === user.id);
        setClasses(teacherClasses);
        if (teacherClasses.length === 1) {
          setSelectedClassId(teacherClasses[0].id.toString());
        }
      } else {
        setClasses(data);
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
        if (classStudents.length === 0) {
          alert('No students found in this class.');
          setLoading(false);
          return;
        }

        const reports = [];
        for (const student of classStudents) {
          try {
            const response = await api.get(`/api/reports/term/${student.id}/${selectedTerm}`);
            if (response.ok) {
              const data = await response.json();
              reports.push(data);
            }
          } catch (e) {
            console.error(`Failed to fetch report for student ${student.id}`, e);
          }
        }

        if (reports.length === 0) {
          alert('Could not generate any reports. Please check if results exist.');
        } else {
          setBulkReports(reports);
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

      if (response.status === 403) {
        const errorData = await response.json();
        if (errorData.error === 'Result Not Published') {
          setReportData(null);
          throw new Error(errorData.message);
        }
      }

      if (!response.ok) {
        let errorMessage = 'Failed to fetch report';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) { }
        throw new Error(errorMessage);
      }

      const data = await response.json();
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
    <div className="space-y-6 max-w-[210mm] mx-auto pb-10">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Term Report Card</h1>
        {reportData && (
          <button
            onClick={printReport}
            className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 flex items-center shadow"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>
        )}
      </div>

      {/* Filter Section (Hidden on Print) */}
      {user?.role === 'teacher' && classes.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center border border-gray-200 print:hidden">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Access Restricted</h3>
          <p className="text-gray-600 mt-2">You are not assigned as a Form Master for any class. The report card section is reserved for Form Masters and Administrators.</p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow print:hidden border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Select Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Choose a term</option>
                {terms.map(term => (
                  <option key={term.id} value={term.id}>
                    {term.name} - {term.academicSession?.name}
                  </option>
                ))}
              </select>
            </div>

            {user?.role === 'student' ? (
              <div className="flex md:col-span-3 items-end">
                <button
                  onClick={fetchReport}
                  disabled={!selectedTerm || loading}
                  className="bg-primary text-white px-8 py-3 rounded-md hover:brightness-90 disabled:bg-gray-400 w-full md:w-auto font-bold shadow"
                >
                  {loading ? 'Generating Report...' : 'View My Report'}
                </button>
              </div>
            ) : (
              <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex gap-4 mb-2">
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="radio" className="form-radio text-primary" name="searchMode" value="admission" checked={searchMode === 'admission'} onChange={(e) => setSearchMode(e.target.value)} />
                    <span className="ml-2 font-medium">By Admission No</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="radio" className="form-radio text-primary" name="searchMode" value="class" checked={searchMode === 'class'} onChange={(e) => setSearchMode(e.target.value)} />
                    <span className="ml-2 font-medium">By Class</span>
                  </label>
                </div>

                {searchMode === 'admission' ? (
                  <div className="md:col-span-2 flex gap-2">
                    <input
                      type="text"
                      value={admissionNumber}
                      onChange={(e) => setAdmissionNumber(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Admission Number"
                    />
                    <button onClick={fetchReport} disabled={loading} className="bg-primary text-white px-8 py-2 rounded-md hover:brightness-90 whitespace-nowrap font-bold">
                      {loading ? '...' : 'Generate'}
                    </button>
                  </div>
                ) : (
                  <>
                    <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2">
                      <option value="">Select Class</option>
                      {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name} {cls.arm}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="flex-1 border border-gray-300 rounded-md px-3 py-2" disabled={!selectedClassId}>
                        <option value="">Select Student</option>
                        <option value="all">-- ALL STUDENTS --</option>
                        {classStudents.map(s => <option key={s.id} value={s.id}>{s.user.firstName} {s.user.lastName}</option>)}
                      </select>
                      <button onClick={fetchReport} disabled={loading || !selectedStudentId} className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 font-bold">
                        Fetch
                      </button>
                    </div>
                  </>
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
          {(bulkReports.length > 0 ? bulkReports : [reportData]).map((data, idx) => {
            if (!data || !data.student) return null;

            const domainSplit = splitDomains(data.psychomotorRatings);
            const gradeAnalysis = getGradeAnalysis(data.subjects || []);
            const termNumber = data.term?.number || data.academic?.termNumber;

            return (
              <div key={idx} className="relative bg-white p-8 print:p-4 my-8 print:my-0 shadow-2xl print:shadow-none print:break-after-page text-black font-serif border-[12px] border-emerald-800 print:emerald-border">

                {/* PROTECTION WATERMARK */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none rotate-12 overflow-hidden">
                  <div className="text-[100px] font-black uppercase text-gray-900 leading-[0.8] text-center">
                    {schoolSettings?.schoolName || 'OFFICIAL RESULT'}<br />
                    {schoolSettings?.schoolName || 'OFFICIAL RESULT'}<br />
                    {schoolSettings?.schoolName || 'OFFICIAL RESULT'}<br />
                    {schoolSettings?.schoolName || 'OFFICIAL RESULT'}
                  </div>
                </div>

                <div className="relative z-10 space-y-4">
                  {/* HEAD SECTION */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="w-24 h-24 flex-shrink-0">
                      {schoolSettings?.logoUrl && (
                        <img src={schoolSettings.logoUrl} alt="Logo" className="w-full h-full object-contain object-left" />
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
                          {data.term?.name?.toUpperCase()} PERFORMANCE REPORT
                        </h2>
                      </div>
                    </div>

                    <div className="w-24 h-28 border-2 border-black bg-gray-50 flex-shrink-0 relative overflow-hidden">
                      {data.student?.photoUrl ? (
                        <img src={data.student.photoUrl.startsWith('http') ? data.student.photoUrl : `${API_BASE_URL}${data.student.photoUrl}`} alt="Student" className="w-full h-full object-cover" />
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
                        <td className="border-r border-black p-1 w-2/3 text-emerald-800" style={{ color: schoolSettings?.primaryColor }}>{data.student?.name}</td>
                        <td className="border-r border-black p-1 w-1/6">GENDER:</td>
                        <td className="p-1">{data.student?.gender}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-1">CLASS:</td>
                        <td className="border-r border-black p-1">{data.student?.class}</td>
                        <td className="border-r border-black p-1">SESSION:</td>
                        <td className="p-1">{data.term?.session || data.academic?.session}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-1">ADM NO:</td>
                        <td className="border-r border-black p-1">{data.student?.admissionNumber}</td>
                        <td className="border-r border-black p-1">D.O.B:</td>
                        <td className="p-1">{data.student?.dateOfBirth ? new Date(data.student.dateOfBirth).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-1">AGE:</td>
                        <td className="border-r border-black p-1">{data.student?.age || '-'}</td>
                        <td className="border-r border-black p-1">CLUB:</td>
                        <td className="p-1">{data.student?.clubs || 'JETS CLUB'}</td>
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
                          <tr className="bg-gray-200">
                            <th className="border border-black p-1 text-left">SUBJECTS</th>
                            <th className="border border-black p-1 text-center w-6 text-[7px] leading-tight">1ST CA<br />{data.academic?.weights?.assignment1 || 5}</th>
                            <th className="border border-black p-1 text-center w-6 text-[7px] leading-tight">2ND CA<br />{data.academic?.weights?.assignment2 || 5}</th>
                            <th className="border border-black p-1 text-center w-6 text-[7px] leading-tight">1ST TST<br />{data.academic?.weights?.test1 || 10}</th>
                            <th className="border border-black p-1 text-center w-6 text-[7px] leading-tight">2ND TST<br />{data.academic?.weights?.test2 || 10}</th>
                            <th className="border border-black p-1 text-center w-8">EXM<br />{data.academic?.weights?.exam || 70}</th>
                            <th className="border border-black p-1 text-center w-8">TOT<br />100</th>
                            {termNumber === 3 && (
                              <>
                                <th className="border border-black p-1 text-center w-6 text-[7px]">T1</th>
                                <th className="border border-black p-1 text-center w-6 text-[7px]">T2</th>
                                <th className="border border-black p-1 text-center w-8 text-[7px]">CUM</th>
                              </>
                            )}
                            <th className="border border-black p-1 text-center w-6">GRD</th>
                            <th className="border border-black p-1 text-center w-6 text-[7px]">POS</th>
                            <th className="border border-black p-1 text-left px-1 text-[8px]">REMARKS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.subjects || []).map((sub, i) => (
                            <tr key={i} className="font-bold uppercase h-6">
                              <td className="border border-black px-1 leading-tight text-[11px] font-black">{sub.name}</td>
                              <td className="border border-black text-center text-[10px]">{sub.assignment1 || '0'}</td>
                              <td className="border border-black text-center text-[10px]">{sub.assignment2 || '0'}</td>
                              <td className="border border-black text-center text-[10px]">{sub.test1 || '0'}</td>
                              <td className="border border-black text-center text-[10px]">{sub.test2 || '0'}</td>
                              <td className="border border-black text-center text-[10px]">{sub.exam || '0'}</td>
                              <td className="border border-black text-center bg-gray-50 text-[10px]">{sub.total?.toFixed(0)}</td>
                              {termNumber === 3 && (
                                <>
                                  <td className="border border-black text-center text-[9px]">{sub.term1Score ?? '-'}</td>
                                  <td className="border border-black text-center text-[9px]">{sub.term2Score ?? '-'}</td>
                                  <td className="border border-black text-center bg-gray-50 text-[9px]">{sub.cumulativeAverage?.toFixed(1) ?? '-'}</td>
                                </>
                              )}
                              <td className="border border-black text-center text-[10px] font-black">{sub.grade}</td>
                              <td className="border border-black text-center text-[10px]">{sub.position}</td>
                              <td className="border border-black px-1 text-[8px] leading-tight italic font-medium">{sub.remark}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* RIGHT: DOMAINS */}
                    <div className="flex flex-col h-full gap-2">
                      {/* AFFECTIVE */}
                      <div className="flex-1 flex flex-col min-h-0">
                        <table className="w-full border-2 border-black border-collapse text-[10px] flex-1">
                          <thead className="bg-gray-200 uppercase font-bold sticky top-0">
                            <tr>
                              <th className="border-b border-r border-black text-left px-1 py-0.5">AFFECTIVE</th>
                              <th className="border-b border-black w-5">5</th>
                              <th className="border-b border-black w-5">4</th>
                              <th className="border-b border-black w-5">3</th>
                              <th className="border-b border-black w-5">2</th>
                              <th className="border-b border-black w-5">1</th>
                            </tr>
                          </thead>
                          <tbody>
                            {domainSplit.affective.map((item, i) => (
                              <tr key={i} className="h-5"><td className="border border-black px-1 truncate font-bold uppercase">{item.name}</td>{renderRatingTicks(item.score)}</tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* PSYCHOMOTOR */}
                      <div className="flex-1 flex flex-col min-h-0">
                        <table className="w-full border-2 border-black border-collapse text-[10px] flex-1">
                          <thead className="bg-gray-200 uppercase font-bold sticky top-0">
                            <tr>
                              <th className="border-b border-r border-black text-left px-1 py-0.5">PSYCHOMOTOR</th>
                              <th className="border-b border-black w-5">5</th>
                              <th className="border-b border-black w-5">4</th>
                              <th className="border-b border-black w-5">3</th>
                              <th className="border-b border-black w-5">2</th>
                              <th className="border-b border-black w-5">1</th>
                            </tr>
                          </thead>
                          <tbody>
                            {domainSplit.psychomotor.map((item, i) => (
                              <tr key={i} className="h-5"><td className="border border-black px-1 truncate font-bold uppercase">{item.name}</td>{renderRatingTicks(item.score)}</tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* SUMMARY & GRADING KEY (DIRECTLY BELOW COGNITIVE) */}
                  <div className="grid grid-cols-[68%_31%] gap-2 mt-2">
                    <div className="grid grid-cols-2 gap-0 border-2 border-black rounded-lg overflow-hidden divide-x-2 divide-black">
                      {/* GRADE INFO */}
                      <div className="p-2 text-[9px] bg-gray-50/50 leading-tight flex flex-col justify-center">
                        <p className="font-black border-b border-black mb-1 uppercase text-gray-500 text-[8px]">Grading Legend</p>
                        <div className="grid grid-cols-2 gap-x-2 font-bold">
                          <span>A: 75-100</span>
                          <span>B: 65-74</span>
                          <span>C: 55-64</span>
                          <span>D: 45-54</span>
                          <span>E: 40-44</span>
                          <span className="text-red-600">F: 0-39</span>
                        </div>
                        <p className="mt-1 border-t border-black/10 pt-1 text-[8px] italic">5: Excellent, 4: V. Good, 3: Good, 2: Fair, 1: Poor</p>
                      </div>

                      {/* POSITION & AVG */}
                      <div className="p-0 flex flex-col">
                        <div className="bg-emerald-800 text-white text-[9px] font-bold text-center py-0.5 uppercase tracking-tighter" style={{ backgroundColor: schoolSettings?.primaryColor }}>Status Summary</div>
                        <div className="bg-white flex-1 grid grid-cols-2 divide-x divide-black/10">
                          <div className="flex flex-col items-center justify-center p-1">
                            <span className="text-[7px] text-gray-400 uppercase font-black">Position</span>
                            <span className="text-sm font-black">{data.termPosition || '-'} / {data.totalStudents || '-'}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-1">
                            <span className="text-[7px] text-gray-400 uppercase font-black">Average</span>
                            <span className="text-sm font-black">{data.termAverage?.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="border-t border-black p-1 flex items-center justify-between bg-emerald-50" style={{ backgroundColor: `${schoolSettings?.primaryColor}10` }}>
                          <span className="text-[9px] font-black uppercase text-gray-500">Overall Grade:</span>
                          <span className="text-lg font-black text-emerald-800" style={{ color: schoolSettings?.primaryColor }}>{data.overallGrade}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center border-2 border-black rounded-lg bg-gray-50 font-mono text-[7px] uppercase tracking-[0.3em] text-gray-300 relative overflow-hidden">
                      <span className="z-10 bg-white px-2">Official Result Certification</span>
                      <div className="absolute inset-x-0 h-[1px] bg-gray-200"></div>
                    </div>
                  </div>

                  {/* REMARKS SECTION */}
                  <div className="border-2 border-black bg-white rounded-lg overflow-hidden mt-4">
                    <div className="grid grid-cols-2 divide-x-2 divide-black">
                      <div className="p-2 space-y-1">
                        <p className="text-[10px] font-black uppercase text-gray-500">Form Master's Remark</p>
                        <p className="text-xs font-medium italic leading-snug min-h-[40px] flex items-center">
                          "{data.formMasterRemark || 'No specific remark recorded.'}"
                        </p>
                        <div className="pt-1 border-t border-black/10 flex justify-between items-center">
                          <span className="text-[9px] font-bold">Name: {data.student?.formMaster || '......................'}</span>
                          <span className="text-[8px] text-gray-400 font-mono">ID: RC-{data.term?.id?.toString().slice(-4)}</span>
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        <p className="text-[10px] font-black uppercase text-gray-500">Principal's Remark</p>
                        <p className="text-xs font-medium italic leading-snug min-h-[40px] flex items-center">
                          "{data.principalRemark || 'Satisfactory result. Keep striving for excellence.'}"
                        </p>
                        <div className="pt-1 border-t border-black/10 flex justify-between items-center text-[9px] font-bold">
                          <span>Next Term Begins:</span>
                          <span className="underline">{data.academic?.nextTermBegins ? new Date(data.academic.nextTermBegins).toLocaleDateString() : '....................'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SIGNATURES & VERIFICATION */}
                  <div className="mt-8 grid grid-cols-3 gap-8 items-end">
                    <div className="space-y-2">
                      <div className="w-full h-8 bg-white border-b border-gray-300 flex items-end gap-[0.5px] opacity-20 grayscale">
                        {[...Array(60)].map((_, i) => (
                          <div key={i} className="bg-black" style={{ height: (i % 8 === 0 ? '100%' : '80%'), width: (i % 5 === 0 ? '2px' : '1px') }}></div>
                        ))}
                      </div>
                      <p className="text-[7px] font-mono font-bold uppercase tracking-[0.2em] text-gray-400">
                        Verification ID: {data.student?.admissionNumber?.replace('/', '-')}-{data.term?.id?.toString().slice(-4)}
                      </p>
                    </div>

                    <div className="text-center group">
                      <div className="border-b-2 border-black w-full mb-1 opacity-80"></div>
                      <p className="text-[10px] font-black uppercase">Teacher's Signature</p>
                      <p className="text-[8px] text-gray-400 uppercase mt-0.5">Automated Seal</p>
                    </div>

                    <div className="text-center">
                      <div className="h-10 flex items-center justify-center">
                        <p className="text-[8px] italic text-gray-300 uppercase">Place Stamp Here</p>
                      </div>
                      <div className="border-b-2 border-emerald-800 w-full mb-1" style={{ borderColor: schoolSettings?.primaryColor }}></div>
                      <p className="text-[10px] font-black uppercase text-emerald-800" style={{ color: schoolSettings?.primaryColor }}>Principal's Signature</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Printing Helpers */}
      <style>{`
        @media print {
          body { background: white !important; margin: 0; padding: 0; }
          .max-w-[210mm] { max-width: 100% !important; margin: 0 !important; }
          .print\\:break-after-page { break-after: page !important; }
          .emerald-border { border: 20px solid #065f46 !important; -webkit-print-color-adjust: exact; }
          table { border-collapse: collapse !important; width: 100% !important; }
          td, th { border: 1px solid black !important; padding: 2px !important; }
          * { box-sizing: border-box !important; }
          .bg-emerald-800 { background-color: #065f46 !important; -webkit-print-color-adjust: exact; }
          .bg-gray-200 { background-color: #e5e7eb !important; -webkit-print-color-adjust: exact; }
          .bg-gray-100 { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
          .bg-gray-50 { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; }
        }
        
        * { box-sizing: border-box !important; }
        .border-black { border-color: black !important; }
      `}</style>
    </div>
  );
};

export default TermReportCard;
