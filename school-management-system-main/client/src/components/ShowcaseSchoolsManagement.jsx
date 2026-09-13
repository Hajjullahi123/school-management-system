import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { toast } from '../utils/toast';
import { FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiImage } from 'react-icons/fi';

const ShowcaseSchoolsManagement = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editSchool, setEditSchool] = useState(null);
  const [newSchool, setNewSchool] = useState({ name: '', logoUrl: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const res = await api.get('/api/showcase');
      if (res.ok) {
        const data = await res.json();
        setSchools(Array.isArray(data) ? data : []);
      } else {
        setSchools([]);
      }
    } catch (error) {
      toast.error('Failed to load showcase schools');
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newSchool.name || !newSchool.logoUrl) {
      toast.error('Name and logo are required');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/api/showcase', newSchool);
      if (res.ok) {
        toast.success('School added successfully');
        setIsAdding(false);
        setNewSchool({ name: '', logoUrl: '' });
        fetchSchools();
      } else {
        const err = await res.json();
        throw new Error(err.error);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add school');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editSchool.name || !editSchool.logoUrl) {
      toast.error('Name and logo are required');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put(`/api/showcase/${editSchool.id}`, editSchool);
      if (res.ok) {
        toast.success('School updated successfully');
        setEditSchool(null);
        fetchSchools();
      } else {
        const err = await res.json();
        throw new Error(err.error);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update school');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this school from the showcase?')) return;

    try {
      const res = await api.delete(`/api/showcase/${id}`);
      if (res.ok) {
        toast.success('School deleted');
        fetchSchools();
      }
    } catch (error) {
      toast.error('Failed to delete school');
    }
  };

  const handleLogoUpload = (e, target) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit for "lightweight"
        toast.error('File size must be less than 500KB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'new') {
          setNewSchool({ ...newSchool, logoUrl: reader.result });
        } else {
          setEditSchool({ ...editSchool, logoUrl: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Usecase Schools</h3>
          <p className="text-sm text-gray-500 font-medium">Manage schools displayed in the login page footer as advertisements.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg"
          >
            <FiPlus /> Add School
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 space-y-4">
          <h4 className="font-bold text-gray-900">Add New Showcase School</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="School Name"
              value={newSchool.name}
              onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
            />
            <div className="flex items-center gap-4">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-all">
                <FiImage className="text-gray-400" />
                <span className="text-sm font-bold text-gray-600 truncate">{newSchool.logoUrl ? 'Logo Selected' : 'Upload Logo'}</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'new')} />
              </label>
              {newSchool.logoUrl && (
                <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white p-1 overflow-hidden">
                  <img src={newSchool.logoUrl} alt="Preview" className="w-full h-full object-contain" />
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              disabled={saving}
              onClick={handleAdd}
              className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-primary transition-all flex items-center gap-2"
            >
              {saving ? 'Adding...' : 'Save School'}
            </button>
            <button 
              onClick={() => setIsAdding(false)}
              className="px-6 py-2 bg-white text-gray-600 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {schools.map(school => (
          <div key={school.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            {editSchool?.id === school.id ? (
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={editSchool.name}
                  onChange={(e) => setEditSchool({ ...editSchool, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold"
                />
                <label className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer text-xs font-bold text-gray-600">
                  <FiImage /> Change Logo
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'edit')} />
                </label>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleUpdate} className="flex-1 bg-primary text-white py-2 rounded-lg font-bold text-xs">Save</button>
                  <button onClick={() => setEditSchool(null)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg font-bold text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center p-2 border border-gray-100 flex-shrink-0">
                  <img src={school.logoUrl} alt={school.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 truncate">{school.name}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={() => setEditSchool(school)}
                      className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(school.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`w-2 h-2 rounded-full ${school.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} title={school.isActive ? 'Visible' : 'Hidden'}></span>
                </div>
              </div>
            )}
          </div>
        ))}
        {schools.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No schools in showcase yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowcaseSchoolsManagement;
