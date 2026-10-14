import React, { useState, useRef } from 'react';
import { api, apiCall, API_BASE_URL } from '../api';
import { compressImage } from '../utils/imageCompressor';
import CameraCapture from './CameraCapture';

const PhotoUpload = ({ studentId, currentPhotoUrl, onPhotoUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState(currentPhotoUrl);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);

  // ─── Validate & preview any File object ───────────────────────────────────
  const applyFile = (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed!');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB!');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // ─── From disk ─────────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    applyFile(file);
    e.target.value = '';
  };

  // ─── From camera ──────────────────────────────────────────────────────────
  const handleCameraCapture = (file) => {
    setShowCamera(false);
    applyFile(file);
  };

  // ─── Upload to server ──────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a photo first');
      return;
    }

    setUploading(true);
    try {
      const compressedFile = await compressImage(selectedFile, 500, 500, 0.85);
      const formData = new FormData();
      formData.append('photo', compressedFile);

      const { data, ok, status } = await apiCall(`/api/upload/${studentId}/photo`, {
        method: 'POST',
        body: formData
      });

      if (ok) {
        alert('Photo uploaded successfully!');
        setPreview(data.photoUrl);
        setSelectedFile(null);
        if (onPhotoUpload) onPhotoUpload(data.photoUrl);
      } else {
        const errorMsg = data.message || data.error || `Server error (${status})`;
        alert(`Failed to upload photo: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert(`Failed to upload photo: ${error.message || 'Network error or file too large'}`);
    } finally {
      setUploading(false);
    }
  };

  // ─── Delete photo ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    setDeleting(true);
    try {
      const response = await api.delete(`/api/upload/${studentId}/photo`);

      if (response.ok) {
        alert('Photo deleted successfully!');
        setPreview(null);
        setSelectedFile(null);
        if (onPhotoUpload) onPhotoUpload(null);
      } else {
        const result = await response.json();
        alert(`Error: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo');
    } finally {
      setDeleting(false);
    }
  };

  const photoSrc = preview
    ? (preview.startsWith('http') || preview.startsWith('data:') ? preview : `${API_BASE_URL}${preview}`)
    : null;

  // A saved photo is one that's already on the server (not a fresh local preview)
  const hasSavedPhoto = currentPhotoUrl && !selectedFile;

  return (
    <>
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="bg-gray-50 p-5 rounded-xl border-2 border-dashed border-gray-300">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
          Student Passport Photo
        </p>

        {/* ── Photo preview at the top, centred ── */}
        <div className="flex justify-center mb-4">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt="Student"
              className="w-36 h-36 object-cover rounded-xl border-4 border-white shadow-lg"
            />
          ) : (
            <div className="w-36 h-36 bg-gray-200 rounded-xl border-4 border-white shadow-inner flex flex-col items-center justify-center gap-1">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs text-gray-400">No photo</span>
            </div>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap justify-center gap-2 mb-3">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif"
            onChange={handleFileSelect}
            className="hidden"
            id={`photo-file-input-${studentId}`}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Choose from Gallery
          </button>

          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Use Camera
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mb-3">
          Accepted: JPEG, JPG, PNG, GIF · Max: 5 MB
        </p>

        {/* ── Upload pending file ── */}
        {selectedFile && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
            <span className="text-xs text-blue-700 truncate max-w-[160px]">📎 {selectedFile.name}</span>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="ml-3 bg-primary text-white px-4 py-1.5 rounded-md hover:brightness-90 disabled:bg-gray-400 text-xs font-bold transition-all flex-shrink-0"
            >
              {uploading ? 'Uploading…' : 'Upload Photo'}
            </button>
          </div>
        )}

        {/* ── Delete button (only shown when there is a saved server photo) ── */}
        {hasSavedPhoto && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {deleting ? 'Deleting…' : 'Delete Photo'}
          </button>
        )}
      </div>
    </>
  );
};

export default PhotoUpload;
