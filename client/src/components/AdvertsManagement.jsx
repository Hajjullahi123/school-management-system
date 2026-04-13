import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiImage, FiLink, FiCheckCircle, FiXCircle, FiUploadCloud } from 'react-icons/fi';
import { toast } from '../utils/toast';
import { apiCall } from '../api';
import Modal from './Modal'; // Reusing standard modal styling

const AdvertsManagement = () => {
  const [adverts, setAdverts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    targetUrl: '',
    isActive: true
  });

  const fetchAdverts = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/api/adverts');
      if (Array.isArray(res.data)) {
        setAdverts(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load advertisements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdverts();
  }, []);

  const handleOpenModal = (ad = null) => {
    if (ad) {
      setEditingAd(ad);
      setFormData({
        title: ad.title,
        imageUrl: ad.imageUrl,
        targetUrl: ad.targetUrl || '',
        isActive: ad.isActive
      });
    } else {
      setEditingAd(null);
      setFormData({ title: '', imageUrl: '', targetUrl: '', isActive: true });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAd(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.imageUrl) {
      toast.error('Title and Image URL are required');
      return;
    }
    
    try {
      if (editingAd) {
        await apiCall(`/api/adverts/${editingAd.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        toast.success('Advert updated successfully');
      } else {
        await apiCall('/api/adverts', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        toast.success('Advert added successfully');
      }
      handleCloseModal();
      fetchAdverts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save advert');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the advert "${title}"?`)) return;
    
    try {
      await apiCall(`/api/adverts/${id}`, { method: 'DELETE' });
      toast.success('Advert deleted');
      fetchAdverts();
    } catch (err) {
      toast.error('Failed to delete advert');
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      await apiCall(`/api/adverts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      toast.success(currentStatus ? 'Advert deactivated' : 'Advert activated');
      fetchAdverts();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading && adverts.length === 0) {
    return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 mx-auto border-2 border-indigo-500 rounded-full border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Dynamic Advertisements</h3>
          <p className="text-sm text-gray-500 mt-1">Manage partner ads displayed on the main login portal</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md transition-all whitespace-nowrap"
        >
          <FiPlus className="mr-2" /> Add New Advert
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adverts.map(ad => (
          <div key={ad.id} className={\`bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all group \${!ad.isActive ? 'opacity-70' : ''}\`}>
            {/* Image Preview */}
            <div className="h-40 bg-gray-100 relative overflow-hidden flex items-center justify-center p-4">
              <img 
                src={ad.imageUrl} 
                alt={ad.title} 
                className="max-h-full max-w-full object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-500"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/400x200?text=Invalid+Image'; }}
              />
              <div className="absolute top-2 right-2">
                <span className={\`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest shadow-sm backdrop-blur-md \${ad.isActive ? 'bg-emerald-100/90 text-emerald-700' : 'bg-gray-200/90 text-gray-600'}\`}>
                  {ad.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="p-5">
              <h4 className="font-bold text-gray-900 text-lg mb-2 truncate">{ad.title}</h4>
              
              {ad.targetUrl ? (
                <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 mb-4 truncate w-full">
                  <FiLink className="min-w-3" /> <span className="truncate">{ad.targetUrl}</span>
                </a>
              ) : (
                <p className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                  <FiLink /> No link configured
                </p>
              )}

              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => toggleStatus(ad.id, ad.isActive)}
                  className={\`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors \${ad.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}\`}
                >
                  {ad.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleOpenModal(ad)}
                  className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Edit"
                >
                  <FiEdit2 />
                </button>
                <button
                  onClick={() => handleDelete(ad.id, ad.title)}
                  className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {adverts.length === 0 && !loading && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
            <FiImage className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No advertisements found.</p>
            <p className="text-sm text-gray-400 mt-1">Add your first advert to make the login page dynamic.</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-6 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
               Add Advert
            </button>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {editingAd ? 'Edit Advertisement' : 'Add New Advertisement'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:bg-gray-200 hover:text-gray-700 p-2 rounded-xl transition-colors">
                <FiXCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  placeholder="e.g., Summer Book Fair 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Image URL</label>
                <input
                  type="url"
                  required
                  value={formData.imageUrl}
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  placeholder="https://example.com/banner.png"
                />
                <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                  <FiUploadCloud /> Use a direct image link (transparent PNG or landscape JPG recommended)
                </p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Target Link (Optional)</label>
                <input
                  type="url"
                  value={formData.targetUrl}
                  onChange={e => setFormData({...formData, targetUrl: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isActiveToggle" className="text-sm font-bold text-gray-700 cursor-pointer">
                  Publish immediately (Active)
                </label>
              </div>

              {/* Preview Box if URL is entered */}
              {formData.imageUrl && (
                <div className="mt-4 border p-2 rounded-xl bg-gray-50">
                  <p className="text-[10px] text-center font-bold text-gray-400 uppercase tracking-widest mb-2">Live Preview</p>
                  <img 
                    src={formData.imageUrl} 
                    alt="Preview" 
                    className="max-h-32 mx-auto object-contain rounded"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/400x200?text=Invalid+Image'; }}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-all transform hover:scale-[1.02]"
                >
                  {editingAd ? 'Update Record' : 'Save Advertisement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvertsManagement;
