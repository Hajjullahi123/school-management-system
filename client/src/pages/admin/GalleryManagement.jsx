import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import { API_BASE_URL } from '../../api';

const GalleryManagement = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general'
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'sports', label: 'Sports' },
    { value: 'academics', label: 'Academics' },
    { value: 'events', label: 'Events' },
    { value: 'facilities', label: 'Facilities' },
    { value: 'students', label: 'Students' },
    { value: 'staff', label: 'Staff' }
  ];

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gallery/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setImages(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!formData.title || !selectedFile) {
      toast.error('Title and image required');
      return;
    }

    setUploading(true);

    const uploadData = new FormData();
    uploadData.append('image', selectedFile);
    uploadData.append('title', formData.title);
    uploadData.append('description', formData.description || '');
    uploadData.append('category', formData.category);

    const token = localStorage.getItem('token');

    // Use XMLHttpRequest instead of fetch for better FormData handling
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        console.log(`Upload progress: ${percentComplete}%`);
      }
    });

    xhr.addEventListener('load', () => {
      setUploading(false);
      if (xhr.status === 201) {
        toast.success('Image uploaded!');
        setShowForm(false);
        setFormData({ title: '', description: '', category: 'general' });
        setSelectedFile(null);
        setPreviewUrl('');
        fetchImages();
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          toast.error(error.error || 'Upload failed');
        } catch {
          toast.error('Upload failed');
        }
      }
    });

    xhr.addEventListener('error', () => {
      setUploading(false);
      toast.error('Upload failed');
    });

    xhr.open('POST', `${API_BASE_URL}/api/gallery/upload?token=${token}`);
    xhr.send(uploadData);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this image?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/gallery/images/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Deleted!');
        fetchImages();
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const toggleActive = async (image) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gallery/images/${image.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: image.title,
          description: image.description,
          category: image.category,
          isActive: !image.isActive
        })
      });

      if (response.ok) {
        toast.success(image.isActive ? 'Hidden' : 'Shown!');
        fetchImages();
      }
    } catch (error) {
      toast.error('Failed');
    }
  };

  const getImageSrc = (imageUrl) => {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    return `${API_BASE_URL}${imageUrl}`;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gallery Management</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setFormData({ title: '', description: '', category: 'general' });
            setSelectedFile(null);
            setPreviewUrl('');
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Upload Image
        </button>
      </div>

      {/* Upload Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Upload Image</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Image title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2 h-20"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Image File *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full border rounded px-3 py-2"
                />
                {previewUrl && (
                  <img src={previewUrl} alt="Preview" className="mt-2 max-h-40 rounded" />
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={uploading || !formData.title || !selectedFile}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  disabled={uploading}
                  className="flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Images Grid */}
      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : images.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No images yet. Upload one!</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative group border rounded-lg overflow-hidden">
                <img
                  src={getImageSrc(image.imageUrl)}
                  alt={image.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x300?text=Image+Error';
                  }}
                />
                <div className="p-3">
                  <h3 className="font-medium text-sm truncate">{image.title}</h3>
                  <p className="text-xs text-gray-500 capitalize">{image.category}</p>
                  <p className="text-xs text-gray-400">
                    {image.isActive ? 'Visible' : 'Hidden'}
                  </p>
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => toggleActive(image)}
                    className="bg-white text-blue-600 px-3 py-1 rounded text-sm"
                  >
                    {image.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => handleDelete(image.id)}
                    className="bg-white text-red-600 px-3 py-1 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryManagement;
