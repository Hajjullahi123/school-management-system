import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../api';
import { API_BASE_URL } from '../config';
import ThemeClassic from './themes/ThemeClassic';
import ThemeModern from './themes/ThemeModern';
import ThemeElite from './themes/ThemeElite';
import ThemePlayful from './themes/ThemePlayful';
import ThemeAcademic from './themes/ThemeAcademic';

const SuperAdminLandingPage = () => {
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        const response = await apiCall(`/api/public-superadmin`);
        setSchool(response.data);
      } catch (err) {
        console.error('Failed to fetch super admin school details:', err);
        setError('Portal not found or inactive.');
      } finally {
        setLoading(false);
      }
    };

    fetchSchool();
  }, []);

  const getLogoUrl = (src) => {
    if (!src) return null;
    if (src.startsWith('data:image') || src.startsWith('http')) return src;
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const path = src.startsWith('/') ? src : '/' + src;
    return `${baseUrl}${path}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold uppercase tracking-widest animate-pulse">Loading System Portal...</p>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-4xl mb-6">!</div>
        <h1 className="text-4xl font-black text-gray-900 mb-4">Portal Not Found</h1>
        <button
          onClick={() => navigate('/login')}
          className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold shadow-xl hover:bg-indigo-700 transition-colors"
        >
          Go to Login
        </button>
      </div>
    );
  }

  // Theme Router (passes isSuperAdmin=true so themes can hide school-specific links like Admissions, Alumni)
  switch (school.websiteTheme) {
    case 'elite':
      return <ThemeElite school={school} getLogoUrl={getLogoUrl} isSuperAdmin={true} />;
    case 'playful':
      return <ThemePlayful school={school} getLogoUrl={getLogoUrl} isSuperAdmin={true} />;
    case 'academic':
      return <ThemeAcademic school={school} getLogoUrl={getLogoUrl} isSuperAdmin={true} />;
    case 'classic':
      return <ThemeClassic school={school} getLogoUrl={getLogoUrl} isSuperAdmin={true} />;
    case 'modern':
    default:
      return <ThemeModern school={school} getLogoUrl={getLogoUrl} isSuperAdmin={true} />;
  }
};

export default SuperAdminLandingPage;
