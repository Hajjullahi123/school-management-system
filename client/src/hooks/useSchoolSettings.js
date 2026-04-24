import { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../api';

/**
 * Custom hook to fetch and provide school settings
 * Returns school name, logo, colors, and other branding information
 */
export const useSchoolSettings = () => {
  const [settings, setSettings] = useState({
    schoolId: null,
    schoolName: "School Management",
    schoolMotto: "System",
    schoolAddress: "",
    schoolPhone: "",
    schoolEmail: "",
    logoUrl: null,
    primaryColor: '#0f766e',
    secondaryColor: '#0d9488',
    accentColor: '#14b8a6',
    isSetupComplete: true // Default to true to prevent flickering before load
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        // Get slug from URL path, or query param, or localStorage
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const urlParams = new URLSearchParams(window.location.search);

        // Priority: 1. Path slug (e.g. /amana-academy/), 2. Query param (?school=), 3. localStorage
        let slug = pathParts[0] && !['login', 'news-events', 'contact', 'gallery', 'alumni', 'demo', 'verify', 'dashboard', 'superadmin', 'school-home', 'verify-dashboard'].includes(pathParts[0])
          ? pathParts[0]
          : urlParams.get('school') || localStorage.getItem('schoolSlug');

        if (slug === 'null' || slug === 'undefined') {
          slug = null;
        }

        const endpoint = slug ? `/api/settings?schoolSlug=${slug}` : '/api/settings';
        const response = await api.get(endpoint);
        const data = await response.json();

        if (response.ok && data && isMounted) {
          setSettings({
            schoolId: data.id,
            schoolName: data.schoolName || data.name || "School Management",
            name: data.schoolName || data.name || "School Management", // Alias for components using .name
            schoolMotto: data.schoolMotto || data.motto || "In Pursuit of Knowledge and Excellence",
            motto: data.schoolMotto || data.motto || "In Pursuit of Knowledge and Excellence", // Alias
            schoolAddress: data.schoolAddress || data.address || "",
            address: data.address || data.schoolAddress || "", // Critical Alias for Transcript/Report Cards
            schoolPhone: data.schoolPhone || data.phone || "",
            phone: data.schoolPhone || data.phone || "", // Alias
            schoolEmail: data.schoolEmail || data.email || "",
            email: data.schoolEmail || data.email || "", // Alias
            logoUrl: data.logoUrl ? (data.logoUrl.startsWith('data:') || data.logoUrl.startsWith('http') ? data.logoUrl : `${API_BASE_URL}${data.logoUrl}`) : null,
            primaryColor: data.primaryColor || '#0f766e',
            secondaryColor: data.secondaryColor || '#0d9488',
            accentColor: data.accentColor || '#14b8a6',
            facebookUrl: data.facebookUrl || null,
            instagramUrl: data.instagramUrl || null,
            whatsappUrl: data.whatsappUrl || null,
            academicCalendarUrl: data.academicCalendarUrl || null,
            eLibraryUrl: data.eLibraryUrl || null,
            alumniNetworkUrl: data.alumniNetworkUrl || null,
            brochureFileUrl: data.brochureFileUrl || null,
            admissionGuideFileUrl: data.admissionGuideFileUrl || null,
            openingHours: data.openingHours || "Mon - Fri: 8:00 AM - 4:00 PM",
            welcomeTitle: data.welcomeTitle || "Building a Brighter Future Together",
            welcomeMessage: data.welcomeMessage || "Providing a supportive and innovative environment where every student can achieve their full potential and prepare for success in an ever-changing world.",
            assignment1Weight: data.assignment1Weight || 5,
            assignment2Weight: data.assignment2Weight || 5,
            test1Weight: data.test1Weight || 10,
            test2Weight: data.test2Weight || 10,
            examWeight: data.examWeight || 70,
            currentSession: data.currentSession || null,
            currentTerm: data.currentTerm || null,
            isSetupComplete: data.isSetupComplete ?? true,
            principalSignatureUrl: data.principalSignatureUrl ? (data.principalSignatureUrl.startsWith('data:') || data.principalSignatureUrl.startsWith('http') ? data.principalSignatureUrl : `${API_BASE_URL}${data.principalSignatureUrl}`) : null,
            weekendDays: data.weekendDays ?? "",
            // Report Card Customization
            reportFontFamily: data.reportFontFamily || 'serif',
            reportColorScheme: data.reportColorScheme || '',
            showPositionOnReport: data.showPositionOnReport !== false, // default true
            showFeesOnReport: data.showFeesOnReport !== false, // default true
            showAttendanceOnReport: data.showAttendanceOnReport !== false, // default true
            reportLayout: data.reportLayout || 'classic',
            // Certificate & Testimonial Customization
            certFontFamily: data.certFontFamily || 'serif',
            certBorderType: data.certBorderType || 'ornate',
            certPrimaryColor: data.certPrimaryColor || '',
            certSecondaryColor: data.certSecondaryColor || '',
            testimFontFamily: data.testimFontFamily || 'sans-serif',
            testimBorderType: data.testimBorderType || 'modern',
            testimPrimaryColor: data.testimPrimaryColor || '',
            testimSecondaryColor: data.testimSecondaryColor || '',
          });
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching school settings:', err);
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      }
    };

    fetchSettings();
    return () => { isMounted = false; };
  }, []);

  const refreshSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          ...data,
          schoolName: data.schoolName || data.name,
          logoUrl: data.logoUrl ? (data.logoUrl.startsWith('data:') || data.logoUrl.startsWith('http') ? data.logoUrl : `${API_BASE_URL}${data.logoUrl}`) : null,
          weekendDays: data.weekendDays ?? ""
        }));
      }
    } catch (err) {
      console.error('Error refreshing settings:', err);
    }
  };

  return { settings, loading, error, refreshSettings };
};

export default useSchoolSettings;


