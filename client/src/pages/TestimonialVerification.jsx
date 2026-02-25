import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, Shield, Loader } from 'lucide-react';
import { API_BASE_URL } from '../api';

const TestimonialVerification = () => {
  const { testimonialNumber } = useParams();
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    verifyTestimonial();
  }, [testimonialNumber]);

  const verifyTestimonial = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/testimonials/verify/${testimonialNumber}`);
      const data = await res.json();

      if (data.verified) {
        setVerificationData(data);
        setError(null);
      } else {
        setError(data.error || 'Testimonial not found');
        setVerificationData(null);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Failed to verify testimonial');
      setVerificationData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-2xl p-12 max-w-md w-full text-center">
          <Loader className="animate-spin h-16 w-16 text-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800">Verifying Testimonial...</h2>
          <p className="text-gray-600 mt-2">Please wait while we verify the authenticity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-xl shadow-2xl p-8 md:p-12 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Shield className="h-20 w-20 mx-auto mb-4 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Testimonial Verification</h1>
          <p className="text-gray-600">Official Document Authentication System</p>
        </div>

        {/* Testimonial Number */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8">
          <p className="text-sm text-gray-600 mb-1">Testimonial Number</p>
          <p className="text-lg font-mono font-semibold text-gray-900">{testimonialNumber}</p>
        </div>

        {/* Verification Result */}
        {verificationData ? (
          <div className="space-y-6">
            {/* Success Indicator */}
            <div className="flex items-center justify-center gap-3 bg-green-50 border-2 border-green-500 rounded-lg p-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
              <div>
                <h3 className="text-2xl font-bold text-green-800">Testimonial Verified</h3>
                <p className="text-green-700">This is an authentic testimonial</p>
              </div>
            </div>

            {/* Student Information */}
            <div className="bg-purple-50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                Testimonial Details
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Student Name</p>
                  <p className="text-lg font-semibold text-gray-900">{verificationData.studentName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">School</p>
                  <p className="text-lg font-semibold text-gray-900">{verificationData.schoolName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Conduct</p>
                    <p className="font-semibold text-gray-900">{verificationData.conduct || 'Good'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Issued Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(verificationData.dateIssued).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {verificationData.character && (
                  <div>
                    <p className="text-sm text-gray-600">Character Assessment</p>
                    <p className="text-sm text-gray-900 italic">{verificationData.character}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Verification Timestamp:</strong> {new Date().toLocaleString()}
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                This verification confirms the testimonial was issued by the school and is authentic.
                For additional verification or full testimonial details, please contact the school directly.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Error Indicator */}
            <div className="flex items-center justify-center gap-3 bg-red-50 border-2 border-red-500 rounded-lg p-6">
              <XCircle className="h-12 w-12 text-red-600" />
              <div>
                <h3 className="text-2xl font-bold text-red-800">Verification Failed</h3>
                <p className="text-red-700">Testimonial not found or invalid</p>
              </div>
            </div>

            {/* Error Details */}
            <div className="bg-red-50 rounded-lg p-6">
              <h4 className="font-semibold text-red-800 mb-2">Error Details</h4>
              <p className="text-red-700">{error}</p>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> This testimonial could not be verified in our system.
                This may indicate:
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1">
                <li>The testimonial number is incorrect or has been altered</li>
                <li>The testimonial is fraudulent</li>
                <li>The testimonial has been revoked</li>
              </ul>
              <p className="text-xs text-yellow-700 mt-3">
                If you believe this is an error, please contact the issuing institution directly.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestimonialVerification;
