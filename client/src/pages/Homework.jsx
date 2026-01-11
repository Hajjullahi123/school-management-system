import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../utils/toast';

const Homework = () => {
  const { user } = useAuth();

  // State
  const [homeworks, setHomeworks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const [selectedHW, setSelectedHW] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const [formData, setFormData] = useState({
    subjectId: '',
    title: '',
    description: '',
    dueDate: '',
    file: null
  });

  const [submissionData, setSubmissionData] = useState({
    file: null
  });

  const [gradeData, setGradeData] = useState({
    grade: '',
    feedback: ''
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
    if (selectedClassId) fetchHomework();
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

  const fetchHomework = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/lms/homework/class/${selectedClassId}`);
      if (response.ok) setHomeworks(await response.json());
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
    data.append('dueDate', formData.dueDate);
    if (formData.file) data.append('file', formData.file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/lms/homework`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: data
      });

      if (response.ok) {
        toast.success('Assignment posted!');
        setShowModal(false);
        setFormData({ subjectId: '', title: '', description: '', dueDate: '', file: null });
        fetchHomework();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Failed to save');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!submissionData.file) return toast.error('Please select a file');
    setSaving(true);

    const data = new FormData();
    data.append('file', submissionData.file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/lms/homework/${selectedHW.id}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: data
      });

      if (response.ok) {
        toast.success('Assignment submitted!');
        setShowSubmitModal(false);
        setSubmissionData({ file: null });
        fetchHomework();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Submission failed');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const fetchSubmissions = async (hwId) => {
    try {
      const response = await api.get(`/api/lms/homework/${hwId}/submissions`);
      if (response.ok) setSubmissions(await response.json());
    } catch (e) { toast.error('Failed to load submissions'); }
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.put(`/api/lms/submissions/${selectedSubmission.id}/grade`, gradeData);
      if (response.ok) {
        toast.success('Grade published!');
        setShowGradeModal(false);
        fetchSubmissions(selectedHW.id);
      }
    } catch (e) { toast.error('Grading failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this assignment permanently?')) return;
    try {
      const response = await api.delete(`/api/lms/homework/${id}`);
      if (response.ok) {
        toast.success('Deleted');
        fetchHomework();
      }
    } catch (e) { toast.error('Failed to delete'); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight italic underline decoration-primary/30 underline-offset-8">Assignments & Homework</h1>
          <p className="text-gray-500 font-bold mt-2">Manage course work and track student progress</p>
        </div>
        {isTeacher && selectedClassId && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-white px-8 py-4 rounded-[22px] font-black shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            Create Task
          </button>
        )}
      </div>

      {isTeacher && (
        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 mb-10 max-w-md">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Viewing Work For</label>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="w-full border-gray-200 rounded-2xl px-5 py-4 font-black text-gray-700 shadow-inner bg-gray-50/50 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          >
            <option value="">-- Choose Class --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.arm}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-primary mb-6"></div>
          <p className="text-gray-400 font-black italic tracking-widest uppercase text-xs">Syncing assignments...</p>
        </div>
      ) : homeworks.length === 0 ? (
        <div className="text-center py-24 bg-gray-50/50 rounded-[50px] border-4 border-dashed border-gray-100 flex flex-col items-center">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 text-gray-200">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <p className="text-gray-500 font-black text-2xl mb-2">Workspace Clean!</p>
          <p className="text-gray-400 font-medium">No homework assigned for this period.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {homeworks.map(hw => (
            <div key={hw.id} className="bg-white rounded-[40px] shadow-xl hover:shadow-2xl transition-all border border-gray-50 group overflow-hidden">
              <div className="flex flex-col lg:flex-row h-full">
                <div className="flex-1 p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-primary/10">
                      {hw.subject?.name}
                    </span>
                    {(!isTeacher && hw.submitted) && (
                      <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-emerald-100 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        Completed
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-black text-gray-900 mb-3 group-hover:text-primary transition-colors">{hw.title}</h3>
                  <p className="text-gray-500 font-medium leading-relaxed line-clamp-3 mb-8">{hw.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-gray-50">
                    <div>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Due Date</p>
                      <div className="flex items-center gap-2 font-bold text-gray-700">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString() : 'Rolling'}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Instructor</p>
                      <p className="font-bold text-gray-700">{hw.teacher?.firstName} {hw.teacher?.lastName}</p>
                    </div>
                    {isTeacher && (
                      <div>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Submissions</p>
                        <p className="font-bold text-gray-700">{hw._count?.submissions || 0} Students</p>
                      </div>
                    )}
                    {hw.fileUrl && (
                      <div>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Reference</p>
                        <a href={`${API_BASE_URL}${hw.fileUrl}`} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline truncate block">
                          {hw.fileName || 'View Manual'}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-8 lg:w-72 flex flex-col justify-center gap-4 border-l border-gray-100 group-hover:bg-primary group-hover:border-primary transition-all">
                  {!isTeacher ? (
                    hw.submitted ? (
                      <div className="text-center group-hover:text-white">
                        <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-60">Result</p>
                        <p className={`text-2xl font-black ${hw.submission?.grade ? 'text-primary' : 'text-gray-400'} group-hover:text-white`}>
                          {hw.submission?.grade || 'Awaiting Grade'}
                        </p>
                        {hw.submission?.feedback && (
                          <p className="mt-4 text-xs font-bold leading-relaxed italic opacity-80 line-clamp-3">
                            "{hw.submission.feedback}"
                          </p>
                        )}
                        <button
                          onClick={() => { setSelectedHW(hw); setShowSubmitModal(true); }}
                          className="w-full mt-6 py-3 bg-white text-primary font-black rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all border-none"
                        >
                          Resubmit
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setSelectedHW(hw); setShowSubmitModal(true); }}
                        className="w-full py-5 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/30 group-hover:bg-white group-hover:text-primary transition-all border-none"
                      >
                        Submit Work
                      </button>
                    )
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={() => { setSelectedHW(hw); fetchSubmissions(hw.id); setShowSubmissionsModal(true); }}
                        className="w-full py-4 bg-white text-gray-800 font-black rounded-2xl shadow-lg group-hover:bg-white group-hover:text-primary transition-all border-none"
                      >
                        View Work
                      </button>
                      {user?.role === 'admin' || (isTeacher && hw.teacherId === user.id) ? (
                        <button
                          onClick={() => handleDelete(hw.id)}
                          className="w-full py-2 text-red-500 font-bold opacity-0 group-hover:opacity-100 group-hover:text-white transition-all"
                        >
                          Kill Task
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HW Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-[50px] shadow-2xl p-10 w-full max-w-2xl border border-white/20 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>

            <div className="flex justify-between items-center mb-10 relative z-10">
              <h3 className="text-3xl font-black text-gray-900 leading-tight">Post New Assignment</h3>
              <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Subject Area</label>
                  <select
                    value={formData.subjectId}
                    onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full border-gray-200 rounded-2xl px-5 py-4 font-black text-gray-700 bg-gray-50/50"
                    required
                  >
                    <option value="">Select...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Deadline</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full border-gray-200 rounded-2xl px-5 py-4 font-black text-gray-700 bg-gray-50/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Assignment Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border-gray-200 rounded-2xl px-5 py-4 font-black text-gray-700 bg-gray-50/50"
                  placeholder="e.g. Weekly Review: Organic Chemistry"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Execution Instructions</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border-gray-200 rounded-3xli px-6 py-5 font-bold text-gray-700 h-32 bg-gray-50/50"
                  placeholder="Enter detailed instructions or questions here..."
                  required
                />
              </div>

              <div className="p-6 bg-primary/5 rounded-[30px] border-2 border-dashed border-primary/20">
                <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-4">Attach Resources (Optional)</label>
                <input
                  type="file"
                  onChange={e => setFormData({ ...formData, file: e.target.files[0] })}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-primary file:text-white file:uppercase file:tracking-widest cursor-pointer"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-5 border-2 border-gray-100 rounded-2xl font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest text-xs"
                >
                  Abandon
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] py-5 bg-primary text-white rounded-2xl font-black shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all uppercase tracking-[0.2em] text-xs"
                >
                  {saving ? 'Transmitting...' : 'Post Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[40px] shadow-2xl p-8 w-full max-w-md border border-white/20">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Hand In Work</h3>
            <p className="text-gray-500 font-bold mb-8">Upload your completed assignment for grading.</p>

            <form onSubmit={handleStudentSubmit} className="space-y-6">
              <div className="p-8 border-4 border-dashed border-gray-100 rounded-[35px] flex flex-col items-center justify-center text-center">
                <input
                  type="file"
                  id="submit-file"
                  className="hidden"
                  onChange={e => setSubmissionData({ file: e.target.files[0] })}
                />
                <label htmlFor="submit-file" className="cursor-pointer group flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <p className="font-bold text-gray-600 truncate max-w-full italic underline">
                    {submissionData.file ? submissionData.file.name : 'Select Submission File'}
                  </p>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="py-4 border-2 border-gray-100 rounded-2xl font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !submissionData.file}
                  className="py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em]"
                >
                  {saving ? 'Sending...' : 'Submit Work'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions Modal (Teacher) */}
      {showSubmissionsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[50px] shadow-2xl p-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-3xl font-black text-gray-900 leading-tight">Class Submissions</h3>
                <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">Review and Grade Student Work</p>
              </div>
              <button onClick={() => setShowSubmissionsModal(false)} className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-20 bg-gray-50/50 rounded-[40px] border-4 border-dashed border-gray-100">
                <p className="text-gray-400 font-black tracking-widest uppercase text-xs">Waiting for hand-ins...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map(sub => (
                  <div key={sub.id} className="bg-white border-2 border-gray-50 rounded-[30px] p-6 hover:border-primary/20 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-400 group-hover:bg-primary group-hover:text-white transition-all">
                        {sub.student?.user?.firstName[0]}{sub.student?.user?.lastName[0]}
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900 text-lg">{sub.student?.user?.firstName} {sub.student?.user?.lastName}</h4>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Submitted: {new Date(sub.submittedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <a
                        href={`${API_BASE_URL}${sub.fileUrl}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 text-primary font-black text-xs uppercase hover:underline"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        View File
                      </a>

                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-tighter mb-0.5">Grade</p>
                        <p className={`font-black uppercase tracking-widest ${sub.grade ? 'text-primary' : 'text-amber-500'}`}>
                          {sub.grade || 'Pending'}
                        </p>
                      </div>

                      <button
                        onClick={() => { setSelectedSubmission(sub); setGradeData({ grade: sub.grade || '', feedback: sub.feedback || '' }); setShowGradeModal(true); }}
                        className="px-6 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                      >
                        Assign Grade
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grade Modal */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-white rounded-[40px] shadow-2xl p-10 w-full max-w-md border border-white/20 relative">
            <h3 className="text-2xl font-black text-gray-900 mb-2 italic">Release Grade</h3>
            <p className="text-gray-500 font-bold mb-8">Publishing grade for {selectedSubmission?.student?.user?.firstName}.</p>

            <form onSubmit={handleGradeSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Final Score (%) / Grade (A-F)</label>
                <input
                  type="text"
                  value={gradeData.grade}
                  onChange={e => setGradeData({ ...gradeData, grade: e.target.value })}
                  className="w-full border-gray-200 rounded-3xl p-6 font-black text-4xl text-center text-primary bg-gray-50 shadow-inner focus:ring-0 focus:border-primary transition-all uppercase"
                  placeholder="A+"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Private Feedback</label>
                <textarea
                  value={gradeData.feedback}
                  onChange={e => setGradeData({ ...gradeData, feedback: e.target.value })}
                  className="w-full border-gray-200 rounded-2xl px-5 py-4 font-bold text-gray-700 h-24 bg-gray-50/50"
                  placeholder="Enter specific comments for the student..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGradeModal(false)}
                  className="py-4 border-2 border-gray-100 rounded-2xl font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest text-[10px]"
                >
                  Exit
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em]"
                >
                  {saving ? 'Publishing...' : 'Confirm Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Homework;
