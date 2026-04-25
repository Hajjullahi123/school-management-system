import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { formatNumber } from '../../utils/formatters';
import StaffAttendanceWidget from '../../components/StaffAttendanceWidget';

const AdminTeacherDashboard = ({ user, schoolSettings }) => {
  const [teacherStats, setTeacherStats] = useState(null);
  const [feeStats, setFeeStats] = useState(null);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [assignedClassCount, setAssignedClassCount] = useState(0);
  const [notices, setNotices] = useState([]);
  const [teacherCBTExams, setTeacherCBTExams] = useState([]);
  const [totalSubjectsCount, setTotalSubjectsCount] = useState(0);
  const [allTerms, setAllTerms] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [selectedDashboardTerm, setSelectedDashboardTerm] = useState(null);
  const [selectedDashboardSession, setSelectedDashboardSession] = useState(null);
  const [alumniCount, setAlumniCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deptAlerts, setDeptAlerts] = useState(null);
  const [nudges, setNudges] = useState([]);

  useEffect(() => {
    fetchMainData();
    fetchNotices();
    if (user?.role === 'teacher') {
      fetchDeptStatus();
      fetchNudges();
    }
  }, [user]);

  const fetchNudges = async () => {
    try {
      const res = await api.get('/api/departments/my-nudges');
      if (res.ok) setNudges(await res.json());
    } catch (e) {}
  };

  const fetchDeptStatus = async () => {
    try {
      const res = await api.get('/api/departments/my-department/status');
      if (res.ok) {
        const data = await res.json();
        const me = data.staff.find(s => s.id === user.id);
        if (me && (me.needsUpdate || !me.hasTargets)) {
          setDeptAlerts({
            deptName: data.departmentName,
            needsUpdate: me.needsUpdate,
            noTargets: !me.hasTargets
          });
        }
      }
    } catch (e) {}
  };

  const handleClearNudge = async (nudgeId) => {
    try {
      const res = await api.post(`/api/departments/nudges/${nudgeId}/read`);
      if (res.ok) {
        setNudges(prev => prev.filter(n => n.id !== nudgeId));
      }
    } catch (e) {}
  };

  const fetchNotices = async () => {
    try {
      const response = await api.get('/api/notices');
      if (response.ok) {
        const data = await response.json();
        setNotices(Array.isArray(data) ? data : []);
      }
    } catch (e) { }
  };

  const fetchMainData = async (termId = null, sessionId = null) => {
    try {
      setLoading(true);

      // Fast Stats Fetch (Optimized for Mobile/Slow Connections)
      try {
        const statsRes = await api.get('/api/settings/stats-summary');
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setTeacherStats({ totalStudents: stats.students, activeClasses: stats.classes });
          setTotalSubjectsCount(stats.subjects);
        }
      } catch (err) {
        console.warn('Fast stats fetch failed');
      }

      const [studentsRes, classesRes, termsRes, sessionsRes, subjectsRes] = await Promise.all([
        api.get('/api/students').catch(err => ({ ok: false, error: err })),
        api.get('/api/classes').catch(err => ({ ok: false, error: err })),
        api.get('/api/terms').catch(err => ({ ok: false, error: err })),
        api.get('/api/academic-sessions').catch(err => ({ ok: false, error: err })),
        (user?.role === 'admin' || user?.role === 'principal') ? api.get('/api/subjects').catch(err => ({ ok: false, error: err })) : Promise.resolve({ ok: true, json: () => [] })
      ]);

      // Parse safely
      const studentsData = studentsRes.ok ? await studentsRes.json() : [];
      const classesData = classesRes.ok ? await classesRes.json() : [];
      const terms = termsRes.ok ? await termsRes.json() : [];
      const sessions = sessionsRes.ok ? await sessionsRes.json() : [];

      if (!studentsRes.ok) console.warn('Student fetch failed:', studentsRes.status);
      if (!classesRes.ok) console.error('Classes fetch failed:', classesRes.status);

      // If fast stats failed, fall back to calculating from full lists
      if (!teacherStats || teacherStats.totalStudents === 0) {
        if (subjectsRes?.ok) {
          const subjectsData = await subjectsRes.json();
          setTotalSubjectsCount(Array.isArray(subjectsData) ? subjectsData.length : 0);
        }

        const students = Array.isArray(studentsData) ? studentsData : [];
        const classes = Array.isArray(classesData) ? classesData : [];

        let totalStudentsCount = 0;
        let activeClassesCount = 0;

        if (user?.role === 'teacher') {
          const myClasses = classes.filter(c => c.classTeacherId == user.id);
          const myClassIds = myClasses.map(c => c.id);
          totalStudentsCount = students.filter(s => myClassIds.includes(s.classId)).length;
          activeClassesCount = myClasses.length;
        } else {
          if (students.length === 0 && classes.length > 0) {
            totalStudentsCount = classes.reduce((acc, curr) => acc + (curr._count?.students || 0), 0);
          } else {
            totalStudentsCount = students.length;
          }
          activeClassesCount = classes.length;
        }
        setTeacherStats({ totalStudents: totalStudentsCount, activeClasses: activeClassesCount });
      }

      setAllTerms(Array.isArray(terms) ? terms : []);
      setAllSessions(Array.isArray(sessions) ? sessions : []);

      const activeTerm = termId ? terms.find(t => t.id === parseInt(termId)) : (terms.find(t => t.isCurrent) || terms[0]);
      const activeSession = sessionId ? sessions.find(s => s.id === parseInt(sessionId)) : (sessions.find(s => s.isCurrent) || sessions[0]);

      setSelectedDashboardTerm(activeTerm);
      setSelectedDashboardSession(activeSession);


      // Admin specific financial summary
      if (user?.role === 'admin' && activeTerm && activeSession) {
        const [summaryRes, alumniRes] = await Promise.all([
          api.get(`/api/fees/summary?termId=${activeTerm.id}&academicSessionId=${activeSession.id}`),
          api.get('/api/alumni/stats')
        ]);
        
        if (summaryRes.ok) setFeeStats(await summaryRes.json());
        if (alumniRes.ok) {
          const alumniData = await alumniRes.json();
          setAlumniCount(alumniData.count || 0);
        }
      }

      // Teacher specific assignments
      if (user?.role === 'teacher') {
        const trackingRes = await api.get(`/api/analytics/submission-tracking?teacherId=${user.id}`);
        if (trackingRes.ok) {
          const data = await trackingRes.json();
          const tracking = Array.isArray(data?.tracking) ? data.tracking : [];
          setTeacherAssignments(tracking.map(item => ({ ...item, class: { name: item.className }, subject: { name: item.subjectName } })));
          setAssignedClassCount(new Set(tracking.map(a => a.classId)).size);
        }

        const cbtRes = await api.get(`/api/analytics/cbt-tracking?teacherId=${user.id}`);
        if (cbtRes.ok) {
          const cbtData = await cbtRes.json();
          setTeacherCBTExams(Array.isArray(cbtData) ? cbtData : []);
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-xs font-black uppercase tracking-widest text-gray-400 animate-pulse">Initializing Command Center...</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Bar */}
      <div className="bg-slate-900 p-5 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex-shrink-0">
            {user?.photoUrl ? (
              <img
                src={user.photoUrl.startsWith('data:') || user.photoUrl.startsWith('http') ? user.photoUrl : `${API_BASE_URL}${user.photoUrl}`}
                alt="Profile"
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/50 shadow-lg"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg border-2 border-primary/30">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black italic tracking-tighter text-white uppercase truncate">Personnel: {user?.firstName} {user?.lastName}</h1>
            <p className="text-primary-light text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">{user?.role} Access Authorized</p>
          </div>
        </div>
      </div>

      {/* Persistent HOD Nudges */}
      {nudges.length > 0 && (
        <div className="space-y-3">
          {nudges.map(nudge => (
            <div key={nudge.id} className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-5 shadow-xl shadow-amber-200/20 relative group animate-in slide-in-from-right-4 duration-500">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-500 text-white rounded-2xl flex-shrink-0 shadow-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-[10px] sm:text-xs font-black text-amber-900 uppercase tracking-tight">HOD Direct Instruction</h4>
                      <p className="text-[8px] sm:text-[10px] font-bold text-amber-700 uppercase mb-1">{nudge.department.name} • {nudge.sender.firstName} {nudge.sender.lastName}</p>
                      <p className="text-sm font-bold text-gray-800 leading-tight">{nudge.message}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleClearNudge(nudge.id)}
                    className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-amber-200 text-amber-700 text-[10px] font-black uppercase rounded-2xl hover:bg-amber-100 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                  >
                    Acknowledge
                  </button>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Department Alerts for Teachers */}
      {deptAlerts && (
        <div className="bg-rose-50 border-2 border-rose-100 rounded-3xl p-5 shadow-lg shadow-rose-200/20 relative overflow-hidden animate-bounce-slow">
           <div className="absolute top-0 right-0 w-24 h-24 bg-rose-200/20 rounded-full -mr-12 -mt-12"></div>
           <div className="flex items-start gap-4 relative z-10">
              <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                 </svg>
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-900 uppercase tracking-tight mb-1">HOD Performance Notice</h3>
                <p className="text-[10px] font-bold text-rose-700 uppercase tracking-widest mb-3">{deptAlerts.deptName} Oversight Hub</p>
                
                <div className="flex flex-wrap gap-2">
                   {deptAlerts.noTargets && (
                     <div className="flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-full border border-rose-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                        <span className="text-[9px] font-black text-rose-600 uppercase">Missing Targets</span>
                     </div>
                   )}
                   {deptAlerts.needsUpdate && (
                     <div className="flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-full border border-rose-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                        <span className="text-[9px] font-black text-rose-600 uppercase">Input Lagging</span>
                     </div>
                   )}
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Grid Stats */}
      <div className={`grid gap-4 ${
        (user?.role === 'admin' || user?.role === 'principal') 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1 sm:grid-cols-2'
      }`}>
        <div className="bg-blue-50 p-5 rounded-xl shadow-sm border border-blue-100 transition-all hover:scale-[1.02]">
          <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Enrollment</p>
          <p className="text-2xl font-black text-blue-900">{teacherStats?.totalStudents || 0}</p>
        </div>
        <div className="bg-purple-50 p-5 rounded-xl shadow-sm border border-purple-100 transition-all hover:scale-[1.02]">
          <p className="text-[11px] font-black text-purple-600 uppercase tracking-widest mb-1">Assigned Classes</p>
          <p className="text-2xl font-black text-purple-900">{teacherStats?.activeClasses || 0}</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'principal') && (
          <div className="bg-teal-50 p-5 rounded-xl shadow-sm border border-teal-100 transition-all hover:scale-[1.02] sm:col-span-2 lg:col-span-1">
            <p className="text-[11px] font-black text-teal-600 uppercase tracking-widest mb-1">Registered Subjects</p>
            <p className="text-2xl font-black text-teal-900">{totalSubjectsCount || 0}</p>
          </div>
        )}
      </div>

      {/* Notices */}
      {notices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-orange-800 italic">Broadcast Wire</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {notices.map(n => (
              <div key={n.id} className="p-4">
                <h4 className="text-sm font-bold text-gray-900">{n.title}</h4>
                <p className="text-xs text-gray-600 line-clamp-2 mt-1 leading-relaxed">{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance & Assignments for Teacher */}
      {user?.role === 'teacher' && (
        <div className="space-y-4">
          <StaffAttendanceWidget />

          {/* Form Master Quick Actions - DIRECT BULK DOWNLOADS */}
          {user?.isFormMaster && user.formMasterClass && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link 
                to="/dashboard/bulk-report-download" 
                className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-3xl shadow-xl shadow-emerald-200/40 transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md text-white shadow-inner">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-black uppercase tracking-wider text-sm">Bulk Term Reports</h3>
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-0.5">Collect Entire {user.formMasterClass.name} Class</p>
                  </div>
                </div>
              </Link>

              <Link 
                to="/dashboard/cumulative-report?view=teacher" 
                className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl shadow-xl shadow-indigo-200/40 transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md text-white shadow-inner">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-black uppercase tracking-wider text-sm">Bulk Cumulative</h3>
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-0.5">Full Academic Session Reports</p>
                  </div>
                </div>
              </Link>
            </div>
          )}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Your Assigned Subjects</h3>
              <div className="px-2 py-1 bg-primary/10 rounded-lg">
                <span className="text-[9px] font-black text-primary uppercase">{teacherAssignments.length} Total</span>
              </div>
            </div>
            
            <div className="space-y-6">
              {Object.entries(
                teacherAssignments.reduce((acc, curr) => {
                  if (!acc[curr.className]) acc[curr.className] = [];
                  acc[curr.className].push(curr);
                  return acc;
                }, {})
              ).map(([className, subjects]) => (
                <div key={className} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-3 bg-primary rounded-full"></div>
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{className}</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {subjects.map(a => (
                      <Link 
                        key={a.id} 
                        to={`/dashboard/result-entry?classId=${a.classId}&subjectId=${a.subjectId}`} 
                        className="group flex items-center justify-between p-4 bg-gray-50 hover:bg-white hover:ring-2 hover:ring-primary/20 rounded-xl transition-all border border-transparent hover:border-primary/10 shadow-sm hover:shadow-md active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary border border-gray-100 group-hover:scale-110 transition-transform">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 group-hover:text-primary transition-colors">{a.subjectName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Enter Result / Progress</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-[10px] font-black text-primary leading-none">{Math.round((a.protocolCount / a.totalStudents) * 100)}%</p>
                            <div className="w-12 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-1000" 
                                style={{ width: `${Math.round((a.protocolCount / a.totalStudents) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          <svg className="w-4 h-4 text-gray-300 group-hover:text-primary transition-all transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Admin Quick Links */}
      {(user?.role === 'admin' || user?.role === 'principal') && (
        <div className="grid grid-cols-2 gap-3">
          <Link to="/dashboard/users" className="bg-indigo-600 text-white p-4 rounded-xl text-center">
             <span className="text-[11px] font-black uppercase tracking-widest">Users</span>
          </Link>
          <Link to="/dashboard/settings" className="bg-slate-700 text-white p-4 rounded-xl text-center">
             <span className="text-[11px] font-black uppercase tracking-widest">System</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default AdminTeacherDashboard;
