import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import PrintReceiptModal from '../../components/PrintReceiptModal';
import { formatNumber, formatDate } from '../../utils/formatters';

const StudentFees = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [feeData, setFeeData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [settings, setSettings] = useState(null);
  const [paying, setPaying] = useState(false);
  const [amountToPay, setAmountToPay] = useState('');

  // Receipt Modal State
  const [studentData, setStudentData] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [allTerms, setAllTerms] = useState([]);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');

  useEffect(() => {
    initialLoad();
  }, []);

  const initialLoad = async () => {
    try {
      setLoading(true);
      const [sessionsRes, termsRes] = await Promise.all([
        api.get('/api/academic-sessions'),
        api.get('/api/terms')
      ]);

      const sessionsData = await sessionsRes.json();
      const termsData = await termsRes.json();

      const sessions = Array.isArray(sessionsData) ? sessionsData : [];
      const terms = Array.isArray(termsData) ? termsData : [];

      setAllSessions(sessions);
      setAllTerms(terms);

      const currentSec = sessions.find(s => s.isCurrent);
      const currentTr = terms.find(t => t.isCurrent);

      if (currentSec) {
        setCurrentSession(currentSec);
        setSelectedSessionId(currentSec.id.toString());
      }
      if (currentTr) {
        setCurrentTerm(currentTr);
        setSelectedTermId(currentTr.id.toString());
      }

      // If we have both, fetch data for them
      if (currentSec && currentTr) {
        await fetchData(currentTr.id, currentSec.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error during initial load:', error);
      setLoading(false);
    }
  };

  const fetchData = async (termId, sessionId) => {
    try {
      if (!termId || !sessionId) return;

      setLoading(true);
      setError(null);

      const studentRes = await api.get(`/api/students/user/${user.id}`);
      const studentData = await studentRes.json();
      const studentId = studentData.id;

      // 3. Get fee record
      const feeRes = await api.get(`/api/fees/student/${studentId}?termId=${termId}&academicSessionId=${sessionId}`);
      const feeRecord = await feeRes.json();

      // 4. Get payment history
      const historyRes = await api.get(`/api/fees/payments/${studentId}?termId=${termId}&academicSessionId=${sessionId}`);
      const paymentHistoryData = await historyRes.json();
      setPaymentHistory(Array.isArray(paymentHistoryData) ? paymentHistoryData : []);

      // 5. Get school settings for payment
      const settingsRes = await api.get('/api/settings');
      const settingsData = await settingsRes.json();

      const targetTerm = allTerms.find(t => t.id === parseInt(termId));
      const targetSession = allSessions.find(s => s.id === parseInt(sessionId));

      setFeeData(feeRecord ? {
        ...feeRecord,
        studentId,
        termId,
        sessionId,
        termName: targetTerm?.name || 'Unknown Term',
        sessionName: targetSession?.name || 'Unknown Session'
      } : null);

      setPaymentHistory(Array.isArray(paymentHistoryData) ? paymentHistoryData : []);
      setSettings(settingsData);
      setStudentData(studentData);

      // Default amount to pay is the balance
      if (feeRecord) {
        setAmountToPay(feeRecord.balance.toString());
      }

    } catch (error) {
      console.error('Error fetching fee data:', error);
      // toast.error('Failed to load fee information');
    } finally {
      setLoading(false);
    }
  };

  const handlePayOnline = async (provider = 'paystack') => {
    if (!amountToPay || isNaN(amountToPay) || parseFloat(amountToPay) < 100) {
      toast.error('Please enter a valid amount (minimum ₦100)');
      return;
    }

    if (!settings?.enableOnlinePayment) {
      toast.error('Online payments are currently disabled');
      return;
    }

    setPaying(true);

    try {
      const response = await api.post('/api/payments/initialize', {
        email: user.email || `${user.username}@school.com`,
        amount: parseFloat(amountToPay),
        studentId: feeData.studentId,
        feeRecordId: feeData.id,
        callbackUrl: `${window.location.origin}/dashboard/student/fees/verify`,
        provider
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error || 'Failed to initialize payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment initialization failed. Please try again or contact support.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!feeData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                No fee record found for the current term. Please contact the bursar.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My School Fees</h1>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="text-xs border-gray-300 rounded focus:ring-primary focus:border-primary px-2 py-1"
          >
            {allSessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="text-xs border-gray-300 rounded focus:ring-primary focus:border-primary px-2 py-1"
          >
            {allTerms.filter(t => t.academicSessionId === parseInt(selectedSessionId)).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={() => fetchData(selectedTermId, selectedSessionId)}
            className="bg-primary text-white text-xs px-3 py-1 rounded hover:brightness-90 transition font-bold"
          >
            Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Fee Summary Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-medium uppercase">Total Expected</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">₦{formatNumber(feeData.expectedAmount)}</p>
          <p className="text-sm text-gray-500 mt-1">{feeData.termName} / {feeData.sessionName}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-medium uppercase">Total Paid</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">₦{formatNumber(feeData.paidAmount)}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${(feeData.paidAmount / feeData.expectedAmount) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-red-500">
          <h3 className="text-gray-500 text-sm font-medium uppercase">Outstanding Balance</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">₦{formatNumber(feeData.balance)}</p>
          {feeData.isClearedForExam ? (
            <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold rounded bg-indigo-100 text-indigo-800">
              ✓ Exam Card: Allowed
            </span>
          ) : (
            <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800">
              🚫 Exam Card: Restricted
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Make a Payment</h2>

            {feeData.balance <= 0 ? (
              <div className="text-center py-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Fees Fully Paid</h3>
                <p className="mt-1 text-sm text-gray-500">You have no outstanding balance.</p>
              </div>
            ) : settings?.enableOnlinePayment ? (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Pay (₦)</label>
                  <input
                    type="number"
                    value={amountToPay}
                    onChange={(e) => setAmountToPay(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                    min="100"
                    max={feeData.balance}
                  />
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    Select Secure Gateway
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>

                  {settings?.paystackPublicKey && (
                    <button
                      onClick={() => handlePayOnline('paystack')}
                      disabled={paying}
                      className="w-full py-4 bg-[#111827] text-white rounded-xl font-bold hover:bg-black transform transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-black/10"
                    >
                      {paying ? (
                        <div className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></div>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="#00C3F7"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 18c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z" /></svg>
                          <span>Pay with Paystack</span>
                        </>
                      )}
                    </button>
                  )}

                  {settings?.flutterwavePublicKey && (
                    <button
                      onClick={() => handlePayOnline('flutterwave')}
                      disabled={paying}
                      className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transform transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/10"
                    >
                      {paying ? (
                        <div className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></div>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 130 130"><path fill="#fbb03b" d="M65 0C29.1 0 0 29.1 0 65s29.1 65 65 65 65-29.1 65-65S100.9 0 65 0z" /><path fill="#fff" d="M96.1 40.8L71.4 65.5l24.7 24.7c1.3 1.3 1.3 3.5 0 4.8l-4.8 4.8c-1.3 1.3-3.5 1.3-4.8 0L61.8 75.1l-4.8 4.8 19.9 19.9c1.3 1.3 1.3 3.5 0 4.8l-4.8 4.8c-1.3 1.3-3.5 1.3-4.8 0L42.5 89.6l-4.8-4.8 19.9-19.9-4.8-4.8L28.1 84.8c-1.3 1.3-3.5 1.3-4.8 0l-4.8-4.8c-1.3-1.3-1.3-3.5 0-4.8l24.7-24.7-24.7-24.7c-1.3-1.3-1.3-3.5 0-4.8l4.8-4.8c1.3-1.3 3.5-1.3 4.8 0l24.7 24.7 24.7-24.7c1.3-1.3 3.5-1.3 4.8 0l4.8 4.8c1.3 1.4 1.3 3.5 0 4.8z" /></svg>
                          <span>Pay with Flutterwave</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p className="text-xs text-center text-gray-500 mt-3">
                  Secured by Paystack. A transaction fee may apply.
                </p>
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded">
                <p className="text-gray-600">Online payments are currently disabled. Please pay at the school bursary.</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
            </div>

            {paymentHistory.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No payment history found for this term.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.isArray(paymentHistory) && paymentHistory.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {payment.reference || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {payment.paymentMethod}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          ₦{formatNumber(payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setReceiptPayment(payment);
                              setReceiptModalOpen(true);
                            }}
                            className="text-primary hover:text-primary-dark font-bold flex items-center gap-1 ml-auto"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {receiptPayment && studentData && (
        <PrintReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => {
            setReceiptModalOpen(false);
            setReceiptPayment(null);
          }}
          student={studentData}
          currentPayment={receiptPayment}
          currentTerm={currentTerm}
          currentSession={currentSession}
          allTerms={allTerms}
          allSessions={allSessions}
        />
      )}
    </div>
  );
};

export default StudentFees;
