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
        // Get slug from URL or localStorage or default to 'default'
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get('school') || localStorage.getItem('schoolSlug');

        const endpoint = slug ? `/api/settings?schoolSlug=${slug}` : '/api/settings';
        const response = await api.get(endpoint);
        const data = await response.json();

        if (response.ok && data && isMounted) {
          setSettings({
            schoolId: data.id,
            schoolName: data.schoolName || data.name || "School Management",
            schoolMotto: data.schoolMotto || data.motto || "In Pursuit of Knowledge and Excellence",
            schoolAddress: data.schoolAddress || data.address || "",
            schoolPhone: data.schoolPhone || data.phone || "",
            schoolEmail: data.schoolEmail || data.email || "",
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
            isSetupComplete: data.isSetupComplete ?? true
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

    return () => {
      isMounted = false;
    };
  }, []);

  return { settings, loading, error };
};

export default useSchoolSettings;


