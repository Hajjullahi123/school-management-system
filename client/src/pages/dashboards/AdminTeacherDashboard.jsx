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
      const [studentsRes, classesRes, termsRes, sessionsRes] = await Promise.all([
        api.get('/api/students'),
        api.get('/api/classes'),
        api.get('/api/terms'),
        api.get('/api/academic-sessions')
      ]);

      const studentsData = await studentsRes.json();
      const classesData = await classesRes.json();
      const terms = await termsRes.json();
      const sessions = await sessionsRes.json();

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Enrollment</p>
          <p className="text-xl font-black text-gray-900">{teacherStats?.totalStudents || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Assigned Classes</p>
          <p className="text-xl font-black text-gray-900">{teacherStats?.activeClasses || 0}</p>
        </div>
        {user?.role === 'admin' && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Registered Alumni</p>
            <p className="text-xl font-black text-gray-900">{alumniCount || 0}</p>
          </div>
        )}
        {user?.role === 'admin' && feeStats && (
          <>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Collections</p>
              <p className="text-lg font-black text-emerald-900">₦{formatNumber(feeStats.totalPaid)}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
              <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Outstanding</p>
              <p className="text-lg font-black text-amber-900">₦{formatNumber(feeStats.totalBalance)}</p>
            </div>
          </>
        )}
      </div>

      {/* Notices */}
      {notices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-orange-800 italic">Broadcast Wire</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
            {notices.map(n => (
              <div key={n.id} className="p-3">
                <h4 className="text-xs font-bold text-gray-900">{n.title}</h4>
                <p className="text-[10px] text-gray-500 line-clamp-1">{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance & Assignments for Teacher */}
      {user?.role === 'teacher' && (
        <div className="space-y-4">
          <StaffAttendanceWidget />
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Academic Pipelines</h3>
            <div className="space-y-2">
              {teacherAssignments.slice(0, 4).map(a => (
                <Link key={a.id} to={`/dashboard/result-entry?classId=${a.classId}&subjectId=${a.subjectId}`} className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
