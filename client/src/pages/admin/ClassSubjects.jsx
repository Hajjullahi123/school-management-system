import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';

const ClassSubjects = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classSubjects, setClassSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassSubjects();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      const data = await response.json();
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/api/subjects');
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchClassSubjects = async () => {
    if (!selectedClass) return;

    setLoading(true);
    try {
      const response = await api.get(`/api/class-subjects/class/${selectedClass.id}`);
      const data = await response.json();
      setClassSubjects(data);

      // Calculate available subjects
      const assignedSubjectIds = data.map(cs => cs.subjectId);
      const available = subjects.filter(subject => !assignedSubjectIds.includes(subject.id));
      setAvailableSubjects(available);
    } catch (error) {
      console.error('Error fetching class subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (subjectId) => {
    try {
      const response = await api.post('/api/class-subjects', {
        classId: selectedClass.id,
        subjectId
      });

      if (response.ok) {
        toast.success('Subject added successfully!');
        fetchClassSubjects();
      } else {
        const result = await response.json();
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adding subject:', error);
      toast.error('Failed to add subject');
    }
  };

  const handleBatchAdd = async () => {
    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/class-subjects/batch', {
        classId: selectedClass.id,
        subjectIds: selectedSubjects
      });

      const result = await response.json();
      if (response.ok) {
        toast.success(`${result.created.length} subjects added successfully!`);
        setSelectedSubjects([]);
        fetchClassSubjects();
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adding subjects:', error);
      toast.error('Failed to add subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePeriods = async (classSubjectId, periods) => {
    try {
      const response = await api.patch(`/api/class-subjects/${classSubjectId}/periods`, {
        periodsPerWeek: periods
      });

      if (response.ok) {
        // Update local state instead of refetching everything for smoothness
        setClassSubjects(prev => prev.map(cs =>
          cs.id === classSubjectId ? { ...cs, periodsPerWeek: periods } : cs
        ));
      } else {
        const result = await response.json();
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating periods:', error);
      toast.error('Failed to update periods');
    }
  };

  const handleRemoveSubject = async (classSubjectId) => {
    if (!confirm('Remove this subject from the class?')) return;

    try {
      const response = await api.delete(`/api/class-subjects/${classSubjectId}`);

      if (response.ok) {
        toast.success('Subject removed successfully!');
        fetchClassSubjects();
      } else {
        const result = await response.json();
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error removing subject:', error);
      toast.error('Failed to remove subject');
    }
  };

  const toggleSubjectSelection = (subjectId) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Class Subject Management</h1>
      </div>

      {/* Class Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Class
        </label>
        <select
          value={selectedClass?.id || ''}
          onChange={(e) => {
            const classId = parseInt(e.target.value);
            const cls = classes.find(c => c.id === classId);
            setSelectedClass(cls);
          }}
          className="w-full md:w-1/3 border rounded-md px-3 py-2"
        >
          <option value="">-- Select a Class --</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} {cls.arm || ''}
            </option>
          ))}
        </select>
      </div>

      {/* Class Subjects Display */}
      {selectedClass && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Subjects for {selectedClass.name} {selectedClass.arm}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {classSubjects.length} subject(s) offered
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${classSubjects.filter(cs => !cs.isAssigned).length === 0 && classSubjects.length > 0
                ? 'bg-green-100 text-green-700'
                : 'bg-orange-100 text-orange-700'
                }`}>
                {classSubjects.filter(cs => cs.isAssigned).length} / {classSubjects.length} Assigned
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : (
            <>
              {/* Current Subjects */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Current Subjects</h3>
                {classSubjects.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No subjects added yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {classSubjects.map((cs) => (
                      <div
                        key={cs.id}
                        className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-lg">{cs.subject.name}</p>
                            {cs.teacher ? (
                              <p className="text-sm text-green-600 flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                {cs.teacher.firstName} {cs.teacher.lastName}
                              </p>
                            ) : (
                              <p className="text-sm text-red-500 flex items-center gap-1">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                Not assigned
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveSubject(cs.id)}
                            className="bg-red-50 p-2 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                            title="Remove subject"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                            Periods per week
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={cs.periodsPerWeek || 1}
                              onChange={(e) => handleUpdatePeriods(cs.id, parseInt(e.target.value) || 1)}
                              className="w-full bg-gray-50 border-none rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary/20"
                            />
                            <span className="text-gray-400 text-sm font-medium">Slots</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Subjects */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Add Subjects</h3>
                {availableSubjects.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    All subjects have been added to this class
                  </p>
                ) : (
                  <>
                    <div className="mb-4">
                      <button
                        onClick={handleBatchAdd}
                        disabled={selectedSubjects.length === 0 || loading}
                        className={`px-4 py-2 rounded-md ${selectedSubjects.length === 0
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-primary text-white hover:brightness-90'
                          }`}
                      >
                        Add Selected ({selectedSubjects.length})
                      </button>
                      <button
                        onClick={() => setSelectedSubjects(availableSubjects.map(s => s.id))}
                        className="ml-2 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedSubjects([])}
                        className="ml-2 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {availableSubjects.map((subject) => (
                        <label
                          key={subject.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedSubjects.includes(subject.id)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-gray-50'
                            }`}
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedSubjects.includes(subject.id)}
                              onChange={() => toggleSubjectSelection(subject.id)}
                              className="mr-2"
                            />
                            <span className="text-sm font-medium">{subject.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900">How it works</h4>
            <p className="text-sm text-blue-700 mt-1">
              First, define which subjects each class will offer. Then, use the Teacher Assignments page to assign teachers to these subjects.
              The system will track how many subjects still need teachers assigned.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassSubjects;
