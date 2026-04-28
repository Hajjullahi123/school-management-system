import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatDateVerbose } from '../../utils/formatters';
import { toast } from 'react-hot-toast';

const NoticeBoard = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    audience: 'all',
    category: 'general',
    isPinned: false,
    expiresAt: ''
  });

  const categories = [
    { id: 'general', label: 'General', color: 'bg-slate-100 text-slate-700', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'urgent', label: 'Urgent', color: 'bg-rose-100 text-rose-700', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { id: 'event', label: 'Event', color: 'bg-amber-100 text-amber-700', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'holiday', label: 'Holiday', color: 'bg-emerald-100 text-emerald-700', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
    { id: 'exam', label: 'Exam', color: 'bg-indigo-100 text-indigo-700', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' }
  ];

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
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Permanently remove this announcement?')) return;
    try {
      const response = await api.delete(`/api/notices/${id}`);
      if (response.ok) {
        toast.success('Notice removed');
        fetchNotices();
      }
    } catch (e) { 
      toast.error('Failed to delete');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post('/api/notices', formData);
      if (response.ok) {
        setFormData({ title: '', content: '', audience: 'all', category: 'general', isPinned: false, expiresAt: '' });
        setShowForm(false);
        fetchNotices();
        toast.success('Announcement Broadcasted!');
      } else {
        toast.error('Failed to post');
      }
    } catch (e) { 
      console.error(e);
      toast.error('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Notice Board</h1>
          <p className="text-slate-500 text-sm font-medium">Manage school-wide announcements and critical updates.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${showForm ? 'bg-slate-200 text-slate-700' : 'bg-primary text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95'}`}
        >
          {showForm ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              Cancel
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              New Announcement
            </>
          )}
        </button>
      </div>

      {/* Post Form */}
      {showForm && (
        <div className="bg-white rounded-[32px] p-6 md:p-10 shadow-2xl border border-slate-100 animate-in slide-in-from-top-4 duration-500">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Headline</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-5 py-4 text-slate-900 font-bold transition-all outline-none"
                  required
                  placeholder="e.g. Resumption Date for Second Term"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Announcement Details</label>
                <textarea
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-5 py-4 text-slate-900 font-bold transition-all outline-none h-40 resize-none"
                  required
                  placeholder="Provide full details here..."
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Audience</label>
                  <select
                    value={formData.audience}
                    onChange={e => setFormData({ ...formData, audience: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-5 py-4 text-slate-900 font-bold transition-all outline-none"
                  >
                    <option value="all">Everyone</option>
                    <option value="student">Students Only</option>
                    <option value="teacher">Staff Only</option>
                    <option value="parent">Parents Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Expiry (Optional)</label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-5 py-4 text-slate-900 font-bold transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Category</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${formData.category === cat.id ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    >
                      <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cat.icon} /></svg>
                      <span className="text-[8px] font-black uppercase tracking-tighter">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })}
                  className={`w-12 h-6 rounded-full relative transition-all ${formData.isPinned ? 'bg-primary' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.isPinned ? 'right-1' : 'left-1'}`}></div>
                </button>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Pin to Top</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Make this announcement prominent</p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all disabled:opacity-50"
                >
                  {submitting ? 'Broadcasting...' : 'Publish Announcement'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Notices Feed */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-100 h-64 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-slate-50 rounded-[40px] p-20 text-center border-4 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
          </div>
          <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Active Announcements</h3>
          <p className="text-slate-400 text-xs font-bold uppercase mt-2 tracking-tighter">Your board is currently clear.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notices.map(notice => {
            const cat = categories.find(c => c.id === notice.category) || categories[0];
            return (
              <div 
                key={notice.id} 
                className={`group relative bg-white rounded-[32px] p-6 shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 flex flex-col ${notice.isPinned ? 'ring-2 ring-primary ring-offset-4 ring-offset-slate-50' : ''}`}
              >
                {/* Status Bar */}
                <div className="flex justify-between items-center mb-6">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${cat.color}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={cat.icon} /></svg>
                    <span className="text-[9px] font-black uppercase tracking-wider">{cat.label}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {notice.isPinned && (
                      <div className="bg-primary text-white p-1.5 rounded-full shadow-lg shadow-primary/20">
                         <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                      </div>
                    )}
                    <button 
                      onClick={() => handleDelete(notice.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                  <h3 className="text-lg font-black text-slate-900 leading-tight group-hover:text-primary transition-colors">{notice.title}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-4">{notice.content}</p>
                </div>

                {/* Footer Metadata */}
                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {notice.author?.photoUrl ? (
                        <img 
                          src={notice.author.photoUrl.startsWith('data:') || notice.author.photoUrl.startsWith('http') ? notice.author.photoUrl : `${API_BASE_URL}${notice.author.photoUrl}`} 
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100" 
                          alt="Author" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-black uppercase ring-2 ring-slate-100">
                          {notice.author?.firstName?.[0]}{notice.author?.lastName?.[0]}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-800 tracking-tight">{notice.author?.firstName} {notice.author?.lastName}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{formatDateVerbose(notice.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Audience</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-black text-slate-600 uppercase italic">
                      {notice.audience === 'all' ? 'Everyone' : notice.audience}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NoticeBoard;
