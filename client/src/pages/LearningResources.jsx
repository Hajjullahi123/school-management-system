import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../utils/toast';

const LearningResources = () => {
  const { user } = useAuth();

  // State
  const [resources, setResources] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]); // All classes/subjects teacher is assigned to
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    subjectId: '',
    title: '',
    description: '',
    type: 'note', // note, past_question, syllabus
    file: null,
    externalUrl: ''
  });

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    if (isTeacher) {
      fetchClasses();
      if (user?.role === 'teacher') {
        fetchTeacherAssignments();
      } else {
        fetchSubjects(); // Admins see all subjects
      }
    } else if (user?.role === 'student' && user?.student?.classId) {
      setSelectedClassId(user.student.classId);
    }
  }, [user]);

  useEffect(() => {
    if (selectedClassId) fetchResources();
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      if (response.ok) setClasses(await response.json());
    } catch (e) { console.error(e); }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/api/subjects');
      if (response.ok) setSubjects(await response.json());
    } catch (e) { console.error(e); }
  };

  const fetchTeacherAssignments = async () => {
    try {
      const response = await api.get(`/api/teacher-assignments/teacher/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setTeacherAssignments(data);
      }
    } catch (e) { console.error(e); }
  };
  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/lms/resources/class/${selectedClassId}`);
      if (response.ok) setResources(await response.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const data = new FormData();
    data.append('classId', selectedClassId);
    data.append('subjectId', formData.subjectId);
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('type', formData.type);
    data.append('externalUrl', formData.externalUrl);
    if (formData.file) data.append('file', formData.file);

    try {
      const url = editingId
        ? `${API_BASE_URL}/api/lms/resources/${editingId}`
        : `${API_BASE_URL}/api/lms/resources`;

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: data
      });

      if (response.ok) {
        toast.success(editingId ? 'Resource updated!' : 'Resource shared successfully!');
        setShowModal(false);
        setEditingId(null);
        setFormData({ subjectId: '', title: '', description: '', type: 'note', file: null, externalUrl: '' });
        fetchResources();
      } else {
        const contentType = response.headers.get('content-type');
        let errMsg = `Error ${response.status}`;
        if (contentType && contentType.includes('application/json')) {
          const err = await response.json();
          errMsg = err.error || err.message || errMsg;
        } else {
          errMsg = await response.text();
        }
        toast.error(errMsg.slice(0, 100));
      }
    } catch (e) {
      toast.error(`Sync error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (res) => {
    setEditingId(res.id);
    setFormData({
      subjectId: res.subjectId.toString(),
      title: res.title,
      description: res.description || '',
      type: res.type,
      file: null,
      externalUrl: res.fileUrl && !res.fileUrl.startsWith('/uploads/') ? res.fileUrl : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      const response = await api.delete(`/api/lms/resources/${id}`);
      if (response.ok) {
        toast.success('Resource deleted');
        fetchResources();
      }
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">E-Learning Resources</h1>
          <p className="text-gray-500 font-medium">Download lecture notes and study materials</p>
        </div>

        {isTeacher && selectedClassId && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            Share Note
          </button>
        )}
      </div>

      {isTeacher && (
        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 mb-8 max-w-md">
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Class Filter</label>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="w-full border-gray-200 rounded-2xl px-4 py-3 focus:ring-primary focus:border-primary font-bold shadow-sm"
          >
            <option value="">-- Choose a Class --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.arm}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mb-4"></div>
          <p className="text-gray-400 font-bold italic">Loading materials...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-20 bg-gray-50/50 rounded-[40px] border-4 border-dashed border-gray-200">
          <svg className="mx-auto h-20 w-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="mt-4 text-gray-500 font-black text-xl">No resources shared yet.</p>
          <p className="text-gray-400">Notes and study guides will appear here once posted.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {resources.map(res => (
            <div key={res.id} className="bg-white p-6 rounded-[35px] shadow-xl hover:shadow-2xl transition-all border border-gray-50 group flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${res.type === 'note' ? 'bg-blue-50 text-blue-600' :
                  res.type === 'past_question' ? 'bg-amber-50 text-amber-600' :
                    res.type === 'syllabus' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-gray-100 text-gray-500'
                  }`}>
                  {res.type.replace('_', ' ')}
                </span>
                {isTeacher && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(res)}
                      className="text-gray-300 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(res.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-1 group-hover:text-primary transition-colors">{res.title}</h3>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-4">
                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full"></span>
                {res.subject?.name}
              </div>

              <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-6">
                {res.description || 'No description provided for this resource.'}
              </p>

              <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">Shared By</p>
                  <p className="text-sm font-bold text-gray-700">{res.teacher?.firstName} {res.teacher?.lastName}</p>
                </div>
                {res.fileUrl && (
                  <a
                    href={res.fileUrl.startsWith('http') ? res.fileUrl : `${API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL}${res.fileUrl.startsWith('/') ? res.fileUrl : '/' + res.fileUrl}`}
                    target="_blank" rel="noopener noreferrer"
                    download={res.fileName || res.title}
                    className="p-3 bg-gray-50 text-primary rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm"
                    title={res.fileName || 'Download resource'}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl p-8 w-full max-w-lg border border-white/20 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 italic underline decoration-primary/30 underline-offset-8">
                {editingId ? 'Modify Resource' : 'Share Knowledge'}
              </h3>
              <button
                onClick={() => { setShowModal(false); setEditingId(null); setFormData({ subjectId: '', title: '', description: '', type: 'note', file: null, externalUrl: '' }); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Subject</label>
                  <select
                    value={formData.subjectId}
                    onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full border-gray-200 rounded-2xl px-4 py-3 font-bold"
                    required
                  >
                    <option value="">Select...</option>
                    {user?.role === 'teacher' ? (
                      teacherAssignments
                        .filter(a => a.classId === parseInt(selectedClassId))
                        .map(a => <option key={a.subjectId} value={a.subjectId}>{a.subject?.name}</option>)
                    ) : (
                      subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border-gray-200 rounded-2xl px-4 py-3 font-bold"
                  >
                    <option value="note">Lesson Note</option>
                    <option value="past_question">Past Paper</option>
                    <option value="syllabus">Syllabus</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border-gray-200 rounded-2xl px-4 py-3 font-bold"
                  placeholder="e.g. Intro to Quantum Theory"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Short Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border-gray-200 rounded-3xl px-4 py-3 font-bold h-24"
                  placeholder="Briefly explain what this resource is about..."
                />
              </div>

              <div className="bg-gray-50 p-6 rounded-[30px] border border-gray-200">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Choose Method</label>
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={e => setFormData({ ...formData, file: e.target.files[0], externalUrl: '' })}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${formData.file ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 hover:border-primary/50'
                        }`}
                    >
                      <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <span className="font-bold text-sm">{formData.file ? formData.file.name : 'Click to Upload Document'}</span>
                      <span className="text-[10px] text-gray-400 mt-1 uppercase font-black">Max 15MB • PDF, DOCX, etc.</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-[10px] font-black text-gray-300 uppercase">OR</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>

                  <div>
                    <input
                      type="url"
                      value={formData.externalUrl}
                      onChange={e => setFormData({ ...formData, externalUrl: e.target.value, file: null })}
                      className="w-full border-gray-200 rounded-2xl px-4 py-3 font-bold text-sm"
                      placeholder="Paste External Link (Drive, Cloud, etc.)"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); setFormData({ subjectId: '', title: '', description: '', type: 'note', file: null, externalUrl: '' }); }}
                  className="flex-1 px-4 py-4 border-2 border-gray-200 rounded-2xl font-black text-gray-400 hover:bg-gray-50 active:scale-95 transition-all uppercase tracking-widest text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || (!formData.file && !formData.externalUrl && !editingId)}
                  className="flex-1 px-4 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest text-sm"
                >
                  {saving ? 'Processing...' : editingId ? 'Update Note' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningResources;
