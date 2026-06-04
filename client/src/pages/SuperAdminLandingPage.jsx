import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Database, Code, ChevronRight, Zap, Server } from 'lucide-react';

import TransparencyConsole from '../components/TechHub/TransparencyConsole';
import LoadTestSimulator from '../components/TechHub/LoadTestSimulator';
import DeveloperApiPortal from '../components/TechHub/DeveloperApiPortal';
import GlobalMapNode from '../components/TechHub/GlobalMapNode';

const SuperAdminLandingPage = () => {
  const { school, openInquiryModal } = useOutletContext(); // Passed down from TechHubLayout

  return (
    <>
      {/* Hero Section */}
      <section className="tech-hero pt-24 sm:pt-32 pb-24 sm:pb-32 px-6 relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center z-10 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
              <Zap size={14} /> EduTechAI Protocol v2.4 Live
            </div>
            <h1 className="tech-fluid-h1 font-bold mb-6">
              The Intelligence Infrastructure <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">for Education.</span>
            </h1>
            <p className="tech-fluid-base text-gray-400 mb-10 max-w-lg leading-relaxed">
              {school.welcomeMessage || 'Deploy ethically trained AI models, manage global learning nodes, and scale educational experiences with sub-50ms latency.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={openInquiryModal} className="active-scale justify-center bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all">
                Request Demo for Your School <ChevronRight size={18} />
              </button>
              <button onClick={() => { document.getElementById('models')?.scrollIntoView({ behavior: 'smooth' }) }} className="active-scale justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-xl font-bold transition-all">
                Explore Capabilities
              </button>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <TransparencyConsole />
          </motion.div>
        </div>
      </section>

      {/* Live Counters */}
      <section className="py-12 border-y border-white/5 bg-[#0A0A0A]">
        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5">
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

      {/* Why EduTechAI for Schools */}
      <section className="py-24 px-6 relative overflow-hidden bg-[#050505]">
        <div className="max-w-[1400px] mx-auto z-10 relative">
          <div className="text-center mb-16 animate-fade-up">
            <h2 className="tech-fluid-h2 mb-4">Why Top Schools Choose EduTechAI</h2>
            <p className="tech-fluid-base text-gray-400 max-w-2xl mx-auto">Purpose-built intelligence that solves real institutional challenges.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'Reduce Workload', desc: 'Automate grading, lesson planning, and administrative tasks, saving teachers up to 15 hours a week.', icon: '⚡' },
              { title: 'Personalized Tutoring', desc: 'Give every student a 24/7 Socratic tutor trained strictly on your approved curriculum.', icon: '🧠' },
              { title: 'Enterprise Privacy', desc: 'Your data is siloed and never used to train public models. Fully GDPR, FERPA, and COPPA compliant.', icon: '🛡️' },
              { title: 'Seamless Integration', desc: 'Syncs instantly with your existing SIS and LMS (Canvas, Moodle) via our global API.', icon: '🔗' }
            ].map((benefit, i) => (
              <div key={i} className={`tech-glass-dark rounded-3xl p-8 hover:-translate-y-2 transition-all duration-300 animate-fade-up delay-${(i+1)*100}`}>
                <div className="text-4xl mb-6">{benefit.icon}</div>
                <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer Portal & Load Testing */}
      <section id="developers" className="py-32 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16 animate-fade-up">
            <h2 className="tech-fluid-h2 mb-4">Built for Scale. Engineered for Pedagogy.</h2>
            <p className="tech-fluid-base text-gray-400 max-w-2xl mx-auto">Integrate our proprietary TutorGPT and AssessNet models directly into your LMS in minutes.</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-10 items-stretch">
            <DeveloperApiPortal />
            <LoadTestSimulator />
          </div>
        </div>
      </section>

      {/* Product Ecosystem Matrix */}
      <section id="models" className="py-32 px-6 bg-[#0A0A0A] border-y border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 animate-fade-up">
            <div>
              <h2 className="tech-fluid-h2 mb-4">The AI Ecosystem Matrix</h2>
              <p className="tech-fluid-base text-gray-400 max-w-xl">A complete suite of models and tools covering the entire educational lifecycle.</p>
            </div>
            <button className="active-scale bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors inline-flex items-center gap-2 self-start md:self-auto">
              Explore All Solutions <ChevronRight size={18} />
            </button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { icon: <Database size={24}/>, title: 'AssessNet', desc: 'Real-time bias detection and automated grading for STEM and Humanities.' },
              { icon: <Code size={24}/>, title: 'TutorGPT-4Edu', desc: 'Socratic tutoring model fine-tuned on verified pedagogical datasets.' },
              { icon: <Server size={24}/>, title: 'LMS Sync', desc: 'Zero-downtime bidirectional syncing with Canvas, Moodle, and Blackboard.' }
            ].map((feature, i) => (
              <div key={i} className={`tech-glass-dark rounded-2xl p-8 group animate-fade-up delay-${(i+1)*100}`}>
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
        <div className="max-w-[1400px] mx-auto">
           <GlobalMapNode />
        </div>
      </section>
    </>
  );
};

export default SuperAdminLandingPage;
