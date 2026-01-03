import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const ParentDashboard = () => {
  const { user } = useAuth();
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const { settings: schoolSettings } = useSchoolSettings();

  useEffect(() => {
    fetchWards();
  }, []);

  const fetchWards = async () => {
    try {
      const response = await api.get('/api/parents/my-wards');
      if (response.ok) {
        const data = await response.json();
        setWards(data);
      }
    } catch (e) {
      console.error('Error fetching wards:', e);
    } finally {
      setLoading(false);
    }
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
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-full">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">No Children Linked to Your Account</h3>
              <p className="text-sm text-white/90">
                Your parent account is active, but no student profiles have been connected yet.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Information */}
        <div className="max-w-3xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/90 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-4 rounded-full">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Welcome, {user.firstName}!</h2>
                  <p className="text-white/90">{schoolSettings?.schoolName || 'School Management System'} - Parent Portal</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="inline-block bg-yellow-100 p-6 rounded-full mb-4">
                  <svg className="w-16 h-16 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Students Linked</h3>
                <p className="text-gray-600">
                  It appears that no student accounts are currently associated with your parent profile.
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg mb-6">
                <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  What to do next:
                </h4>
                <ul className="space-y-2 text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-sm">1</span>
                    <span>Contact the school administration office</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-sm">2</span>
                    <span>Provide your child's/children's admission number(s)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-sm">3</span>
                    <span>Admin will link your children to this parent account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-sm">4</span>
                    <span>Refresh this page to see your children's information</span>
                  </li>
                </ul>
              </div>

              {/* What You'll See */}
              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
                <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Once linked, you'll be able to view:
                </h4>
                <ul className="space-y-2 text-green-800">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>School fee payment status and history</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Academic performance and results</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Complete payment breakdown by term</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Student information and class details</span>
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
      <div className="bg-gradient-to-r from-primary to-primary/90 p-8 rounded-lg text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {user.firstName}!</h1>
            <p className="text-white/90 mt-2">{schoolSettings?.schoolName || 'School Management System'} - Parent Portal</p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/20 rounded-lg p-4">
              <p className="text-sm text-white/90">Total Children</p>
              <p className="text-4xl font-bold">{wards.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Children Cards */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">My Children</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {wards.map(student => {
            // Find the current term's fee record
            const currentTermFeeRecord = student.feeRecords?.find(
              fee => fee.term?.isCurrent && fee.academicSession?.isCurrent
            );
            // Fallback to latest if no current term fee exists
            const latestFeeRecord = currentTermFeeRecord || student.feeRecords?.[0];
            const hasFeeInfo = latestFeeRecord != null;

            return (
              <div key={student.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/5 to-blue-50 p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {student.user?.firstName?.[0]}{student.user?.lastName?.[0]}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">
                        {student.user?.firstName} {student.user?.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {student.classModel?.name} {student.classModel?.arm}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Admission: {student.admissionNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fee Summary */}
                <div className="p-6 border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    School Fee Status {currentTermFeeRecord && <span className="text-primary text-xs">(Current Term)</span>}
                  </h4>

                  {hasFeeInfo ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Total Fee</span>
                        <span className="font-bold text-gray-900">{formatCurrency(latestFeeRecord.expectedAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-600">Paid</span>
                        <span className="font-bold text-green-700">{formatCurrency(latestFeeRecord.paidAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span className="text-sm text-gray-600">Balance</span>
                        <span className="font-bold text-red-700">{formatCurrency(latestFeeRecord.balance)}</span>
                      </div>

                      {/* Payment Status Badge */}
                      <div className="pt-2">
                        {latestFeeRecord.balance === 0 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Fully Paid
                          </span>
                        ) : latestFeeRecord.paidAmount > 0 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                            </svg>
                            Partially Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Not Paid
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm text-gray-500">No fee records available</p>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="p-6 bg-gray-50/50 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Academic Session</p>
                    <p className="text-sm font-bold text-gray-900">
                      {latestFeeRecord?.academicSession?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Term</p>
                    <p className="text-sm font-bold text-gray-900">
                      {latestFeeRecord?.term?.name || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-2">
                  <div className="flex gap-2">
                    {hasFeeInfo && (
                      <button
                        onClick={() => handleViewFees(student)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-primary text-white rounded-lg text-sm font-semibold hover:brightness-90 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Fee Details
                      </button>
                    )}
                    <Link
                      to="/term-report"
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Report Card
                    </Link>
                  </div>
                  <Link
                    to="/parent/attendance"
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    View Attendance
                  </Link>
                  <Link
                    to="/parent/messages"
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message Form Master
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fee Details Modal */}
      {showFeeModal && selectedChild && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
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

            {/* Modal Content */}
            <div className="p-6">
              {selectedChild.feeRecords && selectedChild.feeRecords.length > 0 ? (
                <div className="space-y-6">
                  {selectedChild.feeRecords.map((feeRecord, index) => (
                    <div key={feeRecord.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Fee Record  Header */}
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

                      {/* Fee Summary */}
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

                        {/* Payment History */}
                        {feeRecord.payments && feeRecord.payments.length > 0 && (
                          <div className="mt-4">
                            <h5 className="font-semibold text-gray-700 mb-2">Payment History:</h5>
                            <div className="space-y-2">
                              {feeRecord.payments.map((payment) => (
                                <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {formatCurrency(payment.amount)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(payment.paymentDate).toLocaleDateString()} - {payment.paymentMethod}
                                    </p>
                                  </div>
                                  {payment.reference && (
                                    <span className="text-xs text-gray-500">Ref: {payment.reference}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">No fee records available</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
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
      )}

      {/* Info Section */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-bold text-blue-900">Parent Portal Information</h3>
            <p className="text-sm text-blue-700 mt-1">
              You can view your children's fee status, payment history, and academic progress.
              For any fee-related queries, please contact the school accountant or admin office.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
