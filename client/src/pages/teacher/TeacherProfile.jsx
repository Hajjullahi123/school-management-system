import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, apiCall, API_BASE_URL } from '../../api';
import { toast } from '../../utils/toast';

const TeacherProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [formData, setFormData] = useState({
    specialization: '',
    staffId: '',
    email: '',
    firstName: '',
    lastName: '',
    publicPhone: '',
    publicEmail: '',
    publicWhatsapp: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        specialization: user.teacher?.specialization || '',
        staffId: user.teacher?.staffId || user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        publicPhone: user.teacher?.publicPhone || '',
        publicEmail: user.teacher?.publicEmail || '',
        publicWhatsapp: user.teacher?.publicWhatsapp || ''
      });
      const photoUrl = user.photoUrl || user.teacher?.photoUrl;
      if (photoUrl) {
        setPhotoPreview(photoUrl.startsWith('data:') || photoUrl.startsWith('http') ? photoUrl : `${API_BASE_URL}${photoUrl}`);
      }
      if (user.signatureUrl) {
        setSignaturePreview(user.signatureUrl.startsWith('data:') || user.signatureUrl.startsWith('http') ? user.signatureUrl : `${API_BASE_URL}${user.signatureUrl}`);
      }
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setMessage({ type: 'error', text: 'File size must be less than 2MB' });
        return;
      }
      setSignatureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const formDataToSend = new FormData();

      // Add all form fields
      formDataToSend.append('specialization', formData.specialization);
      formDataToSend.append('staffId', formData.staffId);
      if (formData.email) formDataToSend.append('email', formData.email);
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('publicPhone', formData.publicPhone);
      formDataToSend.append('publicEmail', formData.publicEmail);
      formDataToSend.append('publicWhatsapp', formData.publicWhatsapp);

      // Add photo if selected
      if (photoFile) {
        formDataToSend.append('photo', photoFile);
      }

      console.log('Sending update request...');
      const { data, ok } = await apiCall('/api/teachers/profile', {
        method: 'PUT',
        body: formDataToSend
      });
      console.log('Server response:', data);

      // Upload Signature if changed
      if (ok && signatureFile) {
        const reader = new FileReader();
        const base64Data = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(signatureFile);
        });

        await apiCall('/api/teachers/signature-base64', {
          method: 'POST',
          body: JSON.stringify({
            imageData: base64Data,
            fileName: signatureFile.name
          })
        });
      }

      if (ok) {
        toast.success('Profile updated successfully!');
        setMessage({ type: 'success', text: 'Profile updated successfully! Note: For photo or name changes to reflect across the app, you may need to reload.' });
      } else {
        toast.error(data.error || 'Failed to update profile');
        setMessage({ type: 'error', text: data.error || 'Failed to update profile. Please try again.' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: `Error: ${error.message}. Please check if the server is running.` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
        <p className="text-gray-600 mb-6">Update your information and upload a profile picture</p>

        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
            <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                  <span className="text-4xl text-gray-500">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/5 file:text-primary hover:file:bg-primary/10"
              />
              <p className="mt-2 text-xs text-gray-500">Recommended: Square image, at least 400x400px</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-transparent bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-transparent bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Staff ID</label>
              <input
                type="text"
                name="staffId"
                value={formData.staffId}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-transparent bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email (Optional)</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {user?.teacher && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Specialization / Subject</label>
              <input
                type="text"
                name="specialization"
                value={formData.specialization}
                readOnly
                placeholder="e.g., Mathematics, English, Physics"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-transparent bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
          )}

          <div className="bg-primary/5 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-4 bg-primary rounded-full"></span>
              Public Contact Info (Visible to Parents)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Public Phone</label>
                <input
                  type="text"
                  name="publicPhone"
                  value={formData.publicPhone}
                  onChange={handleInputChange}
                  placeholder="e.g. 08012345678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Public Email</label>
                <input
                  type="email"
                  name="publicEmail"
                  value={formData.publicEmail}
                  onChange={handleInputChange}
                  placeholder="teacher@school.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Number</label>
                <input
                  type="text"
                  name="publicWhatsapp"
                  value={formData.publicWhatsapp}
                  onChange={handleInputChange}
                  placeholder="e.g. 2348012345678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="mt-1 text-[10px] text-gray-500 italic">Include country code without + (e.g. 234...)</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Digital Signature
            </label>
            <div className="flex items-center space-x-4">
              {signaturePreview ? (
                <img src={signaturePreview} alt="Signature Preview" className="h-16 w-32 object-contain border rounded bg-gray-50 dark:bg-gray-100" />
              ) : (
                <div className="h-16 w-32 border border-dashed rounded flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  <span className="text-[10px] mt-1">No Signature</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleSignatureChange}
                className="text-sm w-full block file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/5 file:text-primary hover:file:bg-primary/10"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">PNG with transparent background (Recommended: 300x100px). This will be appended to student report cards if you are a Form Master.</p>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-md hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherProfile;
