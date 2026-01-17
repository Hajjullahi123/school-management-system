import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSchoolSettings } from '../hooks/useSchoolSettings';
import { toast } from '../utils/toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const Timetable = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings } = useSchoolSettings();

  // State
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [allSchedules, setAllSchedules] = useState({}); // { classId: schedule[] }
  const [expandedClasses, setExpandedClasses] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [publishStatus, setPublishStatus] = useState({ isPublished: false, hasSlots: false });
  const [generationLoading, setGenerationLoading] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [generationReport, setGenerationReport] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [targetClassIds, setTargetClassIds] = useState([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [showDaySyncModal, setShowDaySyncModal] = useState(false);
  const [sourceDay, setSourceDay] = useState('');
  const [targetDays, setTargetDays] = useState([]);
  const [daySyncLoading, setDaySyncLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    dayOfWeek: 'Monday',
    startTime: '08:00',
    endTime: '08:40',
    type: 'lesson', // lesson, break
    subjectId: ''
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
    if (isAdmin) {
      fetchAllTimetables();
      fetchTeachers();
    }
    if (user?.role === 'student' && user?.student?.classId) {
      setSelectedClassId(user.student.classId);
    } else if (user?.role === 'parent' && user?.parent?.students?.length > 0) {
      // Find the first student with a class and select it
      const studentWithClass = user.parent.students.find(s => s.classId);
      if (studentWithClass) {
        setSelectedClassId(studentWithClass.classId);
      }
    }
  }, [user]);

  useEffect(() => {
    if (selectedClassId) {
      fetchTimetable();
      fetchPublishStatus();
      fetchClassSubjects();
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    if (user?.role === 'student') return;

    // For parents, we only show their children's classes to simplify
    if (user?.role === 'parent' && user?.parent?.students) {
      const childrenClasses = user.parent.students
        .filter(s => s.classModel)
        .map(s => ({
          ...s.classModel,
          studentName: s.name || `${s.user?.firstName} ${s.user?.lastName}`
        }));

      // Deduplicate classes but keep student name info if needed
      // Actually, simple list is fine
      setClasses(childrenClasses);
      return;
    }

    try {
      const response = await api.get('/api/classes');
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
        if (isAdmin) {
          setExpandedClasses(new Set(data.map(c => c.id)));
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load classes');
    }
  };

  const fetchAllTimetables = async () => {
    try {
      const response = await api.get('/api/timetable/all');
      if (response.ok) {
        const data = await response.json();
        const grouped = data.reduce((acc, slot) => {
          if (!acc[slot.classId]) acc[slot.classId] = [];
          acc[slot.classId].push(slot);
          return acc;
        }, {});
        setAllSchedules(grouped);
      }
    } catch (e) { console.error(e); }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/api/subjects');
      if (response.ok) {
        setSubjects(await response.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/api/teachers');
      if (response.ok) {
        setTeachers(await response.json());
      }
    } catch (e) { console.error(e); }
  };

  const fetchTimetable = async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/timetable/class/${selectedClassId}`);
      if (response.ok) {
        setSchedule(await response.json());
      } else {
        setSchedule([]);
      }
    } catch (e) {
      console.error(e);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublishStatus = async () => {
    if (!selectedClassId) return;
    try {
      const response = await api.get(`/api/timetable/class/${selectedClassId}/status`);
      const data = await response.json();
      setPublishStatus(data);
    } catch (e) { console.error(e); }
  };

  const fetchClassSubjects = async () => {
    if (!selectedClassId) return;
    try {
      const response = await api.get(`/api/class-subjects/class/${selectedClassId}`);
      if (response.ok) {
        setClassSubjects(await response.json());
      }
    } catch (e) { console.error(e); }
  };

  const toggleClassExpansion = (classId) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  const getScheduleByDay = (targetSchedule) => {
    return DAYS.reduce((acc, day) => {
      acc[day] = targetSchedule.filter(s => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
      return acc;
    }, {});
  };

  const handleDelete = async (id) => {
    if (!confirm('🗑️ Are you sure you want to delete this slot?')) return;
    try {
      const response = await api.delete(`/api/timetable/${id}`);
      if (response.ok) {
        toast.success('Slot deleted successfully');
        fetchTimetable();
        fetchPublishStatus();
      } else {
        toast.error('Failed to delete slot');
      }
    } catch (e) {
      toast.error('An unexpected error occurred');
    }
  };

  const handleEdit = (slot) => {
    setEditingSlotId(slot.id);
    setFormData({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: slot.type,
      subjectId: slot.subjectId || ''
    });
    setShowModal(true);
  };

  const handleGenerate = async () => {
    if (!confirm('This will automatically fill empty lesson slots using the "Periods Per Week" defined in Class Subjects. It also checks for teacher clashes across the school. Proceed?')) return;

    setGenerationLoading(true);
    try {
      const response = await api.post(`/api/timetable/generate/${selectedClassId}`);
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Timetable generated successfully!');
        setGenerationReport(data);
        fetchTimetable();
        fetchPublishStatus();
      } else {
        toast.error(data.error || 'Failed to generate timetable');
      }
    } catch (e) {
      toast.error('An error occurred during generation');
    } finally {
      setGenerationLoading(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!confirm('🚀 GLOBAL GENERATION: This will intelligently fill ALL lesson slots for EVERY class in the school simultaneously, ensuring NO teacher clashes across different classes. This is the recommended way to build a conflict-free school timetable. Proceed?')) return;

    setGenerationLoading(true);
    try {
      const response = await api.post('/api/timetable/generate-all');
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Whole-school timetable generated!');
        setGenerationReport(data);
        if (selectedClassId) {
          fetchTimetable();
          fetchPublishStatus();
        }
      } else {
        toast.error(data.error || 'Global generation failed');
      }
    } catch (e) {
      toast.error('An error occurred during global generation');
    } finally {
      setGenerationLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSlotId) {
        // Logic for Edit
        await api.patch(`/api/timetable/${editingSlotId}`, { ...formData });
      } else {
        // DUPLICATION CHECK: Check if slot already exists in local state
        const isDuplicate = schedule.some(s =>
          s.dayOfWeek === formData.dayOfWeek &&
          s.startTime === formData.startTime &&
          s.endTime === formData.endTime
        );

        if (isDuplicate) {
          if (!confirm('⚠️ A slot already exists at this time. Adding another will create a duplication. Continue?')) {
            return;
          }
        }

        await api.post('/api/timetable', { ...formData, classId: selectedClassId });
      }

      setShowModal(false);
      setEditingSlotId(null);
      fetchTimetable();
      fetchPublishStatus();
      if (isAdmin) fetchAllTimetables(); // Sync the overview cards

      toast.success(editingSlotId ? 'Slot updated' : 'New slot added');
      setFormData({
        dayOfWeek: 'Monday',
        startTime: '08:00',
        endTime: '08:40',
        type: 'lesson',
        subjectId: ''
      });
    } catch (e) {
      toast.error(e.message || 'Failed to save. Check your inputs.');
    }
  };

  const handleSync = async () => {
    if (targetClassIds.length === 0) {
      toast.error('Please select at least one target class');
      return;
    }

    setSyncLoading(true);
    try {
      const response = await api.post('/api/timetable/sync', {
        sourceClassId: selectedClassId,
        targetClassIds
      });

      if (response.ok) {
        toast.success(`Schedule synced to ${targetClassIds.length} classes!`);
        setShowSyncModal(false);
        setTargetClassIds([]);
        if (isAdmin) fetchAllTimetables(); // Refresh overview cards
      } else {
        const error = await response.json();
        toast.error(error.error || 'Sync failed');
      }
    } catch (e) {
      toast.error('Sync failed: Network error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDaySync = async () => {
    if (targetDays.length === 0) {
      toast.error('Select at least one day to copy to');
      return;
    }

    setDaySyncLoading(true);
    try {
      const response = await api.post('/api/timetable/sync-days', {
        classId: selectedClassId,
        sourceDay,
        targetDays
      });

      if (response.ok) {
        toast.success(`Structure from ${sourceDay} copied!`);
        setShowDaySyncModal(false);
        setTargetDays([]);
        fetchTimetable();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Sync failed');
      }
    } catch (e) {
      toast.error('Sync failed: Network error');
    } finally {
      setDaySyncLoading(false);
    }
  };

  const handlePublishToggle = async () => {
    const willPublish = !publishStatus.isPublished;
    if (!confirm(`Are you sure you want to ${willPublish ? 'publish' : 'unpublish'} this timetable?`)) return;

    try {
      const response = await api.patch(`/api/timetable/class/${selectedClassId}/publish`, {
        isPublished: willPublish
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(willPublish ? '📅 Timetable Published!' : '📝 Timetable set to Draft');
        setPublishStatus({ ...publishStatus, isPublished: willPublish });
        fetchTimetable();
      } else {
        toast.error('Failed to update status');
      }
    } catch (e) {
      toast.error('Connection error');
    }
  };

  const handleResetClass = async () => {
    if (!selectedClassId) return;
    const className = classes.find(c => c.id === parseInt(selectedClassId))?.name || 'this class';
    if (!confirm(`⚠️ CRITICAL: This will PERMANENTLY DELETE all timetable slots for ${className}. This cannot be undone. Are you sure?`)) return;

    try {
      const response = await api.delete(`/api/timetable/reset/class/${selectedClassId}`);
      if (response.ok) {
        toast.success(`Timetable for ${className} has been reset.`);
        fetchTimetable();
        fetchPublishStatus();
      } else {
        toast.error('Failed to reset class timetable');
      }
    } catch (e) {
      toast.error('Network error occurred');
    }
  };

  const handleResetAll = async () => {
    if (!confirm('🛑 WARNING: This will PERMANENTLY DELETE ALL timetable slots for EVERY class in the school. This is a massive action. Are you absolutely sure?')) return;
    if (!confirm('Please confirm one more time: Do you want to wipe the ENTIRE school timetable?')) return;

    try {
      const response = await api.delete('/api/timetable/reset/all');
      if (response.ok) {
        toast.success('All school timetables have been wiped.');
        fetchTimetable();
        fetchPublishStatus();
      } else {
        toast.error('Failed to reset all timetables');
      }
    } catch (e) {
      toast.error('Network error occurred');
    }
  };

  const handleClearSubjects = async () => {
    if (!selectedClassId) return;
    if (!confirm('This will keep the time periods (slots) but remove all assigned subjects. Perfect for starting a new term. Proceed?')) return;

    try {
      const response = await api.patch(`/api/timetable/reset/class/${selectedClassId}/clear-subjects`);
      if (response.ok) {
        toast.success('All subjects cleared! You can now re-enter or generate them.');
        fetchTimetable();
      } else {
        toast.error('Failed to clear subjects');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const handleResetDay = async (day) => {
    if (!selectedClassId) return;
    if (!confirm(`Wipe all slots for ${day}? This cannot be undone.`)) return;

    try {
      const response = await api.delete(`/api/timetable/reset/class/${selectedClassId}/day/${day}`);
      if (response.ok) {
        toast.success(`${day}'s schedule has been reset.`);
        fetchTimetable();
        fetchPublishStatus();
      } else {
        toast.error('Failed to reset day');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const handleUpdatePeriods = async (classSubjectId, periods) => {
    try {
      const response = await api.patch(`/api/class-subjects/${classSubjectId}/periods`, {
        periodsPerWeek: periods
      });

      if (response.ok) {
        setClassSubjects(prev => prev.map(cs =>
          cs.id === classSubjectId ? { ...cs, periodsPerWeek: periods } : cs
        ));
      } else {
        toast.error('Failed to update quota');
      }
    } catch (error) {
      console.error('Error updating periods:', error);
      toast.error('Network error');
    }
  };

  const handleDownload = (providedSchedule = null, providedClassId = null) => {
    const scheduleToUse = providedSchedule || schedule;
    const classIdToUse = providedClassId || selectedClassId;
    const selectedClass = classes.find(c => c.id === parseInt(classIdToUse));
    const className = selectedClass ? `${selectedClass.name} ${selectedClass.arm || ''}` : 'Class';

    // Create printable content
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Timetable - ' + className + '</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: Arial, sans-serif; padding: 20px; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-top: 20px; }');
    printWindow.document.write('th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }');
    printWindow.document.write(`th { background-color: ${settings?.primaryColor || '#0f766e'}; color: white; }`);
    printWindow.document.write('.header { text-align: center; margin-bottom: 20px; }');
    printWindow.document.write('.short_break { background-color: #ffedd5; }');
    printWindow.document.write('.long_break { background-color: #fed7aa; }');
    printWindow.document.write('.prayer { background-color: #15803d; color: white !important; }');
    printWindow.document.write('.prep { background-color: #e0f2fe; }');
    printWindow.document.write('.games { background-color: #fef9c3; }');
    printWindow.document.write('.extra { background-color: #ccfbf1; }');
    printWindow.document.write('.assembly { background-color: #e9d5ff; }');
    printWindow.document.write('.lesson { background-color: #dbeafe; }');
    printWindow.document.write('</style></head><body>');

    printWindow.document.write('<div class="header">');
    printWindow.document.write('<h1>Class Timetable</h1>');
    printWindow.document.write('<h2>' + className + '</h2>');
    printWindow.document.write('<p>Academic Year: ' + new Date().getFullYear() + '/' + (new Date().getFullYear() + 1) + '</p>');
    printWindow.document.write('</div>');

    printWindow.document.write('<table>');
    printWindow.document.write('<thead><tr><th>Time</th>');
    DAYS.forEach(day => {
      printWindow.document.write('<th>' + day + '</th>');
    });
    printWindow.document.write('</tr></thead><tbody>');

    // Get all unique time slots
    const timeSlots = [...new Set(scheduleToUse.map(s => `${s.startTime}-${s.endTime}`))].sort();

    timeSlots.forEach(timeSlot => {
      printWindow.document.write('<tr>');
      printWindow.document.write('<td><strong>' + timeSlot + '</strong></td>');

      DAYS.forEach(day => {
        const slot = scheduleToUse.find(s => s.dayOfWeek === day && `${s.startTime}-${s.endTime}` === timeSlot);
        if (slot) {
          let cssClass = 'lesson';
          if (slot.type === 'short_break') cssClass = 'short_break';
          if (slot.type === 'long_break') cssClass = 'long_break';
          if (slot.type === 'prayer') cssClass = 'prayer';
          if (slot.type === 'prep') cssClass = 'prep';
          if (slot.type === 'games') cssClass = 'games';
          if (slot.type === 'extra-curricular') cssClass = 'extra';
          if (slot.type === 'assembly') cssClass = 'assembly';

          let content = slot.subject?.name || '-';
          if (slot.type === 'short_break') content = 'Short Break';
          if (slot.type === 'long_break') content = 'Long Break';
          if (slot.type === 'prayer') content = 'Prayer';
          if (slot.type === 'prep') content = 'Prep';
          if (slot.type === 'games') content = 'Games';
          if (slot.type === 'extra-curricular') content = 'Extra-curricular';
          if (slot.type === 'assembly') content = 'Assembly';

          printWindow.document.write('<td class="' + cssClass + '">' + content + '</td>');
        } else {
          printWindow.document.write('<td>-</td>');
        }
      });

      printWindow.document.write('</tr>');
    });

    printWindow.document.write('</tbody></table>');
    printWindow.document.write('<p style="margin-top: 20px; text-align: center; color: #666;">Generated on ' + new Date().toLocaleString() + '</p>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  const renderTimetableGrid = (targetSchedule, targetClassId, isOverview = false) => {
    const slotsByDay = getScheduleByDay(targetSchedule);

    if (targetSchedule.length === 0) {
      return (
        <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <div className="text-gray-400 mb-2 font-medium">No slots defined for this class yet</div>
          {isAdmin && (
            <button
              onClick={() => {
                setSelectedClassId(targetClassId);
                setEditingSlotId(null);
                setFormData({
                  dayOfWeek: 'Monday',
                  startTime: '08:00',
                  endTime: '08:40',
                  type: 'lesson',
                  subjectId: ''
                });
                setShowModal(true);
              }}
              className="text-primary hover:underline font-bold text-sm bg-primary/5 px-3 py-1 rounded"
            >
              + Create Timeline
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {DAYS.map(day => (
          <div key={day} className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
            <div className="p-2 bg-slate-50 border-b font-bold text-center text-slate-700 text-xs uppercase tracking-wider flex justify-between items-center group/header">
              <span className="flex-1 text-center">{day}</span>
              {isAdmin && (
                <div className="flex gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSourceDay(day);
                      setSelectedClassId(targetClassId);
                      setTargetDays(DAYS.filter(d => d !== day));
                      setShowDaySyncModal(true);
                    }}
                    title={`Copy ${day}'s structure to other days`}
                    className="p-1 hover:bg-slate-200 rounded transition-colors text-slate-500"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClassId(targetClassId);
                      handleResetDay(day);
                    }}
                    title={`Reset ${day}`}
                    className="p-1 hover:bg-red-50 rounded transition-colors text-red-400"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="p-2 space-y-1.5 flex-1 min-h-[80px]">
              {slotsByDay[day]?.length === 0 && (
                <p className="text-[9px] text-gray-300 text-center py-4 italic">Free Period</p>
              )}
              {slotsByDay[day]?.map(slot => (
                <div key={slot.id} className={`p-2 rounded border text-[11px] relative group transition-all hover:shadow-sm ${slot.type === 'short_break' || slot.type === 'long_break' ? 'bg-orange-50 border-orange-100' :
                  slot.type === 'prayer' ? 'bg-emerald-600 border-emerald-700 text-white' :
                    slot.type === 'prep' ? 'bg-sky-50 border-sky-100' :
                      slot.type === 'games' ? 'bg-yellow-50 border-yellow-100' :
                        slot.type === 'extra-curricular' ? 'bg-teal-50 border-teal-100' :
                          slot.type === 'assembly' ? 'bg-purple-50 border-purple-100' :
                            'bg-blue-50 border-blue-100'
                  }`}>
                  <div className={`font-bold ${slot.type === 'prayer' ? 'text-white' : 'text-slate-900'} mb-0.5`}>
                    {slot.startTime} - {slot.endTime}
                  </div>
                  <div className={`font-semibold ${slot.type === 'prayer' ? 'text-emerald-50' : 'text-slate-600'} line-clamp-1`}>
                    {slot.type === 'short_break' ? '☕ Short Break' :
                      slot.type === 'long_break' ? '🍴 Long Break' :
                        slot.type === 'prayer' ? '🕌 Prayer' :
                          slot.type === 'prep' ? '📚 Prep' :
                            slot.type === 'games' ? '⚽ Games' :
                              slot.type === 'extra-curricular' ? '🌟 Extra-curricular' :
                                slot.type === 'assembly' ? '📢 Assembly' :
                                  (slot.subject?.name || 'Empty Slot')}
                  </div>
                  {slot.teacher && (
                    <div className={`text-[9px] ${slot.type === 'prayer' ? 'text-emerald-100' : 'text-primary'} font-bold mt-1.5 flex items-center gap-1 opacity-90`}>
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {slot.teacher.firstName} {slot.teacher.lastName}
                    </div>
                  )}

                  {isAdmin && (
                    <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClassId(targetClassId);
                          handleEdit(slot);
                        }}
                        className="bg-white text-blue-500 hover:text-blue-700 rounded shadow-sm border p-1"
                        title="Edit"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(slot.id);
                        }}
                        className="bg-white text-red-500 hover:text-red-700 rounded shadow-sm border p-1"
                        title="Delete"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Group by Day
  const scheduleByDay = getScheduleByDay(schedule);

  // Statistics Calculations
  const allLessonSlots = Object.values(allSchedules).flat().filter(s => s.type === 'lesson');
  const totalLessonSlots = allLessonSlots.length;
  const nonBreakTeachers = teachers.filter(t => t.user?.isActive);
  const averageSlotsPerTeacher = nonBreakTeachers.length > 0 ? (totalLessonSlots / nonBreakTeachers.length).toFixed(1) : 0;

  const teacherStats = nonBreakTeachers.map(t => {
    const count = allLessonSlots.filter(s => s.teacher?.id === t.userId).length;
    let status = 'optimum';
    const avg = parseFloat(averageSlotsPerTeacher);

    if (count > avg * 1.3) status = 'overloaded'; // 30% above average
    else if (count < avg * 0.7) status = 'underloaded'; // 30% below average

    return {
      id: t.userId,
      name: `${t.user.firstName} ${t.user.lastName}`,
      count,
      status
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight italic">
            {user?.role === 'student' ? 'Academic Schedule' : 'Operation: Timetable'}
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">Tactical School Management Unit</p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <button
              onClick={handleGenerateAll}
              disabled={generationLoading}
              className={`bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2 ${generationLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <svg className={`w-4 h-4 ${generationLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.675.337a4 4 0 01-2.58.344l-2.316-.463a2 2 0 01-1.295-.864l-1.058-1.588a2 2 0 01-.13-1.838l.417-1.043a4 4 0 012.312-2.312l1.043-.417a2 2 0 011.838.13l1.588 1.058a2 2 0 01.864 1.295l.463 2.316a4 4 0 00.344 2.58l.337.675a6 6 0 00.517 3.86l.477 2.387a2 2 0 00.547 1.022l1.588 1.058a2 2 0 002.828-2.828l-1.058-1.588z" />
              </svg>
              {generationLoading ? 'Running Optimizer...' : 'Auto-Gen All Classes'}
            </button>
            <button
              onClick={handleResetAll}
              className="bg-white text-red-600 border-2 border-red-50 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-50 active:scale-95 transition-all shadow-xl shadow-red-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Wipe Core Structure
            </button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Unit Statistics */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-indigo-600 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
              <p className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.3em] mb-4">Total Capacity</p>
              <h4 className="text-5xl font-black text-white tracking-tighter mb-1">{totalLessonSlots}</h4>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Active Lesson Slots</p>
            </div>

            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Load Balance</p>
              <h4 className="text-4xl font-black text-slate-800 tracking-tighter mb-1">{averageSlotsPerTeacher}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Periods / Staff</p>
            </div>
          </div>

          {/* Teacher Deployment Matrix */}
          <div className="lg:col-span-3 bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Staff Utilization Matrix</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Cross-departmental work-load analysis</p>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-200"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Over</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ideal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-pink-400 shadow-lg shadow-pink-200"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Under</span>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[320px] custom-scrollbar">
              {teacherStats.map(stat => (
                <div
                  key={stat.id}
                  className={`p-5 rounded-[24px] border-2 transition-all hover:scale-[1.02] active:scale-95 cursor-default group ${stat.status === 'overloaded' ? 'bg-red-50/20 border-red-50' :
                    stat.status === 'underloaded' ? 'bg-pink-50/20 border-pink-100' :
                      'bg-slate-50/30 border-slate-50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center font-black text-[12px] shadow-sm ${stat.status === 'overloaded' ? 'bg-red-500 text-white' :
                      stat.status === 'underloaded' ? 'bg-pink-400 text-white' :
                        'bg-slate-900 text-white'
                      }`}>
                      {stat.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-slate-800 tracking-tighter block">{stat.count}</span>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest -mt-1 underline decoration-primary/20">Periods</p>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 truncate mb-0.5">{stat.name}</h5>
                    <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${stat.status === 'overloaded' ? 'text-red-500' :
                      stat.status === 'underloaded' ? 'text-pink-500' :
                        'text-emerald-600'
                      }`}>
                      {stat.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-[48px] shadow-sm border border-slate-100 p-8">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-10 border-b border-slate-50 pb-8">
          {user?.role !== 'student' && (
            <div className="w-full md:w-1/3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 block">Deployment Perspective</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-700 uppercase text-[11px] tracking-widest focus:border-primary outline-none transition-all"
              >
                <option value="">-- All Units Overview --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {user?.role === 'parent' ? `${c.studentName} (${c.name} ${c.arm || ''})` : `${c.name} ${c.arm || ''}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-4">
            {selectedClassId && (
              <div className={`px-6 py-4 rounded-2xl flex items-center gap-3 border-2 ${publishStatus.isPublished ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                <div className={`w-2 h-2 rounded-full ${publishStatus.isPublished ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  {publishStatus.isPublished ? 'Public Broadcast' : 'Draft Protocol'}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              {isAdmin && selectedClassId && (
                <>
                  <button
                    onClick={handleGenerate}
                    disabled={generationLoading}
                    className="bg-indigo-50 text-indigo-700 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 border-indigo-100"
                  >
                    Flash Gen Class
                  </button>
                  <button
                    onClick={handlePublishToggle}
                    className={`px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2 ${publishStatus.isPublished ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200'}`}
                  >
                    {publishStatus.isPublished ? 'Revert to Draft' : 'Authorize Live'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingSlotId(null);
                      setFormData({ dayOfWeek: 'Monday', startTime: '08:00', endTime: '08:40', type: 'lesson', subjectId: '' });
                      setShowModal(true);
                    }}
                    className="bg-primary text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
                  >
                    + Manual Add
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* View Logic */}
        {isAdmin && !selectedClassId ? (
          <div className="grid grid-cols-1 gap-6">
            {classes.map(cls => (
              <div key={cls.id} className={`bg-white rounded-[32px] transition-all duration-500 ${expandedClasses.has(cls.id) ? 'shadow-2xl ring-2 ring-primary/5' : 'shadow-sm border border-slate-100 hover:border-primary/20 group'}`}>
                <button onClick={() => toggleClassExpansion(cls.id)} className={`w-full px-10 py-8 flex items-center justify-between outline-none ${expandedClasses.has(cls.id) ? 'border-b border-slate-50' : ''}`}>
                  <div className="flex items-center gap-8">
                    <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center font-black text-2xl shadow-inner transition-all transform ${allSchedules[cls.id]?.length > 0 ? 'bg-slate-900 text-white scale-110 -rotate-2' : 'bg-slate-50 text-slate-200'}`}>
                      {cls.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-black text-slate-800 text-xl leading-none uppercase tracking-tight">{cls.name} {cls.arm || ''}</h3>
                        {allSchedules[cls.id]?.some(s => s.isPublished) && <span className="bg-emerald-500 text-white text-[8px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest">Live</span>}
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{allSchedules[cls.id]?.length || 0} Slots Scheduled</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">|</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Set(allSchedules[cls.id]?.filter(s => s.subjectId).map(s => s.subjectId)).size} Subjects Active</span>
                      </div>
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${expandedClasses.has(cls.id) ? 'bg-primary text-white rotate-180 shadow-lg shadow-primary/20' : 'bg-slate-50 text-slate-300 group-hover:bg-slate-100 group-hover:text-primary group-hover:scale-110'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>
                {expandedClasses.has(cls.id) && (
                  <div className="p-10 bg-slate-50/10 border-t border-slate-50 animate-in fade-in duration-500">
                    {renderTimetableGrid(allSchedules[cls.id] || [], cls.id)}
                    <div className="mt-8 flex gap-4 pt-6 border-t border-slate-100">
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(allSchedules[cls.id] || [], cls.id); }} className="bg-white border text-slate-600 px-6 py-3 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-50 transition-all shadow-sm">Export Registry</button>
                      <button onClick={() => { setSourceDay('Monday'); setSelectedClassId(cls.id); setShowDaySyncModal(true); }} className="text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 pl-4 border-l border-slate-200">Replicate Structure</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {selectedClassId ? (
              <div className="relative">
                {renderTimetableGrid(schedule, selectedClassId)}
                <div className="mt-10 flex justify-between items-center border-t border-slate-100 pt-8">
                  <div className="flex gap-4">
                    <button onClick={handleResetClass} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:underline">Reset Unit Registry</button>
                    <button onClick={() => setShowSyncModal(true)} className="text-[10px] font-black uppercase tracking-widest text-purple-600 hover:underline pl-4 border-l border-slate-200">Replicate to multiple targets</button>
                  </div>
                  <button onClick={handleDownload} className="bg-slate-50 text-slate-600 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 hover:text-white transition-all border border-slate-100">Standard Export</button>
                </div>
              </div>
            ) : (
              <div className="text-center py-40 bg-slate-50 rounded-[60px] border-2 border-dashed border-slate-100">
                <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight italic">Terminal Ready</h3>
                <p className="text-slate-400 font-black text-[11px] max-w-xs mx-auto uppercase tracking-[0.3em]">Select a deployment unit to initiate visualization.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analytics: Quota Utilization */}
      {isAdmin && selectedClassId && classSubjects.length > 0 && (
        <div className="mt-12 bg-white rounded-[40px] shadow-sm border border-slate-100 p-10">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Subject Quota Analytics</h2>
              <div className="flex items-center gap-6">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Structure: <span className="text-slate-900">{schedule.filter(s => s.type === 'lesson').length} Slots</span></span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Allocation: <span className="text-slate-900">{classSubjects.reduce((acc, cs) => acc + (cs.periodsPerWeek || 0), 0)} Periods</span></span>
              </div>
            </div>
            <button onClick={() => navigate('/dashboard/class-subjects')} className="bg-slate-50 text-slate-400 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 hover:text-white transition-all">Configure Syllabus</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {classSubjects.map(cs => {
              const used = schedule.filter(s => s.subjectId === cs.subjectId && s.type === 'lesson').length;
              const quota = cs.periodsPerWeek || 0;
              const isOver = used > quota;
              const isUnder = used < quota;

              return (
                <div key={cs.id} className={`p-6 rounded-[32px] border-2 transition-all ${isOver ? 'bg-red-50/30 border-red-100' : isUnder ? 'bg-amber-50/30 border-amber-100' : 'bg-emerald-50/30 border-emerald-100'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <span className="font-black text-slate-800 uppercase text-[11px] tracking-tight truncate pr-4">{cs.subject.name}</span>
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${isOver ? 'bg-red-500 text-white' : isUnder ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
                      {used}/{quota}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex-1">Weekly Target</label>
                      <input
                        type="number"
                        value={cs.periodsPerWeek || 0}
                        onChange={(e) => handleUpdatePeriods(cs.id, parseInt(e.target.value) || 0)}
                        className="w-10 text-center bg-transparent font-black text-slate-900 outline-none"
                      />
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ${isOver ? 'bg-red-500' : isUnder ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min((used / (quota || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                    {isOver && <p className="text-[9px] text-red-500 font-black uppercase tracking-widest animate-bounce">⚠️ OVER-CAPACITY: {used - quota} Slots</p>}
                    {isUnder && quota > 0 && <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest">⏳ UNDER-CAPACITY: {quota - used} Slots</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deployment Modals (Add Slot) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl p-10 w-full max-w-xl border border-slate-100 animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Configure Slot</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Initialize Temporal Parameters</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all text-2xl font-black">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Temporal Unit (Day)</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-primary transition-all"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Interaction Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-primary transition-all"
                  >
                    <option value="lesson">Lesson</option>
                    <option value="assembly">Assembly</option>
                    <option value="short_break">Short Break</option>
                    <option value="long_break">Long Break</option>
                    <option value="prayer">Prayer</option>
                    <option value="prep">Prep</option>
                    <option value="games">Games</option>
                    <option value="extra-curricular">Extra-curricular</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Start Phase</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">End Phase</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {formData.type === 'lesson' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Subject Assignment</label>
                  <select
                    value={formData.subjectId}
                    onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-primary transition-all"
                  >
                    <option value="">-- Auto-Generation Buffer --</option>
                    {classSubjects.map(cs => {
                      const used = schedule.filter(s => s.subjectId === cs.subjectId && s.type === 'lesson').length;
                      const quota = cs.periodsPerWeek || 0;
                      return (
                        <option key={cs.id} value={cs.subjectId}>
                          {cs.subject.name} ({used}/{quota} Units)
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-50 text-slate-400 px-8 py-5 rounded-[24px] font-black uppercase text-[11px] tracking-widest hover:bg-slate-100 transition-all">Abort</button>
                <button type="submit" className="flex-[2] bg-primary text-white px-8 py-5 rounded-[24px] font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-primary/30 hover:brightness-110 transition-all">Commit Configuration</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Synchronize Blueprint Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl p-10 w-full max-w-xl border border-slate-100 animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Global Sync</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Propagating structure across units</p>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all text-2xl font-black">&times;</button>
            </div>

            <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed">Select target units to adopt the temporal framework from <span className="text-primary">{classes.find(c => c.id === parseInt(selectedClassId))?.name}</span>.</p>

            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto mb-10 pr-2 custom-scrollbar">
              {classes.filter(c => c.id !== parseInt(selectedClassId)).map(c => (
                <label key={c.id} className={`flex items-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${targetClassIds.includes(c.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-50 hover:border-slate-100'}`}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={targetClassIds.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) setTargetClassIds([...targetClassIds, c.id]);
                      else setTargetClassIds(targetClassIds.filter(id => id !== c.id));
                    }}
                  />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${targetClassIds.includes(c.id) ? 'text-indigo-600' : 'text-slate-400'}`}>{c.name} {c.arm}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  const allOtherIds = classes.filter(c => c.id !== parseInt(selectedClassId)).map(c => c.id);
                  setTargetClassIds(targetClassIds.length === allOtherIds.length ? [] : allOtherIds);
                }}
                className="flex-1 bg-slate-50 text-slate-400 px-8 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all"
              >
                Toggle Universe
              </button>
              <button
                onClick={handleSync}
                disabled={syncLoading || targetClassIds.length === 0}
                className="flex-[2] bg-indigo-600 text-white px-8 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-200 hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {syncLoading ? 'Syncing...' : 'Initiate Propagation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temporal Port Modal (Day Sync) */}
      {showDaySyncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl p-10 w-full max-w-lg border border-slate-100 animate-in zoom-in-95 duration-500">
            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Phase Mirror</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10">Replicating {sourceDay} Parameters</p>

            <div className="grid grid-cols-2 gap-4 mb-10">
              {DAYS.filter(day => day !== sourceDay).map(day => (
                <label key={day} className={`flex items-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${targetDays.includes(day) ? 'bg-primary/10 border-primary' : 'bg-slate-50 border-slate-50 hover:border-slate-100'}`}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={targetDays.includes(day)}
                    onChange={(e) => {
                      if (e.target.checked) setTargetDays([...targetDays, day]);
                      else setTargetDays(targetDays.filter(d => d !== day));
                    }}
                  />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${targetDays.includes(day) ? 'text-primary' : 'text-slate-400'}`}>{day}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowDaySyncModal(false)} className="flex-1 bg-slate-50 text-slate-400 px-8 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
              <button onClick={handleDaySync} disabled={daySyncLoading || targetDays.length === 0} className="flex-[2] bg-primary text-white px-8 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/30 hover:brightness-110 disabled:opacity-50 transition-all">Confirm Mirror</button>
            </div>
          </div>
        </div>
      )}

      {/* Optimization Intelligence Reports (Conflict Report Modal) */}
      {generationReport && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[110] animate-in fade-in duration-500">
          <div className="bg-white rounded-[50px] shadow-2xl p-12 w-full max-w-2xl border border-slate-100 animate-in slide-in-from-bottom-10 duration-700">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">System Diagnostics</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-medium">Generation Integrity Report</p>
              </div>
              <button onClick={() => setGenerationReport(null)} className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all text-3xl font-black">&times;</button>
            </div>

            <div className={`p-6 rounded-[32px] mb-8 font-bold text-sm leading-relaxed ${generationReport.conflicts?.length > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {generationReport.message}
            </div>

            {generationReport.conflicts?.length > 0 && (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                {generationReport.conflicts.map((c, i) => (
                  <div key={i} className="bg-slate-50 rounded-[32px] p-8 border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="bg-white px-4 py-2 rounded-xl text-[10px] font-black text-slate-900 uppercase tracking-widest shadow-sm">{c.day} | {c.time}</span>
                      {c.class && <span className="text-primary font-black uppercase text-[10px] tracking-widest">Unit: {c.class}</span>}
                    </div>
                    <p className="text-slate-600 font-bold mb-4 leading-relaxed">{c.reason}</p>
                    {c.solution && (
                      <div className="bg-indigo-600 text-white rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
                        Recommendation: {c.solution}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-10 pt-8 border-t border-slate-50">
              <button
                onClick={() => setGenerationReport(null)}
                className="w-full bg-slate-900 text-white px-8 py-5 rounded-[24px] font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-slate-200 hover:scale-[1.02] transition-all"
              >
                Acknowledge & Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;
