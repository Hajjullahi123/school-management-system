import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const DepartmentMonitoring = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [drilldownData, setDrilldownData] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [nudgeType, setNudgeType] = useState('GENERAL');

  const [activeTab, setActiveTab] = useState('oversight'); // oversight, resources, subjects
  const [resources, setResources] = useState([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: '', category: 'CURRICULUM', description: '', fileUrl: '' });
  
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'resources') fetchResources();
  }, [activeTab]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const [statusRes, resourceRes, allSubRes] = await Promise.all([
        api.get('/api/departments/my-department/status'),
        api.get('/api/departments/resources'),
        api.get('/api/subjects')
      ]);

      if (statusRes.ok) {
        const status = await statusRes.json();
        setData(status);
        setSelectedSubjectIds(status.subjects?.map(s => s.id) || []);
      } else {
        const err = await statusRes.json();
        toast.error(err.error || 'Identity Verification Failed');
        setData(null);
      }

      if (resourceRes.ok) setResources(await resourceRes.json());
      if (allSubRes.ok) setAllSubjects(await allSubRes.json());

    } catch (error) {
      toast.error('Strategic Link Interrupted');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    if (!data) return;
    try {
      setResourceLoading(true);
      const response = await api.get(`/api/departments/${data.departmentId}/resources`);
      if (response.ok) {
        setResources(await response.json());
      }
    } catch (error) {
      toast.error('Failed to load library');
    } finally {
      setResourceLoading(false);
    }
  };

  const handleUploadResource = async () => {
     if (!resourceForm.title || !resourceForm.fileUrl) {
        toast.error('Title and destination link are required');
        return;
     }
     try {
       const response = await api.post(`/api/departments/${data.departmentId}/resources`, {
          ...resourceForm,
          fileType: resourceForm.fileUrl.toLowerCase().endsWith('.pdf') ? 'PDF' : 'LINK'
       });
       if (response.ok) {
          toast.success('Resource synchronized to hub');
          setShowResourceModal(false);
          setResourceForm({ title: '', category: 'CURRICULUM', description: '', fileUrl: '' });
          fetchResources();
       }
     } catch (error) { toast.error('Upload failed'); }
  };

  const handleDeleteResource = async (id) => {
     if (!window.confirm('Erase this resource from the departmental hub?')) return;
     try {
        const response = await api.delete(`/api/departments/resources/${id}`);
        if (response.ok) {
           toast.success('Resource purged');
           fetchResources();
        }
     } catch (error) { toast.error('Deletions restricted'); }
  };

  const handleOpenNudge = (teacher) => {
    setSelectedTeacher(teacher);
    setNudgeType(teacher.hasTargets ? (teacher.needsUpdate ? 'PROGRESS_LAGGING' : 'GENERAL') : 'TARGET_MISSING');
    setCustomMessage('');
    setShowNudgeModal(true);
  };

  const submitNudge = async () => {
    try {
      const response = await api.post('/api/departments/nudge', {
        receiverId: selectedTeacher.id,
        type: nudgeType,
        message: customMessage || (nudgeType === 'TARGET_MISSING' ? 'Please set your Quran targets for the current term.' : 'Your student progress records are lagging behind schedule.')
      });

      if (response.ok) {
        toast.success(`Guided Nudge sent to ${selectedTeacher.firstName}`);
        setShowNudgeModal(false);
      } else {
        const err = await response.json();
        toast.error(err.error || 'Transmission Failed');
      }
    } catch (error) {
      toast.error('Nudge dispatch error');
    }
  };

  const handleAutoNudge = async () => {
    try {
      const scanRes = await api.get('/api/departments/auto-nudge/scan');
      if (scanRes.ok) {
        const { laggingCount } = await scanRes.json();
        if (laggingCount === 0) {
          toast.success('Department fully compliant', { icon: '🌟' });
          return;
        }

        if (window.confirm(`Tactical scan identified ${laggingCount} staff members with compliance gaps. Execute batch corrective nudges?`)) {
          const execRes = await api.post('/api/departments/auto-nudge/execute');
          if (execRes.ok) {
            const result = await execRes.json();
            toast.success(result.message, { duration: 5000 });
            fetchStatus();
          } else {
            toast.error('Execution protocol failed');
          }
        }
      } else {
        toast.error('Compliance scan denied');
      }
    } catch (error) { toast.error('Compliance scan link error'); }
  };

  const openDrilldown = async (teacher) => {
    try {
      setSelectedTeacher(teacher);
      setShowDrilldown(true);
      setDrilldownData([]);
      setDrilldownLoading(true);
      const response = await api.get(`/api/analytics/teacher-precision-stats?teacherId=${teacher.id}`);
      if (response.ok) {
        const stats = await response.json();
        setDrilldownData(stats);
      } else {
        toast.error('Precision link failed');
      }
    } catch (error) {
      toast.error('Failed to load precision data');
    } finally {
      setDrilldownLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) return <div className="text-center p-20 font-black text-gray-400 uppercase tracking-[0.5em]">No Department Data Found</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="bg-gradient-to-br from-gray-900 to-indigo-900 p-6 sm:p-12 rounded-[2rem] sm:rounded-[3rem] shadow-2xl relative overflow-hidden text-white border-4 border-white/5">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
         <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full -ml-24 -mb-24"></div>
         <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-4 py-1.5 bg-primary/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-primary/30 text-primary-light">HOD Strategic Oversight</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none mb-4">{data.departmentName}</h1>
              
              <div className="flex items-center gap-2 mb-2">
                 <button 
                   onClick={() => setActiveTab('oversight')}
                   className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'oversight' ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                 >Oversight Hub</button>
                 <button 
                   onClick={() => setActiveTab('resources')}
                   className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'resources' ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                 >Resource Library</button>
                  <button 
                    onClick={() => setActiveTab('subjects')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'subjects' ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                  >Subject Jurisdiction</button>
              </div>

              {/* AI Insights Bar - Only in Oversight */}
              {activeTab === 'oversight' && data.insights?.length > 0 && (
                <div className="flex flex-col gap-2 mt-6 max-w-2xl">
                  {data.insights.map((insight, i) => (
                    <div key={i} className={`flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-sm ${insight.type === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'}`}>
                      <div className={`w-2 h-2 rounded-full animate-pulse ${insight.type === 'CRITICAL' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                      <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                        <span className="font-black italic mr-2">[SYSTEM INSIGHT]:</span>
                        {insight.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-5 w-full sm:w-auto">
               <div className="flex gap-3 sm:gap-4">
                 <div className="bg-white/10 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/10 text-center flex-1">
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Momentum</p>
                    <p className={`text-2xl sm:text-4xl font-black leading-none ${data.momentumScore > 50 ? 'text-emerald-400' : 'text-amber-400'}`}>{data.momentumScore}%</p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/10 text-center flex-1">
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Staff Pool</p>
                    <p className="text-2xl sm:text-4xl font-black leading-none">{data.staff.length}</p>
                 </div>
               </div>

               <button 
                 onClick={handleAutoNudge}
                 className="bg-white text-gray-900 px-6 sm:px-8 py-4 sm:py-5 rounded-2xl sm:rounded-[2rem] font-black text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 transition-all hover:bg-primary hover:text-white hover:scale-105 active:scale-95 group border-2 border-white/10"
               >
                 <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                 </svg>
                 Execute Compliance Protocol
               </button>
            </div>
          </div>iv>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'oversight' ? (
          <motion.div 
            key="oversight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            {data.staff.length === 0 ? (
               <div className="col-span-full py-20 bg-white rounded-[3rem] text-center border-2 border-dashed border-gray-100 font-black text-gray-300 uppercase tracking-widest">No Strategic Staff Pool Identified</div>
            ) : (
              data.staff.map((teacher) => (
                <div key={teacher.id} className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-gray-100 shadow-xl relative group transition-all hover:scale-[1.02]">
                   <div className="flex items-start justify-between mb-8">
                      <div 
                        className="flex items-center gap-4 cursor-pointer"
                        onClick={() => openDrilldown(teacher)}
                      >
                         <div className="w-16 h-16 rounded-[1.5rem] bg-gray-100 flex items-center justify-center font-black text-gray-500 overflow-hidden shadow-lg border-2 border-white transform transition-transform group-hover:rotate-6">
                            {teacher.photoUrl ? <img src={teacher.photoUrl} alt="" className="w-full h-full object-cover" /> : teacher.firstName[0]}
                         </div>
                         <div>
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter leading-none mb-1">{teacher.firstName} {teacher.lastName}</h3>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">{teacher.role}</p>
                            <button className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1 hover:text-primary">Click for details →</button>
                         </div>
                      </div>
                      
                      <button 
                        onClick={() => handleOpenNudge(teacher)}
                        className="p-3 bg-gray-50 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all"
                        title="Send Guided Nudge"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </button>
                   </div>

                   <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className={`p-4 rounded-3xl border-2 transition-all ${teacher.hasTargets ? 'bg-emerald-50/30 border-emerald-100' : 'bg-rose-50/30 border-rose-100 shadow-lg shadow-rose-200/20'}`}>
                         <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Targets</p>
                         <span className={`text-[10px] font-black uppercase ${teacher.hasTargets ? 'text-emerald-700' : 'text-rose-700'}`}>
                           {teacher.hasTargets ? 'Synchronized' : 'Incomplete'}
                         </span>
                      </div>

                      <div className={`p-4 rounded-3xl border-2 transition-all ${!teacher.needsUpdate ? 'bg-blue-50/30 border-blue-100' : 'bg-amber-50/30 border-amber-100 shadow-lg shadow-amber-200/20'}`}>
                         <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Registry</p>
                         <span className={`text-[10px] font-black uppercase ${!teacher.needsUpdate ? 'text-blue-700' : 'text-amber-700'}`}>
                           {!teacher.needsUpdate ? 'Current' : 'LAGGING'}
                         </span>
                      </div>
                   </div>

                   <div className="flex items-center justify-between text-gray-400 border-t border-gray-50 pt-4">
                      <span className="text-[9px] font-bold uppercase tracking-widest">Last Update</span>
                      <span className="text-[10px] font-mono font-bold text-gray-500">
                        {teacher.lastUpdate ? new Date(teacher.lastUpdate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'NEVER'}
                      </span>
                   </div>
                </div>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="resources"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <div>
                 <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Departmental Library</h2>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shared Curriculum & Resource Hub</p>
              </div>
              <button 
                onClick={() => setShowResourceModal(true)}
                className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >Add Resource</button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resourceLoading ? (
                 <div className="col-span-full py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
              ) : resources.length === 0 ? (
                 <div className="col-span-full py-20 text-center font-black text-gray-300 uppercase tracking-widest">Library is empty</div>
              ) : (
                resources.map(res => (
                   <div key={res.id} className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 shadow-xl group transition-all hover:shadow-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-6">
                           <span className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${res.category === 'CURRICULUM' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {res.category}
                           </span>
                           <button onClick={() => handleDeleteResource(res.id)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </button>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2 leading-none">{res.title}</h3>
                        <p className="text-xs text-gray-500 font-medium mb-6 line-clamp-2">{res.description}</p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-auto">
                         <div className="text-[9px] font-bold text-gray-400">
                            By {res.uploader.firstName} • {new Date(res.createdAt).toLocaleDateString()}
                         </div>
                         <a 
                           href={res.fileUrl} 
                           target="_blank" 
                           rel="noreferrer"
                           className="bg-gray-900 text-white p-3 rounded-xl hover:bg-primary transition-all shadow-lg"
                         >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                         </a>
                      </div>
                   </div>
                ))
              )}
           </div>
          </motion.div>
        ) : (
          <motion.div 
            key="subjects"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-8 sm:p-10 rounded-[3rem] shadow-xl border border-gray-100">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                  <div>
                     <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Subject Jurisdiction</h2>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select which subjects fall under this department's oversight</p>
                  </div>
                  <button 
                    onClick={async () => {
                       try {
                          const res = await api.post(`/api/departments/${data.id}/subjects`, { subjectIds: selectedSubjectIds });
                          if (res.ok) {
                             toast.success('Department jurisdiction updated successfully');
                             fetchData();
                          }
                       } catch (e) { toast.error('Sync failed'); }
                    }}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all"
                  >Sync Jurisdiction</button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allSubjects.map(sub => (
                     <label key={sub.id} className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all cursor-pointer ${selectedSubjectIds.includes(sub.id) ? 'border-indigo-600 bg-indigo-50 shadow-md scale-[1.02]' : 'border-gray-50 hover:border-gray-200 bg-white'}`}>
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${selectedSubjectIds.includes(sub.id) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                              {sub.code || sub.name[0]}
                           </div>
                           <div>
                              <p className="font-black text-gray-900 uppercase tracking-tight text-sm">{sub.name}</p>
                              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{sub.code || 'NO CODE'}</p>
                           </div>
                        </div>
                        <input 
                           type="checkbox"
                           checked={selectedSubjectIds.includes(sub.id)}
                           onChange={(e) => {
                              if (e.target.checked) setSelectedSubjectIds([...selectedSubjectIds, sub.id]);
                              else setSelectedSubjectIds(selectedSubjectIds.filter(id => id !== sub.id));
                           }}
                           className="w-5 h-5 accent-indigo-600 rounded-lg"
                        />
                     </label>
                  ))}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resource Upload Modal */}
      {showResourceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-lg p-6 sm:p-10 shadow-2xl relative border border-gray-100">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-6 sm:mb-8 uppercase tracking-tighter">Library Synchronization</h2>
              
              <div className="space-y-4 sm:space-y-5">
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Resource Title</label>
                    <input 
                      type="text" 
                      value={resourceForm.title}
                      onChange={(e) => setResourceForm({...resourceForm, title: e.target.value})}
                      placeholder="e.g. Arabic Term 1 Curriculum"
                      className="w-full border-2 border-gray-100 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-primary/10 outline-none font-black text-xs transition-all"
                    />
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Classification</label>
                       <select 
                         value={resourceForm.category}
                         onChange={(e) => setResourceForm({...resourceForm, category: e.target.value})}
                         className="w-full border-2 border-gray-100 rounded-xl sm:rounded-2xl py-3 sm:py-4 px-6 focus:ring-4 focus:ring-primary/10 outline-none font-black text-[11px] sm:text-xs transition-all bg-gray-50"
                       >
                          <option value="CURRICULUM">Curriculum</option>
                          <option value="LESSON_PLAN">Lesson Plan</option>
                          <option value="PAST_PAPER">Past Paper</option>
                          <option value="OTHER">Reference/Other</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">File URL / Link</label>
                       <input 
                         type="text" 
                         value={resourceForm.fileUrl}
                         onChange={(e) => setResourceForm({...resourceForm, fileUrl: e.target.value})}
                         placeholder="https://..."
                         className="w-full border-2 border-gray-100 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-primary/10 outline-none font-black text-xs transition-all"
                       />
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Detailed Description</label>
                    <textarea 
                      value={resourceForm.description}
                      onChange={(e) => setResourceForm({...resourceForm, description: e.target.value})}
                      placeholder="Brief summary of the resource..."
                      className="w-full border-2 border-gray-100 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-primary/10 outline-none font-bold text-xs transition-all h-24 resize-none"
                    ></textarea>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button onClick={() => setShowResourceModal(false)} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-gray-400">Abort</button>
                    <button onClick={handleUploadResource} className="flex-2 bg-primary text-white py-4 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105">Sync to Library</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Guided Nudge Modal */}
      {showNudgeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative border border-gray-100">
             <h2 className="text-2xl font-black text-gray-900 mb-1 uppercase tracking-tighter">Guided Nudge</h2>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Instructing: {selectedTeacher?.firstName} {selectedTeacher?.lastName}</p>
             
             <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Directive Category</label>
                  <select 
                    value={nudgeType}
                    onChange={(e) => setNudgeType(e.target.value)}
                    className="w-full border-2 border-gray-100 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-primary/10 outline-none font-black text-xs transition-all bg-gray-50"
                  >
                    <option value="TARGET_MISSING">Targets Protocol Compliance</option>
                    <option value="PROGRESS_LAGGING">Registry Lag Interruption</option>
                    <option value="GENERAL">General Pedagogical Instruction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Custom Message (Optional)</label>
                  <textarea 
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Enter specific instructions for the teacher..."
                    className="w-full border-2 border-gray-100 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-primary/10 outline-none font-bold text-xs transition-all h-32 resize-none"
                  ></textarea>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowNudgeModal(false)} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-gray-400">Cancel</button>
                  <button onClick={submitNudge} className="flex-2 bg-primary text-white py-4 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105">Transmit Nudge</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Precision Drilldown Modal */}
      {showDrilldown && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-10">
          <div className="bg-white rounded-[2rem] sm:rounded-[3rem] w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl relative border border-gray-100 flex flex-col translate-y-0 animate-in slide-in-from-bottom-8 duration-500">
             <div className="p-6 sm:p-12 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <div>
                   <h2 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">Precision Analytics</h2>
                   <p className="text-[10px] sm:text-[11px] font-black text-primary uppercase tracking-widest">Teacher: {selectedTeacher?.firstName} {selectedTeacher?.lastName}</p>
                </div>
                <button onClick={() => setShowDrilldown(false)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-md flex items-center justify-center hover:scale-110 transition-all">
                   <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 sm:p-12 space-y-10 sm:space-y-12">
                {drilldownLoading ? (
                  <div className="text-center py-20 text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] animate-pulse">Scanning class datasets...</div>
                ) : drilldownData.length === 0 ? (
                  <div className="text-center py-20 text-[10px] font-black text-gray-400 uppercase tracking-[0.5em]">No granular data available</div>
                ) : (
                  <div className="space-y-10">
                    {drilldownData.map((cls, idx) => (
                      <div key={idx} className="space-y-6">
                        <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                           <div>
                              <h4 className="text-lg sm:text-xl font-black text-gray-900 uppercase tracking-tight">{cls.className}</h4>
                              <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cls.totalStudents} Students Enrolled</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Target Sync</p>
                              <p className={`text-sm sm:text-xl font-black ${cls.hasTargets ? 'text-emerald-500' : 'text-rose-500'}`}>{cls.hasTargets ? 'COMPLETED' : 'INCOMPLETE'}</p>
                           </div>
                        </div>

                        {/* Student Heatmap Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                           {cls.students.map((student, sIdx) => {
                             const daysSinceUpdate = student.lastUpdate ? Math.floor((new Date() - new Date(student.lastUpdate)) / (1000 * 60 * 60 * 24)) : 999;
                             const color = daysSinceUpdate <= 3 ? 'bg-emerald-500' : daysSinceUpdate <= 7 ? 'bg-amber-500' : 'bg-rose-500';
                             
                             return (
                               <div key={sIdx} className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gray-50 border border-gray-100 relative group">
                                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full absolute top-1.5 right-1.5 sm:top-2 sm:right-2 ${color} shadow-sm border border-white`}></div>
                                  <p className="text-[8px] sm:text-[9px] font-black text-gray-900 uppercase truncate mb-1 pr-4">{student.name}</p>
                                  <p className="text-[7px] sm:text-[8px] font-bold text-gray-400 uppercase">{student.lastUpdate ? `${daysSinceUpdate}d ago` : 'No Entry'}</p>
                                  
                                  <div className="absolute inset-0 bg-gray-900/90 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center pointer-events-none">
                                     <p className="text-[7px] sm:text-[8px] font-black text-white uppercase">{student.lastUpdate ? `Last updated: ${new Date(student.lastUpdate).toLocaleDateString()}` : 'Never updated progress'}</p>
                                  </div>
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>

             <div className="p-6 sm:p-12 bg-gray-50/50 border-t border-gray-50 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                   <span className="text-[9px] font-black uppercase text-gray-500">Optimum (0-3d)</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                   <span className="text-[9px] font-black uppercase text-gray-500">Warning (4-7d)</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                   <span className="text-[9px] font-black uppercase text-gray-500">Critical (7d+)</span>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentMonitoring;
