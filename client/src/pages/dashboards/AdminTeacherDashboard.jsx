import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE_URL } from '../../api';
import { formatNumber } from '../../utils/formatters';
import StaffAttendanceWidget from '../../components/StaffAttendanceWidget';
import { requestPushPermission, checkPushPermission } from '../../utils/push';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

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
  const [deptAlertDismissed, setDeptAlertDismissed] = useState(false);
  const [deptScore, setDeptScore] = useState(null);
  const [nudges, setNudges] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [financialTrend, setFinancialTrend] = useState(null);
  const [pushStatus, setPushStatus] = useState(checkPushPermission());

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
        if (user.departmentAsHead) {
          setDeptScore(data.overallScore);
        }
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

      // Fast Stats Fetch (Optimized for Mobile/Slow Connections) — used as initial placeholder
      let fastStatsLoaded = false;
      try {
        const statsRes = await api.get('/api/settings/stats-summary');
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setTeacherStats({ totalStudents: stats.students, activeClasses: stats.classes });
          setTotalSubjectsCount(stats.subjects);
          fastStatsLoaded = true;
        }
      } catch (err) {
        console.warn('Fast stats fetch failed');
      }

      const [termsRes, sessionsRes] = await Promise.all([
        api.get('/api/terms').catch(err => ({ ok: false, error: err })),
        api.get('/api/academic-sessions').catch(err => ({ ok: false, error: err }))
      ]);

      const terms = termsRes.ok ? await termsRes.json() : [];
      const sessions = sessionsRes.ok ? await sessionsRes.json() : [];

      // We rely completely on the fast stats above for TeacherStats instead of over-fetching
      if (!fastStatsLoaded) {
         console.warn('Fast stats failed, falling back to 0 counts');
         setTeacherStats({ totalStudents: 0, activeClasses: 0 });
         setTotalSubjectsCount(0);
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

        // Fetch Chart Data
        const [attRes, finRes] = await Promise.all([
          api.get('/api/analytics/attendance-trends'),
          api.get(`/api/analytics/financial-overview?termId=${activeTerm.id}&sessionId=${activeSession.id}`)
        ]);

        if (attRes.ok) setAttendanceTrend(await attRes.json());
        if (finRes.ok) setFinancialTrend(await finRes.json());
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

      {/* Push Notification Banner */}
      {pushStatus !== 'granted' && (
        <div className="bg-indigo-600 rounded-2xl p-4 shadow-lg flex items-center justify-between group overflow-hidden relative">
          <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white/20 rounded-xl text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <p className="text-white font-black text-xs uppercase tracking-tight">Enable Real-Time Alerts</p>
              <p className="text-white/70 text-[10px] font-bold uppercase">Stay updated with school activities on your phone</p>
            </div>
          </div>
          <button 
            onClick={async () => {
              const success = await requestPushPermission();
              if (success) setPushStatus('granted');
            }}
            className="px-5 py-2 bg-white text-indigo-600 text-[10px] font-black uppercase rounded-xl hover:scale-105 active:scale-95 transition-all relative z-10"
          >
            Activate Now
          </button>
        </div>
      )}

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
      {deptAlerts && !deptAlertDismissed && (!localStorage.getItem(`snoozed_dept_alert_${user.id}`) || Date.now() > parseInt(localStorage.getItem(`snoozed_dept_alert_${user.id}`))) && (
        <div className="bg-rose-50 border-2 border-rose-100 rounded-3xl p-5 shadow-lg shadow-rose-200/20 relative overflow-hidden animate-bounce-slow">
           <div className="absolute top-0 right-0 w-24 h-24 bg-rose-200/20 rounded-full -mr-12 -mt-12"></div>
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg flex-shrink-0">
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
              <button
                onClick={() => {
                  setDeptAlertDismissed(true);
                  // Snooze for 24 hours
                  localStorage.setItem(`snoozed_dept_alert_${user.id}`, (Date.now() + 24 * 60 * 60 * 1000).toString());
                }}
                className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-rose-200 text-rose-700 text-[10px] font-black uppercase rounded-2xl hover:bg-rose-100 transition-all shadow-sm active:scale-95 whitespace-nowrap"
              >
                Snooze Notice (24h)
              </button>
           </div>
        </div>
      )}

      {/* Compact Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-blue-50 p-5 rounded-2xl shadow-sm border border-blue-100 transition-all hover:scale-[1.02]">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Enrollment</p>
          <p className="text-2xl font-black text-blue-900">{teacherStats?.totalStudents || 0}</p>
        </div>
        <div className="bg-purple-50 p-5 rounded-2xl shadow-sm border border-purple-100 transition-all hover:scale-[1.02]">
          <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">Assigned Classes</p>
          <p className="text-2xl font-black text-purple-900">{teacherStats?.activeClasses || 0}</p>
        </div>
        
        {/* Department Momentum - Compact Tile */}
        {user?.departmentAsHead && (
          <Link to="/dashboard/department-monitoring" className="bg-indigo-50 p-5 rounded-2xl shadow-sm border border-indigo-100 transition-all hover:scale-[1.02] group">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Dept. Momentum</p>
              <svg className="w-3 h-3 text-indigo-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </div>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-black text-indigo-900">{deptScore || 0}%</p>
              {deptScore < 70 && <span className="text-[8px] font-black text-rose-500 uppercase animate-pulse mb-1">Low</span>}
            </div>
          </Link>
        )}

        {/* Quran Access - Compact Tile */}
        {user?.hasQuranAccess && (
          <Link to="/dashboard/quran-tracker" className="bg-emerald-50 p-5 rounded-2xl shadow-sm border border-emerald-100 transition-all hover:scale-[1.02] group">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Qur'an Status</p>
              <svg className="w-3 h-3 text-emerald-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </div>
            <p className="text-lg font-black text-emerald-900 uppercase tracking-tighter">Active Tracking</p>
          </Link>
        )}

        {/* HR & Personnel Finance Hub - Compact Tile */}
        <Link to="/dashboard/hr-center" className="bg-slate-900 p-5 rounded-2xl shadow-xl border border-white/5 transition-all hover:scale-[1.02] group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">HR & Finance</p>
              <svg className="w-3 h-3 text-indigo-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </div>
            <p className="text-lg font-black text-white uppercase tracking-tighter">Staff Portal</p>
          </div>
        </Link>

        {(user?.role === 'admin' || user?.role === 'principal') && (
          <div className="bg-teal-50 p-5 rounded-2xl shadow-sm border border-teal-100 transition-all hover:scale-[1.02]">
            <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">Reg. Subjects</p>
            <p className="text-2xl font-black text-teal-900">{totalSubjectsCount || 0}</p>
          </div>
        )}
      </div>

      {/* Visual Analytics Section */}
      {(user?.role === 'admin' || user?.role === 'principal') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Revenue Overview</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Target vs Collected</span>
              </div>
            </div>
            <div className="h-64">
              {financialTrend ? (
                <Bar 
                  data={{
                    labels: ['Revenue Flow'],
                    datasets: [
                      {
                        label: 'Expected',
                        data: [financialTrend.expected],
                        backgroundColor: 'rgba(99, 102, 241, 0.2)',
                        borderColor: 'rgb(99, 102, 241)',
                        borderWidth: 2,
                        borderRadius: 12,
                      },
                      {
                        label: 'Collected',
                        data: [financialTrend.collected],
                        backgroundColor: 'rgba(34, 197, 94, 0.2)',
                        borderColor: 'rgb(34, 197, 94)',
                        borderWidth: 2,
                        borderRadius: 12,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
                  }}
                />
              ) : <div className="h-full flex items-center justify-center text-gray-400 text-xs font-bold uppercase">Calculating Ledger...</div>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Collection Rate</p>
                  <p className="text-lg font-black text-emerald-600">
                    {financialTrend?.expected > 0 ? ((financialTrend.collected / financialTrend.expected) * 100).toFixed(1) : 0}%
                  </p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Outstanding</p>
                  <p className="text-lg font-black text-rose-500">
                    ₦{formatNumber(Math.max(0, (financialTrend?.expected || 0) - (financialTrend?.collected || 0)))}
                  </p>
               </div>
            </div>
          </div>

          {/* Attendance Trend */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Attendance Pulse (7d)</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Student Presence</span>
              </div>
            </div>
            <div className="h-64">
              {attendanceTrend.length > 0 ? (
                <Line 
                  data={{
                    labels: attendanceTrend.map(t => new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' })),
                    datasets: [
                      {
                        label: 'Present',
                        data: attendanceTrend.map(t => t.present),
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 4,
                        pointBackgroundColor: '#fff'
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } }
                  }}
                />
              ) : <div className="h-full flex items-center justify-center text-gray-400 text-xs font-bold uppercase">No records found for this period.</div>}
            </div>
            <div className="mt-4 flex justify-between items-center pt-4 border-t border-gray-50">
               <p className="text-[10px] font-black text-gray-400 uppercase">Average Daily Presence</p>
               <p className="text-sm font-black text-primary">
                 {attendanceTrend.length > 0 ? (attendanceTrend.reduce((a, b) => a + b.present, 0) / attendanceTrend.length).toFixed(0) : 0} Students
               </p>
            </div>
          </div>
        </div>
      )}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-0.5">Collect {user.formMasterClass.name} Reports</p>
                  </div>
                </div>
              </Link>

              <Link 
                to="/dashboard/broadsheet" 
                className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-3xl shadow-xl shadow-amber-200/40 transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md text-white shadow-inner">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-black uppercase tracking-wider text-sm">Exam Record Sheet</h3>
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-0.5">Full {user.formMasterClass.name} Broadsheet</p>
                  </div>
                </div>
              </Link>

              <Link 
                to="/dashboard/cumulative-report?view=teacher" 
                className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl shadow-xl shadow-indigo-200/40 transition-all hover:scale-[1.02] active:scale-95 sm:col-span-2 lg:col-span-1"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md text-white shadow-inner">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
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


          {/* Assigned Subjects Container */}
          <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 mt-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Your Assigned Subjects</h3>
              <div className="px-2 py-1 bg-primary/10 rounded-lg">
                <span className="text-[9px] font-black text-primary uppercase">{teacherAssignments.length} Total</span>
              </div>
            </div>
            
            <div className="space-y-6">
              {teacherAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No Subjects Assigned</p>
                </div>
              ) : (
                Object.entries(
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
                          to={`/dashboard/result-entry?classId=${a.classId}&subjectId=${a.subjectId}&sessionId=${selectedDashboardSession?.id || ''}&termId=${selectedDashboardTerm?.id || ''}`} 
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
                              <p className="text-[10px] font-black text-primary leading-none">{Math.round((a.protocolCount / a.totalStudents) * 100) || 0}%</p>
                              <div className="w-12 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all duration-1000" 
                                  style={{ width: `${Math.round((a.protocolCount / a.totalStudents) * 100) || 0}%` }}
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
                ))
              )}
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
          <Link to="/dashboard/hr-admin" className="bg-rose-600 text-white p-4 rounded-xl text-center">
             <span className="text-[11px] font-black uppercase tracking-widest">HR Command</span>
          </Link>
          <Link to="/dashboard/settings" className="bg-slate-700 text-white p-4 rounded-xl text-center sm:col-span-2 lg:col-span-1">
             <span className="text-[11px] font-black uppercase tracking-widest">System</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default AdminTeacherDashboard;
