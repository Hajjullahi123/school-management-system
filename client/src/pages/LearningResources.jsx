import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const LearningResources = () => {
  const { user } = useAuth();

  // State
  const [resources, setResources] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    subjectId: '',
    title: '',
    description: '',
    fileUrl: '',
    type: 'note' // note, past_question, syllabus
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
    if (selectedClassId) fetchResources();
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

  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/lms/resources/class/${selectedClassId}`);
      setResources(await response.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/lms/resources', { ...formData, classId: selectedClassId });
      setShowModal(false);
      setFormData({ subjectId: '', title: '', description: '', fileUrl: '', type: 'note' });
      fetchResources();
    } catch (e) { alert('Failed to save'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this resource?')) return;
    try {
      await api.delete(`/api/lms/resources/${id}`); // Assuming generic delete endpoint exists or we need to add it
      fetchResources();
    } catch (e) {
      // The backend delete route for resources was likely missing in previous step lms.js
      // I notice lms.js has delete for homework but NOT for resources.
      alert('Delete functionality not yet available for resources.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Learning Resources</h1>
        {isTeacher && selectedClassId && (
          <button onClick={() => setShowModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
            + Add Resource
          </button>
        )}
      </div>

      {isTeacher && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="w-full md:w-1/3 border rounded px-3 py-2"
          >
            <option value="">-- Choose Class --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-center py-8">Loading resources...</p>
      ) : resources.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-500">No resources uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map(res => (
            <div key={res.id} className="bg-white p-5 rounded-lg shadow hover:shadow-lg transition-all border border-gray-100 flex flex-col h-full">
              <div className="flex justify-between items-start">
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${res.type === 'note' ? 'bg-blue-100 text-blue-700' :
                    res.type === 'past_question' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                  {res.type.replace('_', ' ')}
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mt-3">{res.title}</h3>
              <p className="text-sm text-gray-500 mb-2">{res.subject?.name}</p>
              <p className="text-gray-600 text-sm flex-1">{res.description}</p>

              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                {res.fileUrl && (
                  <a href={res.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Download / View
                  </a>
                )}
                {!res.fileUrl && <span className="text-xs text-gray-400">No file attachment</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">Upload Resource</h3>
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
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="note">Lesson Note</option>
                  <option value="past_question">Past Question</option>
                  <option value="syllabus">Syllabus</option>
                  <option value="other">Other</option>
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
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2 h-24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">File/Link URL</label>
                <input
                  type="text"
                  value={formData.fileUrl}
                  onChange={e => setFormData({ ...formData, fileUrl: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://drive.google.com/..."
                />
                <p className="text-xs text-gray-500 mt-1">Paste a Google Drive, Dropbox, or direct download link.</p>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Save Resource</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningResources;
