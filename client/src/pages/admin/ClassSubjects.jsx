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
  
  // States for Copy Subjects Feature
  const [showCopyToModal, setShowCopyToModal] = useState(false);
  const [showCopyFromModal, setShowCopyFromModal] = useState(false);
  const [copyToSelectedClasses, setCopyToSelectedClasses] = useState([]);
  const [copyFromSelectedClass, setCopyFromSelectedClass] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');

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
 setClasses(Array.isArray(data) ? data : []);
 } catch (error) {
 console.error('Error fetching classes:', error);
 setClasses([]);
 }
 };

 const fetchSubjects = async () => {
 try {
 const response = await api.get('/api/subjects');
 const data = await response.json();
 setSubjects(Array.isArray(data) ? data : []);
 } catch (error) {
 console.error('Error fetching subjects:', error);
 setSubjects([]);
 }
 };

 const fetchClassSubjects = async () => {
 if (!selectedClass) return;

 setLoading(true);
 try {
 const response = await api.get(`/api/class-subjects/class/${selectedClass.id}`);
 const data = await response.json();
 const safeData = Array.isArray(data) ? data : [];
 
 if (!response.ok) {
 console.error('Server error fetching class subjects:', data);
 toast.error('Could not load class subjects. Please try again.');
 }
 
 setClassSubjects(safeData);

 // Calculate available subjects safely
 const assignedSubjectIds = safeData.map(cs => cs.subjectId);
 const safeSubjects = Array.isArray(subjects) ? subjects : [];
 const available = safeSubjects.filter(subject => !assignedSubjectIds.includes(subject.id));
 setAvailableSubjects(available);
 } catch (error) {
 console.error('Error fetching class subjects:', error);
 toast.error('Network error loading subjects.');
 setClassSubjects([]);
 setAvailableSubjects([]);
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
 const createdCount = result.created?.length || 0;
 const errorCount = result.errors?.length || 0;
 
 if (createdCount > 0) {
 toast.success(`${createdCount} subjects added successfully!`);
 }
 if (errorCount > 0 && createdCount === 0) {
 // All subjects already exist — just refresh to show them
 toast('These subjects already exist for this class. Refreshing...', { icon: 'ℹ️' });
 } else if (errorCount > 0) {
 toast(`${errorCount} subject(s) were already assigned.`, { icon: 'ℹ️' });
 }
 
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

  const handleCopyTo = async () => {
    if (copyToSelectedClasses.length === 0) {
      toast.error('Please select at least one target class');
      return;
    }
    const subjectIdsToCopy = classSubjects.map(cs => cs.subjectId);
    if (subjectIdsToCopy.length === 0) {
      toast.error('Current class has no subjects to copy');
      return;
    }

    setIsCopying(true);
    try {
      for (const targetClassId of copyToSelectedClasses) {
        await api.post('/api/class-subjects/batch', {
          classId: targetClassId,
          subjectIds: subjectIdsToCopy
        });
      }
      toast.success(`Successfully copied subjects to ${copyToSelectedClasses.length} class(es)`);
      setShowCopyToModal(false);
      setCopyToSelectedClasses([]);
    } catch (error) {
      console.error('Error copying to classes:', error);
      toast.error('An error occurred while copying');
    } finally {
      setIsCopying(false);
    }
  };

  const handleCopyFrom = async () => {
    if (!copyFromSelectedClass) {
      toast.error('Please select a source class');
      return;
    }

    setIsCopying(true);
    try {
      // 1. Fetch subjects from source class
      const response = await api.get(`/api/class-subjects/class/${copyFromSelectedClass}`);
      const sourceSubjects = await response.json();
      
      if (!Array.isArray(sourceSubjects) || sourceSubjects.length === 0) {
        toast.error('Selected class has no subjects to copy');
        setIsCopying(false);
        return;
      }

      const subjectIdsToCopy = sourceSubjects.map(cs => cs.subjectId);

      // 2. Add them to current class
      const addResponse = await api.post('/api/class-subjects/batch', {
        classId: selectedClass.id,
        subjectIds: subjectIdsToCopy
      });

      const result = await addResponse.json();
      if (addResponse.ok) {
        const createdCount = result.created?.length || 0;
        if (createdCount > 0) {
          toast.success(`Copied ${createdCount} subjects successfully!`);
          fetchClassSubjects(); // Refresh current class subjects
        } else {
          toast('Subjects from that class already exist here.', { icon: 'ℹ️' });
        }
        setShowCopyFromModal(false);
        setCopyFromSelectedClass('');
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error copying from class:', error);
      toast.error('Failed to copy subjects');
    } finally {
      setIsCopying(false);
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

      {/* Copy To Modal */}
      {showCopyToModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Copy Subjects to Other Classes</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select the classes that should offer the exact same subjects as {selectedClass.name} {selectedClass.arm}.
            </p>
            <div className="max-h-[300px] overflow-y-auto mb-4 border rounded-xl p-2 grid gap-2">
              {classes.filter(c => c.id !== selectedClass.id).map(cls => (
                <label key={cls.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={copyToSelectedClasses.includes(cls.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCopyToSelectedClasses(prev => [...prev, cls.id]);
                      } else {
                        setCopyToSelectedClasses(prev => prev.filter(id => id !== cls.id));
                      }
                    }}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="font-medium text-gray-700">{cls.name} {cls.arm}</span>
                </label>
              ))}
              {classes.filter(c => c.id !== selectedClass.id).length === 0 && (
                <p className="text-gray-500 text-center py-4">No other classes available.</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCopyToModal(false);
                  setCopyToSelectedClasses([]);
                }}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCopyTo}
                disabled={isCopying || copyToSelectedClasses.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {isCopying && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Copy Subjects
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy From Modal */}
      {showCopyFromModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Copy Subjects from Another Class</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select a class to import its subject allocation into {selectedClass.name} {selectedClass.arm}.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Source Class</label>
              <select
                value={copyFromSelectedClass}
                onChange={(e) => setCopyFromSelectedClass(parseInt(e.target.value))}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary p-2 border"
              >
                <option value="">-- Select Source Class --</option>
                {classes.filter(c => c.id !== selectedClass.id).map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.arm}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCopyFromModal(false);
                  setCopyFromSelectedClass('');
                }}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCopyFrom}
                disabled={isCopying || !copyFromSelectedClass}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {isCopying && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Import Subjects
              </button>
            </div>
          </div>
        </div>
      )}

 </div>
 );
};

export default ClassSubjects;
