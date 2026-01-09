import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';

const PaymentVerify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [status, setStatus] = useState('verifying'); // verifying, success, failed
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref');

    // Paystack returns 'reference' or 'trxref'
    const ref = reference || trxref;

    if (ref) {
      verifyPayment(ref);
    } else {
      setStatus('failed');
      setMessage('No payment reference found');
      setVerifying(false);
    }
  }, [searchParams]);

  const verifyPayment = async (reference) => {
    try {
      const response = await api.get(`/payments/verify/${reference}`);

      // Check for success in various common formats
      if (response.data?.success || response.data?.status === 'success') {
        setStatus('success');
        setMessage('Payment successful! Your fee record has been updated.');
      } else {
        setStatus('failed');
        setMessage(response.data?.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('failed');
      setMessage(error.response?.data?.error || 'An error occurred during verification');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        {verifying ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <h2 className="text-xl font-bold text-gray-800">Verifying Payment</h2>
            <p className="text-gray-600 mt-2">Please wait while we confirm your transaction...</p>
          </div>
        ) : status === 'success' ? (
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-600">Payment Successful!</h2>
            <p className="text-gray-600 mt-2 mb-6">{message}</p>
            <button
              onClick={() => navigate('/dashboard/student/fees')}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Return to Fees
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-600">Payment Failed</h2>
            <p className="text-gray-600 mt-2 mb-6">{message}</p>
            <button
              onClick={() => navigate('/dashboard/student/fees')}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Return to Fees
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentVerify;
