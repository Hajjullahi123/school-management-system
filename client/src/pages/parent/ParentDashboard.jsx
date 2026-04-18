import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import { formatCurrency, formatWhatsAppNumber } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import PrintReceiptModal from '../../components/PrintReceiptModal';
import StudentCard from './StudentCard';

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
    const studentApplicableFees = miscFees.filter(fee => {
      return fee.classIds && fee.classIds.includes(student.classId.toString());
    });
    return studentApplicableFees.map(fee => {
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
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-3 sm:p-4 rounded-lg shadow-lg">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/20 p-2 sm:p-3 rounded-full">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base sm:text-lg">No Children Linked</h3>
              <p className="text-xs sm:text-sm text-white/90">Your parent account is active, but no student profiles have been connected yet.</p>
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto mt-8 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/90 p-4 sm:p-6 text-white flex items-center gap-3 sm:gap-4">
            <div className="bg-white/20 p-2 sm:p-4 rounded-full">
              <svg className="w-6 h-6 sm:w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Welcome, {user.firstName}!</h2>
              <p className="text-xs sm:text-sm text-white/90">{schoolSettings?.schoolName || 'SMS'} - Parent Portal</p>
            </div>
          </div>
          <div className="p-4 sm:p-8 text-center">
            <div className="inline-block bg-yellow-100 p-4 rounded-full mb-4">
              <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-2xl font-bold mb-2">No Students Linked</h3>
            <p className="text-gray-600 mb-6">Contact the school administration office to link your children's profiles to your account.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 px-2 transition-all duration-500">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-4 mb-8">
          {alerts.map(alert => (
            <div key={alert.id} className={`p-5 rounded-[24px] shadow-lg border border-white/20 text-white ${alert.subject === 'Safe Arrival Alert' ? 'bg-gradient-to-r from-teal-600 to-emerald-500' : 'bg-gradient-to-r from-rose-600 to-red-500'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-black text-[10px] uppercase tracking-widest opacity-80">{alert.subject}</h4>
                    <p className="text-sm font-bold">{alert.message}</p>
                  </div>
                </div>
                <button onClick={() => markAlertRead(alert.id)} className="bg-white/20 hover:bg-white/40 p-2 rounded-full transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden rounded-[32px] p-6 sm:p-10 bg-gradient-to-br from-primary to-blue-600 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-4xl font-black italic mb-2 text-white">Hello, {user.firstName}!</h1>
            <p className="text-sm opacity-80">{schoolSettings?.schoolName || 'Management System'}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl p-5 rounded-[24px] border border-white/20 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Wards</p>
            <p className="text-4xl font-black italic">{wards.length}</p>
          </div>
        </div>
      </div>

      {/* Children List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        {wards.map(student => (
          <StudentCard
            key={student.id}
            student={student}
            todayStatus={todayStatus}
            getTodayAttendance={getTodayAttendance}
            getStatusBadge={getStatusBadge}
            handleViewFees={handleViewFees}
            getStudentMiscFees={getStudentMiscFees}
            currentTerm={currentTerm}
          />
        ))}
      </div>

      {/* Modals */}
      {showFeeModal && selectedChild && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Payment Ledger: {selectedChild.user?.firstName}</h2>
              <button onClick={() => setShowFeeModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Fee Records Mapping */}
              {selectedChild.feeRecords?.map(fee => (
                <div key={fee.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                    <span className="font-black text-xs uppercase tracking-widest text-slate-500">{fee.academicSession?.name} - {fee.term?.name}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${fee.balance === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {fee.balance === 0 ? 'Fully Paid' : 'Balance Pending'}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                      <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Bill</p>
                      <p className="font-black text-blue-900">{formatCurrency(fee.expectedAmount)}</p>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-xl">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Paid</p>
                      <p className="font-black text-emerald-900">{formatCurrency(fee.paidAmount)}</p>
                    </div>
                    <div className="text-center p-3 bg-rose-50 rounded-xl">
                      <p className="text-[10px] font-bold text-rose-600 uppercase mb-1">Balance</p>
                      <p className="font-black text-rose-900">{formatCurrency(fee.balance)}</p>
                    </div>
                  </div>
                  {/* Payments List */}
                  {fee.payments?.length > 0 && (
                    <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Transaction History</p>
                      <div className="space-y-2">
                        {fee.payments.map(p => (
                          <div key={p.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <div>
                              <p className="text-xs font-black text-slate-800">{formatCurrency(p.amount)}</p>
                              <p className="text-[9px] text-slate-400 font-bold">{new Date(p.paymentDate).toLocaleDateString()} - {p.paymentMethod}</p>
                            </div>
                            <button
                              onClick={() => { setReceiptPayment(p); setReceiptModalOpen(true); }}
                              className="px-4 py-2 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:brightness-110"
                            >
                              Receipt
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setShowFeeModal(false)} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">Close History</button>
            </div>
          </div>
        </div>
      )}

      {receiptPayment && selectedChild && (
        <PrintReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => { setReceiptModalOpen(false); setReceiptPayment(null); }}
          student={selectedChild}
          currentPayment={receiptPayment}
          currentTerm={currentTerm}
          currentSession={currentSession}
          allTerms={allTerms}
          allSessions={allSessions}
        />
      )}

      <div className="bg-blue-600 text-white p-6 rounded-[28px] shadow-xl flex items-center gap-4">
        <div className="bg-white/20 p-3 rounded-2xl">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h3 className="font-black text-sm uppercase tracking-widest">Portal Support</h3>
          <p className="text-xs opacity-70">Monitor your children's progress and stay updated with school notifications.</p>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
