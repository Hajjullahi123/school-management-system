import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';

const DepartmentMonitoring = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [drilldownData, setDrilldownData] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [nudgeType, setNudgeType] = useState('GENERAL');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/departments/my-department/status');
      if (response.ok) {
        setData(await response.json());
      } else {
        const err = await response.json();
        toast.error(err.error || 'Failed to fetch status');
      }
    } catch (error) {
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
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
      }
    } catch (error) {
      toast.error('Failed to send nudge');
    }
  };

  const handleAutoNudge = async () => {
    try {
      const scanRes = await api.get('/api/departments/auto-nudge/scan');
      if (scanRes.ok) {
        const { laggingCount } = await scanRes.json();
        if (laggingCount === 0) {
          toast.success('Your department is fully compliant!', { icon: '🌟' });
          return;
        }

        if (window.confirm(`Tactical scan identified ${laggingCount} staff members with compliance gaps. Execute batch corrective nudges?`)) {
          const execRes = await api.post('/api/departments/auto-nudge/execute');
          if (execRes.ok) {
            const result = await execRes.json();
            toast.success(result.message, { duration: 5000 });
            fetchStatus();
          }
        }
      }
    } catch (error) { toast.error('Compliance scan failed'); }
  };

  const openDrilldown = async (teacher) => {
    try {
      setSelectedTeacher(teacher);
      setShowDrilldown(true);
      setDrilldownData([]);
      const response = await api.get(`/api/analytics/teacher-precision-stats?teacherId=${teacher.id}`);
      if (response.ok) {
        const stats = await response.json();
        setDrilldownData(stats);
      }
    } catch (error) {
      toast.error('Failed to load precision data');
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
      <div className="bg-gradient-to-br from-gray-900 to-indigo-900 p-8 sm:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden text-white border-4 border-white/5">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
         <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full -ml-24 -mb-24"></div>

         <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-4 py-1.5 bg-primary/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-primary/30 text-primary-light">HOD Command Center</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none mb-2">{data.departmentName}</h1>
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.5em]">Strategic Academic Compliance</p>
            </div>
            
            <div className="flex flex-col items-center sm:items-end gap-5">
               <button 
                 onClick={handleAutoNudge}
                 className="bg-primary hover:bg-primary-light text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 group"
               >
                 <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                 </svg>
                 Tactical Compliance Scan
               </button>

               <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/10 text-center sm:text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Managed Teachers</p>
                  <p className="text-4xl font-black leading-none">{data.staff.length}</p>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.staff.map((teacher) => (
          <div key={teacher.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl relative group transition-all hover:scale-[1.02]">
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
        ))}
      </div>

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
                {drilldownData.length === 0 ? (
                  <div className="text-center py-20 text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] animate-pulse">Scanning class datasets...</div>
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
