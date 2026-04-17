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
