import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import { Link } from 'react-router-dom';

const ClassManagement = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classForm, setClassForm] = useState({ name: '', arm: '', classTeacherId: '', expectedSubjects: 0 });
  const [editingClass, setEditingClass] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showClassForm, setShowClassForm] = useState(false);
  const [terms, setTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  // Grading Modal State
  const [gradingStudent, setGradingStudent] = useState(null);
  const [remarks, setRemarks] = useState({ formMasterRemark: '', principalRemark: '' });
  const [psychomotorRatings, setPsychomotorRatings] = useState([]);
  const [domains, setDomains] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetchTerms();
    fetchDomains();
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

  const openGradingModal = async (student) => {
    if (!selectedTermId) {
      alert("Please select a term first from the top right.");
      return;
    }
    setGradingStudent(student);
    setRemarks({ formMasterRemark: '', principalRemark: '' });
    setPsychomotorRatings([]);

    try {
      const res = await api.get(`/api/report-extras/${student.id}/${selectedTermId}`);
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
    }
  };

  const saveGrading = async () => {
    if (!gradingStudent || !selectedTermId || !selectedClass) return;
    setSaving(true);
    try {
      const payload = {
        studentId: gradingStudent.id,
        termId: selectedTermId,
        classId: selectedClass.id,
        formMasterRemark: remarks.formMasterRemark,
        principalRemark: remarks.principalRemark,
        psychomotorRatings
      };

      const res = await api.post('/api/report-extras/save', payload);
      if (res.ok) {
        alert("Saved successfully!");
        setGradingStudent(null);
      } else {
        alert("Failed to save. Ensure you have the right permissions.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving.");
    } finally {
      setSaving(false);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await api.get('/api/terms');
      if (response.ok) {
        const data = await response.json();
        setTerms(data);
        const currentTerm = data.find(t => t.isCurrent);
        if (currentTerm) setSelectedTermId(currentTerm.id.toString());
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users?role=teacher`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setTeachers(data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchClassStudents = async (classId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/students?classId=${classId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setClassStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingClass
        ? `${API_BASE_URL}/api/classes/${editingClass.id}`
        : `${API_BASE_URL}/api/classes`;

      const response = await fetch(url, {
        method: editingClass ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...classForm,
          classTeacherId: classForm.classTeacherId ? parseInt(classForm.classTeacherId) : null
        })
      });

      if (response.ok) {
        alert(editingClass ? 'Class updated!' : 'Class created!');
        setClassForm({ name: '', arm: '', classTeacherId: '', expectedSubjects: 0 });
        setEditingClass(null);
        setShowClassForm(false);
        fetchClasses();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to save class');
      }
    } catch (error) {
      console.error('Error saving class:', error);
      alert('Failed to save class. Please try again.');
    }
  };

  const handleDeleteClass = async (id) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        alert('Class deleted!');
        fetchClasses();
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Failed to delete class');
    }
  };

  const handleClassClick = (cls) => {
    setSelectedClass(cls);
    setSelectedStudents([]);
    fetchClassStudents(cls.id);
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
    setClassStudents([]);
    setSelectedStudents([]);
  };

  const handleSelectStudent = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === classStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(classStudents.map(s => s.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) {
      alert('Please select students to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedStudents.length} student(s)?`)) return;

    try {
      const deletePromises = selectedStudents.map(studentId =>
        fetch(`${API_BASE_URL}/api/students/${studentId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      );

      await Promise.all(deletePromises);
      alert(`Successfully deleted ${selectedStudents.length} student(s)!`);
      setSelectedStudents([]);
      fetchClassStudents(selectedClass.id);
      fetchClasses(); // Refresh class counts
    } catch (error) {
      console.error('Error deleting students:', error);
      alert('Failed to delete some students');
    }
  };

  // Main view - Class Cards
  if (!selectedClass) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Class Management</h1>
          <button
            onClick={() => {
              if (showClassForm && editingClass) {
                // If editing, clicking "+ Create" should switch to create mode
                setEditingClass(null);
                setClassForm({ name: '', arm: '', classTeacherId: '', expectedSubjects: 0 });
              } else {
                setShowClassForm(!showClassForm);
                if (!showClassForm) {
                  setEditingClass(null);
                  setClassForm({ name: '', arm: '', classTeacherId: '', expectedSubjects: 0 });
                }
              }
            }}
            className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 transition-colors"
          >
            {showClassForm && !editingClass ? 'Hide Form' : '+ Create New Class'}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 relative">
          {/* Class Cards Grid - Takes more space */}
          <div className={`flex-1 transition-all duration-300 ${showClassForm ? 'lg:w-2/3' : 'w-full'}`}>
            <div className={`grid grid-cols-1 gap-6 ${showClassForm ? 'md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              }`}>
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border overflow-hidden cursor-pointer ${editingClass?.id === cls.id ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'
                    }`}
                  onClick={() => handleClassClick(cls)}
                >
                  <div className="bg-gradient-to-br from-primary to-primary/90 p-6 text-white">
                    <h3 className="text-2xl font-bold">
                      {cls.name}{cls.arm ? ` ${cls.arm}` : ''}
                    </h3>
                    <p className="text-white/90 text-sm mt-1">
                      {cls._count?.students || 0} Students | {Math.max(0, (cls.expectedSubjects || 0) - (cls._count?.classSubjects || 0))} More Subjects Needed
                    </p>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-gray-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Form Master</p>
                        <p className="text-sm font-medium text-gray-900">
                          {cls.classTeacher
                            ? `${cls.classTeacher.firstName} ${cls.classTeacher.lastName}`
                            : 'Not Assigned'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClass(cls);
                          setClassForm({
                            name: cls.name,
                            arm: cls.arm || '',
                            classTeacherId: cls.classTeacherId || '',
                            expectedSubjects: cls.expectedSubjects || 0
                          });
                          setShowClassForm(true);
                        }}
                        className={`flex-1 text-sm py-2 rounded transition-colors ${editingClass?.id === cls.id
                          ? 'bg-primary text-white'
                          : 'text-blue-600 hover:bg-blue-50'
                          }`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClass(cls.id);
                        }}
                        className="flex-1 text-sm text-red-600 hover:bg-red-50 py-2 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {classes.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-gray-500 text-lg">No classes created yet</p>
                <p className="text-gray-400 text-sm mt-2">Click "+ Create New Class" to get started</p>
              </div>
            )}
          </div>

          {/* Sidebar Form - Sticky */}
          {showClassForm && (
            <div className="lg:w-96">
              <div className="sticky top-6 bg-white p-6 rounded-lg shadow-lg border border-primary/20 transition-all duration-300 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingClass ? 'Edit Class' : 'Create New Class'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowClassForm(false);
                      setEditingClass(null);
                      setClassForm({ name: '', arm: '', classTeacherId: '', expectedSubjects: 0 });
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Class Name (e.g., SS 1)
                    </label>
                    <input
                      type="text"
                      list="classNames"
                      value={classForm.name}
                      onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                      className="w-full border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="e.g. SS 1"
                      required
                    />
                    <datalist id="classNames">
                      {Array.from(new Set(classes.map(c => c.name))).sort().map(name => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Arm (e.g., A, B, C)
                    </label>
                    <input
                      type="text"
                      list="classArms"
                      value={classForm.arm}
                      onChange={(e) => setClassForm({ ...classForm, arm: e.target.value })}
                      className="w-full border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="e.g. A"
                    />
                    <datalist id="classArms">
                      {Array.from(new Set(classes.map(c => c.arm).filter(Boolean))).sort().map(arm => (
                        <option key={arm} value={arm} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Form Master
                    </label>
                    <select
                      value={classForm.classTeacherId}
                      onChange={(e) => setClassForm({ ...classForm, classTeacherId: e.target.value })}
                      className="w-full border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      <option value="">No Form Master</option>
                      {teachers.map((teacher) => {
                        const isAssigned = classes.some(c => c.classTeacherId === teacher.id && (!editingClass || c.id !== editingClass.id));
                        return (
                          <option key={teacher.id} value={teacher.id} disabled={isAssigned}>
                            {teacher.firstName} {teacher.lastName} {isAssigned ? '(Assigned)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Expected Subjects
                    </label>
                    <input
                      type="number"
                      value={classForm.expectedSubjects}
                      onChange={(e) => setClassForm({ ...classForm, expectedSubjects: e.target.value })}
                      className="w-full border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="e.g. 12"
                      min="0"
                    />
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    <button
                      type="submit"
                      className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:brightness-90 transition-all shadow-md active:scale-95"
                    >
                      {editingClass ? 'Update Class Details' : 'Create Class'}
                    </button>
                    {editingClass && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClass(null);
                          setClassForm({ name: '', arm: '', classTeacherId: '', expectedSubjects: 0 });
                          setShowClassForm(false);
                        }}
                        className="w-full bg-gray-100 text-gray-600 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-bold text-blue-900 uppercase tracking-tighter">About Class Management</h4>
              <p className="text-sm text-blue-700 mt-1">
                Click on any class card to view and manage students. Use the sidebar to quickly add or edit classes without losing your place.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detail view - Students in selected class
  return (
    <div className="space-y-6">
      {/* Grading Modal */}
      {gradingStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Grading & Remarks: {gradingStudent.user?.firstName} {gradingStudent.user?.lastName}</h3>
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
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToClasses}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Classes
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedClass.name}{selectedClass.arm ? ` ${selectedClass.arm}` : ''} - Students
          </h1>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-3 bg-white p-2 rounded-md border shadow-sm">
            <label className="text-sm font-semibold text-gray-700">Select Term:</label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="border-none bg-transparent text-sm font-medium focus:ring-0 cursor-pointer"
            >
              <option value="">Select Term</option>
              {terms.map(term => (
                <option key={term.id} value={term.id}>
                  {term.name} ({term.academicSession?.name}) {term.isCurrent ? '• Active' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-md border shadow-sm">
            <label className="text-sm font-semibold text-gray-700">Publish:</label>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!selectedClass || !selectedTermId) return;
                  const isPublished = selectedClass.isProgressivePublished;
                  if (!confirm(`Are you sure you want to ${isPublished ? 'unpublish' : 'publish'} PROGRESSIVE results?`)) return;

                  try {
                    const response = await api.put(`/api/classes/${selectedClass.id}/publish-results`, {
                      isProgressivePublished: !isPublished,
                      termId: parseInt(selectedTermId)
                    });

                    if (response.ok) {
                      alert(`Progressive results ${!isPublished ? 'published' : 'unpublished'} successfully!`);
                      setSelectedClass(prev => ({ ...prev, isProgressivePublished: !isPublished }));
                    } else {
                      const errorData = await response.json();
                      alert(`Failed: ${errorData.error}`);
                    }
                  } catch (e) {
                    alert(`Error: ${e.message}`);
                  }
                }}
                className={`px-3 py-1 text-xs rounded-md text-white transition-colors ${selectedClass.isProgressivePublished ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {selectedClass.isProgressivePublished ? 'Progressive: Published' : 'Progressive: Draft'}
              </button>
              <button
                onClick={async () => {
                  if (!selectedClass || !selectedTermId) return;
                  const isPublished = selectedClass.isResultPublished;
                  if (!confirm(`Are you sure you want to ${isPublished ? 'unpublish' : 'publish'} FINAL results?`)) return;

                  try {
                    const response = await api.put(`/api/classes/${selectedClass.id}/publish-results`, {
                      isPublished: !isPublished,
                      termId: parseInt(selectedTermId)
                    });

                    if (response.ok) {
                      alert(`Final results ${!isPublished ? 'published' : 'unpublished'} successfully!`);
                      setSelectedClass(prev => ({ ...prev, isResultPublished: !isPublished }));
                      setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, isResultPublished: !isPublished } : c));
                    } else {
                      const errorData = await response.json();
                      alert(`Failed: ${errorData.error}`);
                    }
                  } catch (e) {
                    alert(`Error: ${e.message}`);
                  }
                }}
                className={`px-3 py-1 text-xs rounded-md text-white transition-colors ${selectedClass.isResultPublished ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {selectedClass.isResultPublished ? 'Final: Published' : 'Final: Draft'}
              </button>
            </div>
          </div>

          {selectedStudents.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Selected ({selectedStudents.length})
            </button>
          )}
        </div>
      </div>

      {/* Class Info Card */}
      <div className="bg-gradient-to-r from-primary to-primary/90 text-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-white/90 text-sm">Total Students</p>
            <p className="text-3xl font-bold">{classStudents.length}</p>
          </div>
          <div>
            <p className="text-white/90 text-sm">Form Master</p>
            <p className="text-lg font-semibold">
              {selectedClass.classTeacher
                ? `${selectedClass.classTeacher.firstName} ${selectedClass.classTeacher.lastName}`
                : 'Not Assigned'}
            </p>
          </div>
          <div>
            <p className="text-white/90 text-sm">Selected</p>
            <p className="text-3xl font-bold">{selectedStudents.length}</p>
          </div>
        </div>
      </div>

      {/* Students Table */}
      {
        classStudents.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === classStudents.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-primary rounded focus:ring-primary"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admission No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date of Birth
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {classStudents.map((student) => (
                    <tr
                      key={student.id}
                      className={`hover:bg-gray-50 transition-colors ${selectedStudents.includes(student.id) ? 'bg-primary/5' : ''
                        }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleSelectStudent(student.id)}
                          className="w-4 h-4 text-primary rounded focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.admissionNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {student.user ? `${student.user.firstName} ${student.user.lastName}` : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{student.gender}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex gap-2 justify-end">
                        <Link
                          to={`/dashboard/term-report?studentId=${student.id}&termId=${selectedTermId || ''}`}
                          className="text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded-md transition-colors"
                          target="_blank"
                        >
                          Term Report
                        </Link>
                        <Link
                          to={`/dashboard/report-card?studentId=${student.id}`}
                          className="text-purple-600 border border-purple-200 hover:bg-purple-50 px-3 py-1 rounded-md transition-colors"
                          target="_blank"
                        >
                          Cum. Report
                        </Link>
                        <button
                          onClick={() => openGradingModal(student)}
                          className="text-white bg-primary hover:bg-primary/90 px-3 py-1 rounded-md transition-colors"
                        >
                          Grade & Remark
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-gray-500 text-lg">No students in this class yet</p>
          </div>
        )
      }
    </div >
  );
};

export default ClassManagement;
