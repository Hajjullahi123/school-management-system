import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import PrintReceiptModal from '../../components/PrintReceiptModal';

const PaymentVerify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [status, setStatus] = useState('verifying'); // verifying, success, failed
  const [message, setMessage] = useState('Verifying your payment...');
  const [paymentData, setPaymentData] = useState(null);

  // For Receipt Printing
  const [receiptOpen, setReceiptOpen] = useState(false);

  useEffect(() => {
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref');
    const tx_ref = searchParams.get('tx_ref'); // Flutterwave

    const ref = reference || trxref || tx_ref;

    if (ref) {
      verifyPayment(ref);
    } else {
      setStatus('failed');
      setMessage('No payment reference found in the URL');
      setVerifying(false);
    }
  }, [searchParams]);

  const verifyPayment = async (reference) => {
    try {
      const response = await api.get(`/api/payments/verify/${reference}`);
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage('Transaction completed successfully! Your digital records have been updated.');
        // Fetch the actual payment record to allow printing
        fetchLastPayment(reference);
      } else {
        setStatus('failed');
        setMessage(data.error || 'The payment gateway could not verify this transaction.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('failed');
      setMessage('A system error occurred while verifying your payment.');
    } finally {
      setVerifying(false);
    }
  };

  const fetchLastPayment = async (ref) => {
    try {
      // Find the payment record in the database
      const response = await api.get('/api/payments/history');
      const payments = await response.json();
      const match = payments.find(p => p.reference === ref);
      if (match) setPaymentData(match);
    } catch (e) {
      console.error("Error fetching match:", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 font-['Inter']">
      <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-slate-100 relative overflow-hidden">
        {/* Decorative Background Element */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-600 via-primary to-emerald-500"></div>

        {verifying ? (
          <div className="flex flex-col items-center py-8">
            <div className="relative">
              <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-primary"></div>
              <div className="absolute top-0 left-0 h-20 w-20 rounded-full border-4 border-slate-100 opacity-20"></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mt-8">Verifying Transaction</h2>
            <p className="text-slate-500 mt-3 text-lg leading-relaxed">
              Securing connection to payment gateway...<br />
              This will only take a moment.
            </p>
          </div>
        ) : status === 'success' ? (
          <div className="flex flex-col items-center py-4">
            <div className="h-24 w-24 bg-emerald-50 rounded-full flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-20"></div>
              <svg className="h-12 w-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">Payment Verified!</h2>
            <p className="text-slate-600 mt-4 px-4 text-lg">
              {message}
            </p>

            <div className="mt-10 space-y-4 w-full">
              {paymentData && (
                <button
                  onClick={() => setReceiptOpen(true)}
                  className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:brightness-110 transform transition active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Print Official Receipt
                </button>
              )}

              <button
                onClick={() => navigate('/dashboard/student/fees')}
                className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold text-lg hover:bg-slate-200 transition-colors"
              >
                Go to Fee History
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <div className="h-24 w-24 bg-rose-50 rounded-full flex items-center justify-center mb-8">
              <svg className="h-12 w-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900">Verification Failed</h2>
            <p className="text-slate-600 mt-4 px-4 text-lg">
              {message}
            </p>

            <div className="mt-10 space-y-4 w-full">
              <button
                onClick={() => navigate('/dashboard/student/fees')}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition shadow-lg"
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.href = 'mailto:support@school.com'}
                className="w-full py-4 bg-white text-slate-500 rounded-xl font-semibold text-lg hover:text-slate-800 transition-colors border border-slate-200"
              >
                Contact Support
              </button>
            </div>
          </div>
        )}

        <p className="mt-8 text-xs text-slate-400 font-medium tracking-widest uppercase">
          SECURE ENCRYPTED TRANSACTION
        </p>
      </div>

      {/* Hidden Receipt Modal for Printing */}
      {paymentData && (
        <PrintReceiptModal
          open={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          student={paymentData.student}
          payment={paymentData}
          type="single"
        />
      )}
    </div>
  );
};

export default PaymentVerify;
