import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';

const StudentProfile = () => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    parentGuardianPhone: '',
    parentEmail: '',
    disability: 'None'
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStudentProfile();
  }, []);

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/students/my-profile');

      // Handle non-JSON or error responses
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || `Server error: ${response.status}`);
      }

      if (response.ok) {
        setStudent(data);
        setFormData({
          address: data.address || '',
          parentGuardianPhone: data.parentGuardianPhone || '',
          parentEmail: data.parentEmail || '',
          disability: data.disability || 'None'
        });
      } else {
        setError(data.error || `Failed to load profile (${response.status})`);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // console.log('Submitting profile update:', formData);
      const response = await api.put('/api/students/my-profile', formData);

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse response JSON', jsonError);
        throw new Error('Server returned an invalid response. Please try again.');
      }

      if (response.ok) {
        alert('Profile updated successfully!');
        setStudent(result.student);
        setEditing(false);
      } else {
        console.error('Update failed:', result);
        alert(`Error: ${result.error || 'Failed to update user profile'}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(`Failed to update profile: ${error.message}`);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);

    const uploadData = new FormData();
    uploadData.append('photo', file);

    const token = localStorage.getItem('token');
    const uploadUrl = `${API_BASE_URL}/api/students/my-photo?token=${token}`;

    try {
      console.log('Starting photo upload to:', uploadUrl);
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: uploadData,
        // Don't set Content-Type header, fetch will set it correctly with the boundary
      });

      const result = await response.json();

      if (response.ok) {
        alert('Photo uploaded successfully!');
        fetchStudentProfile(); // Refresh to show new photo
      } else {
        console.error('Upload failed with status:', response.status, result);
        alert(`Error: ${result.error || 'Upload failed'}`);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert(`Failed to upload photo: ${error.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm('Are you sure you want to delete your photo?')) return;

    try {
      const response = await api.delete('/api/students/my-photo');
      const result = await response.json();

      if (response.ok) {
        alert('Photo deleted successfully!');
        fetchStudentProfile();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (error || (!student && !loading)) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-bold">Profile Loading Error</h2>
          </div>
          <p className="text-red-700 mb-6">{error || 'Student profile not found. Please contact the administrator.'}</p>
          <div className="flex gap-3">
            <button
              onClick={fetchStudentProfile}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <a
              href="/"
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Profile
          </button>
        )}
      </div>

      {/* Photo Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Profile Photo</h2>

        <div className="flex items-center gap-6">
          {/* Photo Display */}
          <div className="flex-shrink-0">
            {student.photoUrl ? (
              <img
                src={`${API_BASE_URL}${student.photoUrl}`}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-primary/30"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-white text-4xl font-bold border-4 border-primary/30">
                {student.user.firstName?.[0]}{student.user.lastName?.[0]}
              </div>
            )}
          </div>

          {/* Photo Actions */}
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 mb-2">Upload Your Passport Photo</h3>
            <p className="text-sm text-gray-500 mb-4">
              Accepted: JPG, PNG • Max size: 5MB • Recommended: Square photo, 500x500px
            </p>

            <div className="flex gap-3">
              <label className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {uploadingPhoto ? 'Uploading...' : 'Choose Photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="hidden"
                />
              </label>

              {student.photoUrl && (
                <button
                  onClick={handleDeletePhoto}
                  disabled={uploadingPhoto}
                  className="bg-red-50 text-red-600 px-4 py-2 rounded-md hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove Photo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-6 text-gray-900">Profile Information</h2>

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Read-Only Fields (shown but disabled) */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3 border-b pb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Protected Information (Admin Only)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={`${student.user.firstName} ${student.middleName || ''} ${student.user.lastName}`}
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Admission Number</label>
                  <input
                    type="text"
                    value={student.admissionNumber}
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Class</label>
                  <input
                    type="text"
                    value={student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'Not Assigned'}
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Gender</label>
                  <input
                    type="text"
                    value={student.gender || '-'}
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Contact your admin to update these fields
              </p>
            </div>

            {/* Editable Fields */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3 border-b pb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Information You Can Update
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Residential Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows="3"
                    placeholder="Enter your full address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent/Guardian Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.parentGuardianPhone}
                    onChange={(e) => setFormData({ ...formData, parentGuardianPhone: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="+234 XXX XXX XXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent Email
                  </label>
                  <input
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="parent@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Disability (if any)
                  </label>
                  <select
                    value={formData.disability}
                    onChange={(e) => setFormData({ ...formData, disability: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="None">None</option>
                    <option value="Physical">Physical</option>
                    <option value="Visual">Visual</option>
                    <option value="Hearing">Hearing</option>
                    <option value="Learning">Learning</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                className="bg-primary text-white px-6 py-2 rounded-md hover:brightness-90 transition-colors"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setFormData({
                    address: student.address || '',
                    parentGuardianPhone: student.parentGuardianPhone || '',
                    parentEmail: student.parentEmail || '',
                    disability: student.disability || 'None'
                  });
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* View Mode - Protected Fields */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3 border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                  <p className="text-gray-900 font-medium">{student.user.firstName} {student.middleName || ''} {student.user.lastName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Admission Number</label>
                  <p className="text-gray-900 font-mono">{student.admissionNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Class</label>
                  <p className="text-gray-900">{student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'Not Assigned'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Gender</label>
                  <p className="text-gray-900">{student.gender || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Date of Birth</label>
                  <p className="text-gray-900">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Nationality</label>
                  <p className="text-gray-900">{student.nationality || '-'}</p>
                </div>
              </div>
            </div>

            {/* View Mode - Editable Fields */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3 border-b pb-2">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                  <p className="text-gray-900">{student.address || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Parent/Guardian Phone</label>
                  <p className="text-gray-900">{student.parentGuardianPhone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Parent Email</label>
                  <p className="text-gray-900">{student.parentEmail || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Medical Information */}
            {(student.bloodGroup || student.genotype || student.disability) && (
              <div>
                <h3 className="font-medium text-gray-700 mb-3 border-b pb-2">Medical Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {student.bloodGroup && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Blood Group</label>
                      <p className="text-gray-900">{student.bloodGroup}</p>
                    </div>
                  )}
                  {student.genotype && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Genotype</label>
                      <p className="text-gray-900">{student.genotype}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Disability</label>
                    <p className="text-gray-900">{student.disability || 'None'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900">Note</h4>
            <ul className="text-sm text-blue-700 mt-1 space-y-1">
              <li>• You can update your contact information and upload your photo</li>
              <li>• Important details like name, admission number, and class can only be changed by admin</li>
              <li>• Make sure your information is accurate and up to date</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
