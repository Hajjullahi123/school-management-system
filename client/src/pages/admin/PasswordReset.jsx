import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const PasswordReset = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [resetCredentials, setResetCredentials] = useState(null);
  const [loading, setLoading] = useState(false);
  const { settings: schoolSettings } = useSchoolSettings();

  useEffect(() => {
    fetchAllUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search term
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchAllUsers = async () => {
    try {
      const response = await api.get('/api/users');
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Failed to fetch users');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      alert('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/auth/reset-password', {
        userId: selectedUser.id,
        newPassword: newPassword
      });

      const result = await response.json();

      if (response.ok) {
        setResetCredentials({
          name: `${selectedUser.firstName} ${selectedUser.lastName}`,
          username: result.username,
          password: result.temporaryPassword,
          role: selectedUser.role
        });
        setShowResetModal(false);
        setShowCredentialsModal(true);
        setNewPassword('');
        setSelectedUser(null);
        alert('Password reset successfully!');
      } else {
        alert(result.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const length = 8;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setNewPassword(password);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'teacher': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      case 'accountant': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Password Reset Management</h1>
          <p className="text-gray-600 mt-1">Reset passwords for users who have forgotten their credentials</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="relative">
          <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, username, or email..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/90 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">{user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setNewPassword('123456'); // Default password
                        setShowResetModal(true);
                      }}
                      className="text-primary hover:text-primary-dark font-medium flex items-center justify-end gap-1 ml-auto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setSelectedUser(null);
                    setNewPassword('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* User Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/90 rounded-full flex items-center justify-center text-white text-lg font-bold mr-3">
                    {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</p>
                    <p className="text-sm text-gray-600">{selectedUser.username}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getRoleBadgeColor(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* New Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Temporary Password <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter new password (min. 6 characters)"
                    minLength="6"
                  />
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors whitespace-nowrap"
                    title="Generate Random Password"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  User will be required to change this password on next login
                </p>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-yellow-700">
                    This will reset the user's password and they won't be able to log in with their old password.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleResetPassword}
                disabled={loading || !newPassword || newPassword.length < 6}
                className={`flex-1 bg-primary text-white px-6 py-3 rounded-md hover:brightness-90 transition-colors font-semibold ${(loading || !newPassword || newPassword.length < 6) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setSelectedUser(null);
                  setNewPassword('');
                }}
                className="bg-gray-500 text-white px-6 py-3 rounded-md hover:bg-gray-600 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Display Modal */}
      {showCredentialsModal && resetCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:bg-white p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full my-8 print:shadow-none print:max-w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 print:hidden sticky top-0 bg-white z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Password Reset Successful!</h2>
                <button
                  onClick={() => setShowCredentialsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="text-center mb-8 border-b-2 border-primary pb-6">
                <h1 className="text-3xl font-bold text-primary mb-2">Password Reset Confirmation</h1>
                <p className="text-gray-600">{schoolSettings?.schoolName || 'School Name'}</p>
              </div>

              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 mb-6 border-2 border-primary/20">
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
                    {resetCredentials.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{resetCredentials.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{resetCredentials.role}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Username</h4>
                  <p className="text-2xl font-bold text-gray-900 font-mono bg-gray-100 p-3 rounded">
                    {resetCredentials.username}
                  </p>
                </div>

                <div className="bg-white border-2 border-red-200 rounded-lg p-6">
                  <h4 className="text-sm font-medium text-red-600 mb-2">New Temporary Password</h4>
                  <p className="text-2xl font-bold text-red-600 font-mono bg-red-50 p-3 rounded">
                    {resetCredentials.password}
                  </p>
                  <p className="text-xs text-red-500 mt-2">⚠️ User MUST change this password on next login</p>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <h4 className="text-sm font-bold text-yellow-800 mb-1">Important:</h4>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Provide these credentials to the user securely</li>
                  <li>User will be required to change password on next login</li>
                  <li>Old password is no longer valid</li>
                </ul>
              </div>

              <div className="text-center text-sm text-gray-500 border-t pt-4">
                <p>Reset on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 print:hidden sticky bottom-0 bg-white">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-primary text-white px-6 py-3 rounded-md hover:brightness-90 transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Credentials
              </button>
              <button
                onClick={() => {
                  const text = `Password Reset Confirmation\n\nName: ${resetCredentials.name}\nUsername: ${resetCredentials.username}\nNew Password: ${resetCredentials.password}\n\nNote: User must change this password on next login`;
                  navigator.clipboard.writeText(text);
                  alert('Credentials copied to clipboard!');
                }}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowCredentialsModal(false)}
                className="bg-gray-500 text-white px-6 py-3 rounded-md hover:bg-gray-600 transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900">About Password Reset</h4>
            <p className="text-sm text-blue-700 mt-1">
              Use this tool to reset passwords for users who have forgotten their credentials.
              The new password will be temporary and users will be required to change it on their next login.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;
