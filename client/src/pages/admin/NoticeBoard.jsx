import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

const NoticeBoard = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    audience: 'all' // all, student, teacher
  });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/notices');
      if (response.ok) {
        setNotices(await response.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this notice?')) return;
    try {
      await api.delete(`/api/notices/${id}`);
      fetchNotices();
    } catch (e) { alert('Failed to delete'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/notices', formData);
      if (response.ok) {
        setFormData({ title: '', content: '', audience: 'all' });
        fetchNotices();
        alert('Notice Posted!');
      } else {
        alert('Failed to post');
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Notice Board Management</h1>

      {/* Create Form */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-primary">
        <h2 className="text-lg font-semibold mb-4">Post New Announcement</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
              placeholder="e.g. Mid-Term Break Update"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              className="w-full border rounded px-3 py-2 h-24"
              required
              placeholder="Type your message here..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Audience</label>
            <select
              value={formData.audience}
              onChange={e => setFormData({ ...formData, audience: e.target.value })}
              className="w-full md:w-1/3 border rounded px-3 py-2"
            >
              <option value="all">Everyone</option>
              <option value="student">Students Only</option>
              <option value="teacher">Teachers Only</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-primary text-white px-6 py-2 rounded hover:brightness-90">
              Post Notice
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notices.map(notice => (
          <div key={notice.id} className="bg-white p-4 rounded-lg shadow border border-gray-100 relative">
            <div className="flex justify-between items-start mb-2">
              <span className={`text-xs uppercase font-bold px-2 py-1 rounded ${notice.audience === 'all' ? 'bg-purple-100 text-purple-700' :
                notice.audience === 'student' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                }`}>
                {notice.audience}
              </span>
              <button onClick={() => handleDelete(notice.id)} className="text-red-400 hover:text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
            <h3 className="font-bold text-gray-900">{notice.title}</h3>
            <p className="text-sm text-gray-600 mt-2 mb-4">{notice.content}</p>
            <p className="text-xs text-gray-400">Posted on {new Date(notice.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NoticeBoard;
