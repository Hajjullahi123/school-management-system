import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const Homework = () => {
  const { user } = useAuth();

  // State
  const [homeworks, setHomeworks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    subjectId: '',
    title: '',
    description: '',
    dueDate: ''
  });

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    if (isTeacher) {
      fetchClasses();
      fetchSubjects();
    } else if (user?.role === 'student' && user?.student?.classId) {
      setSelectedClassId(user.student.classId);
    }
  }, [user]);

  useEffect(() => {
    if (selectedClassId) {
      fetchHomework();
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
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

  const fetchHomework = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/lms/homework/class/${selectedClassId}`);
      setHomeworks(await response.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isTeacher) return;

    try {
      await api.post('/api/lms/homework', { ...formData, classId: selectedClassId });
      setShowModal(false);
      setFormData({ subjectId: '', title: '', description: '', dueDate: '' });
      fetchHomework();
    } catch (e) { alert('Failed to save'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this homework?')) return;
    try {
      await api.delete(`/api/lms/homework/${id}`);
      fetchHomework();
    } catch (e) { alert('Failed to delete'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Homework & Assignments</h1>
        {isTeacher && selectedClassId && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            + Assign Homework
          </button>
        )}
      </div>

      {/* Class Selection for Teacher */}
      {isTeacher && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full md:w-1/3 border rounded-md px-3 py-2"
          >
            <option value="">-- Choose Class --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.arm}</option>)}
          </select>
        </div>
      )}

      {/* Homework List */}
      {loading ? (
        <p className="text-center py-8">Loading assignments...</p>
      ) : homeworks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mt-2 text-gray-500">No homework assigned yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {homeworks.map(hw => (
            <div key={hw.id} className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                    {hw.subject?.name}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mt-2">{hw.title}</h3>
                  <p className="text-gray-600 mt-1 whitespace-pre-wrap">{hw.description}</p>
                </div>
                {isTeacher && (
                  <button onClick={() => handleDelete(hw.id)} className="text-red-400 hover:text-red-600">
                    Delete
                  </button>
                )}
              </div>
              <div className="mt-4 flex items-center gap-6 text-sm text-gray-500 border-t pt-4">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Due: {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString() : 'No Due Date'}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Assigned by: {hw.teacher?.firstName} {hw.teacher?.lastName}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">Assign Homework</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                  placeholder="Chapter 5 Exercises"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Instructions / Question</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2 h-32"
                  required
                  placeholder="Enter detailed instructions here..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Post Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Homework;
