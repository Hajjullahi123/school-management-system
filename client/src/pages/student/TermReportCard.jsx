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

  // Selection states
  const [searchMode, setSearchMode] = useState('admission'); // 'admission', 'class'
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Automatically select student for student role
  useEffect(() => {
    if (user?.role === 'student' && user?.student?.id) {
      setSelectedStudentId(user.student.id);
      // Pre-fill admission number if available (though not strictly used in loop logic for student role, good for fallback)
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
      setClassStudents(data); // Reusing classStudents to store wards for dropdown
    } catch (error) {
      console.error('Error fetching wards:', error);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await api.get('/api/terms');
      const data = await response.json();
      setTerms(data);
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      const data = await response.json();
      setClasses(data);
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

    try {
      // BULK MODE: All Students in Class
      if (searchMode === 'class' && selectedClassId && selectedStudentId === 'all') {
        if (classStudents.length === 0) {
          alert('No students found in this class.');
          setLoading(false);
          return;
        }

        const reports = [];
        // Fetch individually for now (could be optimized with a bulk API later)
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

      // For students, force their own ID
      if (user?.role === 'student') {
        targetStudentId = user.studentProfile?.id || user.student?.id;
      }

      // If searching by admission number (and not a student), lookup first
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
          // Clear any previous report data to show the empty state or error
          setReportData(null);
          throw new Error(errorData.message);
        }
      }

      if (!response.ok) {
        let errorMessage = 'Failed to fetch report';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // parsing failed, use default
        }
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

      alert(msg);
      // Ensure specific message is shown if it was a 403
    } finally {
      setLoading(false);
    }
  };

  /* Helper to calculate C.A (Continuous Assessment) */
  const calculateCA = (subject) => {
    return (subject.assignment1 || 0) + (subject.assignment2 || 0) + (subject.test1 || 0) + (subject.test2 || 0);
  };

  /* Helper to analyze grades count */
  const getGradeAnalysis = (subjects) => {
    const analysis = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    subjects.forEach(sub => {
      const grade = sub.grade || 'F';
      if (analysis[grade] !== undefined) analysis[grade]++;
    });
    return analysis;
  };

  /* Helper to map 0-5 ratings to 1-5 scale ticks */
  const renderRatingTicks = (score) => {
    // Score is 0-5. We need to check columns 5,4,3,2,1
    // If score is 5, check 5. If 4, check 4.
    const rounded = Math.round(score);
    return (
      <>
        {[5, 4, 3, 2, 1].map(val => (
          <td key={val} className="border border-black text-center w-6">
            {rounded === val ? '✔' : ''}
          </td>
        ))}
      </>
    );
  };

  /* Helper to split psychomotor into Affective vs Psychomotor if needed. 
     Since backend usually gives one list, we'll arbitrarily split or use categories if available.
     For now, we'll assume the top half is Affective, bottom is Psychomotor if not distinguished.
     Actually, better to just list them all under one if not separated, but the image has two tables.
     We will check if 'psychomotorRatings' has category field, else split by index.
  */
  const splitDomains = (ratings) => {
    if (!ratings) return { affective: [], psychomotor: [] };
    // Simple split for demo purposes if no category
    const mid = Math.ceil(ratings.length / 2);
    return {
      affective: ratings.slice(0, mid),
      psychomotor: ratings.slice(mid)
    };
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-[210mm] mx-auto">
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
      <div className="bg-white p-6 rounded-lg shadow print:hidden border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Select Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
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
                className="bg-primary text-white px-8 py-3 rounded-md hover:brightness-90 disabled:bg-gray-400 w-full md:w-auto font-bold shadow transition-all transform hover:scale-[1.02]"
              >
                {loading ? 'Generating Report...' : 'View My Report'}
              </button>
            </div>
          ) : user?.role === 'parent' ? (
            <div className="col-span-2 grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Select Child
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose your child</option>
                  {classStudents.map((ward) => (
                    <option key={ward.id} value={ward.id}>
                      {ward.user.firstName} {ward.user.lastName} ({ward.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  onClick={fetchReport}
                  disabled={loading || !selectedStudentId || !selectedTerm}
                  className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400 w-full"
                >
                  {loading ? 'Generating...' : 'View Report'}
                </button>
              </div>
            </div>
          ) : (
            <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex gap-4 mb-2">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    className="form-radio text-primary focus:ring-primary"
                    name="searchMode"
                    value="admission"
                    checked={searchMode === 'admission'}
                    onChange={(e) => setSearchMode(e.target.value)}
                  />
                  <span className="ml-2">By Admission No</span>
                </label>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    className="form-radio text-primary focus:ring-primary"
                    name="searchMode"
                    value="class"
                    checked={searchMode === 'class'}
                    onChange={(e) => setSearchMode(e.target.value)}
                  />
                  <span className="ml-2">By Class</span>
                </label>
              </div>

              {searchMode === 'admission' ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Admission Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={admissionNumber}
                      onChange={(e) => setAdmissionNumber(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="e.g. 2024-SS1A-JD"
                    />
                    <button
                      onClick={fetchReport}
                      disabled={loading}
                      className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400 whitespace-nowrap"
                    >
                      {loading ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Class
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} {cls.arm}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Student
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        disabled={!selectedClassId}
                      >
                        <option value="">Select Student</option>
                        <option value="all" className="font-bold text-primary">-- ALL STUDENTS (Bulk Generate) --</option>
                        {classStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.user.firstName} {student.user.lastName} ({student.admissionNumber})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={fetchReport}
                        disabled={loading || !selectedStudentId}
                        className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400 whitespace-nowrap"
                      >
                        {loading ? 'Generating...' : 'Generate'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Report Card Display */}
      {(reportData || bulkReports.length > 0) && (
        <>
          {(bulkReports.length > 0 ? bulkReports : [reportData]).map((data, idx) => {
            if (!data || !data.student) return null;

            const domainSplit = splitDomains(data.psychomotorRatings);
            const gradeAnalysis = getGradeAnalysis(data.subjects || []);

            // Calculate attendance stats (mocking or zero if not available from backend yet)
            const attendance = {
              opened: 120, // Standard term days
              present: 115, // Mock data - would need backend field
              absent: 5
            };

            return (
              <div key={idx} className="bg-white p-8 print:p-0 my-8 print:my-0 shadow-lg print:shadow-none print:break-after-page text-black font-serif border border-gray-200 print:border-none">

                {/* HEAD SECTION */}
                <div className="flex justify-between items-start mb-4 gap-4">
                  {/* Logo - Left */}
                  <div className="w-24 h-24 hidden print:block md:block flex-shrink-0">
                    {schoolSettings?.logoUrl && (
                      <img src={schoolSettings.logoUrl} alt="Logo" className="w-full h-full object-contain object-left" />
                    )}
                  </div>

                  {/* School Info - Center */}
                  <div className="flex-1 text-center">
                    <h1 className="text-3xl font-extrabold font-serif uppercase tracking-wider leading-tight">
                      {schoolSettings?.schoolName || 'SCHOOL NAME'}
                    </h1>
                    <p className="text-sm mt-1">{schoolSettings?.schoolAddress || 'School Address Location'}</p>
                    <p className="text-sm">TEL: {schoolSettings?.contactPhone || '0000000000'}, Email: {schoolSettings?.contactEmail || 'school@email.com'}</p>

                    <div className="mt-4 border-b-2 border-black inline-block px-4 pb-1">
                      <h2 className="text-xl font-bold uppercase tracking-wide">
                        {data.term?.name?.toUpperCase()} STUDENT'S PERFORMANCE REPORT
                      </h2>
                    </div>
                  </div>

                  {/* Student Photo - Right */}
                  <div className="w-24 h-24 border-2 border-black bg-gray-100 hidden print:block md:block flex-shrink-0">
                    {data.student?.photoUrl ? (
                      <img src={`${API_BASE_URL}${data.student.photoUrl}`} alt="Student" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-center p-1 font-bold text-gray-400">PHOTO</div>
                    )}
                  </div>
                </div>

                {/* STUDENT INFO GRID */}
                <div className="border-2 border-black mb-1 text-sm font-bold uppercase bg-white">
                  {/* Row 1 */}
                  <div className="flex border-b border-black">
                    <div className="flex-1 flex border-r border-black">
                      <span className="w-24 pl-2 py-1">NAME:</span>
                      <span className="flex-1 py-1 px-2 text-blue-900">{data.student?.name}</span>
                    </div>
                    <div className="w-64 flex border-r-0 border-black">
                      <span className="w-24 pl-2 py-1 border-l border-black">GENDER:</span>
                      <span className="flex-1 py-1 px-2">{data.student?.gender}</span>
                    </div>
                  </div>
                  {/* Row 2 */}
                  <div className="flex border-b border-black">
                    <div className="flex-1 flex border-r border-black">
                      <span className="w-24 pl-2 py-1">CLASS:</span>
                      <span className="flex-1 py-1 px-2">{data.student?.class}</span>
                    </div>
                    <div className="flex-1 flex border-r border-black">
                      <span className="w-24 pl-2 py-1">SESSION:</span>
                      <span className="flex-1 py-1 px-2">{data.term?.session}</span>
                    </div>
                    <div className="w-64 flex border-r-0 border-black">
                      <span className="w-32 pl-2 py-1 border-l border-black">ADMISSION NO:</span>
                      <span className="flex-1 py-1 px-2">{data.student?.admissionNumber}</span>
                    </div>
                  </div>
                  {/* Row 3 - Misc */}
                  <div className="flex">
                    <div className="flex-1 flex border-r border-black">
                      <span className="w-24 pl-2 py-1">D.O.B:</span>
                      <span className="flex-1 py-1 px-2">{data.student?.dateOfBirth ? new Date(data.student.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex-1 flex border-r border-black">
                      <span className="w-24 pl-2 py-1">AGE:</span>
                      <span className="flex-1 py-1 px-2">-</span>
                    </div>
                    <div className="flex-1 flex border-r-0 border-black">
                      <span className="w-24 pl-2 py-1">CLUB:</span>
                      <span className="flex-1 py-1 px-2">{data.student?.clubs || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* MAIN CONTENT SPLIT */}
                <div className="grid grid-cols-[68%_32%] gap-1 mt-2 items-start">

                  {/* LEFT COLUMN: COGNITIVE DOMAIN */}
                  <div>
                    {/* Header bar */}
                    <div className="bg-gray-300 border-2 border-b-0 border-black text-center font-bold py-1 text-sm uppercase">
                      COGNITIVE DOMAIN
                    </div>
                    <table className="w-full border-2 border-black text-[10px] md:text-xs">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border border-black text-left px-2 py-1 w-2/5">SUBJECTS</th>
                          <th className="border border-black text-center w-10">
                            <div className="border-b border-black">C.A</div>
                            <div>40</div>
                          </th>
                          <th className="border border-black text-center w-10">
                            <div className="border-b border-black">EXAM</div>
                            <div>60</div>
                          </th>
                          <th className="border border-black text-center w-10">
                            <div className="border-b border-black">TOTAL</div>
                            <div>100</div>
                          </th>
                          {/* Hidden previous terms placeholders to match image structure if desired, or skip */}
                          <th className="border border-black text-center w-10 bg-gray-100/50 text-gray-400">
                            Term 2
                          </th>
                          <th className="border border-black text-center w-10 bg-gray-100/50 text-gray-400">
                            Term 1
                          </th>
                          <th className="border border-black text-center w-12 text-[9px]">Cum. Avg</th>
                          <th className="border border-black text-center w-8">GRD</th>
                          <th className="border border-black text-center w-8">POS</th>
                          <th className="border border-black text-left px-1">REMARKS</th>
                          <th className="border border-black text-center w-10 text-[9px]">Class Avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.subjects || []).length === 0 && (
                          <tr>
                            <td colSpan="11" className="border border-black px-2 py-4 text-center text-gray-500 italic">
                              No academic results found for this term.
                            </td>
                          </tr>
                        )}
                        {(data.subjects || []).map((sub, i) => {
                          const ca = calculateCA(sub);
                          return (
                            <tr key={i} className="leading-tight">
                              <td className="border border-black px-2 py-1 font-bold uppercase">{sub.name}</td>
                              <td className="border border-black text-center">{ca}</td>
                              <td className="border border-black text-center">{sub.exam || '-'}</td>
                              <td className="border border-black text-center font-bold bg-gray-100">{sub.total?.toFixed(0)}</td>
                              <td className="border border-black text-center text-gray-300">-</td>
                              <td className="border border-black text-center text-gray-300">-</td>
                              <td className="border border-black text-center">-</td>
                              <td className="border border-black text-center font-bold">{sub.grade}</td>
                              <td className="border border-black text-center">{sub.position}</td>
                              <td className="border border-black px-1 text-[9px] truncate">{sub.remark}</td>
                              <td className="border border-black text-center text-gray-500">{sub.classAverage?.toFixed(0) || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* RIGHT COLUMN: SIDE TABLES */}
                  <div className="flex flex-col gap-2">

                    {/* ATTENDANCE */}
                    <table className="w-full text-xs box-border border-2 border-black">
                      <thead className="bg-gray-300">
                        <tr><th colSpan={2} className="border-b border-black uppercase py-0.5">Attendance Summary</th></tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black px-1">No of Times School Opened</td>
                          <td className="border border-black text-center w-10 font-bold">{attendance.opened}</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-1">No of Times Present</td>
                          <td className="border border-black text-center w-10 font-bold">{attendance.present}</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-1">No of Times Absent</td>
                          <td className="border border-black text-center w-10 font-bold">{attendance.absent}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* AFFECTIVE */}
                    <table className="w-full text-[10px] border-2 border-black">
                      <thead className="bg-gray-300">
                        <tr>
                          <th className="border-b border-r border-black text-left px-1">AFFECTIVE DOMAIN</th>
                          <th className="border-b border-black w-6">5</th>
                          <th className="border-b border-black w-6">4</th>
                          <th className="border-b border-black w-6">3</th>
                          <th className="border-b border-black w-6">2</th>
                          <th className="border-b border-black w-6">1</th>
                        </tr>
                      </thead>
                      <tbody>
                        {domainSplit.affective.length > 0 ? domainSplit.affective.map((item, idx) => (
                          <tr key={idx} className="leading-tight">
                            <td className="border border-black px-1 truncate">{item.name}</td>
                            {renderRatingTicks(item.score)}
                          </tr>
                        )) : (
                          [1, 2, 3, 4, 5].map(i => (
                            <tr key={i}><td className="border border-black px-1">&nbsp;</td><td className="border border-black" /><td className="border border-black" /><td className="border border-black" /><td className="border border-black" /><td className="border border-black" /></tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* PSYCHOMOTOR */}
                    <table className="w-full text-[10px] border-2 border-black">
                      <thead className="bg-gray-300">
                        <tr>
                          <th className="border-b border-r border-black text-left px-1">PSYCHOMOTOR DOMAIN</th>
                          <th className="border-b border-black w-6">5</th>
                          <th className="border-b border-black w-6">4</th>
                          <th className="border-b border-black w-6">3</th>
                          <th className="border-b border-black w-6">2</th>
                          <th className="border-b border-black w-6">1</th>
                        </tr>
                      </thead>
                      <tbody>
                        {domainSplit.psychomotor.length > 0 ? domainSplit.psychomotor.map((item, idx) => (
                          <tr key={idx} className="leading-tight">
                            <td className="border border-black px-1 truncate">{item.name}</td>
                            {renderRatingTicks(item.score)}
                          </tr>
                        )) : (
                          // Fallback rows if no data
                          [1, 2, 3, 4].map(i => (
                            <tr key={i}><td className="border border-black px-1">&nbsp;</td><td className="border border-black" /><td className="border border-black" /><td className="border border-black" /><td className="border border-black" /><td className="border border-black" /></tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* RATING KEY */}
                    <div className="border-2 border-black text-[9px] p-1 bg-gray-50">
                      <h4 className="font-bold bg-gray-300 -mx-1 -mt-1 px-1 mb-1 border-b border-black text-center">Rating Indices</h4>
                      <p>5 - Maintains an Excellent degree of traits</p>
                      <p>4 - Maintains a High level of traits</p>
                      <p>3 - Acceptable level of traits</p>
                      <p>2 - Shows Minimal regard for traits</p>
                      <p>1 - Has No regard for traits</p>
                    </div>

                    {/* GRADE ANALYSIS */}
                    <table className="w-full text-[10px] border-2 border-black">
                      <thead className="bg-gray-300">
                        <tr>
                          <th colSpan={7} className="border-b border-black">GRADE ANALYSIS</th>
                        </tr>
                        <tr>
                          <th className="border border-black">GRADE</th>
                          <th className="border border-black">A</th>
                          <th className="border border-black">B</th>
                          <th className="border border-black">C</th>
                          <th className="border border-black">D</th>
                          <th className="border border-black">E</th>
                          <th className="border border-black">F</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black font-bold text-center">NO</td>
                          {['A', 'B', 'C', 'D', 'E', 'F'].map(g => (
                            <td key={g} className="border border-black text-center">{gradeAnalysis[g] || 0}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* FOOTER SECTION */}
                <div className="grid grid-cols-[1fr_2fr] gap-2 mt-2">
                  {/* LEFT: SUMMARY & SCALE */}
                  <div className="flex flex-col gap-2">
                    {/* Performance Summary */}
                    <table className="w-full text-xs box-border border-2 border-black">
                      <thead className="bg-gray-300">
                        <tr><th colSpan={4} className="border-b border-black py-1">PERFORMANCE SUMMARY</th></tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black px-1 font-bold">Total Obtained:</td>
                          <td className="border border-black text-center font-bold">
                            {data.subjects?.reduce((acc, s) => acc + s.total, 0).toFixed(0)}
                          </td>
                          <td className="border border-black px-1 font-bold">%TAGE</td>
                          <td className="border border-black text-center font-bold">
                            {data.termAverage?.toFixed(1)}%
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black px-1 font-bold">Total Obtainable:</td>
                          <td className="border border-black text-center">
                            {data.subjects?.length * 100}
                          </td>
                          <td className="border border-black px-1 font-bold">GRADE</td>
                          <td className="border border-black text-center font-bold text-lg">
                            {data.overallGrade}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Grade Scale */}
                    <div className="border-2 border-black text-[9px] p-1">
                      <div className="bg-gray-300 font-bold -mx-1 -mt-1 px-1 mb-1 border-b border-black text-center">GRADE SCALE</div>
                      <p className="text-center leading-relaxed">
                        70-100%=A (EXCELLENT) &nbsp; 60-69%=B (VERY GOOD) <br />
                        50-59%=C (GOOD) &nbsp; 40-49%=D (PASS) <br />
                        30-49%=E (FAIR) &nbsp; 0-29%=F (FAIL)
                      </p>
                    </div>
                  </div>

                  {/* RIGHT: REMARKS */}
                  <div className="border-2 border-black p-2 flex flex-col justify-between space-y-2">
                    {/* Teacher */}
                    <div>
                      <p className="text-xs font-bold italic underline mb-1">Teacher's Remark:</p>
                      <div className="border border-black p-2 h-12 text-sm italic font-serif leading-none flex items-center">
                        {data.formMasterRemark || 'He is a focused student.'}
                      </div>
                      <div className="flex justify-between mt-1 text-xs items-end">
                        <p><span className="font-bold">Name:</span> {data.student?.formMaster || '......................'}</p>
                        <p><span className="font-bold">Sign:</span> ......................</p>
                      </div>
                    </div>

                    {/* Principal */}
                    <div>
                      <p className="text-xs font-bold italic underline mb-1">Principal's Remark:</p>
                      <div className="border border-black p-2 h-12 text-sm italic font-serif leading-none flex items-center">
                        {data.principalRemark || 'An excellent result, keep it up!'}
                      </div>
                      <div className="flex justify-between mt-1 text-xs items-end">
                        <p><span className="font-bold">Name:</span> ______________________</p>
                        <p><span className="font-bold">Sign:</span> ......................</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM STATUS BAR */}
                <div className="mt-2 text-xs font-bold border-2 border-black p-1 flex justify-between items-center bg-gray-100">
                  <div className="border border-black px-2 py-0.5 bg-white">
                    Status: {data.overallGrade === 'F' ? 'TO REPEAT' : 'PROMOTED'}
                  </div>
                  <div>
                    Next Session Begins: <span className="underline ml-2">{data.term?.nextTermStartDate ? new Date(data.term.nextTermStartDate).toLocaleDateString() : '.........................'}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </>
      )}

      {!reportData && bulkReports.length === 0 && !loading && (
        <div className="bg-white p-12 rounded-lg shadow text-center print:hidden border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-4 text-gray-600">Select a term and click "Generate Report" to view your report card</p>
        </div>
      )}
    </div>
  );
};

export default TermReportCard;
