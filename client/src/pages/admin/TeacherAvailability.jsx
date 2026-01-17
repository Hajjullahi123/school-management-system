import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import toast from 'react-hot-toast';

const TeacherAvailability = () => {
  const [teachers, setTeachers] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    teacherId: '',
    dayOfWeek: 'Monday',
    startTime: '08:00',
    endTime: '12:00',
    wholeDay: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tRes, aRes] = await Promise.all([
        api.get('/api/teachers'),
        api.get('/api/teacher-availability')
      ]);
      setTeachers(tRes.ok ? await tRes.json() : []);
      setAvailabilities(aRes.ok ? await aRes.json() : []);
    } catch (e) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        startTime: formData.wholeDay ? null : formData.startTime,
        endTime: formData.wholeDay ? null : formData.endTime
      };

      const response = await api.post('/api/teacher-availability', payload);
      if (response.ok) {
        toast.success('Availability block added');
        setShowModal(false);
        fetchData();
      }
    } catch (e) {
      toast.error('Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this unavailability block?')) return;
    try {
      const response = await api.delete(`/api/teacher-availability/${id}`);
      if (response.ok) {
        toast.success('Removed successfully');
        fetchData();
      }
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading availability settings...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Teacher Availability (Off-Duty)</h1>
          <p className="text-gray-600">Mark when teachers are NOT available for lessons. The generator will respect these blocks.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-bold flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Mark Unavailable
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-700">Teacher</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Day</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Time Block</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {availabilities.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-gray-400">No unavailability blocks set. All teachers are available all week.</td>
              </tr>
            ) : (
              availabilities.map((av) => (
                <tr key={av.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{av.teacher?.user?.firstName} {av.teacher?.user?.lastName}</div>
                    <div className="text-xs text-gray-500">{av.teacher?.specialization}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{av.dayOfWeek}</td>
                  <td className="px-6 py-4">
                    {av.startTime && av.endTime ? (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium">
                        {av.startTime} - {av.endTime}
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-bold">
                        WHOLE DAY
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(av.id)}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Mark Teacher Unavailable</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Select Teacher</label>
                <select
                  required
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Day</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.wholeDay}
                      onChange={(e) => setFormData({ ...formData, wholeDay: e.target.checked })}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="text-sm font-semibold">Whole Day?</span>
                  </label>
                </div>
              </div>

              {!formData.wholeDay && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Starts</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Ends</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 text-white rounded-md font-bold hover:bg-red-700 shadow-md"
                >
                  Save Constraint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAvailability;
