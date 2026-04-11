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

  useEffect(() => {
    fetchMainData();
    fetchNotices();
  }, [user]);

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
      const [studentsRes, classesRes, termsRes, sessionsRes, subjectsRes] = await Promise.all([
        api.get('/api/students'),
        api.get('/api/classes'),
        api.get('/api/terms'),
        api.get('/api/academic-sessions'),
        (user?.role === 'admin' || user?.role === 'principal') ? api.get('/api/subjects') : Promise.resolve(null)
      ]);

      const studentsData = await studentsRes.json();
      const classesData = await classesRes.json();
      const terms = await termsRes.json();
      const sessions = await sessionsRes.json();

      if (subjectsRes?.ok) {
        const subjectsData = await subjectsRes.json();
        setTotalSubjectsCount(Array.isArray(subjectsData) ? subjectsData.length : 0);
      }

      setAllTerms(Array.isArray(terms) ? terms : []);
      setAllSessions(Array.isArray(sessions) ? sessions : []);

      const activeTerm = termId ? terms.find(t => t.id === parseInt(termId)) : (terms.find(t => t.isCurrent) || terms[0]);
      const activeSession = sessionId ? sessions.find(s => s.id === parseInt(sessionId)) : (sessions.find(s => s.isCurrent) || sessions[0]);

      setSelectedDashboardTerm(activeTerm);
      setSelectedDashboardSession(activeSession);

      // Basic Stats Calculation
      let totalStudentsCount = 0;
      let activeClassesCount = 0;

      const students = Array.isArray(studentsData) ? studentsData : [];
      const classes = Array.isArray(classesData) ? classesData : [];

      if (user?.role === 'teacher') {
        const myClasses = classes.filter(c => c.classTeacherId == user.id);
        const myClassIds = myClasses.map(c => c.id);
        totalStudentsCount = students.filter(s => myClassIds.includes(s.classId)).length;
        activeClassesCount = myClasses.length;
      } else {
        totalStudentsCount = students.length;
        activeClassesCount = classes.length;
      }

      setTeacherStats({ totalStudents: totalStudentsCount, activeClasses: activeClassesCount });

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

          {/* Form Master Public Contact Widget */}
          {teacherStats?.activeClasses > 0 && (
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-2xl shadow-xl border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-all"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary/20 p-2 rounded-lg">
                    <svg className="w-5 h-5 text-primary-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-black italic uppercase text-xs tracking-widest">Form Master Contact Info</h3>
                    <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest leading-none mt-1">Visible to Parents for Communication</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Public Phone</label>
                    <input 
                      type="text"
                      placeholder="e.g. +234 800 000 0000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs font-bold focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                      defaultValue={user?.teacher?.publicPhone || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        // For simplicity in this demo/dashboard, we can add a local state or use a ref. 
                        // But since 'user' comes from context, we typically update it via a profile update.
                        // We'll add a 'Save' button for better UX.
                      }}
                      id="publicPhone"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Public Email</label>
                    <input 
                      type="email"
                      placeholder="e.g. teacher@school.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs font-bold focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                      defaultValue={user?.teacher?.publicEmail || ''}
                      id="publicEmail"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={async () => {
                      const phone = document.getElementById('publicPhone').value;
                      const email = document.getElementById('publicEmail').value;
                      try {
                        const res = await api.put('/api/teachers/profile', { 
                          publicPhone: phone, 
                          publicEmail: email 
                        });
                        if (res.ok) {
                          alert('Contact details updated successfully! These are now visible to parents.');
                          window.location.reload(); // Simple refresh to update context
                        }
                      } catch (e) {
                        alert('Failed to update contact info');
                      }
                    }}
                    className="bg-primary text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-xl shadow-lg hover: brightness-110 active:scale-95 transition-all"
                  >
                    Save Contact Info
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 font-bold">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Assigned Subjects</h3>
            <div className="space-y-2">
              {teacherAssignments.slice(0, 4).map(a => (
                <Link key={a.id} to={`/dashboard/result-entry?classId=${a.classId}&subjectId=${a.subjectId}`} className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-900">{a.className} - {a.subjectName}</span>
                    <span className="text-[9px] font-black text-primary uppercase">{Math.round((a.protocolCount / a.totalStudents) * 100)}%</span>
                  </div>
                </Link>
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
