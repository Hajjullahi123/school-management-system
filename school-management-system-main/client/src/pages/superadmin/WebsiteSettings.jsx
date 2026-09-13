import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../../config';
import { api } from '../../api';

const WebsiteSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    heroTitle: '',
    heroSubtitle: '',
    heroMessage: '',
    aboutUsText: '',
    websiteTheme: 'classic',
    contactPhone: '',
    contactEmail: '',
    facebookUrl: '',
    instagramUrl: '',
    whatsappUrl: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/superadmin/cms/settings');
      if (response.ok) {
        const data = await response.json();
        setFormData({
          heroTitle: data.heroTitle || '',
          heroSubtitle: data.heroSubtitle || '',
          heroMessage: data.heroMessage || '',
          aboutUsText: data.aboutUsText || '',
          websiteTheme: data.websiteTheme || 'classic',
          contactPhone: data.contactPhone || '',
          contactEmail: data.contactEmail || '',
          facebookUrl: data.facebookUrl || '',
          instagramUrl: data.instagramUrl || '',
          whatsappUrl: data.whatsappUrl || ''
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.put('/api/superadmin/cms/settings', formData);
      if (response.ok) {
        toast.success('Website settings updated successfully!');
      } else {
        const err = await response.json();
        toast.error(err.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Global Website Settings</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        
        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-4">Hero Section (Landing Page)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hero Title</label>
              <input
                type="text"
                name="heroTitle"
                value={formData.heroTitle}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g. EduTech Systems"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hero Subtitle / Motto</label>
              <input
                type="text"
                name="heroSubtitle"
                value={formData.heroSubtitle}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g. Transforming Education"
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium mb-1">Hero Welcome Message</label>
              <textarea
                name="heroMessage"
                value={formData.heroMessage}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 h-24"
                placeholder="Welcome message shown on the hero section..."
              />
            </div>
          </div>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-4">About Us Section</h2>
          <div>
            <label className="block text-sm font-medium mb-1">About Us Text</label>
            <textarea
              name="aboutUsText"
              value={formData.aboutUsText}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 h-32"
              placeholder="Full about us text..."
            />
          </div>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-4">Contact & Social Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Phone</label>
              <input type="text" name="contactPhone" value={formData.contactPhone} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Facebook URL</label>
              <input type="url" name="facebookUrl" value={formData.facebookUrl} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Instagram URL</label>
              <input type="url" name="instagramUrl" value={formData.instagramUrl} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp URL</label>
              <input type="url" name="whatsappUrl" value={formData.whatsappUrl} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WebsiteSettings;
