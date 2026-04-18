import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import { formatCurrency, formatWhatsAppNumber } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import PrintReceiptModal from '../../components/PrintReceiptModal';

const ParentDashboard = () => {
  const { user } = useAuth();
  const [wards, setWards] = useState([]);
  const [miscFees, setMiscFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const { settings: schoolSettings } = useSchoolSettings();

  // Receipt Modal State
  const [allSessions, setAllSessions] = useState([]);
  const [allTerms, setAllTerms] = useState([]);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [todayStatus, setTodayStatus] = useState(null);

  const getTodayString = () => {
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
  };

  useEffect(() => {
    const checkTodayStatus = async () => {
      try {
        const todayStr = getTodayString();
        const response = await api.get(`/api/holidays/check?date=${todayStr}`);
        if (response.ok) {
          const data = await response.json();
          setTodayStatus(data);
        }
      } catch (error) {
        console.error('Error checking today status:', error);
      }
    };
    checkTodayStatus();
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchWards(),
        fetchMiscFees(),
        fetchAcademicData(),
        fetchAlerts()
      ]);
      setLoading(false);
    };
    init();

    // Set up polling for alerts (every 60 seconds)
    const alertInterval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(alertInterval);
  }, []);

  const fetchAcademicData = async () => {
    try {
      const [sessionsRes, termsRes] = await Promise.all([
        api.get('/api/academic-sessions'),
        api.get('/api/terms')
      ]);
      if (sessionsRes.ok && termsRes.ok) {
        const sessions = await sessionsRes.json();
        const terms = await termsRes.json();
        setAllSessions(sessions);
        setAllTerms(terms);
        setCurrentSession(sessions.find(s => s.isCurrent));
        setCurrentTerm(terms.find(t => t.isCurrent));
      }
    } catch (e) {
      console.error('Error fetching academic data:', e);
    }
  };

  const fetchWards = async () => {
    try {
      const response = await api.get('/api/parents/my-wards');
      if (response.ok) {
        const data = await response.json();
        setWards(data);
      }
    } catch (e) {
      console.error('Error fetching wards:', e);
    }
  };

  const fetchMiscFees = async () => {
    try {
      const response = await api.get('/api/misc-fees');
      if (response.ok) {
        setMiscFees(await response.json());
      }
    } catch (e) {
      console.error('Error fetching misc fees:', e);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/api/parents/recent-alerts');
      if (response.ok) {
        setAlerts(await response.json());
      }
    } catch (e) {
      console.error('Error fetching alerts:', e);
    }
  };

  const markAlertRead = async (id) => {
    try {
      await api.put(`/api/messages/${id}/read`, { isRead: true });
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleViewFees = (student) => {
    setSelectedChild(student);
    setShowFeeModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const getTodayAttendance = (student) => {
    if (!student.attendanceRecords || student.attendanceRecords.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = student.attendanceRecords.find(r => {
      const recordDate = new Date(r.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });

    return record;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 border-green-200';
      case 'absent': return 'bg-red-100 text-red-800 border-red-200';
      case 'late': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'excused': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStudentMiscFees = (student) => {
    if (!student.classId) return [];

    // Filter fees applicable to student's class
    const studentApplicableFees = miscFees.filter(fee => {
      return fee.classIds && fee.classIds.includes(student.classId.toString());
    });

    return studentApplicableFees.map(fee => {
      // Find payments for this specific fee
      const payments = (student.miscFeePayments || []).filter(p => p.feeId === fee.id);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

      return {
        ...fee,
        paid: totalPaid,
        balance: fee.amount - totalPaid,
        payments
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your children's profiles...</p>
        </div>
      </div>
    );
  }

  if (wards.length === 0) {
    return (
      <div className="space-y-6">
        {/* No Students Notification Banner */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-3 sm:p-4 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/20 p-2 sm:p-3 rounded-full">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base sm:text-lg">No Children Linked</h3>
              <p className="text-xs sm:text-sm text-white/90">
                Your parent account is active, but no student profiles have been connected yet.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Information */}
        <div className="max-w-3xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/90 p-4 sm:p-6 text-white">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-white/20 p-2 sm:p-4 rounded-full">
                  <svg className="w-6 h-6 sm:w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">Welcome, {user.firstName} {user.lastName}!</h2>
                  <p className="text-xs sm:text-sm text-white/90">{schoolSettings?.schoolName || 'School Management System'} - Parent Portal</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-8">
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-block bg-yellow-100 p-4 sm:p-6 rounded-full mb-3 sm:mb-4">
                  <svg className="w-12 h-12 sm:w-16 h-16 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">No Students Linked</h3>
                <p className="text-xs sm:text-base text-gray-600">
                  It appears that no student accounts are currently associated with your parent profile.
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 sm:p-6 rounded-lg mb-6">
                <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  What to do next:
                </h4>
                <ul className="space-y-2 text-blue-800 text-xs sm:text-base">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-[10px] sm:text-sm">1</span>
                    <span>Contact the admin office</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-[10px] sm:text-sm">2</span>
                    <span>Provide admission number(s)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-[10px] sm:text-sm">3</span>
                    <span>Admin will link your children</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-[10px] sm:text-sm">4</span>
                    <span>Refresh to see information</span>
                  </li>
                </ul>
              </div>

              {/* What You'll See */}
              <div className="bg-green-50 border-l-4 border-green-500 p-4 sm:p-6 rounded-lg">
                <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Once linked, you'll see:
                </h4>
                <ul className="space-y-2 text-green-800 text-xs sm:text-base">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Fee status & history</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Results & academic progress</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Student info & class details</span>
                  </li>
                </ul>
              </div>

              {/* Contact Information */}
              <div className="mt-6 text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong className="text-gray-900">Need help?</strong> Contact the school administration office during working hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[calc(100vh-180px)] overflow-y-auto pr-2 pb-10" style={{
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      {/* Hide scrollbar but keep functionality */}

      {/* Priority Alerts section - Premium Redesign */}
      {alerts.length > 0 && (
        <div className="space-y-4 mb-8">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`relative p-5 rounded-[24px] shadow-2xl border border-white/20 overflow-hidden transition-all hover:scale-[1.01] ${alert.subject === 'Safe Arrival Alert'
                ? 'bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 text-white'
                : 'bg-gradient-to-br from-rose-600 via-red-500 to-orange-500 text-white'
                }`}
            >
              {/* Background Decoration */}
              <div className="absolute top-[-20%] right-[-5%] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              
              <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl shadow-inner border border-white/30 animate-pulse">
                  {alert.subject === 'Safe Arrival Alert' ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em]">Priority</span>
                    <h4 className="font-black uppercase text-[10px] tracking-widest opacity-80">
                      {alert.subject === 'Safe Arrival Alert' ? 'Arrival Confirmation' : 'Important Notice'}
                    </h4>
                  </div>
                  <p className="text-sm font-bold leading-tight tracking-tight drop-shadow-sm">{alert.message}</p>
                </div>
                <button
                  onClick={() => markAlertRead(alert.id)}
                  className="bg-white/20 hover:bg-white/40 p-2.5 rounded-full transition-all active:scale-90 border border-white/20 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Welcome Header - Glassmorphism Edition */}
      <div className="relative group overflow-hidden rounded-[32px] p-1 bg-gradient-to-br from-primary via-primary/80 to-blue-600 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative bg-white/5 backdrop-blur-sm p-6 sm:p-10 rounded-[31px] text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="min-w-0 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mb-4 animate-in fade-in slide-in-from-left-4 duration-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Active Portal Session</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tighter italic mb-2">Hello, {user.firstName}!</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <p className="text-xs sm:text-sm text-white/70 font-medium">{schoolSettings?.schoolName || 'Management System'}</p>
              {currentTerm && (
                <span className="bg-emerald-500 text-white text-[10px] sm:text-xs px-3 py-1 rounded-full font-black uppercase tracking-widest border border-white/20 shadow-lg">
                  {currentTerm.name}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xl p-5 rounded-[24px] border border-white/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
            <div className="text-center space-y-1">
              <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">Connected Wards</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl sm:text-5xl font-black italic tracking-tighter">{wards.length}</span>
                <div className="h-10 w-[2px] bg-white/20 rounded-full"></div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase leading-none text-emerald-400">Verified</p>
                  <p className="text-[10px] font-black uppercase leading-none opacity-40">Accounts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Children Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <span className="w-2 h-8 bg-primary rounded-full"></span>
            Academic Profiles
          </h2>
          <div className="bg-slate-100 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
            {wards.length} Student{wards.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {wards.map(student => {
            const currentTermFeeRecord = student.feeRecords?.find(
              fee => fee.term?.isCurrent && fee.academicSession?.isCurrent
            );
            const latestFeeRecord = currentTermFeeRecord || student.feeRecords?.[0];
            const hasFeeInfo = latestFeeRecord != null;

            return (
              <div key={student.id} className="group flex flex-col bg-white rounded-[32px] overflow-hidden shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
                {/* Ward Header - High Gloss */}
                <div className="relative p-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                  <div className="absolute top-0 right-0 p-4">
                    {todayStatus?.isHoliday ? (
                      <div className="px-3 py-1.5 rounded-2xl bg-blue-50/80 backdrop-blur-sm border border-blue-100 text-[9px] font-black uppercase tracking-widest text-blue-600 flex flex-col items-center">
                        <span className="opacity-50 text-[7px] mb-0.5 leading-none">Status</span>
                        {todayStatus.type === 'weekend' ? 'Weekend' : 'Holiday'}
                      </div>
                    ) : getTodayAttendance(student) ? (
                      <div className={`px-3 py-1.5 rounded-2xl border backdrop-blur-sm text-[9px] font-black uppercase tracking-widest flex flex-col items-center ${getStatusBadge(getTodayAttendance(student).status)}`}>
                        <span className="opacity-50 text-[7px] mb-0.5 leading-none">Today</span>
                        {getTodayAttendance(student).status}
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 rounded-2xl bg-slate-100/80 border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400 flex flex-col items-center">
                        <span className="opacity-50 text-[7px] mb-0.5 leading-none">Attendance</span>
                        Pending
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-[28px] bg-primary p-1 shadow-2xl transition-transform group-hover:rotate-3 duration-500">
                        <div className="w-full h-full rounded-[24px] bg-slate-100 overflow-hidden flex items-center justify-center border-4 border-white">
                          {(() => {
                            const photoUrl = student.user?.photoUrl || student.photoUrl;
                            return photoUrl ? (
                              <img
                                src={photoUrl.startsWith('data:') || photoUrl.startsWith('http') ? photoUrl : `${API_BASE_URL}${photoUrl}`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl font-black text-primary">{student.user?.firstName?.[0]}{student.user?.lastName?.[0]}</span>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center text-white shadow-lg animate-bounce">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>

                    <div className="min-w-0 pr-16">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-1 truncate">
                        {student.user?.firstName} {student.user?.lastName}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-md">
                          {student.classModel?.name} {student.classModel?.arm}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 mt-1 text-[10px] font-bold uppercase tracking-[0.15em]">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <span>REG:</span>
                          <span className="text-slate-800">{student.admissionNumber}</span>
                        </div>
                         {(student.parentPhone || student.parentGuardianPhone) && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <span>PARENT PH:</span>
                            <span className="text-slate-800">{student.parentPhone || student.parentGuardianPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                <div className="p-6 sm:p-8 space-y-6 flex-1 bg-white">
                  {/* Financial Ledger Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Fee Dashboard
                      </h4>
                      {currentTermFeeRecord && <span className="text-[8px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full tracking-widest">CURRENT TERM</span>}
                    </div>

                    {hasFeeInfo ? (
                      <div className="grid grid-cols-1 gap-3">
                        <div className="relative p-4 rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden group/fee transition-all hover:bg-slate-100">
                          <div className="flex justify-between items-center relative z-10">
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Outstanding</p>
                              <p className={`text-2xl font-black italic tracking-tighter ${latestFeeRecord.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {formatCurrency(latestFeeRecord.balance)}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                latestFeeRecord.balance === 0 ? 'bg-emerald-500 text-white' : 
                                latestFeeRecord.paidAmount > 0 ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'
                              }`}>
                                {latestFeeRecord.balance === 0 ? 'Settled' : latestFeeRecord.paidAmount > 0 ? 'Partial' : 'Debt'}
                              </div>
                            </div>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="mt-4 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 bg-emerald-500`}
                              style={{ width: `${Math.min(100, (latestFeeRecord.paidAmount / latestFeeRecord.expectedAmount) * 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-1">
                          <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Fee</p>
                            <p className="font-bold text-slate-900 tracking-tight">{formatCurrency(latestFeeRecord.expectedAmount)}</p>
                          </div>
                          <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 shadow-sm">
                            <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Paid to Date</p>
                            <p className="font-bold text-emerald-700 tracking-tight">{formatCurrency(latestFeeRecord.paidAmount)}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">No Financial Records</p>
                      </div>
                    )}

                    {/* Premium Miscellaneous Summary - Embedded */}
                    {(() => {
                      const studentMiscFees = getStudentMiscFees(student);
                      if (studentMiscFees.length === 0) return null;
                      
                      const totalExpected = studentMiscFees.reduce((sum, f) => sum + f.amount, 0);
                      const totalPaid = studentMiscFees.reduce((sum, f) => sum + (f.paid || 0), 0);
                      const balance = totalExpected - totalPaid;
                      
                      if (totalExpected === 0) return null;

                      return (
                        <div className="p-5 bg-slate-900 rounded-[28px] shadow-2xl relative overflow-hidden group/misc">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover/misc:bg-primary/20 transition-all"></div>
                          
                          <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                              <h4 className="text-[9px] font-black text-primary flex items-center gap-2 uppercase tracking-[0.25em]">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                Ancillary Services
                              </h4>
                              <div className="flex flex-wrap gap-1 max-w-[50%] justify-end">
                                {studentMiscFees.slice(0, 2).map(f => (
                                  <span key={f.id} className="text-[7px] px-2 py-0.5 bg-white/5 text-white/50 rounded-full border border-white/5 font-black uppercase italic truncate">
                                    {f.title}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-white/5 p-2 rounded-2xl text-center">
                                <p className="text-[7px] font-black text-slate-500 uppercase mb-0.5">Billed</p>
                                <p className="text-xs font-bold text-white tracking-tighter italic">₦{totalExpected.toLocaleString()}</p>
                              </div>
                              <div className="bg-white/5 p-2 rounded-2xl text-center">
                                <p className="text-[7px] font-black text-slate-500 uppercase mb-0.5">Cleared</p>
                                <p className="text-xs font-bold text-emerald-400 tracking-tighter italic">₦{totalPaid.toLocaleString()}</p>
                              </div>
                              <div className={`p-2 rounded-2xl border transition-all text-center ${balance > 0 ? 'bg-primary/10 border-primary/20' : 'bg-white/5 border-white/5'}`}>
                                <p className={`text-[7px] font-black uppercase mb-0.5 ${balance > 0 ? 'text-primary' : 'text-slate-500'}`}>Balance</p>
                                <p className={`text-xs font-bold tracking-tighter italic ${balance > 0 ? 'text-white' : 'text-slate-400'}`}>₦{balance.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions Grid - Premium Buttons */}
                  <div className="grid grid-cols-1 gap-4 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      {hasFeeInfo && (
                        <button
                          onClick={() => handleViewFees(student)}
                          className="group/btn flex-1 flex items-center justify-center gap-2 py-4 px-4 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-teal-700 active:scale-95 transition-all"
                        >
                          <svg className="w-4 h-4 transition-transform group-hover/btn:scale-125" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Payments
                        </button>
                      )}
                      <Link
                        to={`/dashboard/parent/attendance?studentId=${student.id}&view=parent`}
                        className="group/btn flex-1 flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
                      >
                        <svg className="w-4 h-4 transition-transform group-hover/btn:scale-125" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Calendar
                      </Link>
                    </div>

                    <div className="flex gap-3">
                      <Link
                        to={`/dashboard/term-report?studentId=${student.id}&view=parent`}
                        className="flex-1 flex flex-col items-center justify-center py-4 bg-slate-900 text-white rounded-[24px] text-[9px] font-black uppercase tracking-widest shadow-xl border border-white/5 hover:bg-black transition-colors"
                      >
                        <span className="opacity-40 text-[7px] mb-1">Terminal</span>
                        Report Card
                      </Link>
                        <Link
                          to={`/dashboard/cumulative-report?studentId=${student.id}&view=parent`}
                          className="flex-1 flex flex-col items-center justify-center py-4 bg-slate-800 text-white rounded-[24px] text-[9px] font-black uppercase tracking-widest shadow-xl border border-white/5 hover:bg-slate-900 transition-colors"
                        >
                          <span className="opacity-40 text-[7px] mb-1">Annual</span>
                          Cumulative
                        </Link>
                      </div>

                      <Link
                        to={`/dashboard/parent/quran?studentId=${student.id}&view=parent`}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-[0.98] transition-all border border-white/10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        View Qur'an Progress
                      </Link>
                    </div>

                    <div className="flex gap-3">
                       <Link
                        to="/dashboard/parent/messages?view=parent"
                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:brightness-110 transition-all active:scale-95"
                      >
                        Support Center
                      </Link>
                      <Link
                        to={`/dashboard/analytics?studentId=${student.id}&view=parent`}
                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-orange-600 transition-all active:scale-95"
                      >
                        Performance
                      </Link>
                    </div>

                    {/* Form Master Quick-Link */}
                    {student.classModel?.classTeacher && (
                      <div className="mt-2 p-5 bg-emerald-50/30 rounded-[28px] border border-emerald-100/50 flex items-center gap-4 transition-all hover:bg-emerald-50 group/master">
                        <div className="h-12 w-12 rounded-2xl bg-white border-2 border-emerald-100 flex items-center justify-center font-black text-emerald-600 shadow-sm overflow-hidden group-hover/master:border-emerald-500 transition-all">
                           {student.classModel.classTeacher.photoUrl ? (
                            <img 
                              src={student.classModel.classTeacher.photoUrl.startsWith('data:') || student.classModel.classTeacher.photoUrl.startsWith('http') ? student.classModel.classTeacher.photoUrl : `${API_BASE_URL}${student.classModel.classTeacher.photoUrl}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{student.classModel.classTeacher.firstName?.[0]}{student.classModel.classTeacher.lastName?.[0]}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-0.5">Form Master</p>
                          <p className="text-sm font-black text-slate-900 truncate">
                            {student.classModel.classTeacher.firstName} {student.classModel.classTeacher.lastName}
                          </p>
                        </div>
                        <div className="flex gap-2">
                           {(student.classModel.classTeacher.teacher?.publicPhone || student.classModel.classTeacher.teacher?.phone) && (
                            <a 
                              href={`tel:${student.classModel.classTeacher.teacher?.publicPhone || student.classModel.classTeacher.teacher?.phone}`}
                              className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm hover:scale-110 active:scale-95 transition-all text-emerald-600 hover:bg-emerald-600 hover:text-white"
                              title="Call Form Master"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </a>
                           )}
                           {(student.classModel.classTeacher.teacher?.publicWhatsapp || student.classModel.classTeacher.teacher?.publicPhone) && (
                            <a 
                              href={`https://wa.me/${formatWhatsAppNumber(student.classModel.classTeacher.teacher?.publicWhatsapp || student.classModel.classTeacher.teacher?.publicPhone || student.classModel.classTeacher.username)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-all text-white"
                              title="WhatsApp Form Master"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.431 6.516a10.024 10.024 0 01-5.115-1.411l-.367-.218-3.801 1.002.112-3.8-.231-.368A9.994 9.994 0 012.83 10.155c0-5.518 4.482-10 10-10 5.518 0 10 4.482 10 10 0 5.519-4.482 10-10 10z" />
                              </svg>
                            </a>
                           )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
            );
          })}
        </div>
      </div>

      {
        showFeeModal && selectedChild && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Fee Payment History</h2>
                    <p className="text-gray-600">
                      {selectedChild.user?.firstName} {selectedChild.user?.lastName} - {selectedChild.admissionNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowFeeModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {selectedChild.feeRecords && selectedChild.feeRecords.length > 0 ? (
                  <div className="space-y-6">
                    {selectedChild.feeRecords.map((feeRecord) => (
                      <div key={feeRecord.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b border-gray-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-bold text-gray-900">
                                {feeRecord.academicSession?.name} - {feeRecord.term?.name}
                              </h4>
                            </div>
                            <div>
                              {feeRecord.balance === 0 ? (
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                                  Fully Paid
                                </span>
                              ) : feeRecord.paidAmount > 0 ? (
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                                  Partially Paid
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                                  Unpaid
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">Total Fee</p>
                              <p className="text-lg font-bold text-blue-700">{formatCurrency(feeRecord.expectedAmount)}</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">Amount Paid</p>
                              <p className="text-lg font-bold text-green-700">{formatCurrency(feeRecord.paidAmount)}</p>
                            </div>
                            <div className="text-center p-3 bg-red-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">Balance</p>
                              <p className="text-lg font-bold text-red-700">{formatCurrency(feeRecord.balance)}</p>
                            </div>
                          </div>

                          {feeRecord.payments && feeRecord.payments.length > 0 && (
                            <div className="mt-4">
                              <h5 className="font-semibold text-gray-700 mb-2">Payment History:</h5>
                              <div className="space-y-2">
                                {feeRecord.payments.map((payment) => (
                                  <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900">
                                        {formatCurrency(payment.amount)}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(payment.paymentDate).toLocaleDateString()} - {payment.paymentMethod}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {payment.reference && (
                                        <span className="text-xs text-gray-400 font-mono">Ref: {payment.reference}</span>
                                      )}
                                      <button
                                        onClick={() => {
                                          setReceiptPayment(payment);
                                          setReceiptModalOpen(true);
                                        }}
                                        className="text-xs bg-white border border-primary text-primary px-3 py-1 rounded hover:bg-primary hover:text-white transition-colors flex items-center gap-1 font-semibold"
                                      >
                                        Receipt
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Miscellaneous Fees Section */}
                    {getStudentMiscFees(selectedChild).length > 0 && (
                      <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          Miscellaneous Fees & Obligations
                        </h3>

                        {/* Grouping Fees by Term/Session Logic could go here, but for now just showing term labels */}
                        <div className="space-y-4">
                          {getStudentMiscFees(selectedChild).map((fee) => (
                            <div key={fee.id} className="border border-purple-100 bg-purple-50/30 rounded-lg overflow-hidden">
                              <div className="p-4 bg-purple-50/50 border-b border-purple-100 flex justify-between items-center">
                                <div>
                                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                    {fee.title}
                                    {fee.term && (
                                      <span className="text-[10px] font-black bg-white/60 text-gray-500 px-1.5 py-0.5 rounded tracking-tighter uppercase italic border border-gray-100">
                                        {fee.term.name}
                                      </span>
                                    )}
                                  </h4>
                                  {fee.description && <p className="text-xs text-gray-500">{fee.description}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                  {fee.isCompulsory && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold uppercase">Compulsory</span>
                                  )}
                                  {fee.balance === 0 ? (
                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Cleared</span>
                                  ) : fee.paid > 0 ? (
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">Partial</span>
                                  ) : (
                                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Unpaid</span>
                                  )}
                                </div>
                              </div>
                              <div className="p-4">
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                  <div className="text-center p-2 bg-white rounded border border-purple-100">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Obligation</p>
                                    <p className="text-sm font-bold text-gray-900">{formatCurrency(fee.amount)}</p>
                                  </div>
                                  <div className="text-center p-2 bg-white rounded border border-purple-100">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Paid</p>
                                    <p className="text-sm font-bold text-green-600">{formatCurrency(fee.paid)}</p>
                                  </div>
                                  <div className="text-center p-2 bg-white rounded border border-purple-100">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Balance</p>
                                    <p className="text-sm font-bold text-red-600">{formatCurrency(fee.balance)}</p>
                                  </div>
                                </div>

                                {fee.payments && fee.payments.length > 0 && (
                                  <div className="mt-3 bg-white/50 rounded p-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Recent Payments:</p>
                                    <div className="space-y-1">
                                      {fee.payments.map(p => (
                                        <div key={p.id} className="flex justify-between items-center text-xs p-1.5 hover:bg-white rounded transition-colors group">
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-900 font-bold">{formatCurrency(p.amount)}</span>
                                            <span className="text-gray-400 font-medium">| {new Date(p.paymentDate).toLocaleDateString()}</span>
                                          </div>
                                          <button
                                            onClick={() => {
                                              setReceiptPayment({
                                                ...p,
                                                receiptNumber: p.receiptNumber || 'N/A',
                                                fee: { title: fee.title }
                                              });
                                              setReceiptModalOpen(true);
                                            }}
                                            className="text-[10px] text-primary hover:underline font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            Receipt
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No fee records available</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white flex justify-end gap-3">
                <button
                  onClick={() => setShowFeeModal(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-bold text-blue-900">Parent Portal Information</h3>
            <p className="text-sm text-blue-700 mt-1">
              You can view your children's fee status, payment history, and academic progress.
            </p>
          </div>
        </div>
      </div>

      {
        receiptPayment && selectedChild && (
          <PrintReceiptModal
            isOpen={receiptModalOpen}
            onClose={() => {
              setReceiptModalOpen(false);
              setReceiptPayment(null);
            }}
            student={selectedChild}
            currentPayment={receiptPayment}
            currentTerm={currentTerm}
            currentSession={currentSession}
            allTerms={allTerms}
            allSessions={allSessions}
          />
        )
      }

    </div>
  );
};

export default ParentDashboard;
