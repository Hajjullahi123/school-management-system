import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { useSchoolSettings } from '../../hooks/useSchoolSettings';
import { generateSubjectReportPDF, generateSubjectReportCSV } from '../../utils/subjectReportGenerator';

const ClassSubjects = () => {
  const { settings } = useSchoolSettings();
  const [isExporting, setIsExporting] = useState(false);
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
 ? prev.filter(id => id !== subjectId)
 : [...prev, subjectId]
 );
 };

  const handleExportReport = async (type) => {
    setIsExporting(true);
    try {
      const response = await api.get('/api/class-subjects');
      const data = await response.json();
      
      if (response.ok) {
        if (type === 'pdf') {
          await generateSubjectReportPDF(data, settings);
        } else {
          generateSubjectReportCSV(data);
        }
        toast.success(`Report exported as ${type.toUpperCase()} successfully`);
      } else {
        toast.error('Failed to fetch data for report');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('An error occurred during export');
    } finally {
      setIsExporting(false);
    }
  };

  const sortedAndFilteredAvailableSubjects = availableSubjects
    .filter(subject => subject.name.toLowerCase().includes(subjectSearchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <h1 className="text-2xl font-bold text-gray-900">Class Subject Management</h1>
 <div className="flex gap-2">
   <button
     onClick={() => handleExportReport('pdf')}
     disabled={isExporting}
     className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold border border-red-100 hover:bg-red-100 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
   >
     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6" /></svg>
     {isExporting ? 'Exporting...' : 'PDF Report'}
   </button>
   <button
     onClick={() => handleExportReport('csv')}
     disabled={isExporting}
     className="px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-semibold border border-green-100 hover:bg-green-100 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
   >
     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
     {isExporting ? 'Exporting...' : 'CSV Export'}
   </button>
 </div>
 </div>

 {/* Class Selection Grid - Shown only when no class is selected */}
 {!selectedClass && (
 <div className="space-y-6">
 {/* Info Box — inline width so it hugs the text */}
 <div className="inline-flex gap-4 bg-blue-50 border border-blue-100 rounded-2xl p-5 shadow-sm max-w-xl w-full">
 <div className="p-2.5 bg-blue-100 rounded-xl h-fit shrink-0">
 <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
 </svg>
 </div>
 <div>
 <h4 className="text-sm font-black text-blue-900 mb-1 uppercase tracking-wide">How it works</h4>
 <p className="text-sm text-blue-700 leading-relaxed">
 Select a class below to define which subjects they will offer.
 After assignment, use the{' '}
 <span className="font-bold underline">Teacher Assignments</span>{' '}
 page to designate instructors. The system tracks completion automatically.
 </p>
 </div>
 </div>

 {/* Class Cards Grid */}
 <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
 {classes.map((cls) => (
 <button
 key={cls.id}
 onClick={() => setSelectedClass(cls)}
 className="group bg-slate-50 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-primary hover:bg-indigo-50 hover:shadow-md transition-all text-left relative overflow-hidden"
 >
 {/* Decorative corner accent */}
 <div className="absolute top-0 right-0 w-14 h-14 bg-indigo-100/60 rounded-bl-full -mr-3 -mt-3 group-hover:bg-primary/10 transition-colors"></div>

 <h3 className="text-base sm:text-xl font-black text-gray-800 mb-1 group-hover:text-primary transition-colors leading-tight">
 {cls.name} {cls.arm || ''}
 </h3>
 <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 sm:mb-4">
 {cls.section || 'Academic'} Section
 </p>

 <div className="flex items-center justify-between mt-auto">
 <div className="flex items-center gap-1.5 sm:gap-2">
 <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-gray-400 group-hover:text-primary group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
 <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
 </svg>
 </span>
 <span className="text-[11px] sm:text-xs font-bold text-gray-500">Click to Manage</span>
 </div>
 <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-primary transform translate-x-2 group-hover:translate-x-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
 </svg>
 </div>
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Class Selection Dropdown - Always visible for quick switching when a class is selected */}
 {selectedClass && (
 <div className="bg-white p-3 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <button 
 onClick={() => setSelectedClass(null)}
 className="p-2 sm:p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-primary transition-all active:scale-95 border border-gray-100"
 title="Back to Class List"
 >
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
 </svg>
 </button>
 <div className="min-w-0">
 <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-0.5">Now Managing</p>
 <h2 className="text-base sm:text-xl font-black text-gray-900 truncate leading-tight">{selectedClass.name} {selectedClass.arm}</h2>
 </div>
 </div>

 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Switch Class:</label>
 <div className="relative w-full sm:w-auto">
 <select
 value={selectedClass?.id || ''}
 onChange={(e) => {
 const classId = parseInt(e.target.value);
 const cls = classes.find(c => c.id === classId);
 setSelectedClass(cls);
 }}
 className="w-full sm:w-[220px] bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs sm:text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary/20 outline-none appearance-none transition-all shadow-sm pr-10"
 >
 <option value="">-- Choose Class --</option>
 {classes.map((cls) => (
 <option key={cls.id} value={cls.id}>
 {cls.name} {cls.arm || ''}
 </option>
 ))}
 </select>
 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
 </svg>
 </div>
 </div>
 </div>
 </div>
 )}

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
 <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-0 items-start sm:items-center">
 <button
   onClick={() => setShowCopyFromModal(true)}
   className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1.5 shadow-sm"
 >
   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
   Copy From...
 </button>
 <button
   onClick={() => setShowCopyToModal(true)}
   disabled={classSubjects.length === 0}
   className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors flex items-center gap-1.5 shadow-sm ${
     classSubjects.length === 0 
       ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed' 
       : 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100'
   }`}
 >
   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
   Copy To...
 </button>
 <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${classSubjects.filter(cs => !cs.isAssigned).length === 0 && classSubjects.length > 0
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
 className="bg-red-50 p-2 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all"
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
 <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={handleBatchAdd}
        disabled={selectedSubjects.length === 0 || loading}
        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${selectedSubjects.length === 0
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-primary text-white hover:brightness-90 shadow-sm hover:shadow active:scale-95'
        }`}
      >
        Add Selected ({selectedSubjects.length})
      </button>
      <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
      <button
        onClick={() => setSelectedSubjects(sortedAndFilteredAvailableSubjects.map(s => s.id))}
        className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-white hover:border-primary/30 hover:text-primary font-semibold text-sm transition-all"
      >
        Select All
      </button>
      <button
        onClick={() => setSelectedSubjects([])}
        className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-white hover:border-red-300 hover:text-red-500 font-semibold text-sm transition-all"
      >
        Clear
      </button>
    </div>
    
    <div className="relative w-full sm:w-64">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        placeholder="Search subjects..."
        value={subjectSearchQuery}
        onChange={(e) => setSubjectSearchQuery(e.target.value)}
        className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-medium transition-all"
      />
      {subjectSearchQuery && (
        <button 
          onClick={() => setSubjectSearchQuery('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  </div>
  
  {sortedAndFilteredAvailableSubjects.length === 0 ? (
    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>
      <p className="text-gray-500 font-medium">No subjects match "{subjectSearchQuery}"</p>
      <button 
        onClick={() => setSubjectSearchQuery('')} 
        className="mt-2 text-primary hover:text-primary/80 font-semibold text-sm transition-colors"
      >
        Clear search filter
      </button>
    </div>
  ) : (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
  {sortedAndFilteredAvailableSubjects.map((subject) => (
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
 )}
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
