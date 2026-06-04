import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { apiCall } from '../../api';
import { Network, ShieldCheck, Globe, CheckCircle2, CircleCheck, Menu, X } from 'lucide-react';
import InquiryModal from './InquiryModal';

const TechHubLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  
  // Accessibility and Theme States
  const [fontMode, setFontMode] = useState('standard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505]">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold uppercase tracking-widest animate-pulse">Initializing Hub...</p>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] p-6 text-center">
        <div className="w-24 h-24 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center text-4xl mb-6">!</div>
        <h1 className="text-4xl font-black text-white mb-4">Hub Not Found</h1>
        <button onClick={() => navigate('/login')} className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-700 transition-colors">
          Go to Login
        </button>
      </div>
    );
  }

  const navLinks = [
    { path: '/edutech', label: 'Solutions' },
    { path: '/edutech/model-zoo', label: 'AI Models' },
    { path: '/edutech/developers', label: 'Developers' },
    { path: '/edutech/trust-safety', label: 'Trust & Safety' },
    { path: '/edutech/global-network', label: 'Global Network' },
  ];

  return (
    <div className={`min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 flex flex-col ${fontMode === 'dyslexia' ? 'font-[OpenDyslexic,sans-serif]' : 'font-sans'}`}>
      
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/edutech')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center rotate-3">
              <Network className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:block">{school.name || 'EduTechAI'}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 uppercase tracking-widest ml-2 border border-indigo-500/30">Hub</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-400">
            {navLinks.map((link) => (
              <a 
                key={link.path}
                onClick={() => navigate(link.path)} 
                className={`tech-nav-link cursor-pointer transition-colors ${location.pathname === link.path ? 'text-white font-bold active' : 'hover:text-white'}`}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setFontMode(prev => prev === 'standard' ? 'dyslexia' : 'standard')}
              className="hidden sm:block text-xs px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/10"
              title="Toggle Accessibility Font"
            >
              {fontMode === 'standard' ? 'Aa (Standard)' : 'Aa (Dyslexic)'}
            </button>
            <button onClick={() => navigate('/login')} className="hidden sm:block bg-white/5 hover:bg-white/10 text-white px-6 py-2 rounded-full text-sm font-bold border border-white/10 transition-colors">
              Console Login
            </button>
            <button 
              onClick={() => setIsInquiryModalOpen(true)} 
              className="hidden sm:block active-scale bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2 rounded-full text-sm font-bold transition-colors"
            >
              Request Demo
            </button>
            <button 
              className="lg:hidden p-2 text-gray-400 hover:text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#050505] border-b border-white/10 absolute top-20 left-0 w-full shadow-2xl">
            <div className="flex flex-col py-4 px-6 gap-4">
              {navLinks.map((link) => (
                <a 
                  key={link.path}
                  onClick={() => navigate(link.path)} 
                  className={`text-lg font-medium cursor-pointer transition-colors ${location.pathname === link.path ? 'text-indigo-400 font-bold' : 'text-gray-400 hover:text-white'}`}
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-white/10 my-2" />
              <button 
                onClick={() => setFontMode(prev => prev === 'standard' ? 'dyslexia' : 'standard')}
                className="w-full text-left text-sm py-2 text-gray-300"
              >
                Toggle Font: {fontMode === 'standard' ? 'Standard' : 'Dyslexic'}
              </button>
              <button onClick={() => navigate('/login')} className="w-full bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl font-bold mt-2">
                Console Login
              </button>
              <button onClick={() => { setIsMobileMenuOpen(false); setIsInquiryModalOpen(true); }} className="w-full bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold mt-2">
                Request Demo
              </button>
            </div>
          </div>
        )}
      </nav>

      <InquiryModal isOpen={isInquiryModalOpen} onClose={() => setIsInquiryModalOpen(false)} />

      {/* Main Content Area */}
      <main className="flex-1 mt-20">
        <Outlet context={{ school, openInquiryModal: () => setIsInquiryModalOpen(true) }} />
      </main>

      {/* Compliance Footer */}
      <footer id="compliance" className="border-t border-white/10 bg-[#050505] pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Network className="text-white" size={16} />
                </div>
                <span className="text-xl font-bold tracking-tight">{school.name || 'EduTechAI'}</span>
              </div>
              <p className="text-gray-400 text-sm max-w-sm mb-6 leading-relaxed">
                Building the ethical infrastructure for the future of global education. Open-source, accessible, and radically transparent.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/10 whitespace-nowrap">
                  <ShieldCheck size={14} className="text-emerald-500" /> SOC2 Type II
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/10 whitespace-nowrap">
                  <Globe size={14} className="text-blue-500" /> GDPR Ready
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/10 whitespace-nowrap">
                  <CircleCheck size={14} className="text-purple-500" /> WCAG 2.1 AA
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Developers</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a onClick={() => navigate('/edutech/developers')} className="cursor-pointer hover:text-white transition-colors">Documentation</a></li>
                <li><a onClick={() => navigate('/edutech/developers')} className="cursor-pointer hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status Page</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub Repository</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Institution</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a onClick={() => navigate('/edutech/trust-safety')} className="cursor-pointer hover:text-white transition-colors">Security & Trust</a></li>
                <li><a href="#" className="hover:text-white transition-colors">AI Pedagogy Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Certification Academy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Sales</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4">
            <p className="text-center md:text-left">&copy; {new Date().getFullYear()} {school.name || 'EduTechAI'} Inc. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-6 mt-2 md:mt-0">
              <a onClick={() => navigate('/edutech/trust-safety')} className="cursor-pointer hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Persistent Global Footer Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-indigo-950/90 border-t border-indigo-500/30 text-[11px] font-mono text-indigo-300 py-1.5 px-6 flex items-center justify-center sm:justify-start gap-4 z-50 backdrop-blur-md">
        <span className="flex items-center gap-1"><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span></span> Current edge node: Frankfurt (12ms)</span>
        <span className="hidden sm:inline">·</span>
        <span className="hidden sm:flex items-center gap-1"><Globe size={10} /> GDPR compliant</span>
        <span className="hidden sm:inline">·</span>
        <span className="hidden sm:flex">Last audit: March 2026</span>
      </div>
    </div>
  );
};

export default TechHubLayout;
