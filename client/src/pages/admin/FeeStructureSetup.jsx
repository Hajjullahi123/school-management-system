import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../api';
import { formatNumber } from '../../utils/formatters';

const FeeStructureSetup = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);

  const [formData, setFormData] = useState({
    classId: '',
    termId: '',
    academicSessionId: '',
    amount: '',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingStructure, setEditingStructure] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      console.log('Fetching initial data for fee structure setup...');

      const [classesRes, termsRes, sessionsRes, structuresRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/classes`, { headers }),
        fetch(`${API_BASE_URL}/api/terms`, { headers }),
        fetch(`${API_BASE_URL}/api/academic-sessions`, { headers }),
        fetch(`${API_BASE_URL}/api/fee-structure`, { headers })
      ]);

      console.log('Response statuses:', {
        classes: classesRes.status,
        terms: termsRes.status,
        sessions: sessionsRes.status,
        structures: structuresRes.status
      });

      const classesData = await classesRes.json();
      const termsData = await termsRes.json();
      const sessionsData = await sessionsRes.json();
      const structuresData = await structuresRes.json();

      console.log('Fetched data:', {
        classes: classesData.length || classesData,
        terms: termsData.length || termsData,
        sessions: sessionsData.length || sessionsData,
        structures: structuresData.length || structuresData
      });

      setClasses(Array.isArray(classesData) ? classesData : []);
      setTerms(Array.isArray(termsData) ? termsData : []);
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setFeeStructures(Array.isArray(structuresData) ? structuresData : []);

      // Set default session/term if available
      const sessions = Array.isArray(sessionsData) ? sessionsData : [];
      const terms = Array.isArray(termsData) ? termsData : [];
      const activeSession = sessions.find(s => s.isCurrent) || sessions[0];
      if (activeSession) {
        console.log('Setting active session for setup:', activeSession);
        setFormData(prev => ({ ...prev, academicSessionId: activeSession.id }));

        const activeTerm = terms.find(t => t.isCurrent && t.academicSessionId === activeSession.id) ||
          terms.find(t => t.academicSessionId === activeSession.id);
        if (activeTerm) {
          console.log('Setting active term for setup:', activeTerm);
          setFormData(prev => ({ ...prev, termId: activeTerm.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load data. Please check the console for details.'
      });
    }
  };

  const handleEdit = (structure) => {
    setEditingStructure(structure);
    setFormData({
      classId: structure.classId,
      termId: structure.termId,
      academicSessionId: structure.academicSessionId,
      amount: structure.amount,
      description: structure.description || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingStructure(null);
    setFormData({
      classId: '',
      termId: '',
      academicSessionId: '',
      amount: '',
      description: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/fee-structure/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        const action = editingStructure ? 'updated' : 'created';
        setMessage({
          type: 'success',
          text: `Fee structure ${action} successfully. Updated ${data.stats.recordsUpdated} records, Created ${data.stats.recordsCreated} records.`
        });
        fetchInitialData(); // Refresh list
        handleCancelEdit(); // Reset form
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save fee structure' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fee Structure Setup</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setup Form */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Set Class Fee</h2>

          {message && (
            <div className={`p-4 mb-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Academic Session</label>
              <select
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary focus:outline-none"
                value={formData.academicSessionId}
                onChange={e => setFormData({ ...formData, academicSessionId: e.target.value })}
              >
                <option value="">Select Session</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.isCurrent ? '(Current)' : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Term</label>
              <select
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary focus:outline-none"
                value={formData.termId}
                onChange={e => setFormData({ ...formData, termId: e.target.value })}
              >
                <option value="">Select Term</option>
                {terms
                  .filter(t => !formData.academicSessionId || t.academicSessionId === parseInt(formData.academicSessionId))
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Class</label>
              <select
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary focus:outline-none"
                value={formData.classId}
                onChange={e => setFormData({ ...formData, classId: e.target.value })}
              >
                <option value="">Select Class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.arm}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Amount (₦)</label>
              <input
                type="number"
                required
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              {editingStructure && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? 'Saving...' : (editingStructure ? 'Update Fee Structure' : 'Save Fee Structure')}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Structures List */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Current Fee Structures</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Term</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feeStructures.map((fs) => (
                  <tr key={fs.id} className={editingStructure?.id === fs.id ? 'bg-primary/5' : ''}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {fs.class.name} {fs.class.arm}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {fs.term.name}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₦{formatNumber(fs.amount)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEdit(fs)}
                        className="text-primary hover:text-primary font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {feeStructures.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-2 text-sm text-gray-500 text-center">
                      No fee structures found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeStructureSetup;
