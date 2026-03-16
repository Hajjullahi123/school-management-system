import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';

const DEFAULT_DOMAINS = [
  { name: 'Handwriting', description: 'Legibility, neatness, and presentation', maxScore: 5 },
  { name: 'Drawing / Painting', description: 'Artistic creativity and skill', maxScore: 5 },
  { name: 'Sports', description: 'Physical activity and sportsmanship', maxScore: 5 },
  { name: 'Punctuality', description: 'Attendance and time-keeping', maxScore: 5 },
  { name: 'Neatness', description: 'Personal grooming and tidiness', maxScore: 5 },
  { name: 'Honesty', description: 'Truthfulness and integrity', maxScore: 5 },
  { name: 'Politeness', description: 'Respectful behavior and courtesy', maxScore: 5 },
  { name: 'Co-operation', description: 'Teamwork and collaborative attitude', maxScore: 5 },
  { name: 'Attentiveness', description: 'Concentration and participation in class', maxScore: 5 },
  { name: 'Self Control', description: 'Emotional regulation and discipline', maxScore: 5 },
];

const PsychomotorDomains = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', maxScore: 5 });
  const [seeding, setSeeding] = useState(false);

  useEffect(() => { fetchDomains(); }, []);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/report-extras/domains');
      if (res.ok) {
        const data = await res.json();
        setDomains(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      toast.error('Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let res;
      if (editingDomain) {
        res = await api.put(`/api/report-extras/domains/${editingDomain.id}`, formData);
      } else {
        res = await api.post('/api/report-extras/domains', formData);
      }
      if (res.ok) {
        toast.success(editingDomain ? 'Domain updated!' : 'Domain created!');
        fetchDomains();
        resetForm();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save domain');
      }
    } catch (e) {
      toast.error('Unexpected error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (domain) => {
    try {
      const res = await api.put(`/api/report-extras/domains/${domain.id}`, {
        ...domain,
        isActive: !domain.isActive
      });
      if (res.ok) {
        toast.success(`Domain ${!domain.isActive ? 'activated' : 'deactivated'}`);
        fetchDomains();
      }
    } catch (e) {
      toast.error('Failed to toggle domain');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this domain? This cannot be undone.')) return;
    try {
      const res = await api.delete(`/api/report-extras/domains/${id}`);
      if (res.ok) {
        toast.success('Domain deleted');
        fetchDomains();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete');
      }
    } catch (e) {
      toast.error('Unexpected error');
    }
  };

  const handleEdit = (domain) => {
    setEditingDomain(domain);
    setFormData({ name: domain.name, description: domain.description || '', maxScore: domain.maxScore });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingDomain(null);
    setFormData({ name: '', description: '', maxScore: 5 });
    setShowForm(false);
  };

  const handleSeedDefaults = async () => {
    if (!confirm(`This will add ${DEFAULT_DOMAINS.length} default psychomotor domains. Continue?`)) return;
    setSeeding(true);
    let added = 0, skipped = 0;
    for (const d of DEFAULT_DOMAINS) {
      try {
        const res = await api.post('/api/report-extras/domains', d);
        if (res.ok) added++;
        else skipped++; // already exists
      } catch { skipped++; }
    }
    toast.success(`Added ${added} domains${skipped > 0 ? `, skipped ${skipped} (already exist)` : ''}`);
    fetchDomains();
    setSeeding(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Psychomotor & Affective Domains</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure assessment domains that appear on student report cards (e.g. Handwriting, Punctuality, Neatness).
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50 text-sm flex items-center gap-2"
          >
            {seeding ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : '⚡'}
            Load Default Domains
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-primary text-white rounded-md hover:brightness-90 text-sm"
          >
            + Add Domain
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>ℹ️ How it works:</strong> Domains listed here will appear as sliders in the Form Master's
        <strong> "Grade &amp; Remark"</strong> panel (My Class page) and will be printed on each student's report card.
        Toggle <span className="font-semibold">Active/Inactive</span> to show or hide a domain without deleting it.
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {editingDomain ? `Edit: ${editingDomain.name}` : 'New Domain'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Handwriting, Punctuality, Sports"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
                <select
                  value={formData.maxScore}
                  onChange={e => setFormData({ ...formData, maxScore: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                >
                  {[3, 4, 5, 6, 10].map(n => (
                    <option key={n} value={n}>{n} (1–{n})</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what this domain measures"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-primary text-white rounded-md hover:brightness-90 disabled:opacity-50 text-sm"
              >
                {saving ? 'Saving...' : (editingDomain ? 'Update Domain' : 'Create Domain')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Domains Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : domains.length === 0 ? (
          <div className="text-center p-12 text-gray-400">
            <div className="text-5xl mb-3">🧠</div>
            <p className="font-medium text-gray-600">No domains configured yet</p>
            <p className="text-sm mt-1">Click <strong>"Load Default Domains"</strong> to get started quickly, or add them manually.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Max Score</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {domains.map(domain => (
                <tr key={domain.id} className={`hover:bg-gray-50 transition-colors ${!domain.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4 font-medium text-gray-900">{domain.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{domain.description || <span className="italic text-gray-300">—</span>}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {domain.maxScore}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleActive(domain)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${domain.isActive
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {domain.isActive ? '✓ Active' : '✗ Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => handleEdit(domain)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(domain.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        {domains.filter(d => d.isActive).length} active domain{domains.filter(d => d.isActive).length !== 1 ? 's' : ''} ·{' '}
        {domains.filter(d => !d.isActive).length} inactive
      </p>
    </div>
  );
};

export default PsychomotorDomains;
