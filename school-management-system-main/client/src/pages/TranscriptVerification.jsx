import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../api';
import { ShieldCheck, ShieldAlert, Loader2, School, User, Calendar, CheckCircle } from 'lucide-react';

const TranscriptVerification = () => {
  const { studentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verify = async () => {
      try {
        // Public route doesn't need auth
        const res = await fetch(`${API_BASE_URL}/api/promotion/verify/${studentId}`);
        if (res.ok) {
          setData(await res.json());
        } else {
          setError('Invalid verification link or record not found.');
        }
      } catch (err) {
        setError('Unable to reach the verification server.');
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [studentId]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
      <p className="text-gray-500 font-medium">Verifying Academic Credentials...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className={`p-6 text-white text-center ${error ? 'bg-red-500' : 'bg-green-600'}`}>
          {error ? (
            <ShieldAlert className="w-16 h-16 mx-auto mb-2" />
          ) : (
            <ShieldCheck className="w-16 h-16 mx-auto mb-2" />
          )}
          <h1 className="text-2xl font-bold uppercase tracking-tight">
            {error ? 'Verification Failed' : 'Credential Verified'}
          </h1>
          <p className="text-white/80 text-sm mt-1">Official School Verification System</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {error ? (
            <div className="text-center">
              <p className="text-gray-600 mb-6">{error}</p>
              <Link to="/" className="inline-block bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-300 transition-all">
                Back to Home
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Student Name</p>
                  <p className="text-lg font-bold text-gray-900 uppercase">{data.studentName}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">School</p>
                  <p className="text-lg font-bold text-gray-900">{data.schoolName}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Graduation Year</p>
                  <p className="text-lg font-bold text-gray-900">{data.graduationYear || 'N/A'}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center justify-center gap-2 text-green-600 font-bold bg-green-50 py-3 rounded-xl border border-green-100">
                  <CheckCircle className="w-5 h-5" />
                  STATUS: {data.status?.toUpperCase()}
                </div>
              </div>

              <p className="text-[10px] text-gray-400 text-center mt-6">
                Verification Hash: {btoa(`${data.studentName}-${data.graduationYear}`).substring(0, 16).toUpperCase()}
                <br />
                Last Updated: {new Date(data.lastUpdated).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Branding Footer */}
      <div className="mt-8 text-center">
        <p className="text-gray-400 text-xs font-medium">Powered by School Management System Security</p>
      </div>
    </div>
  );
};

export default TranscriptVerification;
