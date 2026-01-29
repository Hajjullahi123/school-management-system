import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiCheck, FiGlobe, FiSmartphone, FiShield, FiTrendingUp,
  FiMessageSquare, FiArrowRight, FiActivity, FiZap, FiPlusCircle,
  FiPlayCircle, FiDownloadCloud, FiBell, FiUsers
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const MarketingHome = () => {
  const navigate = useNavigate();
  const { demoLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [prices, setPrices] = useState({ basic: 15000, standard: 45000, premium: 0 });

  useEffect(() => {
    fetch('/api/platform-billing/public-pricing')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setPrices({
            basic: data.basic,
            standard: data.standard,
            premium: 0 // Keep custom for enterprise
          });
        }
      })
      .catch(() => { });
  }, []);

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
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-2xl border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-200">EA</div>
            <span className="text-2xl font-black tracking-tighter">EduTechAI</span>
          </div>

          <div className="hidden md:flex items-center gap-10 text-sm font-black text-gray-400 uppercase tracking-widest">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
            <a href="#mobile" className="hover:text-indigo-600 transition-colors">Mobile App</a>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-6">
              <Link to="/login" className="text-sm font-black text-gray-700 hover:text-indigo-600 transition-colors uppercase tracking-widest">Login</Link>
              <button
                onClick={handleDemoLogin}
                className="bg-indigo-600 text-white px-8 py-3 rounded-full text-sm font-black shadow-xl shadow-indigo-100 transform transition-all hover:scale-105 active:scale-95 hover:bg-indigo-700 uppercase tracking-widest"
              >
                Demo
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-gray-600"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white border-b border-gray-100 p-6 space-y-4 shadow-xl"
          >
            <a href="#features" onClick={() => setIsMenuOpen(false)} className="block text-lg font-black text-gray-900 uppercase tracking-widest">Features</a>
            <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="block text-lg font-black text-gray-900 uppercase tracking-widest">Pricing</a>
            <a href="#mobile" onClick={() => setIsMenuOpen(false)} className="block text-lg font-black text-gray-900 uppercase tracking-widest">Mobile App</a>
            <div className="pt-4 flex flex-col gap-4">
              <Link to="/login" className="block text-center py-4 font-black border-2 border-gray-100 rounded-2xl text-gray-600">Login</Link>
              <button onClick={handleDemoLogin} className="block w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg">Try Demo</button>
            </div>
          </motion.div>
        )}
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
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-black leading-[1.1] md:leading-[0.9] tracking-tighter text-gray-900">
              The Future of <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Schooling</span> Is Digital.
            </h1>
            <p className="text-lg md:text-xl text-gray-500 font-medium leading-relaxed max-w-lg">
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
            className="relative mt-20 lg:mt-0"
          >
            {/* Abstract Visual Representing Dashboard on Tablet/Mobile */}
            <div className="relative bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[32px] md:rounded-[48px] aspect-[4/3] shadow-3xl overflow-hidden border-[8px] md:border-[12px] border-white/20">
              <div className="absolute top-8 left-8 right-8 bottom-0 bg-white rounded-t-[32px] p-6 space-y-4">
                {/* Header Bar */}
                <div className="flex items-center justify-between mb-2">
                  <div className="h-3 w-24 bg-gray-800 rounded-full"></div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                </div>

                {/* Dashboard Stat Cards */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Students Card */}
                  <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-4 translate-x-4"></div>
                    <FiUsers className="text-white/60 text-xl mb-2" />
                    <p className="text-2xl font-black text-white">1,245</p>
                    <p className="text-[8px] font-bold text-indigo-200 uppercase tracking-wider">Students</p>
                  </div>

                  {/* Revenue Card */}
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-4 translate-x-4"></div>
                    <FiTrendingUp className="text-white/60 text-xl mb-2" />
                    <p className="text-2xl font-black text-white">₦2.4M</p>
                    <p className="text-[8px] font-bold text-blue-200 uppercase tracking-wider">Revenue</p>
                  </div>

                  {/* Attendance Card */}
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-4 translate-x-4"></div>
                    <FiCheck className="text-white/60 text-xl mb-2" />
                    <p className="text-2xl font-black text-white">98%</p>
                    <p className="text-[8px] font-bold text-emerald-200 uppercase tracking-wider">Attendance</p>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="bg-gray-50 rounded-3xl p-4 h-32 flex items-end gap-2">
                  <div className="flex-1 bg-indigo-200 rounded-t-lg h-[60%]"></div>
                  <div className="flex-1 bg-indigo-300 rounded-t-lg h-[80%]"></div>
                  <div className="flex-1 bg-indigo-400 rounded-t-lg h-[45%]"></div>
                  <div className="flex-1 bg-indigo-500 rounded-t-lg h-[90%]"></div>
                  <div className="flex-1 bg-indigo-600 rounded-t-lg h-[70%]"></div>
                  <div className="flex-1 bg-indigo-700 rounded-t-lg h-[95%]"></div>
                </div>
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

      {/* Trust Bar */}
      <div className="py-16 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.5em] mb-12">The Engine Behind Elite Institutions</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-30 grayscale group hover:grayscale-0 transition-all duration-1000">
            <div className="flex items-center gap-3 font-black text-2xl tracking-tighter group-hover:text-indigo-600 transition-colors"><FiShield /> AL-QALAM</div>
            <div className="flex items-center gap-3 font-black text-2xl tracking-tighter group-hover:text-blue-600 transition-colors"><FiGlobe /> GLOBAL ACADEMY</div>
            <div className="flex items-center gap-3 font-black text-2xl tracking-tighter group-hover:text-emerald-600 transition-colors"><FiActivity /> EXCELLENCE</div>
            <div className="flex items-center gap-3 font-black text-2xl tracking-tighter group-hover:text-amber-600 transition-colors"><FiZap /> SMART SCHOOLS</div>
            <div className="flex items-center gap-3 font-black text-2xl tracking-tighter group-hover:text-purple-600 transition-colors"><FiCheck /> PREMIER INT'L</div>
          </div>
        </div>
      </div>

      {/* Impact Stats */}
      <section className="py-24 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-indigo-600/5"></div>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-12 text-center relative z-10">
          {[
            { val: "500k+", label: "Active Students" },
            { val: "1.2k+", label: "Schools Managed" },
            { val: "99.9%", label: "Uptime SLA" },
            { val: "₦2.5B+", label: "Fees Processed" }
          ].map((stat, i) => (
            <div key={i} className="space-y-2">
              <h3 className="text-4xl md:text-5xl font-black text-indigo-400">{stat.val}</h3>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="py-32 bg-indigo-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 uppercase italic">Onboard in Minutes</h2>
            <p className="text-gray-500 font-medium max-w-xl mx-auto">Our streamlined process ensures your school transition is seamless and stress-free.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 relative">
            {/* Connector Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-indigo-100 -translate-y-1/2 z-0"></div>

            {[
              { num: "01", title: "Setup", desc: "Configure your academic sessions and classes in minutes.", icon: <FiZap /> },
              { num: "02", title: "Import", desc: "Bulk upload students and staff data from Excel/CSV.", icon: <FiDownloadCloud /> },
              { num: "03", title: "Launch", desc: "Automate fees and start recording results immediately.", icon: <FiPlayCircle /> },
              { num: "04", title: "Scalable", desc: "Expand your reach with our integrated Parent App.", icon: <FiTrendingUp /> }
            ].map((step, i) => (
              <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative z-10 hover:shadow-xl hover:-translate-y-2 transition-all duration-500">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl mb-6 flex items-center justify-center text-2xl shadow-lg shadow-indigo-100">
                  {step.icon}
                </div>
                <div className="text-5xl font-black text-indigo-50/50 absolute top-6 right-8">{step.num}</div>
                <h3 className="text-xl font-black text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 uppercase italic">Enterprise Features</h2>
            <p className="text-gray-500 font-medium">Tools designed to modernize every aspect of your institution.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <FiMessageSquare />, title: "Parent Chat", desc: "Direct messaging with teachers." },
              { icon: <FiGlobe />, title: "CBT Portal", desc: "Offline/Online exam infrastructure." },
              { icon: <FiTrendingUp />, title: "Profit Tracking", desc: "Advanced financial bookkeeping." },
              { icon: <FiShield />, title: "Secure Data", desc: "Full 256-bit SSL encryption." }
            ].map((f, i) => (
              <div key={i} className="flex gap-4 p-6 bg-gray-50 rounded-2xl hover:bg-indigo-50 transition-colors cursor-default">
                <div className="text-indigo-600 text-xl font-bold">{f.icon}</div>
                <div>
                  <h4 className="font-bold text-gray-900">{f.title}</h4>
                  <p className="text-xs text-gray-500 font-medium">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 uppercase italic">Plans Scale with Your Growth</h2>
            <p className="text-gray-500 font-medium text-lg italic uppercase tracking-widest">Transparent pricing. No hidden fees. Military-grade security.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <PricingCard
              tier="Starter"
              price={`₦${new Intl.NumberFormat().format(prices.basic)}`}
              period="per Month"
              desc="Perfect for growing primary schools."
              features={["Up to 200 Students", "Result Management", "Basic Analytics", "S3 Daily Backups"]}
              onAction={handleDemoLogin}
            />
            <PricingCard
              tier="Professional"
              price={`₦${new Intl.NumberFormat().format(prices.standard)}`}
              period="per Month"
              desc="The standard for secondary institutions."
              features={["Unlimited Students", "Advanced AI Analytics", "CBT Exam Portal", "Parent Messaging Portal", "Financial Management"]}
              highlighted={true}
              onAction={handleDemoLogin}
            />
            <PricingCard
              tier="Enterprise"
              price="Custom"
              period="Contact Sales"
              desc="For school chains and large universities."
              features={["White-Label Mobile App", "Priority 24/7 Support", "Multi-Campus Sync", "Custom Report Designs", "On-Premise Deployment Option"]}
              onAction={() => navigate('/contact')}
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-5xl font-black tracking-tighter text-gray-900 mb-8 leading-[0.9]">
                Loved by <span className="text-indigo-600">Administrators</span> Everywhere.
              </h2>
              <div className="space-y-8">
                <div className="flex gap-4 p-8 bg-gray-50 rounded-[32px] border border-gray-100 italic relative">
                  <div className="text-6xl text-indigo-100 absolute -top-4 -left-4">"</div>
                  <p className="text-gray-600 font-medium relative z-10">
                    "Switching to EduTechAI was the best decision we made for our school. The CBT portal and parent app have completely automated our major pain points."
                  </p>
                  <div className="mt-4">
                    <p className="font-black text-gray-900">— Dr. Salisu Ibrahim</p>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Principal, Excellence Academy</p>
                  </div>
                </div>
                <div className="flex gap-4 p-8 bg-gray-50 rounded-[32px] border border-gray-100 italic relative">
                  <div className="text-6xl text-indigo-100 absolute -top-4 -left-4">"</div>
                  <p className="text-gray-600 font-medium relative z-10">
                    "The result management system is flawless. What used to take weeks now takes hours. My teachers are much happier now."
                  </p>
                  <div className="mt-4">
                    <p className="font-black text-gray-900">— Hajiya Fatima Yusuf</p>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Proprietress, Al-Qalam Schools</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-indigo-600 rounded-[50px] aspect-square flex items-center justify-center p-12 overflow-hidden shadow-3xl shadow-indigo-100">
                <div className="grid grid-cols-2 gap-4 w-full">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="aspect-square bg-indigo-500/50 rounded-3xl border border-white/10 flex flex-col items-center justify-center text-white text-center p-4">
                      <span className="text-3xl font-black mb-1">98%</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">Satisfaction</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Floating stat */}
              <div className="absolute -bottom-10 -right-10 bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 font-black text-center">
                <p className="text-indigo-600 text-3xl">24/7</p>
                <p className="text-xs text-gray-400 uppercase tracking-widest">Premium Support</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section id="mobile" className="py-32 bg-indigo-900 text-white overflow-hidden relative">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="url(#grad1)" />
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#4f46e5', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 items-center gap-16 relative z-10">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-800/50 backdrop-blur-md border border-indigo-500/30 rounded-full text-indigo-300 text-xs font-black uppercase tracking-widest">
              <FiSmartphone className="text-basic" /> Available on iOS & Android
            </div>
            <h2 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter">
              Your School in <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-cyan-200">Their Pocket.</span>
            </h2>
            <p className="text-xl text-indigo-200 font-medium leading-relaxed max-w-lg">
              Empower parents with real-time transparency. Attendance, Results, Fees, and specialized Quranic progress tracking—accessible anywhere, anytime.
            </p>

            <div className="grid grid-cols-1 gap-4 pt-4">
              {[
                { title: "Zero-Configuration Mobile App", desc: "Native experience, zero setup for users" },
                { title: "Parent-Teacher Instant Messaging", desc: "Encrypted direct communication" },
                { title: "Offline Attendance Logging", desc: "No internet? No problem. It syncs later" },
                { title: "Digital ID Card Wallet", desc: "Secure contactless student verification" }
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/50">
                    <FiCheck className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase tracking-tight">{f.title}</h4>
                    <p className="text-sm text-indigo-200">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/contact')}
                className="flex items-center gap-3 bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black text-lg transition-all hover:bg-indigo-50 hover:scale-105 active:scale-95 shadow-xl shadow-indigo-900/50"
              >
                <FiDownloadCloud className="text-xl" />
                White-Label My App
              </button>
              <button className="flex items-center gap-3 bg-indigo-950/50 text-white border border-indigo-500/30 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:bg-indigo-900/80 backdrop-blur-sm">
                View Mobile Features
              </button>
            </div>
          </div>

          <div className="relative flex justify-center">
            {/* Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/30 rounded-full blur-[100px]"></div>

            {/* Phone Mockup with CSS */}
            <div className="w-[320px] h-[650px] bg-gray-900 rounded-[60px] border-[14px] border-gray-800 shadow-2xl relative overflow-hidden z-10 transform rotate-[-6deg] hover:rotate-0 transition-transform duration-700">
              {/* Dynamic Island */}
              <div className="absolute top-0 w-full h-8 flex justify-center z-20">
                <div className="w-32 h-7 bg-black rounded-b-3xl flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-800"></div>
                  <div className="w-12 h-1.5 rounded-full bg-gray-900/50"></div>
                </div>
              </div>

              {/* Screen Content */}
              <div className="w-full h-full bg-gray-50 pt-12 pb-4 overflow-hidden flex flex-col relative">
                {/* App Header */}
                <div className="px-6 flex justify-between items-center mb-6">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Welcome</p>
                    <h3 className="text-xl font-black text-gray-900">Dr. Ibrahim</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white shadow-sm">
                    <span className="font-bold text-indigo-600">AI</span>
                  </div>
                </div>

                {/* Card */}
                <div className="mx-6 p-6 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-[32px] text-white shadow-xl shadow-indigo-100 mb-8 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Collection</p>
                      <h2 className="text-3xl font-black">₦1,250,580</h2>
                    </div>
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                      <FiTrendingUp className="text-white" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span>Target Goal</span>
                      <span>85%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-[85%] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mx-6 mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Dash Widgets</h4>
                    <span className="text-[10px] font-bold text-indigo-600">Edit</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { icon: <FiCheck />, label: "Fees", color: "indigo" },
                      { icon: <FiActivity />, label: "Result", color: "blue" },
                      { icon: <FiGlobe />, label: "CBT", color: "emerald" },
                      { icon: <FiSmartphone />, label: "Notify", color: "amber" }
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm text-white bg-indigo-600`}>
                          {item.icon}
                        </div>
                        <span className="text-[9px] font-black text-gray-500 uppercase">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity List */}
                <div className="flex-1 bg-white rounded-t-[40px] p-8 shadow-[0_-20px_40px_rgba(0,0,0,0.04)] mt-auto">
                  <div className="w-10 h-1 bg-gray-100 rounded-full mx-auto mb-8"></div>
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Live Monitor</h4>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-bold text-gray-400">Updating</span>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {[
                      { name: "Fatima A.", act: "Fee Payment", time: "2m", status: "+₦45k" },
                      { name: "Usman B.", act: "CBT Login", time: "5m", status: "Active" },
                      { name: "Admin", act: "Result Gen", time: "12m", status: "Done" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 group cursor-pointer">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                          {item.name[0]}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-black text-gray-900 text-xs">{item.name}</h5>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{item.act}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-black text-indigo-600">{item.status}</p>
                          <p className="text-[9px] font-bold text-gray-300">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Back Phone Peer */}
            <div className="absolute top-10 -right-12 w-[300px] h-[600px] bg-gray-900 rounded-[50px] opacity-30 transform rotate-[10deg] -z-10 blur-[2px]"></div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-black text-gray-900 uppercase italic">Frequently Asked</h2>
            <p className="text-gray-500 font-medium tracking-widest uppercase text-xs">Got questions? We have answers.</p>
          </div>
          <div className="space-y-4">
            {[
              { q: "Is my school's data secure?", a: "Yes. Every record is encrypted using 256-bit SSL and synced daily to military-grade Amazon S3 buckets across multiple regions." },
              { q: "Do parents need to pay for the mobile app?", a: "No. The parent app is free to download for all your students' guardians. You can also opt for a premium white-labeled version." },
              { q: "Can we use this for CBT exams offline?", a: "Absolutely. Our CBT infrastructure supports a 'Hybrid Local Hub' that works without internet, syncing results only when you go online." },
              { q: "What happens if we want to cancel?", a: "You can export your data at any time. We believe in your freedom, which is why we don't have long-term lock-in contracts." }
            ].map((faq, i) => (
              <details key={i} className="group bg-white p-8 rounded-[32px] border border-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-shadow">
                <summary className="list-none flex justify-between items-center font-black text-gray-900 text-lg">
                  {faq.q}
                  <FiPlusCircle className="group-open:rotate-45 transition-transform text-indigo-600" />
                </summary>
                <div className="pt-6 text-gray-500 font-medium leading-relaxed border-t border-gray-50 mt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-indigo-600 rounded-[60px] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-3xl shadow-indigo-200">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 space-y-8">
              <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight">
                Join the Digital <br className="hidden md:block" />
                Revolution Today.
              </h2>
              <p className="text-indigo-100 text-xl font-medium max-w-2xl mx-auto">
                Stop managing files. Start managing success. Get your institutional dashboard up and running in less than 15 minutes.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6">
                <button
                  onClick={handleDemoLogin}
                  className="bg-white text-indigo-600 px-10 py-5 rounded-[24px] font-black text-xl shadow-2xl hover:bg-gray-50 transition-all active:scale-95"
                >
                  Claim My Free Demo
                </button>
                <Link to="/contact" className="bg-indigo-700 text-white px-10 py-5 rounded-[24px] font-black text-xl hover:bg-indigo-800 transition-all shadow-xl">
                  Talk to Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black">EA</div>
              <span className="text-2xl font-black tracking-tighter text-gray-900">EduTechAI</span>
            </div>
            <p className="text-gray-400 font-medium leading-relaxed">
              Next-generation institutional intelligence for modern schools across Africa and beyond.
            </p>
            <div className="flex gap-4">
              {[FiGlobe, FiSmartphone, FiShield].map((Icon, i) => (
                <div key={i} className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-600 transition-all cursor-pointer">
                  <Icon />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-gray-900 font-black uppercase tracking-widest text-xs mb-8">Platform</h4>
            <ul className="space-y-4 text-gray-500 font-medium text-sm">
              <li><a href="#" className="hover:text-indigo-600 transition-colors">Infrastructure</a></li>
              <li><a href="#" className="hover:text-indigo-600 transition-colors">CBT Engine</a></li>
              <li><a href="#" className="hover:text-indigo-600 transition-colors">Mobile App</a></li>
              <li><a href="#" className="hover:text-indigo-600 transition-colors">Security</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 font-black uppercase tracking-widest text-xs mb-8">Resources</h4>
            <ul className="space-y-4 text-gray-500 font-medium text-sm">
              <li><a href="#" className="hover:text-indigo-600 transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-indigo-600 transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-indigo-600 transition-colors">Developer API</a></li>
              <li><a href="#" className="hover:text-indigo-600 transition-colors">Status</a></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-gray-900 font-black uppercase tracking-widest text-xs mb-8">Newsletter</h4>
            <p className="text-xs text-gray-400 font-medium">Get the latest on AI in education.</p>
            <div className="relative">
              <input
                type="email"
                placeholder="name@email.com"
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-6 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all pr-12"
              />
              <button className="absolute right-2 top-2 bottom-2 bg-indigo-600 text-white px-4 rounded-xl hover:bg-indigo-700 transition-colors">
                <FiArrowRight />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-24 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-gray-400 text-xs font-bold font-inter tracking-widest uppercase">© 2026 EduTechAI Enterprise. All rights reserved.</p>
          <div className="flex gap-10 text-[10px] font-black text-gray-300 uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-600">Privacy</a>
            <a href="#" className="hover:text-indigo-600">Terms</a>
            <a href="#" className="hover:text-indigo-600">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, color }) => {
  const colors = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', hover: 'hover:bg-indigo-600', fill: 'bg-indigo-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', hover: 'hover:bg-blue-600', fill: 'bg-blue-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', hover: 'hover:bg-amber-600', fill: 'bg-amber-500' }
  };

  const c = colors[color] || colors.indigo;

  return (
    <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-32 h-32 ${c.fill} opacity-[0.03] rounded-bl-[100px] transition-transform group-hover:scale-150`}></div>
      <div className={`w-16 h-16 ${c.bg} ${c.text} rounded-[24px] mb-8 flex items-center justify-center text-2xl group-hover:${c.hover} group-hover:text-white transition-all duration-300 shadow-sm`}>
        {icon}
      </div>
      <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">{title}</h3>
      <p className="text-gray-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );
};

const PricingCard = ({ tier, price, period, desc, features, highlighted, onAction }) => (
  <div className={`p-10 rounded-[48px] border-2 transition-all duration-500 relative flex flex-col h-full ${highlighted ? 'border-indigo-600 bg-gray-900 text-white shadow-3xl shadow-indigo-900/30 -translate-y-4' : 'border-gray-100 bg-white text-gray-900 hover:border-indigo-200 hover:shadow-xl'}`}>
    {highlighted && (
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg">
        Most Popular
      </div>
    )}
    <h3 className={`text-xl font-black uppercase tracking-widest mb-2 ${highlighted ? 'text-indigo-400' : 'text-indigo-600'}`}>{tier}</h3>
    <div className="flex items-baseline gap-2 mb-4">
      <span className="text-5xl font-black tracking-tighter">{price}</span>
      <span className={`text-sm font-bold ${highlighted ? 'text-gray-400' : 'text-gray-400'}`}>{period}</span>
    </div>
    <p className={`text-sm font-medium mb-8 leading-relaxed ${highlighted ? 'text-gray-300' : 'text-gray-500'}`}>{desc}</p>
    <div className={`h-px w-full mb-8 ${highlighted ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
    <ul className="space-y-4 mb-10 flex-1">
      {features.map((f, i) => (
        <li key={i} className="flex items-start gap-3 text-sm font-bold">
          <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${highlighted ? 'bg-indigo-900 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
            <FiCheck size={12} />
          </div>
          <span className={highlighted ? 'text-gray-200' : 'text-gray-700'}>{f}</span>
        </li>
      ))}
    </ul>
    <button
      onClick={onAction}
      className={`w-full py-4 rounded-2xl font-black transition-all active:scale-95 ${highlighted ? 'bg-white text-indigo-900 hover:bg-indigo-50 shadow-xl' : 'bg-gray-100 text-gray-900 hover:bg-gray-200 hover:text-black'}`}
    >
      Get Started
    </button>
  </div>
);

export default MarketingHome;
