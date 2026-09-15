import React, { useState, useEffect, useRef } from 'react';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useAuth } from '../../context/AuthContext';

const QuickSelectMenu = ({ options, onSelect, placeholder = "Quick Select", buttonBg = "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200/60" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs border ${buttonBg}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
        <span className="truncate max-w-[160px] sm:max-w-none">{placeholder}</span>
        <svg className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-gray-100 z-[250] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3 bg-gray-50/90 border-b border-gray-100 flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Select Pre-written Template ({options.length})</span>
            <span className="text-[10px] text-gray-400 font-medium italic">Scroll to view all</span>
          </div>
          <div className="max-h-64 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {options.map((option, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50/80 hover:text-emerald-950 transition-colors border border-transparent hover:border-emerald-200/50 text-xs font-medium text-gray-700 leading-relaxed flex items-start gap-2.5 group"
              >
                <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-[10px] shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  {idx + 1}
                </span>
                <span className="flex-1">{option}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MyClass = () => {
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { settings: schoolSettings } = useSchoolSettings();
  const { user } = useAuth();

  // Exam officer class toggle state
  const isExamOfficer = user?.role === 'examination_officer';
  const unassignedClasses = user?.unassignedClasses || [];
  const [selectedClassId, setSelectedClassId] = useState(null);

  // Grading State
  const [gradingStudent, setGradingStudent] = useState(null);
  const [remarks, setRemarks] = useState({ formMasterRemark: '', principalRemark: '' });
  const [developmentPlan, setDevelopmentPlan] = useState({
    teacherComment: '',
    literacyComment: '',
    numeracyComment: '',
    atSchoolNextStep: '',
    atHomeNextStep: '',
    headTeacherComment: ''
  });
  const [manualAttendance, setManualAttendance] = useState({
    enabled: false,
    presentDays: '',
    absentDays: '',
    totalDays: ''
  });
  const [psychomotorRatings, setPsychomotorRatings] = useState([]);
  const [domains, setDomains] = useState([]);
  const [earlyYearsDomains, setEarlyYearsDomains] = useState([]);
  const [activeLayoutMode, setActiveLayoutMode] = useState('auto'); // 'auto', 'early_years', 'standard'
  const [currentTerm, setCurrentTerm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publication, setPublication] = useState({ isPublished: false, isProgressivePublished: false });
  const [reportPreview, setReportPreview] = useState(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const predefinedRemarks = [
    "An excellent result, keep up the good work.",
    "A very good performance, keep it up.",
    "A good result. You can do better.",
    "Fair performance. Room for more improvement.",
    "Weak performance. Needs more focus on core subjects.",
    "Satisfactory result. Consolidate your effort.",
    "Poor performance. You need to be more serious with your studies.",
    "Has shown remarkable improvement this term. Well done!",
    "Distinguished academic performance. Keep shining!",
    "Active participant in class activities. Good progress made."
  ];

  const earlyYearsPredefinedComments = {
    teacherOverall: [
      "An outstanding term! Shows exceptional curiosity, enthusiasm, and consistent engagement across all learning activities.",
      "Has made steady and pleasing progress this term. Settling in well and showing growing independence.",
      "Demonstrates fantastic social skills, creative expression, and active participation in daily classroom routines.",
      "A cheerful and confident learner who demonstrates great leadership and positive collaboration with peers.",
      "Participates enthusiastically in group activities and is developing strong active listening skills.",
      "Shows good effort and curiosity. Continues to build confidence during structured and independent play.",
      "Making steady growth but requires occasional encouragement to focus and complete tasks independently.",
      "Shows potential but needs consistent support with classroom routines and sharing with peers.",
      "Gradually adjusting to class activities; further encouragement will boost confidence and focus."
    ],
    literacy: [
      "Demonstrates excellent phonics awareness, accurately recognizes letter sounds, and reads simple sight words confidently.",
      "Has a rich vocabulary, expresses ideas clearly in full sentences, and enjoys storytelling and book reading.",
      "Recognizes most uppercase and lowercase letters and is learning to blend basic letter sounds together.",
      "Enjoys listening to stories, follows story plots well, and is developing confidence in verbal expression.",
      "Working on identifying basic letter sounds and building vocabulary through daily rhyming and picture books.",
      "Encouraged to practise letter tracing, pencil grip, and expressing thoughts in complete sentences."
    ],
    numeracy: [
      "Confidently counts beyond 20, recognizes numerals, and understands basic shapes, patterns, and quantities.",
      "Demonstrates strong problem-solving skills in sorting objects, counting games, and spatial awareness.",
      "Counts objects accurately up to 10 and is making steady progress in identifying basic numbers and shapes.",
      "Participates actively in counting songs and hands-on math activities with manipulative objects.",
      "Developing number recognition from 1 to 5 and learning to match quantities with numerals.",
      "Needs continued hands-on practice with counting games, shape matching, and number formation."
    ],
    atSchoolNextStep: [
      "Provide guided phonics and blending exercises during literacy centers.",
      "Engage in small-group hands-on counting games and shape sorting activities.",
      "Encourage active participation in show-and-tell to build public speaking and vocabulary.",
      "Support pencil grip control, fine motor activities (playdough, scissors), and letter tracing.",
      "Reinforce sharing, turn-taking, and cooperative play during outdoor and free play sessions.",
      "Offer extra encouragement to follow multi-step instructions and maintain task focus."
    ],
    atHomeNextStep: [
      "Read storybooks together daily and discuss pictures, characters, and story endings.",
      "Practise counting everyday objects at home (cutlery, toys, steps) and identifying number symbols.",
      "Engage in rhyming games, letter sound hunts, and singing phonics songs together.",
      "Promote fine motor skills through drawing, coloring, buttoning clothes, and playdough.",
      "Encourage independent self-care routines (packing bag, tidying toys, washing hands).",
      "Discuss daily events to build conversational skills and expand expressive vocabulary."
    ],
    headTeacher: [
      "An excellent report reflecting great dedication and growth. Keep up the wonderful work!",
      "Very commendable performance and character development. Keep striving for excellence.",
      "A solid term's work. Continued effort and practice will yield even higher achievements.",
      "Fair progress shown this term. With consistent practice at home and school, further growth will follow.",
      "Promising development. We look forward to seeing continued improvement next term."
    ]
  };

  useEffect(() => {
    fetchMyClass();
    fetchDomains();
    fetchEarlyYearsDomains();
    fetchCurrentTerm();
  }, [selectedClassId]);

  useEffect(() => {
    if (classData?.id && currentTerm?.id) {
      fetchPublicationStatus(currentTerm.id);
    }
  }, [classData?.id, currentTerm?.id]);

  const fetchDomains = async () => {
    try {
      const res = await api.get('/api/report-extras/domains');
      if (res.ok) {
        const data = await res.json();
        setDomains(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error("Failed to fetch domains", e); }
  };

  const fetchEarlyYearsDomains = async () => {
    try {
      const res = await api.get('/api/early-years/domains');
      if (res.ok) {
        const data = await res.json();
        setEarlyYearsDomains(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error("Failed to fetch early years domains", e); }
  };

  const getSkillRating = (skill) => {
    const rating = psychomotorRatings.find(r => r.skillId === skill.id || r.name === skill.name);
    if (!rating) return 'A';
    if (typeof rating.score === 'string') return rating.score.toUpperCase();
    if (rating.score >= 5) return 'A';
    if (rating.score === 4) return 'P';
    if (rating.score === 3 || rating.score === 2) return 'W';
    if (rating.score <= 1) return 'NA';
    return 'A';
  };

  const handleSkillRate = (skill, code) => {
    setPsychomotorRatings(prev => {
      const existingIndex = prev.findIndex(r => r.skillId === skill.id || r.name === skill.name);
      const item = { skillId: skill.id, name: skill.name, score: code };
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = item;
        return updated;
      }
      return [...prev, item];
    });
  };

  const setAllEarlyYearsSkills = (code) => {
    const allSkillsRatings = [];
    earlyYearsDomains.forEach(domain => {
      (domain.skills || []).forEach(skill => {
        allSkillsRatings.push({ skillId: skill.id, name: skill.name, score: code });
      });
    });
    setPsychomotorRatings(allSkillsRatings);
  };

  const fetchCurrentTerm = async () => {
    try {
      const res = await api.get('/api/terms/current');
      if (res.ok) {
        const term = await res.json();
        setCurrentTerm(term);
        fetchPublicationStatus(term.id);
      }
    } catch (e) { console.error("Failed to fetch current term", e); }
  };

  const fetchPublicationStatus = async (termId) => {
    if (!classData?.id || !termId) return;
    try {
      const res = await api.get(`/api/classes/${classData.id}/publication-status?termId=${termId}`);
      if (res.ok) {
        setPublication(await res.json());
      }
    } catch (e) { console.error("Failed to fetch publication status", e); }
  };

  const [modalTab, setModalTab] = useState('assessment'); // 'assessment' or 'preview'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openGradingModal = async (student) => {
    if (!currentTerm) {
      alert("No current term found. Please contact admin.");
      return;
    }
    setModalTab('assessment');
    setGradingStudent(student);
    setLoading(true);
    setFetchingPreview(true);
    setReportPreview(null);
    setRemarks({ formMasterRemark: '', principalRemark: '' });
    setPsychomotorRatings([]);
    setManualAttendance({ enabled: false, presentDays: '', absentDays: '', totalDays: '' });

    try {
      // Parallel fetch for speed
      const [extrasRes, reportRes] = await Promise.all([
        api.get(`/api/report-extras/${student.id}/${currentTerm.id}`),
        api.get(`/api/reports/term/${student.id}/${currentTerm.id}`)
      ]);

      if (extrasRes.ok) {
        const data = await extrasRes.json();
        setRemarks({
          formMasterRemark: data.formMasterRemark || '',
          principalRemark: data.principalRemark || ''
        });
        setPsychomotorRatings(Array.isArray(data.psychomotorRatings) ? data.psychomotorRatings : []);
        if (data.attendanceOverride) {
          setManualAttendance({
            enabled: data.attendanceOverride.enabled ?? true,
            presentDays: data.attendanceOverride.presentDays ?? '',
            absentDays: data.attendanceOverride.absentDays ?? '',
            totalDays: data.attendanceOverride.totalDays ?? ''
          });
        }
        if (data.developmentPlan) {
          setDevelopmentPlan({
            teacherComment: data.developmentPlan.teacherComment || data.formMasterRemark || '',
            literacyComment: data.developmentPlan.literacyComment || '',
            numeracyComment: data.developmentPlan.numeracyComment || '',
            atSchoolNextStep: data.developmentPlan.atSchoolNextStep || '',
            atHomeNextStep: data.developmentPlan.atHomeNextStep || '',
            headTeacherComment: data.developmentPlan.headTeacherComment || data.principalRemark || ''
          });
        } else {
          setDevelopmentPlan({
            teacherComment: data.formMasterRemark || '',
            literacyComment: '',
            numeracyComment: '',
            atSchoolNextStep: '',
            atHomeNextStep: '',
            headTeacherComment: data.principalRemark || ''
          });
        }
      }

      if (reportRes.ok) {
        setReportPreview(await reportRes.json());
      }
    } catch (e) {
      console.error("Error fetching report details", e);
    } finally {
      setLoading(false);
      setFetchingPreview(false);
    }
  };

  const saveGrading = async () => {
    if (!gradingStudent || !currentTerm) return;
    setSaving(true);
    try {
      const payload = {
        studentId: gradingStudent.id,
        termId: currentTerm.id,
        classId: classData.id,
        formMasterRemark: developmentPlan.teacherComment || remarks.formMasterRemark,
        principalRemark: developmentPlan.headTeacherComment || remarks.principalRemark,
        psychomotorRatings,
        developmentPlan,
        attendanceOverride: manualAttendance.enabled ? manualAttendance : null
      };

      const res = await api.post('/api/report-extras/save', payload);
      if (res.ok) {
        alert("Saved successfully!");
        setGradingStudent(null);
      } else {
        alert("Failed to save.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving.");
    } finally {
      setSaving(false);
    }
  };

  const generateAIRemark = async () => {
    if (!gradingStudent || !currentTerm) return;
    setGeneratingAI(true);
    try {
      const res = await api.post(`/api/reports/generate-remark/${gradingStudent.id}/${currentTerm.id}`);
      if (res.ok) {
        const { remark } = await res.json();
        setRemarks(prev => ({ ...prev, formMasterRemark: remark }));
      } else {
        const error = await res.json();
        alert(error.error || "Failed to generate AI remark.");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating AI remark.");
    } finally {
      setGeneratingAI(false);
    }
  };

  const fetchMyClass = async () => {
    try {
      const classIdParam = isExamOfficer && selectedClassId ? `?classId=${selectedClassId}` : '';
      const response = await api.get(`/api/classes/my-class${classIdParam}`);

      if (response.status === 404) {
        const data = await response.json();
        const debugInfo = data.debug ? ` (UID: ${data.debug.userId}, SID: ${data.debug.schoolId}, Classes: ${data.debug.classCount})` : '';
        setError('You are not currently assigned as a Form Master for any class.' + debugInfo);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch class data');
      }

      const data = await response.json();
      
      // Sort students alphabetically
      if (data.students && Array.isArray(data.students)) {
        data.students.sort((a, b) => {
          const nameA = `${a.user?.firstName || ''} ${a.user?.lastName || ''} ${a.name || ''} ${a.middleName || ''}`.trim().toLowerCase() || 'zzzz';
          const nameB = `${b.user?.firstName || ''} ${b.user?.lastName || ''} ${b.name || ''} ${b.middleName || ''}`.trim().toLowerCase() || 'zzzz';
          return nameA.localeCompare(nameB);
        });
      }
      
      setClassData(data);
    } catch (err) {
      console.error('Error fetching my class:', err);
      setError('Failed to load class information.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && error.includes('not currently assigned')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-center space-y-6">
        <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center text-primary">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-2xl font-black text-gray-900">No Class Assigned</h2>
          <p className="text-gray-600 font-medium">
            You are currently not assigned as a <strong>Form Master</strong> for any class.
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
            <p className="font-bold mb-1">How to proceed:</p>
            <ul className="text-left list-disc list-inside space-y-1">
              <li>Contact the Principal or Admin to assign you a class</li>
              <li>Once assigned, you can manage students, results, and remarks here</li>
              <li>You can still use Result Entry for your specific subjects</li>
            </ul>
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="px-8 py-3 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-all active:scale-95"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border-l-4 border-rose-400 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 text-rose-400">
            <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-rose-700 font-bold">{error}</p>
        </div>
      </div>
    );
  }

  const activeStudents = classData?.students?.filter(s => s.user?.isActive !== false) || [];

  const isEarlyYearsClass = Boolean(
    classData?.reportLayout === 'early_years' ||
    reportPreview?.reportSettings?.reportLayout === 'early_years' ||
    schoolSettings?.reportLayout === 'early_years' ||
    (classData?.name && /early|nursery|kg|kindergarten|reception|playgroup|toddler|creche|pre-k|ركن|الركن|روضة|الروضة|تمهيدي|حضانة/i.test(classData.name)) ||
    (reportPreview?.student?.class && /early|nursery|kg|kindergarten|reception|playgroup|toddler|creche|pre-k|ركن|الركن|روضة|الروضة|تمهيدي|حضانة/i.test(reportPreview.student.class))
  );

  const isEarlyYearsMode = activeLayoutMode === 'early_years' 
    ? true 
    : (activeLayoutMode === 'standard' ? false : isEarlyYearsClass);

  const renderRatingTicks = (score) => {
    const rounded = Math.round(score);
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(val => (
          <div key={val} className={`w-4 h-4 rounded-sm border flex items-center justify-center text-[10px] ${rounded === val ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-300'}`}>
            {rounded === val ? '✔' : val}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Exam Officer Class Toggle */}
      {isExamOfficer && unassignedClasses.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-indigo-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="text-sm font-bold">Switch Class</span>
            </div>
            <select
              value={selectedClassId || classData?.id || ''}
              onChange={(e) => {
                const newId = parseInt(e.target.value);
                setSelectedClassId(newId);
                setLoading(true);
                setError(null);
              }}
              className="flex-1 sm:flex-none sm:min-w-[250px] px-4 py-2.5 bg-white border-2 border-indigo-300 rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all cursor-pointer"
            >
              {unassignedClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}{cls.arm ? ` ${cls.arm}` : ''}
                </option>
              ))}
            </select>
            <span className="text-xs text-indigo-500 font-medium">
              {unassignedClasses.length} class{unassignedClasses.length !== 1 ? 'es' : ''} without Form Master
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          {schoolSettings?.logoUrl && (
            <img src={schoolSettings.logoUrl} alt="Logo" className="h-12 w-12 object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">Class Management</h1>
            <p className="text-sm text-gray-600">
              {isExamOfficer ? 'Managing' : 'Form Master'}:{' '}
              <span className="font-bold text-primary">{classData.name} {classData.arm}</span>
              {isExamOfficer && (
                <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">Exam Officer</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button
            onClick={async () => {
              if (!confirm(`Are you sure you want to ${publication.isProgressivePublished ? 'unpublish' : 'publish'} PROGRESSIVE results for this class?`)) return;
              try {
                const response = await api.put(`/api/classes/${classData.id}/publish-results`, {
                  isProgressivePublished: !publication.isProgressivePublished,
                  termId: currentTerm.id
                });
                if (response.ok) {
                  alert(`Progressive results ${!publication.isProgressivePublished ? 'published' : 'unpublished'} successfully!`);
                  fetchPublicationStatus(currentTerm.id);
                } else {
                  const errorData = await response.json();
                  alert(`Failed to update status: ${errorData.error || 'Unknown error'}`);
                }
              } catch (e) {
                console.error(e);
                alert(`Error: ${e.message}`);
              }
            }}
            className={`px-4 py-2 rounded-md font-medium text-white transition-colors ${publication.isProgressivePublished
              ? 'bg-orange-600 hover:bg-orange-700'
              : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {publication.isProgressivePublished ? 'Unpublish Progressive' : 'Publish Progressive'}
          </button>
          <button
            onClick={async () => {
              if (!confirm(`Are you sure you want to ${publication.isPublished ? 'unpublish' : 'publish'} FINAL results for this class?`)) return;
              try {
                const response = await api.put(`/api/classes/${classData.id}/publish-results`, {
                  isPublished: !publication.isPublished,
                  termId: currentTerm.id
                });
                if (response.ok) {
                  alert(`Final results ${!publication.isPublished ? 'published' : 'unpublished'} successfully!`);
                  fetchPublicationStatus(currentTerm.id);
                } else {
                  const errorData = await response.json();
                  alert(`Failed to update status: ${errorData.error || 'Unknown error'}`);
                }
              } catch (e) {
                console.error(e);
                alert(`Error: ${e.message}`);
              }
            }}
            className={`px-4 py-2 rounded-md font-medium text-white transition-colors ${publication.isPublished
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
              }`}
          >
            {publication.isPublished ? 'Unpublish Final' : 'Publish Final'}
          </button>
        </div>
      </div>

      {/* Compact Info Bar */}
      <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-y-4 gap-x-2 sm:gap-6">
        <div className="flex items-center gap-3 min-w-[120px]">
          <div className="p-2 bg-green-50 rounded-lg">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-none mb-1">Active</p>
            <p className="text-lg font-black text-gray-900 leading-none">{activeStudents.length}</p>
          </div>
        </div>
        <div className="hidden lg:block w-px h-8 bg-gray-100"></div>
        <div className="flex items-center gap-3 min-w-[120px]">
          <div className="p-2 bg-primary/10 rounded-lg">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-none mb-1">Registered</p>
            <p className="text-lg font-black text-gray-900 leading-none">{classData.students.length}</p>
          </div>
        </div>
        <div className="hidden lg:block w-px h-8 bg-gray-100"></div>
        <div className="flex items-center gap-3 min-w-[140px]">
          <div className="p-2 bg-blue-50 rounded-lg">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-none mb-1">Session</p>
            <p className="text-sm font-black text-gray-900 leading-none">{currentTerm?.academicSession?.name || '...'}</p>
          </div>
        </div>
        <div className="hidden lg:block w-px h-8 bg-gray-100"></div>
        <div className="flex items-center gap-3 min-w-[140px]">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-none mb-1">Term</p>
            <p className="text-sm font-black text-gray-900 leading-none uppercase">{currentTerm?.name || '...'}</p>
          </div>
        </div>
      </div>

      {/* Grading Modal */}
      {gradingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl h-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                 <div>
                    <h3 className="text-xl font-black text-gray-900 leading-none mb-1">Continuous Assessment & Remark</h3>
                    <p className="text-sm font-medium text-gray-500">Student: <span className="text-primary font-bold">
                      {gradingStudent.user 
                        ? `${gradingStudent.user.firstName} ${gradingStudent.user.lastName} ${gradingStudent.middleName || ''}` 
                        : (gradingStudent.name || gradingStudent.middleName || `Unknown Student (${gradingStudent.admissionNumber})`)
                      }
                    </span></p>
                 </div>
              </div>
              <button onClick={() => setGradingStudent(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Mobile Tabs */}
              <div className="lg:hidden flex border-b border-gray-100 bg-gray-50/50 shrink-0">
                <button
                  onClick={() => setModalTab('assessment')}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'assessment' ? 'text-primary bg-white border-b-2 border-primary' : 'text-gray-400'}`}
                >
                  Assessment Form
                </button>
                <button
                  onClick={() => setModalTab('preview')}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'preview' ? 'text-primary bg-white border-b-2 border-primary' : 'text-gray-400'}`}
                >
                  Report Preview
                </button>
              </div>

              <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr,380px] divide-x divide-gray-100">
                {/* LEFT: Assessment Form */}
                <div className={`${isMobile && modalTab !== 'assessment' ? 'hidden' : 'block'} overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 sm:space-y-10 custom-scrollbar`}>
                  {/* Template Layout Switcher Bar */}
                  <div className="flex flex-wrap items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200 gap-2 mb-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                      </svg>
                      <span>Grading Layout:</span>
                      <span className="font-black text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded">
                        {isEarlyYearsMode ? 'Early Years Progress Template' : 'Standard Psychomotor Template'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-xs border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setActiveLayoutMode('early_years')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${isEarlyYearsMode ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Early Years Mode
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLayoutMode('standard')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${!isEarlyYearsMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Standard Mode
                      </button>
                    </div>
                  </div>

                  {/* SECTION 01: SKILL RATINGS (EARLY YEARS) OR ACADEMIC REMARKS (STANDARD) */}
                  {isEarlyYearsMode ? (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">01</span>
                          <h4 className="font-black text-gray-900 uppercase tracking-tighter text-lg">
                            Early Years Developmental Domains & Skills
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAllEarlyYearsSkills('A')}
                            className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg hover:bg-emerald-200 transition-colors"
                          >
                            Mark All Achieved (A)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPsychomotorRatings([])}
                            className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {/* Rating Legend Key */}
                      <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-xl text-xs font-bold text-gray-700 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-gray-500 uppercase tracking-wider text-[10px] font-black">Rating Scale:</span>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-600 text-white rounded font-bold"><span className="font-black">A</span> Achieved</span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-600 text-white rounded font-bold"><span className="font-black">P</span> Progressing</span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500 text-white rounded font-bold"><span className="font-black">W</span> Working on It</span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-400 text-white rounded font-bold"><span className="font-black">NA</span> Not Assessed</span>
                        </div>
                      </div>

                      {/* Domains & Sub-Skills */}
                      {earlyYearsDomains.length === 0 ? (
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-sm font-medium">
                          Early Years domains loading or not configured.
                        </div>
                      ) : (
                        earlyYearsDomains.map((domain, dIdx) => {
                          const domainGradients = [
                            'from-emerald-600 to-teal-700',
                            'from-indigo-600 to-blue-700',
                            'from-purple-600 to-pink-700',
                            'from-amber-500 to-orange-600',
                            'from-teal-600 to-cyan-700',
                            'from-rose-600 to-red-700'
                          ];
                          const headerGradient = domainGradients[dIdx % domainGradients.length];
                          return (
                            <div key={domain.id} className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                              <div className={`bg-gradient-to-r ${headerGradient} px-4 py-2.5 text-white font-black text-xs uppercase tracking-wider flex justify-between items-center shadow-xs`}>
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">{dIdx + 1}</span>
                                  <span>{domain.name}</span>
                                </div>
                                <span className="text-[10px] font-bold bg-black/20 px-2 py-0.5 rounded-full">{(domain.skills || []).length} Skills</span>
                              </div>
                              <div className="divide-y divide-gray-100">
                                {(domain.skills || []).map((skill) => {
                                  const currentRating = getSkillRating(skill);
                                  return (
                                    <div key={skill.id} className="p-3 hover:bg-gray-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors">
                                      <span className="text-xs font-semibold text-gray-800 flex-1">{skill.name}</span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {[
                                          { code: 'A', label: 'A', title: 'A - Achieved Target', bgSelected: 'bg-emerald-500 text-white border-emerald-500 ring-2 ring-emerald-300' },
                                          { code: 'P', label: 'P', title: 'P - Progressing Well', bgSelected: 'bg-sky-500 text-white border-sky-500 ring-2 ring-sky-300' },
                                          { code: 'W', label: 'W', title: 'W - Working Towards', bgSelected: 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-300' },
                                          { code: 'NA', label: 'NA', title: 'NA - Not Assessed', bgSelected: 'bg-slate-500 text-white border-slate-500 ring-2 ring-slate-300' }
                                        ].map((opt) => (
                                          <button
                                            key={opt.code}
                                            type="button"
                                            title={opt.title}
                                            onClick={() => handleSkillRate(skill, opt.code)}
                                            className={`w-8 h-8 rounded-lg text-xs font-black border transition-all ${
                                              currentRating === opt.code
                                                ? `${opt.bgSelected} shadow-sm scale-110`
                                                : 'border-gray-200 text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-900'
                                            }`}
                                          >
                                            {opt.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                         <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">01</span>
                         <h4 className="font-black text-gray-900 uppercase tracking-tighter">Academic Remarks</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Form Master's Remark</label>
                              <button 
                                onClick={generateAIRemark}
                                disabled={generatingAI}
                                title="Generate AI Remark"
                                className={`p-1.5 rounded-lg transition-all ${generatingAI ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-110 active:scale-95'}`}
                              >
                                {generatingAI ? (
                                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            <QuickSelectMenu
                              options={predefinedRemarks}
                              onSelect={(val) => setRemarks(prev => ({ ...prev, formMasterRemark: val }))}
                              placeholder="Quick Select Remark"
                              buttonBg="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200/60"
                            />
                          </div>
                          <textarea
                            placeholder="Provide a detailed assessment of the student's behavior and academic attitude..."
                            className="w-full border-2 border-gray-100 rounded-2xl p-4 h-32 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none font-medium text-gray-700 bg-gray-50/30 resize-none"
                            value={remarks.formMasterRemark}
                            onChange={(e) => setRemarks({ ...remarks, formMasterRemark: e.target.value })}
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Principal's Remark</label>
                            <QuickSelectMenu
                              options={predefinedRemarks}
                              onSelect={(val) => setRemarks(prev => ({ ...prev, principalRemark: val }))}
                              placeholder="Quick Select Remark"
                              buttonBg="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200/60"
                            />
                          </div>
                          <textarea
                            placeholder="Official headteacher's comment based on term performance..."
                            className="w-full border-2 border-gray-100 rounded-2xl p-4 h-28 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none font-medium text-gray-700 bg-gray-50/30 resize-none"
                            value={remarks.principalRemark}
                            onChange={(e) => setRemarks({ ...remarks, principalRemark: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION 02: COMMENTS & DEVELOPMENT PLAN (EARLY YEARS) OR PSYCHOMOTOR (STANDARD) */}
                  {isEarlyYearsMode ? (
                    <div className="space-y-6 pt-6 border-t border-gray-100">
                      <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                        <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">02</span>
                        <h4 className="font-black text-gray-900 uppercase tracking-tighter text-lg">Early Years Comments & Development Plan</h4>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Teacher's Overall Comment</label>
                            <QuickSelectMenu
                              options={earlyYearsPredefinedComments.teacherOverall}
                              onSelect={(val) => setDevelopmentPlan(prev => ({ ...prev, teacherComment: val }))}
                              placeholder="Quick Select Comment"
                              buttonBg="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200/60"
                            />
                          </div>
                          <textarea
                            placeholder="Overall assessment of energy, engagement, and term progress..."
                            className="w-full border-2 border-gray-100 rounded-xl p-3 h-24 focus:border-primary transition-all outline-none font-medium text-xs text-gray-700 bg-gray-50/30 resize-none"
                            value={developmentPlan.teacherComment}
                            onChange={(e) => setDevelopmentPlan({ ...developmentPlan, teacherComment: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Literacy Development Comment</label>
                            <QuickSelectMenu
                              options={earlyYearsPredefinedComments.literacy}
                              onSelect={(val) => setDevelopmentPlan(prev => ({ ...prev, literacyComment: val }))}
                              placeholder="Quick Select Comment"
                              buttonBg="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200/60"
                            />
                          </div>
                          <textarea
                            placeholder="Letter sound recognition, vocabulary, complete sentence development..."
                            className="w-full border-2 border-gray-100 rounded-xl p-3 h-20 focus:border-primary transition-all outline-none font-medium text-xs text-gray-700 bg-gray-50/30 resize-none"
                            value={developmentPlan.literacyComment}
                            onChange={(e) => setDevelopmentPlan({ ...developmentPlan, literacyComment: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Numeracy Development Comment</label>
                            <QuickSelectMenu
                              options={earlyYearsPredefinedComments.numeracy}
                              onSelect={(val) => setDevelopmentPlan(prev => ({ ...prev, numeracyComment: val }))}
                              placeholder="Quick Select Comment"
                              buttonBg="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200/60"
                            />
                          </div>
                          <textarea
                            placeholder="Counting, number recognition, basic concepts..."
                            className="w-full border-2 border-gray-100 rounded-xl p-3 h-20 focus:border-primary transition-all outline-none font-medium text-xs text-gray-700 bg-gray-50/30 resize-none"
                            value={developmentPlan.numeracyComment}
                            onChange={(e) => setDevelopmentPlan({ ...developmentPlan, numeracyComment: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Recommended Next Step (At School)</label>
                              <QuickSelectMenu
                                options={earlyYearsPredefinedComments.atSchoolNextStep}
                                onSelect={(val) => setDevelopmentPlan(prev => ({ ...prev, atSchoolNextStep: val }))}
                                placeholder="Quick Select"
                                buttonBg="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200/60"
                              />
                            </div>
                            <textarea
                              placeholder="Guided literacy and numeracy practice, classroom routines..."
                              className="w-full border-2 border-gray-100 rounded-xl p-3 h-20 focus:border-primary transition-all outline-none font-medium text-xs text-gray-700 bg-gray-50/30 resize-none"
                              value={developmentPlan.atSchoolNextStep}
                              onChange={(e) => setDevelopmentPlan({ ...developmentPlan, atSchoolNextStep: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Recommended Next Step (At Home)</label>
                              <QuickSelectMenu
                                options={earlyYearsPredefinedComments.atHomeNextStep}
                                onSelect={(val) => setDevelopmentPlan(prev => ({ ...prev, atHomeNextStep: val }))}
                                placeholder="Quick Select"
                                buttonBg="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200/60"
                              />
                            </div>
                            <textarea
                              placeholder="Read together, practise sounds and counting, sorting games..."
                              className="w-full border-2 border-gray-100 rounded-xl p-3 h-20 focus:border-primary transition-all outline-none font-medium text-xs text-gray-700 bg-gray-50/30 resize-none"
                              value={developmentPlan.atHomeNextStep}
                              onChange={(e) => setDevelopmentPlan({ ...developmentPlan, atHomeNextStep: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Head Teacher's Comment</label>
                            <QuickSelectMenu
                              options={earlyYearsPredefinedComments.headTeacher}
                              onSelect={(val) => setDevelopmentPlan(prev => ({ ...prev, headTeacherComment: val }))}
                              placeholder="Quick Select Comment"
                              buttonBg="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200/60"
                            />
                          </div>
                          <textarea
                            placeholder="Official headteacher's comment..."
                            className="w-full border-2 border-gray-100 rounded-xl p-3 h-20 focus:border-primary transition-all outline-none font-medium text-xs text-gray-700 bg-gray-50/30 resize-none"
                            value={developmentPlan.headTeacherComment}
                            onChange={(e) => setDevelopmentPlan({ ...developmentPlan, headTeacherComment: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 pt-6 border-t border-gray-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">02</span>
                          <h4 className="font-black text-gray-900 uppercase tracking-tighter text-lg">Affective & Psychomotor Assessment</h4>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {domains.length === 0 ? (
                          <div className="col-span-full p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-sm font-medium">
                             Assessment categories are not yet configured. Please contact the administrator.
                          </div>
                        ) : (
                          domains.map((domain) => {
                            const rating = psychomotorRatings.find(r => r.domainId === domain.id) || { score: 1 };
                            return (
                              <div key={domain.id} className="group p-4 rounded-2xl border-2 border-gray-50 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all">
                                <div className="flex justify-between items-center mb-4">
                                  <span className="text-sm font-black text-gray-700 uppercase tracking-tight">{domain.name}</span>
                                  <span className="px-2 py-1 bg-white rounded-lg text-xs font-black text-emerald-600 shadow-sm border border-emerald-100">{rating.score} / {domain.maxScore}</span>
                                </div>
                                <input
                                  type="range"
                                  min="1"
                                  max={domain.maxScore}
                                  step="1"
                                  value={rating.score}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setPsychomotorRatings(prev => {
                                      const existing = prev.find(p => p.domainId === domain.id);
                                      if (existing) {
                                        return prev.map(p => p.domainId === domain.id ? { ...p, score: val } : p);
                                      }
                                      return [...prev, { domainId: domain.id, name: domain.name, score: val }];
                                    });
                                  }}
                                  className="w-full accent-emerald-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between mt-2 px-1">
                                  <span className="text-[10px] font-black text-gray-300">WEAK</span>
                                  <span className="text-[10px] font-black text-gray-300">EXCELLENT</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* SECTION 03: PHYSICAL REGISTER ATTENDANCE OVERRIDE */}
                  <div className="space-y-4 pt-6 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">03</span>
                        <div>
                          <h4 className="font-black text-gray-900 uppercase tracking-tighter text-sm">Physical Register Attendance</h4>
                          <p className="text-[11px] text-gray-500 font-medium">Override auto-calculated attendance for schools using physical registers.</p>
                        </div>
                      </div>
                      {reportPreview?.attendance && (
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded self-start sm:self-center">
                          System Auto-Count: {reportPreview.attendance.present || 0} / {reportPreview.attendance.total || 0} Days ({reportPreview.attendance.percentage || 0}%)
                        </span>
                      )}
                    </div>

                    <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-gray-800 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={manualAttendance.enabled}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setManualAttendance(prev => ({
                                ...prev,
                                enabled: isChecked,
                                presentDays: isChecked ? (prev.presentDays !== '' ? prev.presentDays : (reportPreview?.attendance?.present ?? '')) : prev.presentDays,
                                absentDays: isChecked ? (prev.absentDays !== '' ? prev.absentDays : (reportPreview?.attendance?.absent ?? '')) : prev.absentDays,
                                totalDays: isChecked ? (prev.totalDays !== '' ? prev.totalDays : (reportPreview?.attendance?.total ?? '')) : prev.totalDays
                              }));
                            }}
                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                          />
                          <span>Override Attendance with Physical Register Record</span>
                        </label>
                        {manualAttendance.enabled && (
                          <button
                            type="button"
                            onClick={() => setManualAttendance({ enabled: false, presentDays: '', absentDays: '', totalDays: '' })}
                            className="text-[10px] font-bold text-gray-500 hover:text-red-600 underline"
                          >
                            Reset to Auto-Count
                          </button>
                        )}
                      </div>

                      {manualAttendance.enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          <div>
                            <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">Days Present</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="e.g. 58"
                              value={manualAttendance.presentDays}
                              onChange={(e) => setManualAttendance({ ...manualAttendance, presentDays: e.target.value })}
                              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:border-primary outline-none bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">Days Absent</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="e.g. 2"
                              value={manualAttendance.absentDays}
                              onChange={(e) => setManualAttendance({ ...manualAttendance, absentDays: e.target.value })}
                              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:border-primary outline-none bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">Total Term Days</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="e.g. 60"
                              value={manualAttendance.totalDays}
                              onChange={(e) => setManualAttendance({ ...manualAttendance, totalDays: e.target.value })}
                              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:border-primary outline-none bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT: LIVE REPORT PREVIEW */}
                <div className={`${isMobile && modalTab !== 'preview' ? 'hidden' : 'flex'} bg-gray-50/50 flex flex-col overflow-hidden`}>
                  <div className="p-4 bg-white border-b border-gray-100 shrink-0">
                    <h4 className="font-black text-gray-900 text-xs uppercase tracking-widest flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                       Live Report Preview
                    </h4>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {fetchingPreview ? (
                       <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-sm font-bold text-gray-500">Retrieving academic record...</p>
                       </div>
                    ) : reportPreview ? (
                      isEarlyYearsMode ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                          {/* Early Years Header Banner */}
                          <div className="p-5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-[10px] font-black opacity-80 uppercase tracking-widest mb-1">Evaluation Mode</p>
                                <p className="text-xl font-black">Early Years Progress</p>
                              </div>
                              <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-[10px] font-black uppercase tracking-wider text-emerald-100">
                                No Subject Marks
                              </span>
                            </div>
                            <p className="text-xs text-emerald-100/90 font-medium">
                              Assessment is based on developmental domain skill ratings and teacher qualitative feedback.
                            </p>
                          </div>

                          {/* Attendance Summary */}
                          {reportPreview.attendance && (
                            <div className="p-4 bg-emerald-50/50 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Attendance Summary</p>
                                <p className="text-xs font-bold text-gray-700">
                                  {reportPreview.attendance.presentDays ?? 0} / {reportPreview.attendance.totalDays ?? 0} Days Present
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-black text-emerald-600">
                                  {reportPreview.attendance.totalDays ? Math.round(((reportPreview.attendance.presentDays || 0) / reportPreview.attendance.totalDays) * 100) : 0}%
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Live Skill Mastery Breakdown */}
                          <div className="p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Skill Mastery Summary</p>
                              <span className="text-[10px] font-bold text-gray-400">{psychomotorRatings.length} Skills Rated</span>
                            </div>

                            {(() => {
                              const counts = { A: 0, P: 0, W: 0, NA: 0 };
                              psychomotorRatings.forEach(r => {
                                let code = 'A';
                                if (typeof r.score === 'string') {
                                  code = r.score.toUpperCase();
                                } else {
                                  if (r.score >= 5) code = 'A';
                                  else if (r.score === 4) code = 'P';
                                  else if (r.score === 2 || r.score === 3) code = 'W';
                                  else if (r.score <= 1) code = 'NA';
                                }
                                if (counts[code] !== undefined) counts[code]++;
                                else counts['A']++;
                              });

                              return (
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                                    <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                                      <span className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">A</span>
                                      Achieved
                                    </span>
                                    <span className="text-base font-black text-emerald-700">{counts.A}</span>
                                  </div>
                                  <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                                    <span className="text-xs font-black text-blue-800 flex items-center gap-1.5">
                                      <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">P</span>
                                      Progressing
                                    </span>
                                    <span className="text-base font-black text-blue-700">{counts.P}</span>
                                  </div>
                                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                                    <span className="text-xs font-black text-amber-800 flex items-center gap-1.5">
                                      <span className="w-5 h-5 rounded bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">W</span>
                                      Working on It
                                    </span>
                                    <span className="text-base font-black text-amber-700">{counts.W}</span>
                                  </div>
                                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                                    <span className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                                      <span className="w-5 h-5 rounded bg-gray-400 text-white flex items-center justify-center text-[10px] font-black">NA</span>
                                      Not Assessed
                                    </span>
                                    <span className="text-base font-black text-gray-600">{counts.NA}</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Comments Preview */}
                          <div className="p-4 space-y-3 bg-gray-50/50">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Development Comments Preview</p>
                            
                            {developmentPlan.teacherComment ? (
                              <div className="p-3 bg-white rounded-xl border border-gray-100 text-xs">
                                <span className="font-bold text-gray-500 block text-[10px] uppercase mb-0.5">Teacher Comment:</span>
                                <p className="text-gray-700 italic line-clamp-3">"{developmentPlan.teacherComment}"</p>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No teacher comment added yet.</p>
                            )}

                            {developmentPlan.literacyComment && (
                              <div className="p-3 bg-white rounded-xl border border-gray-100 text-xs">
                                <span className="font-bold text-gray-500 block text-[10px] uppercase mb-0.5">Literacy Comment:</span>
                                <p className="text-gray-700 italic line-clamp-2">"{developmentPlan.literacyComment}"</p>
                              </div>
                            )}

                            {developmentPlan.numeracyComment && (
                              <div className="p-3 bg-white rounded-xl border border-gray-100 text-xs">
                                <span className="font-bold text-gray-500 block text-[10px] uppercase mb-0.5">Numeracy Comment:</span>
                                <p className="text-gray-700 italic line-clamp-2">"{developmentPlan.numeracyComment}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                          {/* Summary Header */}
                          <div className="p-5 bg-gradient-to-br from-primary to-primary-dark text-white">
                             <div className="flex justify-between items-start mb-4">
                                <div>
                                   <p className="text-[10px] font-black opacity-60 uppercase mb-1">Overall Average</p>
                                   <p className="text-3xl font-black">{reportPreview.termAverage?.toFixed(1)}%</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[10px] font-black opacity-60 uppercase mb-1">Position</p>
                                   <p className="text-xl font-black">{reportPreview.termPosition} / {reportPreview.totalStudents}</p>
                                </div>
                             </div>
                             <div className="flex gap-2">
                                <span className="px-2 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                   Grade: {reportPreview.overallGrade || 'N/A'}
                                </span>
                             </div>
                          </div>

                          {/* Subject Table */}
                          <div className="p-0">
                             <table className="w-full text-left text-[11px]">
                                <thead className="bg-gray-50/50 text-gray-400 font-black uppercase tracking-widest font-mono">
                                   <tr>
                                      <th className="px-4 py-3">Subject</th>
                                      <th className="px-4 py-3 text-center">TOT</th>
                                      <th className="px-4 py-3 text-center">GRD</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                   {reportPreview.subjects?.map((sub, i) => (
                                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                         <td className="px-4 py-3 font-bold text-gray-700">{sub.name}</td>
                                         <td className="px-4 py-3 text-center font-black">{sub.total?.toFixed(0)}</td>
                                         <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded font-black ${sub.grade === 'F' ? 'text-red-500 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>{sub.grade}</span>
                                         </td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>

                          {/* Psychomotor Summary */}
                          <div className="p-5 space-y-4">
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Psychomotor Record</p>
                             <div className="space-y-2">
                                {reportPreview.psychomotorRatings?.slice(0, 5).map((r, i) => (
                                  <div key={i} className="flex justify-between items-center text-[11px]">
                                     <span className="font-bold text-gray-600">{r.name}</span>
                                     {renderRatingTicks(r.score)}
                                  </div>
                                ))}
                             </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="p-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                         <p className="text-gray-400 font-bold text-sm">No grade data available for this term yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
               <p className="text-xs text-gray-400 font-bold max-w-md italic">
                 Note: Remarks and assessments are only visible to parents once the results have been officially published.
               </p>
               <div className="flex gap-3">
                 <button
                   onClick={() => setGradingStudent(null)}
                   className="px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all border border-gray-100"
                 >
                   Discard Changes
                 </button>
                 <button
                   onClick={saveGrading}
                   disabled={saving}
                   className="px-10 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:bg-gray-400 flex items-center gap-2"
                 >
                   {saving ? (
                     <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                        <span>Saving...</span>
                     </>
                   ) : (
                     <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        <span>Confirm Grading</span>
                     </>
                   )}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Student List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admission No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-200">
              {(Array.isArray(classData?.students) ? classData.students : []).map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const photoUrl = student.user?.photoUrl || student.photoUrl;
                      return photoUrl ? (
                        <img
                          src={photoUrl.startsWith('data:') || photoUrl.startsWith('http') ? photoUrl : `${API_BASE_URL}${photoUrl}`}
                          alt="Student"
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {(student.user?.firstName?.[0] || student.name?.[0] || student.middleName?.[0] || '?').toUpperCase()}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.admissionNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 leading-tight">
                    {(() => {
                      const firstName = student.user?.firstName || '';
                      const lastName = student.user?.lastName || '';
                      const middleName = student.middleName || '';
                      const legacyName = student.name || '';
                      
                      const fullName = `${firstName} ${middleName} ${lastName}`.trim().replace(/\s+/g, ' ');
                      const displayName = fullName || legacyName || `Student ${student.admissionNumber || student.id}`;

                      const showIdClue = () => (
                        (student.parentGuardianName || student.parentGuardianPhone) ? (
                          <span className="text-[10px] text-gray-400 italic mt-0.5 block">
                            ID Clue: {student.parentGuardianName || ''} {student.parentGuardianPhone ? `(${student.parentGuardianPhone})` : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic mt-0.5 block">
                            Admitted: {student.admissionYear || 'N/A'} | ID: {student.id}
                          </span>
                        )
                      );

                      return (
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{displayName}</span>
                          {(!firstName || !lastName) && !legacyName && (
                            <span className="text-[10px] text-orange-500 font-bold uppercase tracking-tight">
                              Incomplete Profile
                            </span>
                          )}
                          {showIdClue()}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.user?.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {student.user?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openGradingModal(student)}
                      className="text-primary hfocus:ring-primary bg-primary/5 px-3 py-1 rounded-md"
                    >
                      Grade & Remark
                    </button>
                  </td>
                </tr>
              ))}
              {classData?.students?.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                    No students found in this class yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyClass;
