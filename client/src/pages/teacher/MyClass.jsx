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
  const [currentTermId, setCurrentTermId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMyClass();
    fetchDomains();
    fetchCurrentTerm();
  }, []);

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
        setCurrentTermId(term.id);
      }
    } catch (e) { console.error("Failed to fetch current term", e); }
  };

  const openGradingModal = async (student) => {
    if (!currentTermId) {
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
      const res = await api.get(`/api/report-extras/${student.id}/${currentTermId}`);
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
    if (!gradingStudent || !currentTermId) return;
    setSaving(true);
    try {
      const payload = {
        studentId: gradingStudent.id,
        termId: currentTermId,
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
        setError('You are not currently assigned as a Form Master for any class.');
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
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          {schoolSettings?.logoUrl && (
            <img src={schoolSettings.logoUrl} alt="Logo" className="h-16 w-16 object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Class Management</h1>
            <p className="text-gray-600 mt-1">
              Form Master for: <span className="font-semibold text-primary text-lg">{classData.name} {classData.arm}</span>
            </p>
            <p className="text-xs text-gray-400">{schoolSettings?.schoolName || 'School Management System'}</p>
          </div>
        </div>
        <div>
          <button
            onClick={async () => {
              if (!confirm(`Are you sure you want to ${classData.isResultPublished ? 'unpublish' : 'publish'} results for this class?`)) return;
              try {
                const response = await api.put(`/api/classes/${classData.id}/publish-results`, {
                  isPublished: !classData.isResultPublished
                });
                if (response.ok) {
                  alert(`Results ${!classData.isResultPublished ? 'published' : 'unpublished'} successfully!`);
                  fetchMyClass();
                } else {
                  const errorData = await response.json();
                  alert(`Failed to update status: ${errorData.error || 'Unknown error'}`);
                }
              } catch (e) {
                console.error(e);
                alert(`Error: ${e.message}`);
              }
            }}
            className={`px-4 py-2 rounded-md font-medium text-white transition-colors ${classData.isResultPublished
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
              }`}
          >
            {classData.isResultPublished ? 'Unpublish Results' : 'Publish Results'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-primary">
          <p className="text-sm text-gray-600">Active Students</p>
          <p className="text-3xl font-bold text-gray-900">{activeStudents.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-gray-400">
          <p className="text-sm text-gray-600">Total Registered</p>
          <p className="text-3xl font-bold text-gray-900">{classData.students.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 focus:border-primary">
          <p className="text-sm text-gray-600">Inactive Students</p>
          <p className="text-3xl font-bold text-gray-900">{classData.students.length - activeStudents.length}</p>
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
                    {(Array.isArray(domains) ? domains : []).map(domain => {
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
                    {student.photoUrl ? (
                      <img
                        src={`${API_BASE_URL}${student.photoUrl}`}
                        alt="Student"
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {student.user.firstName[0]}
                      </div>
                    )}
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
