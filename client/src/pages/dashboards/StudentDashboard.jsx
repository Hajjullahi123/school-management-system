import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE_URL } from '../../api';
import { formatNumber } from '../../utils/formatters';

const StudentDashboard = ({ user, currentTerm, currentSession }) => {
  const [studentData, setStudentData] = useState(null);
  const [studentFeeRecord, setStudentFeeRecord] = useState(null);
  const [miscFeeSummary, setMiscFeeSummary] = useState([]);
  const [previousPerformance, setPreviousPerformance] = useState(null);
  const [previousTermName, setPreviousTermName] = useState('');
  const [notices, setNotices] = useState([]);
  const [stats, setStats] = useState({
    currentTermAverage: 0,
    totalSubjects: 0,
    attendanceRate: 0,
    overallPosition: 0
  });

  useEffect(() => {
    fetchDashboardData();
    fetchNotices();
  }, [user, currentTerm, currentSession]);

  const fetchNotices = async () => {
    try {
      const response = await api.get('/api/notices');
      if (response.ok) {
        const data = await response.json();
        setNotices(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch notices');
    }
  };

  const fetchDashboardData = async () => {
    if (!user?.student?.id) return;

    try {
      // Find previous term for performance summary
      if (currentTerm) {
        const allTermsResponse = await api.get('/api/terms');
        if (allTermsResponse.ok) {
          const allTermsData = await allTermsResponse.json();
          const allTerms = Array.isArray(allTermsData) ? allTermsData : [];
          const sortedTerms = allTerms.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
          const currentIndex = sortedTerms.findIndex(t => t.id === currentTerm.id);
          if (currentIndex > 0) {
            const prevTerm = sortedTerms[currentIndex - 1];
            try {
              const reportCardRes = await api.get(`/api/report-card/${user.student.id}/${prevTerm.id}`);
              if (reportCardRes.ok) {
                const reportData = await reportCardRes.json();
                setPreviousPerformance(reportData.summary);
                setPreviousTermName(prevTerm.name);
              }
            } catch (err) { }
          }
        }
      }

      // Fetch student details
      const studentResponse = await api.get(`/api/students/${user.student.id}`);
      if (studentResponse.ok) {
        const student = await studentResponse.json();
        setStudentData(student);
      }

      // Fetch fee record
      if (currentTerm && currentSession) {
        try {
          const feeResponse = await api.get(
            `/api/fees/student/${user.student.id}/summary?termId=${currentTerm.id}&academicSessionId=${currentSession.id}`
          );
          if (feeResponse.ok) {
            const feeData = await feeResponse.json();
            setStudentFeeRecord(feeData);
          }
        } catch (error) { }
      }

      // Fetch attendance summary
      let attendanceRate = 0;
      try {
        const attendanceRes = await api.get(`/api/attendance/student/${user.student.id}/summary`);
        if (attendanceRes.ok) {
          const summary = await attendanceRes.json();
          attendanceRate = summary.total > 0
            ? ((summary.present + summary.late) / summary.total * 100).toFixed(1)
            : 0;
        }
      } catch (e) { }

      // Fetch Miscellanous fees
      try {
        const miscFeeResponse = await api.get(`/api/misc-fees/student/${user.student.id}`);
        if (miscFeeResponse.ok) {
          const miscFeeData = await miscFeeResponse.json();
          setMiscFeeSummary(Array.isArray(miscFeeData) ? miscFeeData : []);
        }
      } catch (error) { }

      // Fetch current term results
      const resultsResponse = await api.get(`/api/results?studentId=${user.student.id}`);
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const results = Array.isArray(resultsData) ? resultsData : [];
        if (results.length > 0) {
          const totalScore = results.reduce((sum, r) => sum + (r.totalScore || 0), 0);
          const average = (totalScore / results.length).toFixed(2);
          setStats({
            currentTermAverage: average,
            totalSubjects: results.length,
            attendanceRate: attendanceRate,
            overallPosition: results[0]?.positionInClass || 0
          });
        } else {
          setStats(prev => ({ ...prev, attendanceRate }));
        }
      }
    } catch (error) {
      console.error('Error fetching student dashboard info:', error);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Welcome Header with Photo */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-5 sm:p-6 rounded-lg shadow-lg">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {studentData?.photoUrl ? (
            <img
              src={`${API_BASE_URL}${studentData.photoUrl}`}
              alt="Student"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-xl"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white flex items-center justify-center text-primary font-black text-2xl sm:text-3xl border-4 border-white shadow-xl">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          )}
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black italic tracking-tighter uppercase leading-tight">
              Welcome, {user?.firstName}!
            </h1>
            <div className="flex flex-col mt-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-white/90 text-xs sm:text-base font-bold uppercase tracking-widest opacity-80 truncate">
                  {studentData?.classModel?.name} {studentData?.classModel?.arm || ''}
                </span>
                {currentTerm && (
                  <span className="bg-white/10 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded border border-white/20 font-black uppercase tracking-tighter italic">
                    {currentTerm.name}
                  </span>
                )}
              </div>
              <span className="text-white font-black bg-white/20 px-3 py-1.5 rounded-full text-[10px] sm:text-xs w-fit mx-auto sm:mx-0 uppercase tracking-widest border border-white/20">
                ADM: {studentData?.admissionNumber || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notices Section */}
      {notices.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-orange-500">
          <div className="p-4 bg-orange-50 border-b border-orange-100 italic font-black uppercase tracking-widest text-[10px] text-orange-800 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            Bulletin Intelligence
          </div>
          <div className="divide-y divide-gray-100">
            {notices.slice(0, 3).map(notice => (
              <div key={notice.id} className="p-4 hover:bg-gray-50 transition-colors">
                <h4 className="font-bold text-gray-900 text-sm">{notice.title}</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notice.content}</p>
                <div className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider flex justify-between">
                  <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personal Information */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 border-b border-gray-50 pb-2">Identification Ledger</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-[11px]">
          <div>
            <p className="text-gray-400 font-bold uppercase tracking-tighter mb-0.5">Full Name</p>
            <p className="font-black text-gray-900 break-words">{user?.firstName} {user?.lastName}</p>
          </div>
          <div>
            <p className="text-gray-400 font-bold uppercase tracking-tighter mb-0.5">Birth Ledger</p>
            <p className="font-black text-gray-900">
              {studentData?.dateOfBirth ? new Date(studentData.dateOfBirth).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-400 font-bold uppercase tracking-tighter mb-0.5">Gender</p>
            <p className="font-black text-gray-900 uppercase">{studentData?.gender || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-400 font-bold uppercase tracking-tighter mb-0.5">Blood / Genotype</p>
            <p className="font-black text-gray-900 uppercase">
              {studentData?.bloodGroup || 'N/A'} / {studentData?.genotype || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-400 font-bold uppercase tracking-tighter mb-0.5">Origin</p>
            <p className="font-black text-gray-900 uppercase">{studentData?.nationality || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="bg-slate-900 p-5 sm:p-8 rounded-[24px] overflow-hidden relative border border-white/5">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black italic tracking-tighter text-white uppercase">Financial Ledger</h2>
            <Link to="/dashboard/student/fees" className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-white/10">
              Audit
            </Link>
          </div>
          {studentFeeRecord ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Expected</p>
                <p className="text-xl font-black text-white">₦{formatNumber(studentFeeRecord.expectedAmount || 0)}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Settled</p>
                <p className="text-xl font-black text-emerald-400">₦{formatNumber(studentFeeRecord.paidAmount || 0)}</p>
              </div>
              <div className={`p-4 rounded-xl border ${studentFeeRecord.balance > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/5'}`}>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Balance</p>
                <p className={`text-xl font-black ${studentFeeRecord.balance > 0 ? 'text-white' : 'text-slate-400'}`}>
                  ₦{formatNumber(studentFeeRecord.balance || 0)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-center py-4 text-slate-500 text-xs italic">No tuition records found for this term.</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/dashboard/term-report" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-all">
          <div className="text-primary mb-2 bg-primary/10 p-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Grades</span>
        </Link>
        <Link to="/dashboard/cumulative-report" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center group hover:border-blue-500/50 transition-all">
          <div className="text-blue-600 mb-2 bg-blue-50 p-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">History</span>
        </Link>
        <Link to="/dashboard/progressive-report" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center group hover:border-purple-500/50 transition-all">
          <div className="text-purple-600 mb-2 bg-purple-50 p-2 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6m6 6v-3m-6-6V7a2 2 0 114 0v2" /></svg>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Charts</span>
        </Link>
      </div>
    </div>
  );
};

export default StudentDashboard;
