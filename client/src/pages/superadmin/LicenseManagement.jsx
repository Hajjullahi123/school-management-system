import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { FiKey, FiCheck, FiX, FiClock, FiUsers, FiAlertCircle, FiCopy, FiRefreshCw } from 'react-icons/fi';

const LicenseManagement = () => {
  const [licenses, setLicenses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatedLicense, setGeneratedLicense] = useState(null);
  const [formData, setFormData] = useState({
    schoolName: '',
    packageType: 'basic',
    maxStudents: 500,
    durationMonths: 12,
    contactPerson: '',
    contactEmail: '',
    contactPhone: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [licensesRes, schoolsRes] = await Promise.all([
        api.get('/api/license/list'),
        api.get('/api/license/schools')
      ]);

      if (licensesRes.ok) {
        const data = await licensesRes.json();
        setLicenses(data);
      }

      if (schoolsRes.ok) {
        const data = await schoolsRes.json();
        setSchools(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load license data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-set maxStudents based on package
    if (name === 'packageType') {
      let maxStudents = 500;
      if (value === 'standard') maxStudents = 1500;
      if (value === 'premium') maxStudents = -1; // Unlimited
      setFormData(prev => ({ ...prev, maxStudents }));
    }
  };

  const handleGenerateLicense = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/api/license/generate', formData);

      if (response.ok) {
        const result = await response.json();
        setGeneratedLicense(result.license);
        setSuccess('License generated successfully!');
        fetchData();

        // Reset form but keep modal open to show license
        setFormData({
          schoolName: '',
          packageType: 'basic',
          maxStudents: 500,
          durationMonths: 12,
          contactPerson: '',
          contactEmail: '',
          contactPhone: ''
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate license');
      }
    } catch (error) {
      console.error('Error generating license:', error);
      setError('Failed to generate license');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('License key copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const closeModal = () => {
    setShowGenerateModal(false);
    setGeneratedLicense(null);
    setError('');
    setSuccess('');
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'ACTIVE', icon: FiCheck },
      expired: { bg: 'bg-red-100', text: 'text-red-800', label: 'EXPIRED', icon: FiX },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'INACTIVE', icon: FiClock },
      lifetime: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'LIFETIME', icon: FiCheck }
    };

    const badge = badges[status] || badges.inactive;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getPackageBadge = (packageType) => {
    const colors = {
      basic: 'bg-amber-100 text-amber-800',
      standard: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${colors[packageType] || colors.basic}`}>
        {packageType}
      </span>
    );
  };

  // Calculate statistics
  const stats = {
    totalSchools: schools.length,
    activeSchools: schools.filter(s => s.status === 'active' || s.status === 'lifetime').length,
    expiringThisMonth: schools.filter(s => s.daysRemaining > 0 && s.daysRemaining <= 30).length,
    totalStudents: schools.reduce((sum, s) => sum + s.currentStudents, 0),
    totalRevenue: schools.reduce((sum, s) => {
      const prices = { basic: 200000, standard: 400000, premium: 750000 };
      return sum + (prices[s.packageType] || 0);
    }, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">License Management</h1>
          <p className="text-gray-600 mt-1">Generate and manage school licenses</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-primary text-white px-6 py-3 rounded-xl hover:brightness-90 flex items-center gap-2 shadow-lg transition-all font-bold"
        >
          <FiKey className="w-5 h-5" />
          Generate License
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <FiAlertCircle className="w-5 h-5" />
            <p className="font-semibold">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <FiCheck className="w-5 h-5" />
            <p className="font-semibold">{success}</p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Total Schools</p>
              <p className="text-3xl font-black text-gray-900 mt-1">{stats.totalSchools}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FiUsers className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Active</p>
              <p className="text-3xl font-black text-green-600 mt-1">{stats.activeSchools}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <FiCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Expiring Soon</p>
              <p className="text-3xl font-black text-orange-600 mt-1">{stats.expiringThisMonth}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <FiClock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Total Students</p>
              <p className="text-3xl font-black text-purple-600 mt-1">{stats.totalStudents.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <FiUsers className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Revenue</p>
              <p className="text-2xl font-black text-gray-900 mt-1">₦{(stats.totalRevenue / 1000000).toFixed(1)}M</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <FiKey className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-black text-gray-900">All Schools</h2>
          <button
            onClick={fetchData}
            className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">School</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Package</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Students</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {schools.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-500 italic">
                    No schools found
                  </td>
                </tr>
              ) : (
                schools.map((school) => (
                  <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-gray-900">{school.name}</div>
                        <div className="text-xs text-gray-500">{school.slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getPackageBadge(school.packageType || 'basic')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <span className="font-bold text-gray-900">{school.currentStudents}</span>
                        <span className="text-gray-500"> / {school.maxStudents === -1 ? '∞' : school.maxStudents}</span>
                      </div>
                      {school.remainingSlots !== -1 && school.remainingSlots < 50 && (
                        <div className="text-xs text-orange-600 font-semibold mt-1">
                          {school.remainingSlots} slots left
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(school.status)}
                    </td>
                    <td className="px-6 py-4">
                      {school.daysRemaining === -1 ? (
                        <span className="text-blue-600 font-semibold text-sm">Lifetime</span>
                      ) : school.daysRemaining > 0 ? (
                        <div className="text-sm">
                          <span className={`font-semibold ${school.daysRemaining <= 30 ? 'text-orange-600' : 'text-gray-900'}`}>
                            {school.daysRemaining} days
                          </span>
                        </div>
                      ) : (
                        <span className="text-red-600 font-semibold text-sm">Expired</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(school.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate License Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-gray-900">Generate New License</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8">
              {generatedLicense ? (
                <div className="space-y-6">
                  <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                        <FiCheck className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-black text-green-900 text-lg">License Generated!</h4>
                        <p className="text-green-700 text-sm">Send this key to {generatedLicense.schoolName}</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 border-2 border-green-300">
                      <label className="text-xs font-black text-gray-600 uppercase mb-2 block">License Key</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={generatedLicense.licenseKey}
                          readOnly
                          className="flex-1 font-mono text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                        />
                        <button
                          onClick={() => copyToClipboard(generatedLicense.licenseKey)}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 font-semibold"
                        >
                          <FiCopy className="w-4 h-4" />
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="text-xs font-black text-gray-600 uppercase">Package</label>
                        <p className="text-lg font-bold text-gray-900 capitalize">{generatedLicense.packageType}</p>
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-600 uppercase">Max Students</label>
                        <p className="text-lg font-bold text-gray-900">
                          {generatedLicense.maxStudents === -1 ? 'Unlimited' : generatedLicense.maxStudents}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={closeModal}
                    className="w-full bg-gray-100 text-gray-900 font-black py-4 rounded-xl hover:bg-gray-200 transition-all"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleGenerateLicense} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-black text-gray-600 uppercase mb-2">School Name *</label>
                      <input
                        type="text"
                        name="schoolName"
                        value={formData.schoolName}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Al-Hikmah International School"
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-primary/20 outline-none transition-all font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase mb-2">Package Type *</label>
                      <select
                        name="packageType"
                        value={formData.packageType}
                        onChange={handleInputChange}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-primary/20 outline-none transition-all font-semibold"
                      >
                        <option value="basic">Basic - ₦200,000</option>
                        <option value="standard">Standard - ₦400,000</option>
                        <option value="premium">Premium - ₦750,000</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase mb-2">Max Students</label>
                      <input
                        type="number"
                        name="maxStudents"
                        value={formData.maxStudents}
                        onChange={handleInputChange}
                        placeholder="500"
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-primary/20 outline-none transition-all font-semibold"
                      />
                      <p className="text-xs text-gray-500 mt-1">-1 for unlimited</p>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-black text-gray-600 uppercase mb-2">Duration (Months)</label>
                      <input
                        type="number"
                        name="durationMonths"
                        value={formData.durationMonths}
                        onChange={handleInputChange}
                        placeholder="12"
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-primary/20 outline-none transition-all font-semibold"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave as 0 for lifetime license</p>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-black text-gray-600 uppercase mb-2">Contact Person</label>
                      <input
                        type="text"
                        name="contactPerson"
                        value={formData.contactPerson}
                        onChange={handleInputChange}
                        placeholder="e.g., Dr. Ahmad Ibrahim"
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-primary/20 outline-none transition-all font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase mb-2">Contact Email</label>
                      <input
                        type="email"
                        name="contactEmail"
                        value={formData.contactEmail}
                        onChange={handleInputChange}
                        placeholder="admin@school.edu.ng"
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-primary/20 outline-none transition-all font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase mb-2">Contact Phone</label>
                      <input
                        type="tel"
                        name="contactPhone"
                        value={formData.contactPhone}
                        onChange={handleInputChange}
                        placeholder="+234 XXX XXX XXXX"
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-primary/20 outline-none transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 bg-gray-100 text-gray-900 font-black py-4 rounded-xl hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-white font-black py-4 rounded-xl hover:brightness-90 transition-all shadow-lg"
                    >
                      Generate License
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LicenseManagement;
