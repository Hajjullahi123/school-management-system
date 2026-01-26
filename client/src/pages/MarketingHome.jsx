import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiCheck, FiGlobe, FiSmartphone, FiShield, FiTrendingUp,
  FiMessageSquare, FiArrowRight, FiActivity, FiZap, FiPlusCircle,
  FiPlayCircle, FiDownloadCloud, FiBell
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const MarketingHome = () => {
  const navigate = useNavigate();
  const { demoLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const result = await demoLogin();
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        toast.error('Demo currently unavailable');
      }
    } catch (err) {
      toast.error('Server connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white font-inter selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black">EA</div>
            <span className="text-2xl font-black tracking-tighter">EduTechAI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-500">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
            <a href="#mobile" className="hover:text-indigo-600 transition-colors">Mobile App</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-black text-gray-700 hover:text-indigo-600">Login</Link>
            <button
              onClick={handleDemoLogin}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-black shadow-xl shadow-indigo-100 transform transition-all hover:scale-105 active:scale-95"
            >
              Try Demo
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-40 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase tracking-widest">
              <FiActivity /> Now Powered by Advanced AI
            </div>
            <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter text-gray-900">
              The Future of <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Schooling</span> Is Digital.
            </h1>
            <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-lg">
              Manage students, automate finances, host CBT exams, and track specialized progress like Quranic studies—all in one encrypted cloud infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={handleDemoLogin}
                className="flex items-center justify-center gap-3 bg-gray-900 text-white px-8 py-5 rounded-[24px] font-black text-lg shadow-2xl hover:bg-black transition-all group"
              >
                {loading ? 'Loading Demo...' : 'Explore Live Demo'}
                <FiPlayCircle className="group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                to="/contact"
                className="flex items-center justify-center gap-3 bg-white border-2 border-gray-100 text-gray-600 px-8 py-5 rounded-[24px] font-black text-lg hover:border-indigo-600 hover:text-indigo-600 transition-all"
              >
                Schedule Demo
              </Link>
            </div>
            <div className="flex items-center gap-6 pt-4 text-gray-400">
              <div className="flex flex-col">
                <span className="text-2xl font-black text-gray-900">100+</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">Schools Onboarded</span>
              </div>
              <div className="w-[1px] h-10 bg-gray-100"></div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-gray-900">99.9%</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">Server Uptime</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            {/* Abstract Visual Representing Dashboard on Tablet/Mobile */}
            <div className="relative bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[48px] aspect-[4/3] shadow-3xl overflow-hidden border-[12px] border-white/20">
              <div className="absolute top-8 left-8 right-8 bottom-0 bg-white rounded-t-[32px] p-6 space-y-4">
                <div className="h-6 w-32 bg-gray-100 rounded-full"></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-24 bg-indigo-50 rounded-2xl"></div>
                  <div className="h-24 bg-blue-50 rounded-2xl"></div>
                  <div className="h-24 bg-emerald-50 rounded-2xl"></div>
                </div>
                <div className="h-40 bg-gray-50 rounded-3xl"></div>
              </div>
            </div>
            {/* Floating elements */}
            <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 animate-bounce-slow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"><FiCheck /></div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase">New Payment</p>
                  <p className="text-lg font-black text-gray-900">₦45,000.00</p>
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 bg-indigo-900 p-6 rounded-3xl shadow-2xl animate-pulse">
              <FiSmartphone className="text-white text-4xl" />
            </div>
          </motion.div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-32 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 uppercase italic">Power Up Your Institution</h2>
            <p className="text-gray-500 font-medium">Enterprise tools usually reserved for elite schools, now accessible to everyone.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<FiSmartphone />}
              title="Native Mobile Shell"
              desc="Real-time push notifications for parents and offline access for teachers."
              color="indigo"
            />
            <FeatureCard
              icon={<FiShield />}
              title="Automated Backups"
              desc="Never lose data. Every record is synced daily to military-grade Amazon S3 storage."
              color="blue"
            />
            <FeatureCard
              icon={<FiZap />}
              title="AI Performance Tracking"
              desc="Identify failing students automatically with advanced statistical trend analysis."
              color="amber"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 uppercase italic">Plans Scale with Your Growth</h2>
            <p className="text-gray-500 font-medium text-lg italic uppercase tracking-widest">Transparent pricing. No hidden fees. Military-grade security.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <PricingCard
              tier="Starter"
              price="₦15,000"
              period="per Month"
              desc="Perfect for growing primary schools."
              features={["Up to 200 Students", "Result Management", "Basic Analytics", "S3 Daily Backups"]}
            />
            <PricingCard
              tier="Professional"
              price="₦45,000"
              period="per Month"
              desc="The standard for secondary institutions."
              features={["Unlimited Students", "Advanced AI Analytics", "CBT Exam Portal", "Parent Messaging Portal", "Financial Management"]}
              highlighted={true}
            />
            <PricingCard
              tier="Enterprise"
              price="Custom"
              period="Contact Sales"
              desc="For school chains and large universities."
              features={["White-Label Mobile App", "Priority 24/7 Support", "Multi-Campus Sync", "Custom Report Designs", "On-Premise Deployment Option"]}
            />
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section id="mobile" className="py-32 bg-indigo-600 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-40 opacity-10 pointer-events-none">
          <FiSmartphone className="text-[400px]" />
        </div>
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 items-center gap-16">
          <div className="space-y-8">
            <h2 className="text-5xl md:text-7xl font-black leading-tight">Your School in <br /> Their Pockets.</h2>
            <p className="text-xl text-indigo-100 font-medium leading-relaxed">
              Give parents the transparency they desire. Attendance, Results, Fees, and specialized Quranic progress tracking—accessible anywhere, anytime.
            </p>
            <ul className="space-y-4">
              {[
                "Zero-Configuration Mobile App",
                "Parent-Teacher Instant Messaging",
                "Offline Attendance Logging",
                "Digital ID Card Wallet"
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-3 font-bold">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center"><FiCheck /></div>
                  {f}
                </li>
              ))}
            </ul>
            <button className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-lg transition-all hover:bg-gray-100 shadow-xl">
              White-Label My App
            </button>
          </div>
          <div className="relative">
            {/* Mockup for Mobile */}
            <div className="w-72 h-[580px] bg-gray-900 rounded-[50px] mx-auto border-[10px] border-gray-800 shadow-3xl relative overflow-hidden">
              <div className="absolute top-0 w-full h-8 bg-black flex justify-center pt-1">
                <div className="w-20 h-4 bg-gray-800 rounded-full"></div>
              </div>
              <div className="p-6 pt-12 text-black bg-white h-full space-y-6">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-indigo-100"></div>
                  <FiBell className="text-gray-400" />
                </div>
                <div className="h-10 bg-gray-100 rounded-xl"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-20 bg-indigo-600 rounded-2xl"></div>
                  <div className="h-20 bg-gray-50 rounded-2xl"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-2 w-full bg-gray-100 rounded-full"></div>
                  <div className="h-2 w-3/4 bg-gray-100 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto text-center space-y-8">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black">EA</div>
            <span className="text-4xl font-black tracking-tighter">EduTechAI</span>
          </div>
          <p className="text-gray-400 font-medium font-inter">© 2026 EduTechAI Enterprise. All rights reserved.</p>
          <div className="flex justify-center gap-8 text-sm font-black text-gray-500 underline decoration-indigo-200 underline-offset-8">
            <a href="#">Security</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Developer Portal</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, color }) => (
  <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
    <div className={`w-16 h-16 bg-${color}-50 text-${color}-600 rounded-[20px] mb-8 flex items-center justify-center text-2xl group-hover:bg-${color}-600 group-hover:text-white transition-colors`}>
      {icon}
    </div>
    <h3 className="text-2xl font-black text-gray-900 mb-4">{title}</h3>
    <p className="text-gray-500 font-medium leading-relaxed">{desc}</p>
  </div>
);

const PricingCard = ({ tier, price, period, desc, features, highlighted }) => (
  <div className={`p-10 rounded-[48px] border-2 transition-all duration-500 ${highlighted ? 'border-indigo-600 bg-gray-900 text-white shadow-3xl -translate-y-4' : 'border-gray-100 bg-white text-gray-900 hover:border-indigo-200'}`}>
    <h3 className={`text-xl font-black uppercase tracking-widest mb-2 ${highlighted ? 'text-indigo-400' : 'text-indigo-600'}`}>{tier}</h3>
    <div className="flex items-baseline gap-2 mb-4">
      <span className="text-5xl font-black tracking-tighter">{price}</span>
      <span className={`text-sm font-bold opacity-60`}>{period}</span>
    </div>
    <p className={`text-sm font-medium mb-8 ${highlighted ? 'text-gray-400' : 'text-gray-500'}`}>{desc}</p>
    <ul className="space-y-4 mb-10">
      {features.map((f, i) => (
        <li key={i} className="flex items-center gap-3 text-sm font-bold">
          <FiCheck className={highlighted ? 'text-indigo-400' : 'text-indigo-600'} />
          {f}
        </li>
      ))}
    </ul>
    <button className={`w-full py-4 rounded-2xl font-black transition-all ${highlighted ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
      Get Started
    </button>
  </div>
);

export default MarketingHome;
