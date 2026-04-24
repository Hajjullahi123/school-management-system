import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const MyClass = () => {
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { settings: schoolSettings } = useSchoolSettings();

  // Grading State
  const [gradingStudent, setGradingStudent] = useState(null);
  const [remarks, setRemarks] = useState({ formMasterRemark: '', principalRemark: '' });
  const [psychomotorRatings, setPsychomotorRatings] = useState([]);
  const [domains, setDomains] = useState([]);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publication, setPublication] = useState({ isPublished: false, isProgressivePublished: false });
  const [reportPreview, setReportPreview] = useState(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);

  const predefinedRemarks = [
    "An excellent result, keep up the good work.",
    "A very good performance, keep it up.",
    "A good result. You can do better.",
    "Fair performance. Room for more improvement.",
    "Weak performance. Needs more focus on core subjects.",
    "Satisfactory result. Consolidate your effort.",
    "Poor performance. You need to be more serious with your studies."
  ];

  useEffect(() => {
    fetchMyClass();
    fetchDomains();
    fetchCurrentTerm();
  }, []);

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
        formMasterRemark: remarks.formMasterRemark,
        principalRemark: remarks.principalRemark,
        psychomotorRatings
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

  const fetchMyClass = async () => {
    try {
      const response = await api.get('/api/classes/my-class');

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
          const nameA = `${a.user?.firstName} ${a.user?.lastName} ${a.middleName || ''}`.trim().toLowerCase();
          const nameB = `${b.user?.firstName} ${b.user?.lastName} ${b.middleName || ''}`.trim().toLowerCase();
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

  const activeStudents = classData?.students?.filter(s => s.user.isActive) || [];

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          {schoolSettings?.logoUrl && (
            <img src={schoolSettings.logoUrl} alt="Logo" className="h-12 w-12 object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">Class Management</h1>
            <p className="text-sm text-gray-600">
              Form Master: <span className="font-bold text-primary">{classData.name} {classData.arm}</span>
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
                    <p className="text-sm font-medium text-gray-500">Student: <span className="text-primary font-bold">{gradingStudent.user.firstName} {gradingStudent.user.lastName} {gradingStudent.middleName || ''}</span></p>
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
                  {/* Performance Breakdown Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                       <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">01</span>
                       <h4 className="font-black text-gray-900 uppercase tracking-tighter">Academic Remarks</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-8">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Form Master's Remark</label>
                          <select 
                            onChange={(e) => setRemarks({ ...remarks, formMasterRemark: e.target.value })}
                            className="text-xs border-none bg-gray-50 rounded-lg px-3 py-1.5 font-bold text-gray-500 focus:ring-0 cursor-pointer outline-none"
                          >
                            <option value="">-- Quick Select --</option>
                            {predefinedRemarks.map((rem, i) => <option key={i} value={rem}>{rem}</option>)}
                          </select>
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
                          <select 
                            onChange={(e) => setRemarks({ ...remarks, principalRemark: e.target.value })}
                            className="text-xs border-none bg-gray-50 rounded-lg px-3 py-1.5 font-bold text-gray-500 focus:ring-0 cursor-pointer outline-none"
                          >
                            <option value="">-- Quick Select --</option>
                            {predefinedRemarks.map((rem, i) => <option key={i} value={rem}>{rem}</option>)}
                          </select>
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

                  {/* Psychomotor Assessment */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                       <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">02</span>
                       <h4 className="font-black text-gray-900 uppercase tracking-tighter text-lg">Affective & Psychomotor Assessment</h4>
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
                          {student.user.firstName[0]}{student.user.lastName?.[0]}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.admissionNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.user.firstName} {student.user.lastName} {student.middleName || ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {student.user.isActive ? 'Active' : 'Inactive'}
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
              {classData.students.length === 0 && (
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
