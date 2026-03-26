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

  const openGradingModal = async (student) => {
    if (!currentTerm) {
      alert("No current term found. Please contact admin.");
      return;
    }
    setGradingStudent(student);
    setLoading(true); // Re-using loading or creating a local one? Let's just block UI slightly or better, use a specific loader. 
    // Actually, better to fetch data and then show modal, or show modal with loader.
    // Let's reset state first
    setRemarks({ formMasterRemark: '', principalRemark: '' });
    setPsychomotorRatings([]);

    try {
      const res = await api.get(`/api/report-extras/${student.id}/${currentTerm.id}`);
      if (res.ok) {
        const data = await res.json();
        setRemarks({
          formMasterRemark: data.formMasterRemark || '',
          principalRemark: data.principalRemark || ''
        });
        setPsychomotorRatings(Array.isArray(data.psychomotorRatings) ? data.psychomotorRatings : []);
      }
    } catch (e) {
      console.error("Error fetching report details", e);
    } finally {
      setLoading(false);
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

  if (error) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeStudents = classData?.students?.filter(s => s.user.isActive) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
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
        <div className="flex gap-3">
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
        {/* Active Students */}
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

        {/* Total Registered */}
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

        {/* Session */}
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

        {/* Term */}
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Grading: {gradingStudent.user.firstName} {gradingStudent.user.lastName}</h3>
              <button
                onClick={() => setGradingStudent(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Remarks Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Form Master's Remark</label>
                  <textarea
                    value={remarks.formMasterRemark}
                    onChange={(e) => setRemarks({ ...remarks, formMasterRemark: e.target.value })}
                    className="w-full border rounded-md p-2 h-24"
                    placeholder="Teacher's impression..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Principal's Remark (On Behalf)</label>
                  <textarea
                    value={remarks.principalRemark}
                    onChange={(e) => setRemarks({ ...remarks, principalRemark: e.target.value })}
                    className="w-full border rounded-md p-2 h-24"
                    placeholder="Headteacher's remark..."
                  />
                </div>
              </div>

              {/* Psychomotor Domain Section */}
              <div>
                <h4 className="font-semibold text-lg mb-4 border-b pb-2">Psychomotor Domain & Affective Assessment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {domains.length === 0 ? (
                    <div className="col-span-full text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <p className="text-gray-500">No assessment domains configured.</p>
                      <p className="text-sm text-gray-400 mt-1">Please ask the administrator to run the psychomotor seed script.</p>
                    </div>
                  ) : (
                    (Array.isArray(domains) ? domains : []).map(domain => {
                      const rating = psychomotorRatings.find(r => r.domainId === domain.id) || { score: 0 };
                      return (
                        <div key={domain.id} className="bg-gray-50 p-4 rounded-md">
                          <div className="flex justify-between mb-2">
                            <span className="font-medium text-sm">{domain.name}</span>
                            <span className="text-sm font-bold text-primary">{rating.score}/{domain.maxScore}</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max={domain.maxScore}
                            value={rating.score || 0}
                            onChange={(e) => {
                              const newScore = parseInt(e.target.value);
                              setPsychomotorRatings(prev => {
                                const existing = prev.find(p => p.domainId === domain.id);
                                if (existing) {
                                  return prev.map(p => p.domainId === domain.id ? { ...p, score: newScore } : p);
                                } else {
                                  return [...prev, { domainId: domain.id, name: domain.name, score: newScore }];
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
                            <span>1 (Poor)</span>
                            <span>{domain.maxScore} (Excellent)</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setGradingStudent(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={saveGrading}
                disabled={saving}
                className="px-6 py-2 bg-primary text-white rounded-md hover:brightness-90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Grading'}
              </button>
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
                    {student.user.firstName} {student.user.lastName}
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
