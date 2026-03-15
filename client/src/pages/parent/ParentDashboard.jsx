import React, { useState, useEffect } from 'react';
import { api } from '../../api';
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
                  <h2 className="text-xl sm:text-2xl font-bold">Welcome, {user.firstName}!</h2>
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
    <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2" style={{
      scrollbarWidth: '12px',
      scrollbarColor: '#0f766e #f1f5f9'
    }}>
      {/* Custom scrollbar for Webkit browsers */}
      <style>{`
        div::-webkit-scrollbar {
          width: 12px;
        }
        div::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 6px;
        }
        div::-webkit-scrollbar-thumb {
          background: #0f766e;
          border-radius: 6px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #0d9488;
        }
      `}</style>

      {/* Priority Alerts section */}
      {alerts.length > 0 && (
        <div className="space-y-3 mb-6">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl shadow-xl border-l-8 border-white/30 animate-pulse-slow ${alert.subject === 'Safe Arrival Alert'
                ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white'
                : 'bg-gradient-to-r from-red-600 to-red-500 text-white'
                }`}
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-lg">
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
                  <h4 className="font-black uppercase text-[10px] tracking-widest opacity-80 mb-1">
                    {alert.subject === 'Safe Arrival Alert' ? 'Arrival Alert' : 'Priority Alert'}
                  </h4>
                  <p className="text-sm font-bold leading-tight">{alert.message}</p>
                </div>
                <button
                  onClick={() => markAlertRead(alert.id)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Welcoming Notification Banner */}
      {wards.length > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-primary text-white p-4 rounded-lg shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-full">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">
                {wards.length === 1 ? 'Child Linked Successfully!' : `${wards.length} Children Linked Successfully!`}
              </h3>
              <p className="text-sm text-white/90">
                You are connected to: {wards.map(s => `${s.user?.firstName} ${s.user?.lastName}`).join(', ')}
              </p>
            </div>
            <div className="hidden md:flex items-center bg-white/20 px-4 py-2 rounded-full">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">{wards.length} Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-primary/90 p-4 sm:p-8 rounded-lg text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold truncate">Welcome, {user.firstName}!</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-2">
              <p className="text-xs sm:text-sm text-white/90 truncate">Portal Access • {schoolSettings?.schoolName || 'School System'}</p>
              {currentTerm && (
                <span className="bg-white/20 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded border border-white/20 font-black uppercase tracking-tighter italic">
                  {currentTerm.name}
                </span>
              )}
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="bg-white/20 rounded-lg p-3 sm:p-4">
              <p className="text-[10px] sm:text-sm text-white/90 uppercase tracking-widest">Wards</p>
              <p className="text-2xl sm:text-4xl font-bold">{wards.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Children Cards */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">My Children</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
          {wards.map(student => {
            const currentTermFeeRecord = student.feeRecords?.find(
              fee => fee.term?.isCurrent && fee.academicSession?.isCurrent
            );
            const latestFeeRecord = currentTermFeeRecord || student.feeRecords?.[0];
            const hasFeeInfo = latestFeeRecord != null;

            return (
              <div key={student.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow flex flex-col">
                <div className="bg-gradient-to-r from-primary/5 to-blue-50 p-4 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-lg sm:text-2xl font-bold shadow-lg flex-shrink-0">
                      {student.user?.firstName?.[0]}{student.user?.lastName?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                        {student.user?.firstName} {student.user?.lastName}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">
                        {student.classModel?.name} {student.classModel?.arm}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate uppercase tracking-widest font-semibold">
                        ID: {student.admissionNumber}
                      </p>
                    </div>
                    {/* Today's Attendance Badge */}
                    <div className="flex-shrink-0">
                      {getTodayAttendance(student) ? (
                        <div className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tight flex flex-col items-center justify-center ${getStatusBadge(getTodayAttendance(student).status)}`}>
                          <span className="opacity-60 text-[8px] leading-tight">TODAY</span>
                          <span className="leading-tight">{getTodayAttendance(student).status}</span>
                        </div>
                      ) : (
                        <div className="px-2 py-1 rounded-lg border border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-tight text-gray-400 flex flex-col items-center justify-center">
                          <span className="opacity-60 text-[8px] leading-tight">TODAY</span>
                          <span className="leading-tight">PENDING</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 border-b border-gray-100 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-gray-700 mb-3 flex items-center gap-2 uppercase tracking-wider">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Fee Status {currentTermFeeRecord && <span className="text-primary text-[10px] sm:text-xs font-black ml-auto">CURRENT</span>}
                  </h4>

                  {hasFeeInfo ? (
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex justify-between items-center p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                        <span className="text-xs sm:text-sm text-gray-600">Total</span>
                        <span className="text-sm sm:text-base font-bold text-gray-900">{formatCurrency(latestFeeRecord.expectedAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 sm:p-3 bg-green-50 rounded-lg">
                        <span className="text-xs sm:text-sm text-gray-600">Paid</span>
                        <span className="text-sm sm:text-base font-bold text-green-700">{formatCurrency(latestFeeRecord.paidAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 sm:p-3 bg-red-50 rounded-lg">
                        <span className="text-xs sm:text-sm text-gray-600">Balance</span>
                        <span className="text-sm sm:text-base font-bold text-red-700">{formatCurrency(latestFeeRecord.balance)}</span>
                      </div>

                      <div className="pt-1">
                        {latestFeeRecord.balance === 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-green-100 text-green-800">
                            Fully Paid
                          </span>
                        ) : latestFeeRecord.paidAmount > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-yellow-100 text-yellow-800">
                            Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-red-100 text-red-800">
                            Unpaid
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 sm:py-6 bg-gray-50 rounded-lg">
                      <p className="text-xs sm:text-sm text-gray-400 font-bold uppercase tracking-widest">No Records Found</p>
                    </div>
                  )}
                  {/* Miscellaneous Fees Summary */}
                  {(() => {
                    const studentMiscFees = getStudentMiscFees(student);
                    if (studentMiscFees.length === 0) return null;
                    
                    const totalExpected = studentMiscFees.reduce((sum, f) => sum + f.amount, 0);
                    const totalPaid = studentMiscFees.reduce((sum, f) => sum + (f.paid || 0), 0);
                    const balance = totalExpected - totalPaid;
                    
                    if (totalExpected === 0) return null;

                    return (
                      <div className="mt-4 pt-4 border-t border-dashed border-gray-100">
                        <h4 className="text-[10px] font-black text-slate-400 mb-2 flex items-center gap-2 uppercase tracking-[0.2em]">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                          Misc Obligations
                        </h4>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-orange-50/50 p-2 rounded-lg border border-orange-100/50">
                            <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Expected</p>
                            <p className="text-xs font-bold text-gray-900">{formatCurrency(totalExpected)}</p>
                          </div>
                          <div className="flex-1 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50">
                            <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Paid</p>
                            <p className="text-xs font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
                          </div>
                          <div className={`flex-1 p-2 rounded-lg border ${balance > 0 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
                            <p className={`text-[8px] font-black uppercase tracking-widest ${balance > 0 ? 'text-orange-500' : 'text-slate-400'}`}>Balance</p>
                            <p className={`text-xs font-bold ${balance > 0 ? 'text-orange-700' : 'text-gray-900'}`}>{formatCurrency(balance)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="p-3 sm:p-4 bg-white border-t border-gray-100 flex flex-col gap-2">
                  {/* Row 1: Core Info */}
                  <div className="flex gap-2">
                    {hasFeeInfo && (
                      <button
                        onClick={() => handleViewFees(student)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                      >
                        Fees
                      </button>
                    )}
                    <Link
                      to={`/dashboard/parent/attendance?studentId=${student.id}&view=parent`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                    >
                      Attendance
                    </Link>
                  </div>

                  {/* Row 2: Results/Reports */}
                  <div className="flex gap-2">
                    <Link
                      to={`/dashboard/term-report?studentId=${student.id}&view=parent`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                    >
                      Terminal
                    </Link>
                    <Link
                      to={`/dashboard/progressive-report?studentId=${student.id}&view=parent`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                    >
                      Progressive
                    </Link>
                    <Link
                      to={`/dashboard/cumulative-report?studentId=${student.id}&view=parent`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                    >
                      Cumulative
                    </Link>
                  </div>

                  {/* Row 3: Communication */}
                  <div className="flex">
                    <Link
                      to="/dashboard/parent/messages?view=parent"
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                    >
                      Message
                    </Link>
                  </div>
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
                        <div className="space-y-4">
                          {getStudentMiscFees(selectedChild).map((fee) => (
                            <div key={fee.id} className="border border-purple-100 bg-purple-50/30 rounded-lg overflow-hidden">
                              <div className="p-4 bg-purple-50/50 border-b border-purple-100 flex justify-between items-center">
                                <div>
                                  <h4 className="font-bold text-gray-900">{fee.title}</h4>
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

    </div >
  );
};

export default ParentDashboard;
