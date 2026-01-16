import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from '../../utils/toast';

const PeriodSetup = () => {
  const [activeTab, setActiveTab] = useState('lessons'); // lessons, breaks
  const [lessons, setLessons] = useState([]);
  const [breaks, setBreaks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    startTime: '08:00',
    endTime: '08:40',
    type: 'lesson',
    dayOfWeek: 'Monday'
  });
  const [editingId, setEditingId] = useState(null);

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchSlots();
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      const data = await response.json();
      setClasses(data);
      if (data.length > 0) setSelectedClassId(data[0].id.toString());
    } catch (e) { console.error(e); }
  };

  const fetchSlots = async () => {
    try {
      const response = await api.get(`/api/timetable/class/${selectedClassId}`);
      const data = await response.json();
      setLessons(data.filter(s => s.type === 'lesson'));
      setBreaks(data.filter(s => s.type === 'break'));
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch(`/api/timetable/${editingId}`, formData);
      } else {
        await api.post('/api/timetable', { ...formData, classId: selectedClassId });
      }
      setFormData({ name: '', startTime: '08:00', endTime: '08:40', type: activeTab === 'lessons' ? 'lesson' : 'break', dayOfWeek: 'Monday' });
      setEditingId(null);
      fetchSlots();
      toast.success(editingId ? 'Structure updated' : 'Slot added to structure');
    } catch (e) { toast.error('Check time alignment or fields'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('🗑️ Remove this slot from the basic structure?')) return;
    try {
      const response = await api.delete(`/api/timetable/${id}`);
      if (response.ok) {
        toast.success('Structure slot removed');
        fetchSlots();
      } else {
        toast.error('Deletion failed');
      }
    } catch (e) { toast.error('Server error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Period Setup</h1>
        <select
          value={selectedClassId}
          onChange={e => setSelectedClassId(e.target.value)}
          className="border rounded-lg px-4 py-2 bg-white font-bold text-gray-700 outline-none shadow-sm"
        >
          {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.arm}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="flex border-b">
          <button
            onClick={() => { setActiveTab('lessons'); setFormData({ ...formData, type: 'lesson' }); }}
            className={`flex-1 py-4 font-bold text-sm tracking-widest uppercase transition-all ${activeTab === 'lessons' ? 'bg-primary text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Lesson Slots
          </button>
          <button
            onClick={() => { setActiveTab('breaks'); setFormData({ ...formData, type: 'break' }); }}
            className={`flex-1 py-4 font-bold text-sm tracking-widest uppercase transition-all ${activeTab === 'breaks' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Break & Assembly
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 mb-10">
            <div className="md:col-span-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Day of Week</label>
              <select
                value={formData.dayOfWeek}
                onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value })}
                className="w-full border-2 border-white rounded-xl py-2.5 px-4 bg-white font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm"
              >
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Start Time</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full border-2 border-white rounded-xl py-2 px-4 shadow-sm font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">End Time</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full border-2 border-white rounded-xl py-2 px-4 shadow-sm font-bold outline-none"
              />
            </div>
            <button type="submit" className={`w-full py-3 rounded-xl font-black uppercase text-xs tracking-widest text-white transition-all shadow-lg active:scale-95 ${activeTab === 'lessons' ? 'bg-primary shadow-primary/20' : 'bg-orange-500 shadow-orange-200'}`}>
              {editingId ? 'Update Slot' : 'Create Slot'}
            </button>
          </form>

          <div className="space-y-4">
            <h3 className="text-lg font-black uppercase tracking-tighter text-gray-800 flex items-center gap-2">
              <span className={`w-2 h-6 rounded-full ${activeTab === 'lessons' ? 'bg-primary' : 'bg-orange-500'}`}></span>
              Defined {activeTab === 'lessons' ? 'Lessons' : 'Breaks'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(activeTab === 'lessons' ? lessons : breaks).map(slot => (
                <div key={slot.id} className="bg-white border-2 border-gray-50 rounded-2xl p-4 flex justify-between items-center group hover:border-primary/20 transition-all hover:shadow-md">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{slot.dayOfWeek}</p>
                    <p className="text-lg font-black text-gray-900 leading-none mt-1">{slot.startTime} - {slot.endTime}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingId(slot.id); setFormData({ ...slot, subjectId: '' }); }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(slot.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              {(activeTab === 'lessons' ? lessons : breaks).length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400 font-medium bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                  No {activeTab} defined yet for this class...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex gap-4">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div className="text-sm">
          <h4 className="font-black text-primary uppercase tracking-tighter mb-1">Automation Intelligence</h4>
          <p className="text-primary/70 font-medium">Define your daily structure here first. Once slots are defined, the Intelligent Generator in the Timetable section will use your "Periods Per Week" settings to fill these slots automatically while avoiding teacher clashes.</p>
        </div>
      </div>
    </div>
  );
};

export default PeriodSetup;
