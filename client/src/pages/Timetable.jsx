import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSchoolSettings } from '../hooks/useSchoolSettings';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const Timetable = () => {
  const { user } = useAuth();
  const { settings } = useSchoolSettings();

  // State
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [publishStatus, setPublishStatus] = useState({ isPublished: false, hasSlots: false });
  const [generationLoading, setGenerationLoading] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [generationReport, setGenerationReport] = useState(null);

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
      setClasses(await response.json());
    } catch (e) { console.error(e); }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/api/subjects');
      setSubjects(await response.json());
    } catch (e) { console.error(e); }
  };

  const fetchTimetable = async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/timetable/class/${selectedClassId}`);
      setSchedule(await response.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchPublishStatus = async () => {
    if (!selectedClassId) return;
    try {
      const response = await api.get(`/api/timetable/class/${selectedClassId}/status`);
      const data = await response.json();
      setPublishStatus(data);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this slot?')) return;
    try {
      await api.delete(`/api/timetable/${id}`);
      fetchTimetable();
      fetchPublishStatus();
    } catch (e) { alert('Failed to delete'); }
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
    if (!confirm('This will automatically assign subjects to all empty lesson slots while avoiding teacher clashes. Existing subjects in this class will be reassigned. Proceed?')) return;

    setGenerationLoading(true);
    try {
      const response = await api.post(`/api/timetable/generate/${selectedClassId}`);
      const data = await response.json();

      if (response.ok) {
        setGenerationReport(data);
        fetchTimetable();
        fetchPublishStatus();
      } else {
        alert(data.error || 'Failed to generate timetable');
      }
    } catch (e) {
      alert('An error occurred during generation');
    } finally {
      setGenerationLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSlotId) {
        // Logic for Edit - though backend doesn't have PUT yet, we'll use a PATCH route or simulate
        // Actually, let's just delete and re-add or add a PATCH in backend
        // For now, I'll update the backend to support PATCH /:id
        await api.patch(`/api/timetable/${editingSlotId}`, { ...formData });
      } else {
        await api.post('/api/timetable', { ...formData, classId: selectedClassId });
      }

      setShowModal(false);
      setEditingSlotId(null);
      fetchTimetable();
      fetchPublishStatus();
      setFormData({
        dayOfWeek: 'Monday',
        startTime: '08:00',
        endTime: '08:40',
        type: 'lesson',
        subjectId: ''
      });
    } catch (e) {
      alert('Failed to save. Make sure all fields are correct.');
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
        alert(data.message);
        setPublishStatus({ ...publishStatus, isPublished: willPublish });
        fetchTimetable();
      }
    } catch (e) {
      alert('Failed to update publish status');
    }
  };

  const handleDownload = () => {
    const selectedClass = classes.find(c => c.id === parseInt(selectedClassId));
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
    printWindow.document.write('.break { background-color: #fed7aa; }');
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
    const timeSlots = [...new Set(schedule.map(s => `${s.startTime}-${s.endTime}`))].sort();

    timeSlots.forEach(timeSlot => {
      printWindow.document.write('<tr>');
      printWindow.document.write('<td><strong>' + timeSlot + '</strong></td>');

      DAYS.forEach(day => {
        const slot = schedule.find(s => s.dayOfWeek === day && `${s.startTime}-${s.endTime}` === timeSlot);
        if (slot) {
          const cssClass = slot.type === 'break' ? 'break' : 'lesson';
          const content = slot.type === 'break' ? 'Break' : (slot.subject?.name || '-');
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

  // Group by Day
  const scheduleByDay = DAYS.reduce((acc, day) => {
    acc[day] = schedule.filter(s => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {user?.role === 'student' ? 'My Class Timetable' : 'Class Timetable'}
        </h1>
        <div className="flex gap-2">
          {isAdmin && selectedClassId && (
            <button
              onClick={handleGenerate}
              disabled={generationLoading}
              className={`bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-semibold flex items-center gap-2 ${generationLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <svg className={`w-5 h-5 ${generationLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.675.337a4 4 0 01-2.58.344l-2.316-.463a2 2 0 01-1.295-.864l-1.058-1.588a2 2 0 01-.13-1.838l.417-1.043a4 4 0 012.312-2.312l1.043-.417a2 2 0 011.838.13l1.588 1.058a2 2 0 01.864 1.295l.463 2.316a4 4 0 00.344 2.58l.337.675a6 6 0 00.517 3.86l.477 2.387a2 2 0 00.547 1.022l1.588 1.058a2 2 0 002.828-2.828l-1.058-1.588z" />
              </svg>
              {generationLoading ? 'Generating...' : 'Intelligent Generate'}
            </button>
          )}
          {isAdmin && selectedClassId && publishStatus.hasSlots && (
            <button
              onClick={handlePublishToggle}
              className={`px-4 py-2 rounded-md font-semibold transition-colors flex items-center gap-2 ${publishStatus.isPublished
                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                : 'bg-green-600 text-white hover:bg-green-700'
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={publishStatus.isPublished ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
              </svg>
              {publishStatus.isPublished ? 'Unpublish' : 'Publish'}
            </button>
          )}
          {selectedClassId && schedule.length > 0 && (publishStatus.isPublished || isAdmin) && (
            <button
              onClick={handleDownload}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download/Print
            </button>
          )}
          {isAdmin && selectedClassId && (
            <button
              onClick={() => {
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
              className="bg-primary text-white px-4 py-2 rounded-md hover:brightness-90 font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Slot
            </button>
          )}
        </div>
      </div>

      {/* Conflict Report Modal */}
      {generationReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">Generation Report</h3>
              <button onClick={() => setGenerationReport(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>

            <p className="mb-4 text-gray-600">{generationReport.message}</p>

            {generationReport.conflicts?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-red-600 mb-2">Conflicts Detected ({generationReport.conflicts.length}):</h4>
                <div className="max-h-60 overflow-y-auto border rounded bg-red-50 p-2 space-y-2">
                  {generationReport.conflicts.map((c, i) => (
                    <div key={i} className="text-sm border-b border-red-100 last:border-0 pb-1">
                      <span className="font-bold">{c.day} {c.time}:</span> {c.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setGenerationReport(null)}
                className="bg-primary text-white px-6 py-2 rounded-md font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Badge */}
      {selectedClassId && publishStatus.hasSlots && (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${publishStatus.isPublished
          ? 'bg-green-100 text-green-800'
          : 'bg-yellow-100 text-yellow-800'
          }`}>
          <span className={`w-2 h-2 rounded-full ${publishStatus.isPublished ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
          {publishStatus.isPublished ? 'Published - Visible to all' : 'Draft - Only visible to admins'}
        </div>
      )}

      {/* Selection for Admin and Teachers - Hidden for Students */}
      {user?.role !== 'student' && (
        <div className="bg-white p-4 rounded-lg shadow mb-6 text-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {user?.role === 'parent' ? 'Select Ward' : 'Select Class'}
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full md:w-1/3 border rounded-md px-3 py-2"
          >
            <option value="">-- Choose {user?.role === 'parent' ? 'Ward' : 'Class'} --</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {user?.role === 'parent' ? `${c.studentName} (${c.name} ${c.arm || ''})` : `${c.name} ${c.arm || ''}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Not Published Warning for Non-Admins */}
      {!isAdmin && selectedClassId && !publishStatus.isPublished && publishStatus.hasSlots && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-yellow-700">
              <strong>Timetable Not Published:</strong> The administrator has not yet published the timetable for this class.
            </p>
          </div>
        </div>
      )}

      {/* Grid View */}
      {selectedClassId ? (
        schedule.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {DAYS.map(day => (
              <div key={day} className="bg-white rounded-lg shadow flex flex-col h-full">
                <div className="p-3 bg-gradient-to-r from-primary to-primary/90 border-b font-bold text-center text-white rounded-t-lg">
                  {day}
                </div>
                <div className="p-2 space-y-2 flex-1 min-h-[200px]">
                  {scheduleByDay[day]?.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No classes</p>
                  )}
                  {scheduleByDay[day]?.map(slot => (
                    <div key={slot.id} className={`p-2 rounded border text-sm relative group ${slot.type === 'break' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
                      }`}>
                      <div className="font-semibold text-gray-900 text-xs">
                        {slot.startTime} - {slot.endTime}
                      </div>
                      <div className="text-gray-700 font-medium">
                        {slot.type === 'break' ? 'Break / Assembly' : slot.subject?.name}
                      </div>

                      {isAdmin && (
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(slot)}
                            className="bg-white text-blue-500 hover:text-blue-700 rounded-full w-5 h-5 flex items-center justify-center shadow-sm border"
                            title="Edit slot"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(slot.id)}
                            className="bg-white text-red-500 hover:text-red-700 rounded-full w-5 h-5 flex items-center justify-center shadow-sm border"
                            title="Delete slot"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 text-lg">No timetable available for this class</p>
            {isAdmin && (
              <p className="text-gray-400 text-sm mt-2">Click "Add Slot" to create timetable entries</p>
            )}
          </div>
        )
      ) : (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
          {user?.role === 'student'
            ? "You haven't been assigned to a class yet. Please contact the administrator."
            : "Please select a class to view the timetable."}
        </div>
      )}

      {/* Add Modal (Admin Only) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add Timetable Slot</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Day</label>
                <select
                  value={formData.dayOfWeek}
                  onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input type="radio" name="type" value="lesson" checked={formData.type === 'lesson'} onChange={() => setFormData({ ...formData, type: 'lesson' })} />
                    <span className="ml-2">Lesson</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="type" value="break" checked={formData.type === 'break'} onChange={() => setFormData({ ...formData, type: 'break' })} />
                    <span className="ml-2">Break</span>
                  </label>
                </div>
              </div>

              {formData.type === 'lesson' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Subject</label>
                  <select
                    value={formData.subjectId}
                    onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:brightness-90">Save Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;
