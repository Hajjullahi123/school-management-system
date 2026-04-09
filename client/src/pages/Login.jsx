import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useSchoolSettings from '../hooks/useSchoolSettings';
import PWAInstallButton from '../components/PWAInstallButton';
import { apiCall } from '../api';
import { API_BASE_URL } from '../config';
import { FiFacebook, FiInstagram, FiMessageCircle, FiGlobe } from 'react-icons/fi';

const Login = () => {
  const { settings: schoolSettings } = useSchoolSettings();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { schoolSlug: urlSlug } = useParams();
  const [schoolSlug, setSchoolSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [globalSettings, setGlobalSettings] = useState(null);

  const [step, setStep] = useState(1); // 1: Identifier, 2: School Selection, 3: Password
  const [matchedSchools, setMatchedSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);

  useEffect(() => {
    fetchGlobalSettings();
    // 1. Check if schoolSlug is in the URL
    if (urlSlug) {
      setSchoolSlug(urlSlug);
      // Removed setStep(3) - We need to collect the username first!
      localStorage.setItem('schoolSlug', urlSlug);
    } else {
      // 2. Otherwise check if schoolSlug already exists in localStorage
      const savedSlug = localStorage.getItem('schoolSlug');
      if (savedSlug && savedSlug !== 'undefined' && savedSlug !== 'null') {
        setSchoolSlug(savedSlug);
      }
    }
  }, [urlSlug]);

  // Sync selectedSchool with schoolSettings when branding is loaded from URL slug
  useEffect(() => {
    if (urlSlug && schoolSettings?.schoolId && !selectedSchool) {
      setSelectedSchool({
        id: schoolSettings.schoolId,
        name: schoolSettings.name,
        slug: urlSlug,
        logoUrl: schoolSettings.logoUrl
      });
    }
  }, [urlSlug, schoolSettings, selectedSchool]);

  const fetchGlobalSettings = async () => {
    try {
      const res = await apiCall('/api/public/global-settings');
      setGlobalSettings(res.data);
    } catch (error) {
      console.error('Failed to fetch global settings:', error);
    }
  };

  const { login, demoLogin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirectPath = user.role === 'superadmin' ? '/dashboard' : '/school-home';
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate]);

  const getLogoUrl = (src) => {
    if (!src) return null;
    if (src.startsWith('data:image') || src.startsWith('http')) return src; // Return base64 or absolute as-is
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const path = src.startsWith('/') ? src : '/' + src;
    return `${baseUrl}${path}`;
  };

  const handleIdentify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiCall('/api/auth/identify', {
        method: 'POST',
        body: JSON.stringify({ 
          identifier: username,
          schoolSlug: urlSlug || schoolSlug 
        })
      });

      if (res.data.globalAccess) {
        // Superadmin with global access - skip school selection and go directly to password
        setSchoolSlug(null); // No school needed
        setStep(3);
      } else if (res.data.schools && res.data.schools.length > 0) {
        setMatchedSchools(res.data.schools);
        if (res.data.schools.length === 1) {
          const school = res.data.schools[0];
          setSelectedSchool(school);
          setSchoolSlug(school.slug);
          localStorage.setItem('schoolSlug', school.slug);
          setStep(3);
        } else {
          setStep(2);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Account not found. Please check your username/email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolSelect = (school) => {
    setSelectedSchool(school);
    setSchoolSlug(school.slug);
    localStorage.setItem('schoolSlug', school.slug);
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password, schoolSlug);

      if (result.success) {
        // Ensure slug is set in localStorage on successful login
        if (schoolSlug) localStorage.setItem('schoolSlug', schoolSlug);
        const redirectPath = result.role === 'superadmin' ? '/dashboard' : '/school-home';
        navigate(redirectPath, { replace: true });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setPassword('');
    setSelectedSchool(null);
    setMatchedSchools([]);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden">
      {/* Left Side: Marketing & Showcase */}
      <div className="md:w-1/2 lg:w-3/5 bg-gray-900 relative flex flex-col justify-between p-8 md:p-16 text-white overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 animate-pulse delay-700"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl font-black text-white">EA</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter">EduTechAI PORTAL</h1>
            
            {/* Mobile-only Login Access Button */}
            <button 
              onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="md:hidden ml-auto bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold text-xs border border-white/20 backdrop-blur-sm transition-all"
            >
              Log In
            </button>
          </div>

          <div className="max-w-xl">
            <h2 className="text-5xl lg:text-7xl font-black mb-8 leading-[1.1] tracking-tight">
              Revolutionizing <br />
              <span className="text-primary italic">Education</span> <br />
              Through Intelligence.
            </h2>

            <p className="text-gray-400 text-xl mb-12 leading-relaxed">
              Experience the future of school management with our state-of-the-art AI-powered infrastructure, designed for seamless operations and academic excellence.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-16">
              {[
                { title: "AI-Driven Insights", desc: "Predictive analytics for student performance and growth.", icon: "🎯" },
                { title: "Secured Ecosystem", desc: "Military-grade encryption for all financial and personal data.", icon: "🔐" },
                { title: "Automated Workflow", desc: "Effortless grading, attendance, and record-keeping.", icon: "⚙️" },
                { title: "Smart Communication", desc: "Real-time bridge between teachers, parents, and students.", icon: "💬" }
              ].map((feat, i) => (
                <div key={i} className="flex gap-4">
                  <div className="text-2xl">{feat.icon}</div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">{feat.title}</h4>
                    <p className="text-gray-500 text-sm leading-snug">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PWA Install Button */}
        <div className="relative z-10 mb-8 max-w-xs">
          <PWAInstallButton />
        </div>

        {/* Developer Spotlight */}
        <div className="relative z-10 bg-white/5 border border-white/10 backdrop-blur-xl p-6 rounded-3xl mt-auto">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center shadow-inner overflow-hidden border border-white/10">
              <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-primary font-black uppercase tracking-widest text-xs mb-1">Lead Innovation Engineer</h4>
              <p className="text-white text-lg font-bold mb-2">Designed & Engineered with Vision</p>
              <p className="text-gray-400 text-sm mb-4">
                This system is crafted by a top-tier developer dedicated to pushing the boundaries of educational technology. For consultations or custom enterprise solutions, reach out directly.
              </p>
              <a
                href={globalSettings?.whatsappUrl || "https://wa.me/2348033448456"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-2.5 rounded-full font-bold text-sm transform transition-all hover:scale-105 active:scale-95 shadow-lg mb-6"
              >
                <FiMessageCircle className="w-5 h-5" />
                Connect on WhatsApp
              </a>

              {/* Dynamic Social Links */}
              <div className="flex gap-4 justify-center sm:justify-start">
                <a href={globalSettings?.facebookUrl || "#"} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#1877F2] transition-colors group" title="Facebook">
                  <FiFacebook className="w-5 h-5 text-gray-400 group-hover:text-white" />
                </a>
                <a href={globalSettings?.instagramUrl || "#"} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] transition-colors group" title="Instagram">
                  <FiInstagram className="w-5 h-5 text-gray-400 group-hover:text-white" />
                </a>
                <a href={globalSettings?.websiteUrl || "#"} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors group" title="Personal Website">
                  <FiGlobe className="w-5 h-5 text-gray-400 group-hover:text-white" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div id="login-section" className="md:w-1/2 lg:w-2/5 flex items-center justify-center p-8 bg-gray-50 relative">
        <div className="absolute top-0 right-0 p-8">
          {/* Back to Home removed as per Login-First requirement */}
        </div>

        <div className="w-full max-w-md">
          <div className="mb-10 text-center md:text-left">
            <h3 className="text-3xl font-black text-gray-900 mb-2">Welcome Back</h3>
            <p className="text-gray-500 font-medium font-inter">Enter your portal credentials to continue.</p>
          </div>

          <form className="space-y-6" onSubmit={step === 1 ? handleIdentify : handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-shake">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                <span className="text-sm font-bold">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {step === 1 && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Username / Admission No / Email</label>
                  <div className="relative group">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 group-focus-within:text-primary transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </span>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your unique ID or Email"
                      className="block w-full pl-10 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all font-medium"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <label className="block text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Select Your School</label>
                  <div className="grid grid-cols-1 gap-3">
                    {matchedSchools.map(school => (
                      <button
                        key={school.id}
                        type="button"
                        onClick={() => handleSchoolSelect(school)}
                        className="flex items-center gap-4 p-4 text-left border-2 border-gray-100 rounded-2xl hover:border-primary hover:bg-gray-50 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-200">
                          {school.logoUrl ? (
                            <img 
                              src={getLogoUrl(school.logoUrl)} 
                              alt="" 
                              className="w-full h-full object-contain"
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <span 
                            className="text-xl font-black text-gray-300"
                            style={{ display: school.logoUrl ? 'none' : 'flex' }}
                          >
                            {school.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{school.name}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{school.slug}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button onClick={resetFlow} type="button" className="text-xs font-bold text-gray-400 hover:text-primary mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg> Use a different ID
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  {/* School Identity Card or Global Access Badge */}
                  {selectedSchool ? (
                    <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 relative group">
                      <div className="w-12 h-12 rounded-xl bg-white flex-shrink-0 flex items-center justify-center overflow-hidden border border-emerald-200">
                        {selectedSchool?.logoUrl ? (
                          <img 
                            src={getLogoUrl(selectedSchool.logoUrl)} 
                            alt=""
                            className="w-full h-full object-contain"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <span 
                          className="text-xl font-black text-emerald-300"
                          style={{ display: selectedSchool?.logoUrl ? 'none' : 'flex' }}
                        >
                          {selectedSchool?.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Logging into</p>
                        <h4 className="font-bold text-gray-900 truncate">{selectedSchool?.name}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={resetFlow}
                        className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-2xl border border-purple-100 relative group">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex-shrink-0 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest leading-none mb-1">Global Access</p>
                        <h4 className="font-bold text-gray-900">System Administrator</h4>
                      </div>
                      <button
                        type="button"
                        onClick={resetFlow}
                        className="text-[10px] font-bold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-lg hover:bg-purple-200 transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Secret Password</label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 group-focus-within:text-primary transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-12 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.06m2.72-2.31c1.022-.641 2.222-1.03 3.51-1.07M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.362 1.54a9.959 9.959 0 01-4.598 5.49M5.433 5.433l13.134 13.134" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {step !== 2 && (
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  <span className="text-sm font-bold text-gray-600 group-hover:text-primary transition-colors">Keep me signed in</span>
                </label>
                <a href="#" className="text-sm font-black text-primary hover:text-accent transition-colors">Support Help?</a>
              </div>
            )}

            {step !== 2 && (
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl transform transition-all hover:scale-[1.02] active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary'}`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{step === 1 ? 'Identifying...' : 'Authenticating...'}</span>
                  </div>
                ) : (
                  step === 1 ? "Identify Account" : "Access Your Portal"
                )}
              </button>
            )}
          </form>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="h-[1px] bg-gray-200 flex-1"></div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">or explore</span>
            <div className="h-[1px] bg-gray-200 flex-1"></div>
          </div>

          <button
            onClick={() => navigate('/demo')}
            disabled={loading}
            className="w-full mt-4 py-4 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl font-black shadow-sm transform transition-all hover:border-primary hover:text-primary active:scale-[0.98] flex items-center justify-center gap-3 group"
          >
            <FiGlobe className="group-hover:animate-spin-slow" />
            Try Live Demo (No Login Required)
          </button>

          <div className="mt-12 text-center">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Secured Infrastructure</p>
            <div className="flex justify-center gap-6 text-gray-300">
              <span className="flex items-center gap-1 text-[10px] font-bold"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg> SSL PROTECTED</span>
              <span className="flex items-center gap-1 text-[10px] font-bold"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> AI VERIFIED</span>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
};

export default Login;
