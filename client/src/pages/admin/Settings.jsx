import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import { api, API_BASE_URL } from '../../api';
import SystemSettings from './SystemSettings';
import DocumentUploader from '../../components/DocumentUploader';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('branding');
  const [settings, setSettings] = useState({
    schoolName: '',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
    schoolMotto: '',
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6',
    accentColor: '#60a5fa',
    paystackPublicKey: '',
    paystackSecretKey: '',
    flutterwavePublicKey: '',
    flutterwaveSecretKey: '',
    enableOnlinePayment: false,
    facebookUrl: '',
    instagramUrl: '',
    whatsappUrl: '',
    academicCalendarUrl: '',
    eLibraryUrl: '',
    alumniNetworkUrl: '',
    brochureFileUrl: '',
    admissionGuideFileUrl: '',
    emailUser: '',
    emailPassword: '',
    emailHost: '',
    emailPort: 465,
    emailSecure: true,
    smsUsername: '',
    smsApiKey: '',
    smsSenderId: '',
    enableSMS: false,
    examMode: false,
    examModeType: 'none',
    assignment1Weight: 5,
    assignment2Weight: 5,
    test1Weight: 10,
    test2Weight: 10,
    examWeight: 70,
    gradingSystem: '[{"grade":"A","min":70,"max":100,"remark":"Excellent"},{"grade":"B","min":60,"max":69.9,"remark":"Very Good"},{"grade":"C","min":50,"max":59.9,"remark":"Good"},{"grade":"D","min":40,"max":49.9,"remark":"Pass"},{"grade":"E","min":30,"max":39.9,"remark":"Weak Pass"},{"grade":"F","min":0,"max":29.9,"remark":"Fail"}]',
    passThreshold: 40
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [brochureFile, setBrochureFile] = useState(null);
  const [admissionGuideFile, setAdmissionGuideFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseStatus, setLicenseStatus] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchLicenseStatus();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      const data = await response.json();
      setSettings(data);
      if (data.logoUrl) {
        setLogoPreview(data.logoUrl.startsWith('data:') || data.logoUrl.startsWith('http') ? data.logoUrl : `${API_BASE_URL}${data.logoUrl}`);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchLicenseStatus = async () => {
    try {
      const response = await api.get('/api/license/status');
      const data = await response.json();
      setLicenseStatus(data);
    } catch (error) {
      console.error('Error fetching license status:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('File size must be less than 2MB');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let updatedSettings = { ...settings };

      // 1. Upload logo if changed (NEW: Use base64!)
      if (logoFile) {
        // ... (existing base64 logo logic)
        const reader = new FileReader();
        const base64Data = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });

        const logoResponse = await api.post('/api/settings/logo-base64', {
          imageData: base64Data,
          fileName: logoFile.name
        });

        const logoData = await logoResponse.json();
        if (logoResponse.ok) {
          updatedSettings.logoUrl = logoData.logoUrl;
        }
      }

      // 2. Upload Brochure if changed
      if (brochureFile) {
        const formData = new FormData();
        formData.append('brochure', brochureFile);
        const response = await fetch(`${API_BASE_URL}/api/upload/brochure`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await response.json();
        if (response.ok) {
          updatedSettings.brochureFileUrl = data.fileUrl;
        }
      }

      // 3. Upload Admission Guide if changed
      if (admissionGuideFile) {
        const formData = new FormData();
        formData.append('admissionGuide', admissionGuideFile);
        const response = await fetch(`${API_BASE_URL}/api/upload/admission-guide`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await response.json();
        if (response.ok) {
          updatedSettings.admissionGuideFileUrl = data.fileUrl;
        }
      }

      // 4. Update settings
      console.log('Saving settings...');
      const response = await api.put('/api/settings', updatedSettings);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      toast.success('Settings saved successfully');

      // Reload to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      const smtpConfig = {
        host: settings.emailHost,
        port: parseInt(settings.emailPort),
        user: settings.emailUser,
        pass: settings.emailPassword
      };

      if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
        toast.error('Please fill in Host, User, and Password to test');
        return;
      }

      toast.info('Testing SMTP connection...');
      const response = await api.post('/api/email/test-config', { smtpConfig });
      const data = await response.json();

      if (response.ok) {
        toast.success('SMTP Connection Successful!');
      } else {
        toast.error(data.error || 'SMTP Connection Failed');
      }
    } catch (error) {
      console.error('Test email error:', error);
      toast.error('Failed to test SMTP connection');
    }
  };

  const handleTestSMS = async () => {
    try {
      if (!settings.smsUsername || !settings.smsApiKey) {
        toast.error('Please fill in SMS Username and API Key to test');
        return;
      }

      const testPhone = prompt('Enter phone number to receive test SMS (international format, e.g., +234...):');
      if (!testPhone) return;

      toast.info('Sending test SMS...');
      const response = await api.post('/api/settings/test-sms', {
        smsUsername: settings.smsUsername,
        smsApiKey: settings.smsApiKey,
        smsSenderId: settings.smsSenderId,
        testPhone
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Test SMS sent successfully!');
      } else {
        toast.error(data.error || 'Failed to send test SMS');
      }
    } catch (error) {
      console.error('Test SMS error:', error);
      toast.error('Failed to test SMS connection');
    }
  };

  const handleActivateLicense = async (e) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      toast.error('Please enter a license key');
      return;
    }

    try {
      const response = await api.post('/api/license/activate', { licenseKey });
      const data = await response.json();

      if (response.ok) {
        toast.success('License activated successfully!');
        setLicenseKey('');
        fetchLicenseStatus();
      } else {
        toast.error(data.error || 'License activation failed');
      }
    } catch (error) {
      console.error('Error activating license:', error);
      toast.error('Failed to activate license');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {!settings.isSetupComplete && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 mb-8 animate-pulse text-center">
          <h2 className="text-xl font-bold text-primary mb-2">🚀 Welcome to [School Name] Setup!</h2>
          <p className="text-gray-700">
            Please fill in your <strong>School Name, Address, and Phone Number</strong> to complete your initial setup and unlock the full dashboard.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('branding')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'branding'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              School Branding
            </button>
            <button
              onClick={() => setActiveTab('socials')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'socials'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Social Media
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'payment'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Payment Integration
            </button>
            <button
              onClick={() => setActiveTab('license')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'license'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              License Activation
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'system'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Academic Session
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'email'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Email Config
            </button>
            <button
              onClick={() => setActiveTab('sms')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'sms'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              SMS Config
            </button>
            <button
              onClick={() => setActiveTab('exam')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'exam'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Examination
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  School Logo
                </label>
                <div className="flex items-center space-x-4">
                  {logoPreview && (
                    <img src={logoPreview} alt="Logo Preview" className="h-20 w-20 object-contain border rounded" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="text-sm w-full"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB (Recommended: 500x500px)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Name *
                  </label>
                  <input
                    type="text"
                    name="schoolName"
                    value={settings.schoolName}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Motto
                  </label>
                  <input
                    type="text"
                    name="schoolMotto"
                    value={settings.schoolMotto}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Address
                  </label>
                  <input
                    type="text"
                    name="schoolAddress"
                    value={settings.schoolAddress}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Phone
                  </label>
                  <input
                    type="text"
                    name="schoolPhone"
                    value={settings.schoolPhone}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Email
                  </label>
                  <input
                    type="email"
                    name="schoolEmail"
                    value={settings.schoolEmail || ''}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Hours
                  </label>
                  <input
                    type="text"
                    name="openingHours"
                    value={settings.openingHours || ''}
                    onChange={handleInputChange}
                    placeholder="Mon - Fri: 8:00 AM - 4:00 PM"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Landing Page Welcome Title
                  </label>
                  <input
                    type="text"
                    name="welcomeTitle"
                    value={settings.welcomeTitle || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. Building a Brighter Future Together"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Landing Page Welcome Message
                  </label>
                  <textarea
                    name="welcomeMessage"
                    value={settings.welcomeMessage || ''}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Enter a brief welcome message for the landing page hero section..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  ></textarea>
                </div>
              </div>

              {/* Data Backup & Export Section */}
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-7-4h.01M11 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Data Backup & Export</h3>
                    <p className="text-sm text-gray-500">Securely download your school's data and digital assets</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                    <h4 className="font-bold text-gray-800">Database Export</h4>
                    <p className="text-xs text-gray-500">
                      Download a complete snapshot of records in JSON format.
                    </p>
                    <button
                      type="button"
                      onClick={() => window.open(`${API_BASE_URL}/api/backup/export?token=${localStorage.getItem('token')}`, '_blank')}
                      className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      Download Data Backup
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                    <h4 className="font-bold text-gray-800">Assets Export</h4>
                    <p className="text-xs text-gray-500">
                      Download all uploaded files in a compressed ZIP archive.
                    </p>
                    <button
                      type="button"
                      onClick={() => window.open(`${API_BASE_URL}/api/backup/export-assets?token=${localStorage.getItem('token')}`, '_blank')}
                      className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                    >
                      Download Assets (ZIP)
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer Links & Documents */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Footer Links & Documents</h3>
                <p className="text-sm text-gray-600 mb-4">Manage footer links that appear on the landing page</p>

                <div className="space-y-4">
                  {/* Academic Calendar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Academic Calendar URL
                    </label>
                    <input
                      type="url"
                      name="academicCalendarUrl"
                      value={settings.academicCalendarUrl || ''}
                      onChange={handleInputChange}
                      placeholder="https://example.com/calendar or external link"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Link to your school's academic calendar</p>
                  </div>

                  {/* E-Library */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-Library URL
                    </label>
                    <input
                      type="url"
                      name="eLibraryUrl"
                      value={settings.eLibraryUrl || ''}
                      onChange={handleInputChange}
                      placeholder="https://example.com/library or external link"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Link to digital library or resources</p>
                  </div>

                  {/* Alumni Network */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alumni Network URL
                    </label>
                    <input
                      type="url"
                      name="alumniNetworkUrl"
                      value={settings.alumniNetworkUrl || ''}
                      onChange={handleInputChange}
                      placeholder="https://example.com/alumni or external link"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Link to alumni portal or network</p>
                  </div>

                  <div className="space-y-4">
                    {/* Brochure */}
                    <div className="flex gap-4 items-center flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">School Brochure (Link)</label>
                        <input
                          type="url"
                          name="brochureFileUrl"
                          value={settings.brochureFileUrl || ''}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Upload Brochure (PDF)</label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setBrochureFile(e.target.files[0])}
                          className="w-full text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Admission Guide */}
                    <div className="flex gap-4 items-center flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Admission Guide (Link)</label>
                        <input
                          type="url"
                          name="admissionGuideFileUrl"
                          value={settings.admissionGuideFileUrl || ''}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Upload Guide (PDF)</label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setAdmissionGuideFile(e.target.files[0])}
                          className="w-full text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Theme Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['primaryColor', 'secondaryColor', 'accentColor'].map(color => (
                    <div key={color}>
                      <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">{color.replace('Color', ' Color')}</label>
                      <input
                        type="color"
                        name={color}
                        value={settings[color]}
                        onChange={handleInputChange}
                        className="h-10 w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:brightness-90 disabled:bg-gray-400 transition-all shadow-lg"
                >
                  {saving ? 'Saving...' : 'Save Branding Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Socials Tab */}
          {activeTab === 'socials' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Social Media Presence</h3>
                  <p className="text-sm text-gray-500 mb-6">These links will be displayed in your school's public landing page.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Facebook URL</label>
                      <input
                        type="url"
                        name="facebookUrl"
                        value={settings.facebookUrl || ''}
                        onChange={handleInputChange}
                        placeholder="https://facebook.com/yourschool"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Instagram URL</label>
                      <input
                        type="url"
                        name="instagramUrl"
                        value={settings.instagramUrl || ''}
                        onChange={handleInputChange}
                        placeholder="https://instagram.com/yourschool"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">WhatsApp Number</label>
                      <input
                        type="text"
                        name="whatsappUrl"
                        value={settings.whatsappUrl || ''}
                        onChange={handleInputChange}
                        placeholder="2348012345678"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3"
                      />
                      <p className="text-xs text-gray-400 mt-1 italic">Digits only, no spaces or + sign.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                >
                  {saving ? 'Saving...' : 'Save Social Links'}
                </button>
              </div>
            </form>
          )}

          {/* Payment Tab */}
          {activeTab === 'payment' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  name="enableOnlinePayment"
                  checked={settings.enableOnlinePayment}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">
                  Enable Online Payment
                </label>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Paystack Integration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Public Key
                    </label>
                    <input
                      type="text"
                      name="paystackPublicKey"
                      value={settings.paystackPublicKey}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secret Key
                    </label>
                    <input
                      type="password"
                      name="paystackSecretKey"
                      autoComplete="new-password"
                      value={settings.paystackSecretKey}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Flutterwave Integration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Public Key
                    </label>
                    <input
                      type="text"
                      name="flutterwavePublicKey"
                      value={settings.flutterwavePublicKey}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secret Key
                    </label>
                    <input
                      type="password"
                      name="flutterwaveSecretKey"
                      autoComplete="new-password"
                      value={settings.flutterwaveSecretKey}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-white rounded-md hover:brightness-90 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* License Tab */}
          {activeTab === 'license' && (
            <div className="space-y-6">
              {licenseStatus && (
                <div className={`p-4 rounded-lg ${licenseStatus.isActivated ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <h3 className="font-medium text-lg mb-2">
                    {licenseStatus.isActivated ? '✅ License Active' : '⚠️ License Not Activated'}
                  </h3>
                  {licenseStatus.isActivated && (
                    <div className="text-sm text-gray-700 space-y-1">
                      <p><strong>Activated:</strong> {new Date(licenseStatus.activatedAt).toLocaleDateString()}</p>
                      <p><strong>Expires:</strong> {new Date(licenseStatus.expiresAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleActivateLicense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Key
                  </label>
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-md hover:brightness-90"
                >
                  Activate License
                </button>
              </form>
            </div>
          )}


          {/* Email Settings Tab */}
          {activeTab === 'email' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Configure your school's SMTP settings to enable automated notifications for payments, absences, and results.
                      <strong> Tip:</strong> For Gmail, use host <code>smtp.gmail.com</code> and an <strong>App Password</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    name="emailHost"
                    value={settings.emailHost || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., smtp.gmail.com"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    name="emailPort"
                    value={settings.emailPort || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., 465 or 587"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div className="flex items-center mt-8">
                  <input
                    type="checkbox"
                    name="emailSecure"
                    checked={settings.emailSecure}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-primary rounded"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700">
                    Use SSL/TLS (Secure)
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Username / Email
                  </label>
                  <input
                    type="text"
                    name="emailUser"
                    value={settings.emailUser || ''}
                    onChange={handleInputChange}
                    placeholder="your-email@school.com"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Password / App Password
                  </label>
                  <input
                    type="password"
                    name="emailPassword"
                    autoComplete="new-password"
                    value={settings.emailPassword || ''}
                    onChange={handleInputChange}
                    placeholder="••••••••••••••••"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <button
                  type="button"
                  onClick={handleTestEmail}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Test Connection
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-white rounded-md hover:brightness-90 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save Email Settings'}
                </button>
              </div>
            </form>
          )}

          {/* SMS Settings Tab */}
          {activeTab === 'sms' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-orange-700">
                      Configure your <strong>Africa's Talking</strong> credentials to enable SMS notifications.
                      Ensure you use international phone number formats (e.g., +234...) for all users.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center mb-6 p-4 bg-gray-50 rounded-lg border">
                <input
                  type="checkbox"
                  name="enableSMS"
                  checked={settings.enableSMS}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-primary rounded"
                />
                <div className="ml-3">
                  <label className="text-sm font-bold text-gray-900">Enable SMS Notifications</label>
                  <p className="text-xs text-gray-500">Master switch to turn all SMS alerts on/off</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Africa's Talking Username
                  </label>
                  <input
                    type="text"
                    name="smsUsername"
                    value={settings.smsUsername || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., sandbox or your_username"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    name="smsApiKey"
                    autoComplete="new-password"
                    value={settings.smsApiKey || ''}
                    onChange={handleInputChange}
                    placeholder="Your AT API Key"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sender ID (Optional)
                  </label>
                  <input
                    type="text"
                    name="smsSenderId"
                    value={settings.smsSenderId || ''}
                    onChange={handleInputChange}
                    placeholder="Short code or alphanumeric ID"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <button
                  type="button"
                  onClick={handleTestSMS}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Send Test SMS
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-white rounded-md hover:brightness-90 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save SMS Settings'}
                </button>
              </div>
            </form>
          )}

          {/* System Settings Tab */}
          {activeTab === 'system' && (
            <SystemSettings />
          )}

          {/* Examination Tab */}
          {activeTab === 'exam' && (
            <form onSubmit={handleSaveSettings} className="space-y-8">
              <div className={`p-8 rounded-[40px] border-2 transition-all ${settings.examMode ? 'bg-indigo-50 border-indigo-200 shadow-xl shadow-indigo-100' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Examination Mode</h3>
                    <p className="text-sm text-slate-500 font-bold mt-1">Activate this to monitor real-time result submission across all classes.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer scale-125">
                    <input
                      type="checkbox"
                      name="examMode"
                      checked={settings.examMode}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {settings.examMode && (
                  <div className="mt-8 pt-8 border-t border-indigo-100 animate-in fade-in slide-in-from-top-4 duration-500">
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Select Monitoring Target</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { id: 'assignment1', label: '1st Assignment' },
                        { id: 'assignment2', label: '2nd Assignment' },
                        { id: 'test1', label: '1st Test' },
                        { id: 'test2', label: '2nd Test' },
                        { id: 'examination', label: 'Final Exam' },
                        { id: 'none', label: 'General Monitoring' }
                      ].map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, examModeType: type.id }))}
                          className={`px-6 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${settings.examModeType === type.id
                            ? 'bg-primary text-white shadow-2xl shadow-primary/40'
                            : 'bg-white text-slate-400 border border-slate-100 hover:border-primary/30 hover:text-primary'
                            }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Score Distribution weights</h3>
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">1st Assgn (%)</label>
                        <input type="number" name="assignment1Weight" value={settings.assignment1Weight} onChange={handleInputChange} className="w-full bg-slate-50 border-0 rounded-[20px] px-6 py-4 focus:ring-2 ring-primary outline-none font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">2nd Assgn (%)</label>
                        <input type="number" name="assignment2Weight" value={settings.assignment2Weight} onChange={handleInputChange} className="w-full bg-slate-50 border-0 rounded-[20px] px-6 py-4 focus:ring-2 ring-primary outline-none font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">1st Test (%)</label>
                        <input type="number" name="test1Weight" value={settings.test1Weight} onChange={handleInputChange} className="w-full bg-slate-50 border-0 rounded-[20px] px-6 py-4 focus:ring-2 ring-primary outline-none font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">2nd Test (%)</label>
                        <input type="number" name="test2Weight" value={settings.test2Weight} onChange={handleInputChange} className="w-full bg-slate-50 border-0 rounded-[20px] px-6 py-4 focus:ring-2 ring-primary outline-none font-bold" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Final Examination (%)</label>
                      <input type="number" name="examWeight" value={settings.examWeight} onChange={handleInputChange} className="w-full bg-slate-50 border-0 rounded-[20px] px-6 py-4 focus:ring-2 ring-primary outline-none font-bold" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[40px] p-10 text-white flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                  <h4 className="text-3xl font-black mb-6 italic tracking-tighter">Monitoring Logic</h4>
                  <p className="text-slate-400 text-sm font-bold leading-relaxed mb-8">
                    The tracker monitors if teachers have entered digits for the selected <span className="text-white">Monitoring Target</span>.
                    For example, if <span className="text-primary font-black uppercase">1st Test</span> is active, the submission report will mark a teacher as "Pending" if any student in their class is missing a 1st Test score.
                  </p>
                  <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Weight Integrity</span>
                      <span className={`text-xl font-black ${Number(settings.assignment1Weight || 0) +
                        Number(settings.assignment2Weight || 0) +
                        Number(settings.test1Weight || 0) +
                        Number(settings.test2Weight || 0) +
                        Number(settings.examWeight || 0) === 100
                        ? 'text-emerald-400' : 'text-red-500 animate-pulse'
                        }`}>
                        {Number(settings.assignment1Weight || 0) +
                          Number(settings.assignment2Weight || 0) +
                          Number(settings.test1Weight || 0) +
                          Number(settings.test2Weight || 0) +
                          Number(settings.examWeight || 0)
                        }%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${Number(settings.assignment1Weight || 0) +
                          Number(settings.assignment2Weight || 0) +
                          Number(settings.test1Weight || 0) +
                          Number(settings.test2Weight || 0) +
                          Number(settings.examWeight || 0) === 100
                          ? 'bg-emerald-400' : 'bg-red-500'
                          }`}
                        style={{
                          width: `${Math.min(100, (
                            Number(settings.assignment1Weight || 0) +
                            Number(settings.assignment2Weight || 0) +
                            Number(settings.test1Weight || 0) +
                            Number(settings.test2Weight || 0) +
                            Number(settings.examWeight || 0)
                          ))}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm col-span-1 lg:col-span-2">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Grading System Configuration</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const current = JSON.parse(settings.gradingSystem || '[]');
                      const updated = [...current, { grade: '', min: 0, max: 0, remark: '' }];
                      setSettings({ ...settings, gradingSystem: JSON.stringify(updated) });
                    }}
                    className="text-xs font-bold text-primary bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20"
                  >
                    + Add Grade
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                        <th className="pb-4 pr-4">Grade</th>
                        <th className="pb-4 px-4">Min Score</th>
                        <th className="pb-4 px-4">Max Score</th>
                        <th className="pb-4 px-4">Remark</th>
                        <th className="pb-4 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {JSON.parse(settings.gradingSystem || '[]').map((item, idx) => (
                        <tr key={idx} className="group">
                          <td className="py-3 pr-4">
                            <input
                              type="text"
                              value={item.grade}
                              onChange={(e) => {
                                const current = JSON.parse(settings.gradingSystem);
                                current[idx].grade = e.target.value.toUpperCase();
                                setSettings({ ...settings, gradingSystem: JSON.stringify(current) });
                              }}
                              placeholder="A"
                              className="w-16 bg-slate-50 border-0 rounded-lg px-3 py-2 font-bold focus:ring-1 ring-primary"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={item.min}
                              onChange={(e) => {
                                const current = JSON.parse(settings.gradingSystem);
                                current[idx].min = parseFloat(e.target.value);
                                setSettings({ ...settings, gradingSystem: JSON.stringify(current) });
                              }}
                              className="w-20 bg-slate-50 border-0 rounded-lg px-3 py-2 focus:ring-1 ring-primary"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={item.max}
                              onChange={(e) => {
                                const current = JSON.parse(settings.gradingSystem);
                                current[idx].max = parseFloat(e.target.value);
                                setSettings({ ...settings, gradingSystem: JSON.stringify(current) });
                              }}
                              className="w-20 bg-slate-50 border-0 rounded-lg px-3 py-2 focus:ring-1 ring-primary"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={item.remark}
                              onChange={(e) => {
                                const current = JSON.parse(settings.gradingSystem);
                                current[idx].remark = e.target.value;
                                setSettings({ ...settings, gradingSystem: JSON.stringify(current) });
                              }}
                              placeholder="Excellent"
                              className="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 focus:ring-1 ring-primary"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const current = JSON.parse(settings.gradingSystem);
                                const updated = current.filter((_, i) => i !== idx);
                                setSettings({ ...settings, gradingSystem: JSON.stringify(updated) });
                              }}
                              className="text-red-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-10 pt-10 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Promotion Threshold</h4>
                    <p className="text-xs text-slate-500 font-medium">Minimum average percentage required for a student to pass and be promoted to the next class.</p>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-[30px]">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      name="passThreshold"
                      value={settings.passThreshold}
                      onChange={handleInputChange}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-2xl font-black text-primary min-w-[60px]">{settings.passThreshold}%</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-10">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-12 py-5 bg-primary text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? 'Synchronizing Intelligence...' : 'Save Academic Framework'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div >
    </div >
  );
};

export default Settings;
