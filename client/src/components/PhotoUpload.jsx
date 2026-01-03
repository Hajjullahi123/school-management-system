import React, { useState } from 'react';
import { api, API_BASE_URL } from '../api';

const PhotoUpload = ({ studentId, currentPhotoUrl, onPhotoUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentPhotoUrl);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPEG, JPG, PNG, and GIF files are allowed!');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB!');
      return;
    }

    setSelectedFile(file);

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a photo first');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);

      const response = await api.post(`/api/upload/${studentId}/photo`, formData);

      const result = await response.json();

      if (response.ok) {
        alert('Photo uploaded successfully!');
        setPreview(`${API_BASE_URL}${result.photoUrl}`);
        setSelectedFile(null);
        if (onPhotoUpload) {
          onPhotoUpload(result.photoUrl);
        }
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const response = await api.delete(`/api/upload/${studentId}/photo`);

      if (response.ok) {
        alert('Photo deleted successfully!');
        setPreview(null);
        setSelectedFile(null);
        if (onPhotoUpload) {
          onPhotoUpload(null);
        }
      } else {
        const result = await response.json();
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo');
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
      <label className="block text-sm font-medium text-gray-700 mb-3">Student Passport Photo</label>

      {/* Photo Preview */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {preview ? (
            <div className="relative">
              <img
                src={preview.startsWith('http') || preview.startsWith('data:') ? preview : `${API_BASE_URL}${preview}`}
                alt="Student"
                className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
              />
              {currentPhotoUrl && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  title="Delete photo"
                >
                  ×
                </button>
              )}
            </div>
          ) : (
            <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center border-2 border-gray-300">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1">
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary/5 file:text-primary
              hover:file:bg-primary/10"
          />
          <p className="text-xs text-gray-500 mt-1">
            Accepted: JPEG, JPG, PNG, GIF (Max: 5MB)
          </p>

          {selectedFile && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="mt-3 bg-primary text-white px-4 py-2 rounded-md hover:brightness-90 disabled:bg-gray-400 text-sm"
            >
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload;
