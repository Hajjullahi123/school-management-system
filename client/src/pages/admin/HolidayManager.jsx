import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';

const HolidayManager = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // new holiday form
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    type: 'holiday',
    description: ''
  });

  // bulk weekends form
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkData, setBulkData] = useState({
    startDate: '',
    endDate: ''
  });

  const [settings, setSettings] = useState(null);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  useEffect(() => {
    fetchHolidays();
    fetchSettings();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await api.get('/api/holidays');
      if (res.ok) {
        setHolidays(await res.json());
      }
    } catch (err) {
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/settings');
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error('Failed to load settings');
    }
  };

  const handleUpdateWeekends = async (dayIndex) => {
    setUpdatingSettings(true);
    try {
      const currentWeekends = (settings.weekendDays || '0,6').split(',').map(d => d.trim()).filter(d => d !== '');
      let newWeekends;
      
      if (currentWeekends.includes(String(dayIndex))) {
        newWeekends = currentWeekends.filter(d => d !== String(dayIndex));
      } else {
        newWeekends = [...currentWeekends, String(dayIndex)];
      }

      const res = await api.put('/api/settings', { weekendDays: newWeekends.join(',') });
      if (res.ok) {
        toast.success('Weekend settings updated');
        fetchSettings();
      } else {
        toast.error('Failed to update weekend settings');
      }
    } catch (err) {
      toast.error('Error updating settings');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday / rest day?')) return;
    try {
      const res = await api.delete(`/api/holidays/${id}`);
      if (res.ok) {
        toast.success('Deleted successfully');
        fetchHolidays();
      }
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/holidays', formData);
      if (res.ok) {
        toast.success('Holiday created');
        setShowForm(false);
        setFormData({ date: '', name: '', type: 'holiday', description: '' });
        fetchHolidays();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create');
      }
    } catch (err) {
      toast.error('Failed to create holiday');
    }
  };

  const handleBulkWeekends = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/holidays/bulk-weekends', bulkData);
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Weekends added');
        setShowBulkForm(false);
        setBulkData({ startDate: '', endDate: '' });
        fetchHolidays();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add weekends');
      }
    } catch (err) {
      toast.error('Failed to add weekends');
    }
  };

  const daysOfWeek = [
    { id: 0, name: 'Sunday' },
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' }
  ];

  const currentWeekendIndices = (settings?.weekendDays || '0,6').split(',').map(d => d.trim());
  const currentWeekendNames = daysOfWeek.filter(d => currentWeekendIndices.includes(String(d.id))).map(d => d.name + 's').join(' & ');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Holiday & Weekend Calendar</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowBulkForm(!showBulkForm); setShowForm(false); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-bold"
          >
            Auto-fill Weekends
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowBulkForm(false); }}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 font-bold"
          >
            + Add Holiday
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Weekend Configuration
        </h2>
        <p className="text-sm text-gray-500 mb-6 font-medium">Select which days of the week are considered weekends for your school. This affects attendance marking and auto-filling.</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {daysOfWeek.map((day) => {
            const isSelected = currentWeekendIndices.includes(String(day.id));
            return (
              <button
                key={day.id}
                disabled={updatingSettings || !settings}
                onClick={() => handleUpdateWeekends(day.id)}
                className={`px-3 py-3 rounded-lg border-2 text-center transition-all ${
                  isSelected 
                    ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' 
                    : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-300'
                } ${updatingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-[10px] uppercase font-black tracking-widest mb-1">{isSelected ? 'Weekend' : 'Weekday'}</div>
                <div className="text-sm">{day.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold mb-4">Add Holiday / Day Off</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Eid Al-Fitr" className="w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm">
                  <option value="holiday">Public/School Holiday</option>
                  <option value="weekend">Weekend / Rest Day</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-md px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md font-bold">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 font-bold">Save Holiday</button>
            </div>
          </form>
        </div>
      )}

      {showBulkForm && (
        <div className="bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-200">
          <h2 className="text-lg font-bold mb-4 text-blue-900">Auto-fill Weekends ({currentWeekendNames})</h2>
          <p className="text-sm text-blue-700 mb-4 font-medium">This will mark all {currentWeekendNames} within the selected date range as "Rest Days" so attendance cannot be marked.</p>
          <form onSubmit={handleBulkWeekends} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Start Date *</label>
                <input required type="date" value={bulkData.startDate} onChange={e => setBulkData({ ...bulkData, startDate: e.target.value })} className="w-full border rounded-md px-3 py-2 border-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">End Date *</label>
                <input required type="date" value={bulkData.endDate} onChange={e => setBulkData({ ...bulkData, endDate: e.target.value })} className="w-full border rounded-md px-3 py-2 border-blue-300" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowBulkForm(false)} className="px-4 py-2 text-blue-600 hover:bg-blue-100 rounded-md font-bold">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold">Add Weekends</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading calendar...</div>
        ) : holidays.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-gray-200 m-6 rounded-xl">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-gray-500 font-medium">No holidays or weekends marked yet.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {holidays.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {new Date(h.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-700">
                    {h.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-[10px] rounded-full font-black uppercase tracking-widest ${h.type === 'weekend' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                      {h.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic">
                    {h.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleDelete(h.id)} className="text-red-500 hover:text-red-900 font-bold bg-red-50 px-3 py-1 rounded transition-colors">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default HolidayManager;
