import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const ExamRepository = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('repository'); // 'repository' or 'monitoring'
  const [monitoringData, setMonitoringData] = useState([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examFile, setExamFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    driveLink: '',
    subjectId: '',
    classId: ''
  });
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);

  useEffect(() => {
    if (activeTab === 'repository') fetchExams();
    else fetchMonitoringData();

    if (user.role === 'teacher') {
      fetchTeacherAssignments();
    } else {
      fetchClassesAndSubjects();
    }
  }, [activeTab]);

  const fetchExams = async () => {
    try {
      const resp = await api.get('/api/academics/exam-repository');
      if (resp.ok) {
        setExams(await resp.json());
      }
    } catch (err) {
      toast.error('Failed to fetch exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonitoringData = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/api/academics/exam-monitoring');
      if (resp.ok) setMonitoringData(await resp.json());
    } catch (err) {
      toast.error('Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const handleNudge = async (teacherId, nudgeType = 'whatsapp', context = null) => {
    try {
      const payload = { 
        teacherId, 
        nudgeType,
        subjectName: context?.subject,
        className: context?.class
      };
      
      const resp = await api.post('/api/academics/nudge-teacher', payload);
      if (resp.ok) {
        toast.success(`${nudgeType === 'dashboard' ? 'Dashboard' : 'WhatsApp'} nudge sent!`);
      } else {
        const err = await resp.json();
        toast.error(err.error || 'Failed to send nudge');
      }
    } catch (err) {
      toast.error('Nudge service error');
    }
  };

  const fetchTeacherAssignments = async () => {
    // ... same as before
    try {
      const resp = await api.get(`/api/teacher-assignments/teacher/${user.id}`);
      if (resp.ok) {
        const data = await resp.json();
        setTeacherAssignments(data);
        const uniqueClasses = [];
        const classIdsSet = new Set();
        data.forEach(a => {
            const cls = a.classSubject?.class || a.class;
            if (cls && !classIdsSet.has(cls.id)) {
                uniqueClasses.push(cls);
                classIdsSet.add(cls.id);
            }
        });
        setClasses(uniqueClasses);
      }
    } catch (err) {}
  };

  const fetchClassesAndSubjects = async () => {
      const [cResp, sResp] = await Promise.all([
          api.get('/api/classes'),
          api.get('/api/subjects')
      ]);
      if (cResp.ok) setClasses(await cResp.json());
      if (sResp.ok) setSubjects(await sResp.json());
  };

  const handleClassChange = (classId) => {
      setFormData({...formData, classId, subjectId: ''});
      if (user.role === 'teacher') {
          const relevantSubjects = teacherAssignments
            .filter(a => (a.classSubject?.classId || a.classId) === parseInt(classId))
            .map(a => a.classSubject?.subject || a.subject);
          setSubjects(relevantSubjects);
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!examFile && !formData.driveLink) {
      return toast.error('Please upload a PDF file or provide a Drive link');
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('subjectId', formData.subjectId);
      data.append('classId', formData.classId);
      if (formData.driveLink) data.append('driveLink', formData.driveLink);
      if (examFile) data.append('examFile', examFile);

      const resp = await fetch(`${api.baseUrl}/api/academics/exam-repository`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: data
      });

      if (resp.ok) {
        toast.success('Exam questions submitted successfully');
        setShowSubmitModal(false);
        setFormData({ title: '', driveLink: '', subjectId: '', classId: '' });
        setExamFile(null);
        fetchExams();
      } else {
        const err = await resp.json();
        toast.error(err.error || 'Failed to submit');
      }
    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Exam Repository</h1>
          <p className="text-gray-500 mt-1 font-medium">Archive and monitor examination questions across all departments.</p>
        </div>
        <div className="flex items-center gap-3">
          {user.role !== 'teacher' && (
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 mr-4">
              <button 
                onClick={() => setActiveTab('repository')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'repository' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
              >
                Archive
              </button>
              <button 
                onClick={() => setActiveTab('monitoring')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'monitoring' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
              >
                Smart Monitoring
              </button>
            </div>
          )}
          {user.role === 'teacher' && (
            <button 
              onClick={() => setShowSubmitModal(true)}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Submit Exam Questions
            </button>
          )}
        </div>
      </div>

      {activeTab === 'repository' ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Exam Title</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Subject & Class</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Teacher</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Submission</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-20 animate-pulse text-gray-400">Loading archive...</td></tr>
              ) : exams.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-20 text-gray-400 font-medium italic">No exam submissions found.</td></tr>
              ) : exams.map(exam => (
                <tr key={exam.id} className="hover:bg-gray-50/50 transition duration-200">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{exam.title}</div>
                    <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{new Date(exam.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-indigo-600 text-sm">{exam.subject?.name}</div>
                    <div className="text-xs text-gray-500">{exam.class?.name} {exam.class?.arm}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-700 text-sm">{exam.teacher?.firstName} {exam.teacher?.lastName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {exam.fileUrl && (
                        <a 
                          href={exam.fileUrl} 
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded w-fit"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          PDF VIEW
                        </a>
                      )}
                      {exam.driveLink && (
                        <a 
                          href={exam.driveLink} 
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs font-bold text-green-600 hover:text-green-800 flex items-center gap-1 bg-green-50 px-2 py-1 rounded w-fit"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          DRIVE LINK
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      exam.status === 'approved' ? 'bg-green-100 text-green-700' : 
                      exam.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {exam.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
           <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-center gap-3 text-amber-700">
             <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <p className="text-sm font-medium">Monitoring provides a snapshot of submissions for the current term across all assigned subjects.</p>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {monitoringData.map(teacher => (
               <div key={teacher.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                 <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <div>
                      <h3 className="font-black text-gray-900">{teacher.name}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{teacher.phone || 'No phone'}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-indigo-600">{teacher.submitted} / {teacher.total}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Submissions</div>
                    </div>
                 </div>
                 <div className="p-4 flex-grow grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teacher.assignments.map((a, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition ${
                        a.isSubmitted ? 'bg-green-50/50 border-green-100 shadow-sm shadow-green-50' : 'bg-red-50/50 border-red-100 shadow-sm shadow-red-50 opacity-80'
                      }`}>
                         <div className="min-w-0">
                           <div className={`text-[10px] font-black uppercase tracking-tighter truncate ${a.isSubmitted ? 'text-green-600' : 'text-red-700'}`}>
                              {a.subject}
                           </div>
                           <div className="text-[11px] font-medium text-gray-500">{a.class}</div>
                         </div>
                         <div className={`flex items-center gap-1 shrink-0`}>
                            {a.isSubmitted ? (
                              <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleNudge(teacher.id, 'whatsapp', a); }}
                                  title="Nudge via WhatsApp"
                                  className="w-7 h-7 rounded-lg bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition shadow-sm"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .044 5.37.041 12.008c0 2.126.556 4.2 1.61 6.062L0 24l6.135-1.61a11.801 11.801 0 005.918 1.57h.004c6.635 0 12.006-5.37 12.009-12.008a11.77 11.77 0 00-3.417-8.411z"/></svg>
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleNudge(teacher.id, 'dashboard', a); }}
                                  title="Nudge via Dashboard"
                                  className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 transition shadow-sm"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                </button>
                              </div>
                            )}
                         </div>
                      </div>
                    ))}
                 </div>
                 <div className="p-4 bg-gray-50/30 border-t border-gray-50 flex justify-end">
                    <button 
                      onClick={() => handleNudge(teacher.id, 'whatsapp')}
                      disabled={teacher.submitted === teacher.total}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition disabled:opacity-30 flex items-center gap-2"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .044 5.37.041 12.008c0 2.126.556 4.2 1.61 6.062L0 24l6.135-1.61a11.801 11.801 0 005.918 1.57h.004c6.635 0 12.006-5.37 12.009-12.008a11.77 11.77 0 00-3.417-8.411z"/></svg>
                      WHATSAPP ALL
                    </button>
                    <button 
                      onClick={() => handleNudge(teacher.id, 'dashboard')}
                      disabled={teacher.submitted === teacher.total}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition disabled:opacity-30 flex items-center gap-2"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                      DASHBOARD ALL
                    </button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 p-6 text-white">
              <h2 className="text-xl font-bold">Submit Exam Questions</h2>
              <p className="text-indigo-100 text-sm">Upload a PDF file or provide a Google Drive link for your exam questions.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. 2nd Term 2026 Mathematics Exam"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select 
                    required
                    value={formData.classId}
                    onChange={e => handleClassChange(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.arm}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select 
                    required
                    disabled={!formData.classId}
                    value={formData.subjectId}
                    onChange={e => setFormData({...formData, subjectId: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1 select-none">Drive Link (Optional)</label>
                <input 
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formData.driveLink}
                  onChange={e => setFormData({...formData, driveLink: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1 select-none">PDF File Upload</label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-6 hover:border-indigo-400 transition cursor-pointer bg-gray-50/50 group">
                  <input 
                    type="file"
                    accept=".pdf"
                    onChange={e => setExamFile(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center text-center">
                    <svg className={`w-10 h-10 mb-2 transition ${examFile ? 'text-green-500' : 'text-gray-300 group-hover:text-indigo-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="text-xs font-bold text-gray-600 line-clamp-1">
                      {examFile ? examFile.name : 'Select or Drop PDF Exam File'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-black">Max 5MB</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 px-4 py-4 rounded-xl font-black text-gray-500 hover:bg-gray-50 transition uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 text-white px-4 py-4 rounded-xl font-black shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : 'Finish Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamRepository;
