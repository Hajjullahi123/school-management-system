import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../api';
import { motion } from 'framer-motion';
import { Network, Database, Shield, ShieldCheck, Code, ChevronRight, Zap, Globe, Server, FileText, CircleCheck } from 'lucide-react';

import TransparencyConsole from '../components/TechHub/TransparencyConsole';
import LoadTestSimulator from '../components/TechHub/LoadTestSimulator';
import DeveloperApiPortal from '../components/TechHub/DeveloperApiPortal';
import GlobalMapNode from '../components/TechHub/GlobalMapNode';

const SuperAdminLandingPage = () => {
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Accessibility and Theme States
  const [fontMode, setFontMode] = useState('standard'); // 'standard' | 'dyslexia'

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

  return (
    <div className={`min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 ${fontMode === 'dyslexia' ? 'font-[OpenDyslexic,sans-serif]' : 'font-sans'}`}>
      
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center rotate-3">
              <Network className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight">{school.name || 'EduTechAI'}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 uppercase tracking-widest ml-2 border border-indigo-500/30">Hub</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#models" className="hover:text-white transition-colors">Model Zoo</a>
            <a href="#developers" className="hover:text-white transition-colors">Developers</a>
            <a href="#compliance" className="hover:text-white transition-colors">Trust & Safety</a>
            <a href="#network" className="hover:text-white transition-colors">Global Network</a>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setFontMode(prev => prev === 'standard' ? 'dyslexia' : 'standard')}
              className="text-xs px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/10"
              title="Toggle Accessibility Font"
            >
              {fontMode === 'standard' ? 'Aa (Standard)' : 'Aa (Dyslexic)'}
            </button>
            <button onClick={() => navigate('/login')} className="bg-white text-black px-6 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors">
              Console Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
              <Zap size={14} /> EduTechAI Protocol v2.4 Live
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1] mb-6">
              The Intelligence Infrastructure <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">for Education.</span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-lg leading-relaxed">
              {school.welcomeMessage || 'Deploy ethically trained AI models, manage global learning nodes, and scale educational experiences with sub-50ms latency.'}
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all">
                Read the Documentation <ChevronRight size={18} />
              </button>
              <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-xl font-bold transition-all">
                View Model Benchmarks
              </button>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <TransparencyConsole />
          </motion.div>
        </div>
      </section>

      {/* Live Counters */}
      <section className="py-10 border-y border-white/5 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-mono font-bold text-white mb-2">2.4M+</span>
            <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">Active Learners</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-mono font-bold text-white mb-2">840M</span>
            <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">API Calls Today</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-mono font-bold text-white mb-2">12ms</span>
            <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">Avg Latency</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-mono font-bold text-white mb-2">142</span>
            <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">Countries Reached</span>
          </div>
        </div>
      </section>

      {/* Developer Portal & Load Testing */}
      <section id="developers" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Built for Scale. Engineered for Pedagogy.</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">Integrate our proprietary TutorGPT and AssessNet models directly into your LMS in minutes.</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            <DeveloperApiPortal />
            <LoadTestSimulator />
          </div>
        </div>
      </section>

      {/* Product Ecosystem Matrix */}
      <section id="models" className="py-32 px-6 bg-[#0A0A0A] border-y border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">The AI Ecosystem Matrix</h2>
              <p className="text-gray-400 text-lg max-w-xl">A complete suite of models and tools covering the entire educational lifecycle.</p>
            </div>
            <button className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors inline-flex items-center gap-2 self-start md:self-auto">
              Explore All Solutions <ChevronRight size={18} />
            </button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Database size={24}/>, title: 'AssessNet', desc: 'Real-time bias detection and automated grading for STEM and Humanities.' },
              { icon: <Code size={24}/>, title: 'TutorGPT-4Edu', desc: 'Socratic tutoring model fine-tuned on verified pedagogical datasets.' },
              { icon: <Server size={24}/>, title: 'LMS Sync', desc: 'Zero-downtime bidirectional syncing with Canvas, Moodle, and Blackboard.' }
            ].map((feature, i) => (
              <div key={i} className="bg-[#111] border border-gray-800 rounded-2xl p-8 hover:bg-gray-900 transition-colors group">
                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed mb-6">{feature.desc}</p>
                <a href="#" className="text-indigo-400 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                  Read Whitepaper <ChevronRight size={16} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Map */}
      <section id="network" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
           <GlobalMapNode />
        </div>
      </section>

      {/* Compliance Footer */}
      <footer id="compliance" className="border-t border-white/10 bg-[#050505] pt-20 pb-10">
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
              <div className="flex gap-4">
                {/* Compliance Badges */}
                <div className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/10">
                  <ShieldCheck size={14} className="text-emerald-500" /> SOC2 Type II
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/10">
                  <Globe size={14} className="text-blue-500" /> GDPR Ready
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/10">
                  <CircleCheck size={14} className="text-purple-500" /> WCAG 2.1 AA
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Developers</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status Page</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub Repository</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Institution</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Security & Trust</a></li>
                <li><a href="#" className="hover:text-white transition-colors">AI Pedagogy Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Certification Academy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Sales</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} {school.name || 'EduTechAI'} Inc. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SuperAdminLandingPage;
