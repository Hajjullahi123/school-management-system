import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const DepartmentManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('management'); // 'management' or 'intelligence'
  const [departments, setDepartments] = useState([]);
  const [benchmarks, setBenchmarks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [currentDept, setCurrentDept] = useState(null);
  const [formData, setFormData] = useState({ name: '', headId: '', subjectIds: [] });
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchData();
    if (activeTab === 'intelligence') fetchBenchmarks();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptRes, staffRes, subRes] = await Promise.all([
        api.get('/api/departments'),
        api.get('/api/users?role=teacher'),
        api.get('/api/subjects')
      ]);

      if (deptRes.ok) {
         const depts = await deptRes.json();
         setDepartments(depts);
         if (staffRes.ok) {
            const staffData = await staffRes.json();
            const enrichedStaff = staffData.map(s => {
              const dept = depts.find(d => d.staff.some(m => m.id === s.id));
              return { ...s, currentDept: dept ? dept.name : null };
            });
            setStaff(enrichedStaff);
         }
         if (subRes.ok) {
            const subjectsData = await subRes.json();
            const enrichedSubjects = subjectsData.map(s => {
              const dept = depts.find(d => d.subjects.some(m => m.id === s.id));
              return { ...s, currentDept: dept ? dept.name : null };
            });
            setSubjects(enrichedSubjects);
         }
      }
    } catch (error) {
      toast.error('Failed to load department data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBenchmarks = async () => {
    try {
      const res = await api.get('/api/departments/benchmarking');
      if (res.ok) setBenchmarks(await res.json());
    } catch (error) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isEditing ? `/api/departments/${currentDept.id}` : '/api/departments';
      const method = isEditing ? 'put' : 'post';
      const response = await api[method](url, formData);
      if (response.ok) {
        toast.success(isEditing ? 'Department updated successfully' : 'Department created successfully');
        setShowModal(false);
        setFormData({ name: '', headId: '', subjectIds: [] });
        setIsEditing(false);
        fetchData();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Failed to process department');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const handleEdit = (dept) => {
    setCurrentDept(dept);
    setFormData({
      name: dept.name,
      headId: dept.headId || '',
      subjectIds: dept.subjects.map(s => s.id) || []
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (dept) => {
    const targetDept = dept || currentDept;
    if (!targetDept) return;

    if (!window.confirm(`CRITICAL ACTION: Are you sure you want to permanently purge the ${targetDept.name} department? This will disconnect all staff, subjects, and erase departmental intelligence.`)) return;
    
    try {
      const response = await api.delete(`/api/departments/${targetDept.id}`);
      if (response.ok) {
        toast.success('Department purged successfully');
        setShowModal(false);
        fetchData();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Deletion failed');
      }
    } catch (error) {
      toast.error('Network error during deletion');
    }
  };


  const handleAssignStaff = async () => {
    try {
      const response = await api.post(`/api/departments/${currentDept.id}/staff`, {
        staffIds: selectedStaffIds
      });
      if (response.ok) {
        toast.success('Staff assigned successfully');
        setShowStaffModal(false);
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to assign staff');
    }
  };

  const handleAssignSubjects = async () => {
    try {
      const response = await api.post(`/api/departments/${currentDept.id}/subjects`, {
        subjectIds: selectedSubjectIds
      });
      if (response.ok) {
        toast.success('Subjects assigned successfully');
        setShowSubjectModal(false);
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to assign subjects');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-gray-100 flex gap-2">
         <button 
           onClick={() => setActiveTab('management')}
           className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'management' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
         >
           Operational Hub
         </button>
         <button 
           onClick={() => setActiveTab('intelligence')}
           className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'intelligence' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:bg-gray-50'}`}
         >
           Strategic Intelligence
         </button>
      </div>

      {activeTab === 'management' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Academic Departments</h1>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Structure & Oversight Control</p>
            </div>
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData({ name: '', headId: '', subjectIds: [] });
                setShowModal(true);
              }}
              className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              Create Department
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map((dept) => (
                <div key={dept.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>

                   <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-4 bg-primary/10 rounded-2xl">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(dept)}
                          className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete Department"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2">{dept.name}</h3>
                    
                    <div className="space-y-4 mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Head of Dept</p>
                          <p className="text-sm font-bold text-gray-700">{dept.head ? `${dept.head.firstName} ${dept.head.lastName}` : 'Not Assigned'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Size</p>
                          <p className="text-sm font-bold text-gray-700">{dept._count?.staff || 0} Members</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subjects</p>
                          <p className="text-sm font-bold text-gray-700">{dept.subjects?.length || 0} Managed</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button
                        onClick={() => {
                          setCurrentDept(dept);
                          setSelectedStaffIds(dept.staff.map(m => m.id) || []);
                          setShowStaffModal(true);
                        }}
                        className="bg-gray-50 text-gray-600 py-3 rounded-2xl font-black text-[10px] uppercase tracking-tighter hover:bg-primary hover:text-white transition-all border border-gray-100"
                      >
                        Team
                      </button>
                      <button
                        onClick={() => {
                          setCurrentDept(dept);
                          setSelectedSubjectIds(dept.subjects.map(s => s.id) || []);
                          setShowSubjectModal(true);
                        }}
                        className="bg-gray-50 text-gray-600 py-3 rounded-2xl font-black text-[10px] uppercase tracking-tighter hover:bg-emerald-600 hover:text-white transition-all border border-gray-100"
                      >
                        Subjects
                      </button>
                    </div>

                    <button
                      onClick={() => handleEdit(dept)}
                      className="w-full bg-gray-900 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:brightness-125 transition-all"
                    >
                      Configure Hub
                    </button>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Departmental Benchmarking</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Performance Ranking & Compliance Delta</p>

              <div className="space-y-4">
                 {benchmarks.map((stat, idx) => (
                    <div key={stat.id} className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 flex flex-col sm:flex-row items-center gap-6 group hover:bg-white hover:shadow-xl transition-all">
                       <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-xs">
                          #{idx + 1}
                       </div>
                       
                       <div className="flex-1">
                          <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">{stat.name}</h4>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{stat.staffCount} Staff • {stat.nudgeCount} Nudges Sent</p>
                       </div>

                       <div className="flex gap-8 items-center">
                          <div className="text-center">
                             <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Target Alignment</p>
                             <p className="text-sm font-black text-emerald-600">{stat.targetComplianceScore}%</p>
                          </div>
                          <div className="text-center">
                             <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Update Velocity</p>
                             <p className="text-sm font-black text-blue-600">{stat.recordComplianceScore}%</p>
                          </div>
                          <div className="relative w-16 h-16 flex items-center justify-center">
                             <svg className="w-full h-full -rotate-90">
                                <circle cx="32" cy="32" r="28" className="stroke-gray-100 fill-none" strokeWidth="6" />
                                <circle cx="32" cy="32" r="28" className="stroke-primary fill-none transition-all duration-1000" strokeWidth="6" strokeDasharray={`${stat.overallScore * 1.75} 175`} strokeLinecap="round" />
                             </svg>
                             <span className="absolute text-[10px] font-black text-gray-900">{stat.overallScore}%</span>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Modals from Management View */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl relative border border-gray-100">
            <h2 className="text-2xl font-black text-gray-900 mb-8 uppercase tracking-tighter">{isEditing ? 'Configure' : 'New'} Department</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Dept Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Quran Department"
                  className="w-full border-2 border-gray-100 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-primary/10 outline-none font-black transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Appoint Head (HOD)</label>
                <select
                  value={formData.headId}
                  onChange={(e) => setFormData({ ...formData, headId: e.target.value })}
                  className="w-full border-2 border-gray-100 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-primary/10 outline-none font-black transition-all appearance-none bg-gray-50"
                >
                  <option value="">Select Staff Member</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <div className="flex gap-4">
                  <button type="button" onClick={() => { setShowModal(false); setIsEditing(false); }} className="flex-1 py-4 font-black uppercase text-xs tracking-widest text-gray-400">Cancel</button>
                  <button type="submit" className="flex-2 bg-primary text-white py-4 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105">{isEditing ? 'Update Hub' : 'Create Hub'}</button>
                </div>
                
                {isEditing && (
                  <button 
                    type="button" 
                    onClick={handleDelete}
                    className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-xl transition-all mt-2"
                  >
                    Purge Department
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showStaffModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-10 shadow-2xl relative border border-gray-100 max-h-[90vh] flex flex-col">
            <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Assign Members</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-8">Department: {currentDept?.name}</p>
             <div className="flex-1 overflow-y-auto mb-8 pr-2 space-y-2 p-2">
               {staff.map(s => (
                 <label key={s.id} className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedStaffIds.includes(s.id) ? 'border-primary bg-primary/5 shadow-md scale-[1.02]' : 'border-gray-50 hover:border-gray-200 bg-white'}`}>
                   <div className="flex items-center gap-3 sm:gap-4">
                     <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-500 overflow-hidden text-[10px] sm:text-base">
                       {s.photoUrl ? <img src={s.photoUrl} alt="" className="w-full h-full object-cover" /> : s.firstName[0]}
                     </div>
                     <div>
                       <p className="font-black text-gray-900 uppercase text-[10px] sm:text-xs tracking-tight">{s.firstName} {s.lastName}</p>
                       <div className="flex items-center gap-2">
                         <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 capitalize">{s.teacher?.specialization || 'Instructor'}</p>
                         {s.currentDept && <span className="text-[7px] sm:text-[8px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">In: {s.currentDept}</span>}
                       </div>
                     </div>
                   </div>
                   <input
                     type="checkbox"
                     checked={selectedStaffIds.includes(s.id)}
                     onChange={(e) => {
                       if (e.target.checked) setSelectedStaffIds([...selectedStaffIds, s.id]);
                       else setSelectedStaffIds(selectedStaffIds.filter(id => id !== s.id));
                     }}
                     className="w-5 h-5 sm:w-6 sm:h-6 accent-primary rounded-lg"
                   />
                 </label>
               ))}
             </div>
            <div className="flex gap-4 border-t border-gray-100 pt-8">
              <button type="button" onClick={() => setShowStaffModal(false)} className="flex-1 py-4 font-black uppercase text-xs tracking-widest text-gray-400">Close</button>
              <button onClick={handleAssignStaff} className="flex-2 bg-primary text-white py-4 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105">Sync Members</button>
            </div>
          </div>
        </div>
      )}

      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-10 shadow-2xl relative border border-gray-100 max-h-[90vh] flex flex-col">
            <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Assign Subjects</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-8">Department: {currentDept?.name}</p>
             <div className="flex-1 overflow-y-auto mb-8 pr-2 space-y-2 p-2">
               {subjects.map(s => (
                 <label key={s.id} className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedSubjectIds.includes(s.id) ? 'border-emerald-500 bg-emerald-50 shadow-md scale-[1.02]' : 'border-gray-50 hover:border-gray-200 bg-white'}`}>
                   <div className="flex items-center gap-3 sm:gap-4">
                     <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-[10px] sm:text-xs">
                       {s.code || s.name[0]}
                     </div>
                     <div>
                       <p className="font-black text-gray-900 uppercase text-[10px] sm:text-xs tracking-tight">{s.name}</p>
                       <div className="flex items-center gap-2">
                         <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Code: {s.code || 'N/A'}</p>
                         {s.currentDept && <span className="text-[7px] sm:text-[8px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">In: {s.currentDept}</span>}
                       </div>
                     </div>
                   </div>
                   <input
                     type="checkbox"
                     checked={selectedSubjectIds.includes(s.id)}
                     onChange={(e) => {
                       if (e.target.checked) setSelectedSubjectIds([...selectedSubjectIds, s.id]);
                       else setSelectedSubjectIds(selectedSubjectIds.filter(id => id !== s.id));
                     }}
                     className="w-5 h-5 sm:w-6 sm:h-6 accent-emerald-500 rounded-lg"
                   />
                 </label>
               ))}
             </div>
            <div className="flex gap-4 border-t border-gray-100 pt-8">
              <button type="button" onClick={() => setShowSubjectModal(false)} className="flex-1 py-4 font-black uppercase text-xs tracking-widest text-gray-400">Close</button>
              <button onClick={handleAssignSubjects} className="flex-2 bg-emerald-600 text-white py-4 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-600/20 transition-all hover:scale-105">Sync Subjects</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
