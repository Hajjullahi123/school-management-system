import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const MiscellaneousFees = () => {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    isCompulsory: false,
    classIds: []
  });

  useEffect(() => {
    fetchFees();
    fetchClasses();
  }, []);

  const fetchFees = async () => {
    try {
      const response = await api.get('/api/misc-fees');
      if (response.ok) {
        const data = await response.json();
        setFees(data);
      }
    } catch (error) {
      console.error('Error fetching fees:', error);
      toast.error('Failed to load fees');
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (editingFee) {
        response = await api.put(`/api/misc-fees/${editingFee.id}`, formData);
      } else {
        response = await api.post('/api/misc-fees', formData);
      }

      if (response.ok) {
        toast.success(`Fee ${editingFee ? 'updated' : 'created'} successfully!`);
        fetchFees();
        resetForm();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to save fee');
      }
    } catch (error) {
      console.error('Error saving fee:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (fee) => {
    setEditingFee(fee);
    setFormData({
      title: fee.title,
      description: fee.description || '',
      amount: fee.amount,
      isCompulsory: fee.isCompulsory,
      classIds: fee.classIds
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this fee?')) return;

    try {
      const response = await api.delete(`/api/misc-fees/${id}`);
      if (response.ok) {
        toast.success('Fee deleted successfully!');
        fetchFees();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete fee');
      }
    } catch (error) {
      console.error('Error deleting fee:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: '',
      isCompulsory: false,
      classIds: []
    });
    setEditingFee(null);
    setShowForm(false);
  };

  const handleClassToggle = (classId) => {
    const classIdStr = classId.toString();
    setFormData(prev => ({
      ...prev,
      classIds: prev.classIds.includes(classIdStr)
        ? prev.classIds.filter(id => id !== classIdStr)
        : [...prev.classIds, classIdStr]
    }));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Miscellaneous Fees</h1>
          <p className="text-gray-600">Manage custom fees separate from school tuition</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark"
        >
          {showForm ? 'Cancel' : '+ Create Fee'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingFee ? 'Edit Fee' : 'Create New Fee'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fee Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., School Uniform, Field Trip"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₦) *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g., 5000"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details about this fee"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows="2"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isCompulsory"
                checked={formData.isCompulsory}
                onChange={(e) => setFormData({ ...formData, isCompulsory: e.target.checked })}
                className="h-4 w-4 text-primary rounded"
              />
              <label htmlFor="isCompulsory" className="ml-2 text-sm text-gray-700">
                Mark as Compulsory (all students in selected classes must pay)
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Applicable Classes *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {classes.map(cls => (
                  <label key={cls.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.classIds.includes(cls.id.toString())}
                      onChange={() => handleClassToggle(cls.id)}
                      className="h-4 w-4 text-primary rounded"
                    />
                    <span className="text-sm">{cls.name}</span>
                  </label>
                ))}
              </div>
              {formData.classIds.length === 0 && (
                <p className="text-red-500 text-xs mt-1">Please select at least one class</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || formData.classIds.length === 0}
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : (editingFee ? 'Update Fee' : 'Create Fee')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fees.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  No fees created yet. Click "Create Fee" to get started.
                </td>
              </tr>
            ) : (
              fees.map(fee => (
                <tr key={fee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{fee.title}</div>
                    {fee.description && (
                      <div className="text-sm text-gray-500">{fee.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-900">₦{fee.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${fee.isCompulsory
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                      }`}>
                      {fee.isCompulsory ? 'Compulsory' : 'Optional'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {fee.classIds.length} class{fee.classIds.length !== 1 ? 'es' : ''}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(fee)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(fee.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MiscellaneousFees;
