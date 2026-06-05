import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, BookOpen, Clock, Settings, Headphones, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const bgImages = [
  '/images/bg-school-1.png',
  '/images/bg-school-2.png',
  '/images/bg-school-3.png'
];

const HomePage = () => {
  const [currentBg, setCurrentBg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length);
    }, 5000); // switch every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-2 pb-20 lg:pt-4 lg:pb-28 overflow-hidden">
        {/* Animated Background Images */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence>
            <motion.div
              key={currentBg}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${bgImages[currentBg]})` }}
            />
          </AnimatePresence>
          {/* Dark overlay to ensure text is readable */}
          <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-[2px]"></div>
        </div>

        <div className="section-container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left z-10 relative bg-slate-800/60 backdrop-blur-md border border-slate-700 p-4 md:p-10 rounded-3xl shadow-2xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight animate-fade-up">
                EduTech <br/> <span className="text-3xl md:text-4xl lg:text-5xl text-primary font-semibold">All-in-One School Management System + Free Website</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 mb-10 animate-fade-up delay-100 max-w-2xl mx-auto lg:mx-0 font-medium">
                One platform for results, fees, CBT, alumni, attendance, payroll, and ID cards. Plus a free professional website with your own domain when you subscribe.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-up delay-200">
                <Link to="/contact" className="btn-primary w-full sm:w-auto text-center shadow-lg hover:shadow-xl transition-shadow">
                  Request a Quote →
                </Link>
                <Link to="/services" className="btn-secondary w-full sm:w-auto text-center">
                  See All Services
                </Link>
              </div>
            </div>
            
            {/* Right Graphics */}
            <div className="relative z-0 mt-10 lg:mt-0 perspective-1000">
              <motion.div
                initial={{ opacity: 0, y: 50, rotateX: 5, rotateY: -10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0 }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                className="relative rounded-2xl shadow-2xl overflow-hidden border-4 border-white/50 bg-white"
              >
                <img src="/images/hero-dashboard.png" alt="School Management Dashboard" className="w-full h-auto block" />
              </motion.div>
              
              {/* Floating Widget */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 md:-bottom-10 md:-left-12 w-40 md:w-64 drop-shadow-2xl z-20"
              >
                <img src="/images/hero-floating-widget.png" alt="Analytics Widget" className="w-full h-auto rounded-xl bg-transparent" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Benefit Cards */}
      <section className="py-10 lg:py-16 bg-slate-900 border-t border-slate-800">
        <div className="section-container max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-700 text-primary rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <Monitor size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Free Website + Custom Domain</h3>
              <p className="text-slate-400 leading-relaxed">Every subscriber gets a beautiful, fully functional school website with their own domain name.</p>
            </div>
            <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-700 text-accent rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <Settings size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Simple, Powerful Management</h3>
              <p className="text-slate-400 leading-relaxed">Manage results, fees, attendance, and payroll from one dashboard – no training headaches.</p>
            </div>
            <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-700 text-secondary rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <Headphones size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">24/7 Support for Schools</h3>
              <p className="text-slate-400 leading-relaxed">Real humans, not bots. We help your staff get started and stay running smoothly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-10 lg:py-16 bg-slate-900 border-y border-slate-800">
        <div className="section-container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Everything you need to run your school</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">A sneak peek at our most popular features designed for Nigerian schools.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {[
              { title: 'Free Website + Custom Domain', desc: 'We build and host a professional school website.' },
              { title: 'Result Management', desc: 'Compute termly results, print report cards, generate transcripts.' },
              { title: 'Fee Management', desc: 'Set fee schedules, send automatic reminders, accept online payments.' },
              { title: 'Attendance Management', desc: 'Digital register – daily or per subject. Mark attendance via web or app.' },
            ].map((service, i) => (
              <div key={i} className="bg-primary p-8 rounded-2xl shadow-lg flex gap-5 items-start text-white hover:bg-blue-800 transition-colors transform hover:-translate-y-1 duration-300">
                <div className="bg-white/20 p-2 rounded-full shrink-0">
                  <CheckCircle2 className="text-white" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-xl mb-2">{service.title}</h4>
                  <p className="text-blue-100 leading-relaxed">{service.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/services" className="btn-secondary px-8 py-3 rounded-full text-lg font-medium">
              View All 8 Services
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24 relative overflow-hidden bg-slate-800">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-fixed opacity-40"
          style={{ backgroundImage: "url('/images/bg-how-it-works.png')" }}
        >
          <div className="absolute inset-0 bg-slate-800/50 backdrop-blur-md"></div>
        </div>

        <div className="section-container max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">How It Works</h2>
            <div className="w-16 h-1 bg-primary mx-auto mt-6 rounded-full"></div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="relative z-10 flex flex-col items-start p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors shadow-xl">
              <div className="font-heading font-black text-6xl text-white/10 mb-6">01</div>
              <h4 className="font-bold text-xl mb-3 text-white">Select Services</h4>
              <p className="text-slate-300 leading-relaxed">School visits website & selects services of interest.</p>
            </div>
            
            <div className="relative z-10 flex flex-col items-start p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors shadow-xl">
              <div className="font-heading font-black text-6xl text-white/10 mb-6">02</div>
              <h4 className="font-bold text-xl mb-3 text-white">Get in Touch</h4>
              <p className="text-slate-300 leading-relaxed">Send inquiry or book a free demo with our team.</p>
            </div>
            
            <div className="relative z-10 flex flex-col items-start p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors shadow-xl">
              <div className="font-heading font-black text-6xl text-white/10 mb-6">03</div>
              <h4 className="font-bold text-xl mb-3 text-white">Launch</h4>
              <p className="text-slate-300 leading-relaxed">We set up your system + free website, train your staff, and go live.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 bg-primary text-white">
        <div className="section-container text-center max-w-4xl mx-auto">
          <QuoteIcon className="mx-auto text-white/30 mb-8 w-16 h-16" />
          <h3 className="text-2xl md:text-3xl font-medium leading-relaxed mb-8">
            "The free website alone saved us thousands. Plus, fee collection is now 100% online – no more chasing parents."
          </h3>
          <p className="font-bold text-lg">Principal Adeyemi</p>
          <p className="text-white/80">ABC International School</p>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="py-10 lg:py-16 bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-primary rounded-3xl p-10 md:p-16 text-center text-white shadow-2xl relative overflow-hidden">
            {/* Decorative background circle */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to simplify your school operations?</h2>
              <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">Get a free custom domain website and modern management system when you subscribe.</p>
              <Link to="/contact" className="inline-block bg-white text-primary font-bold text-lg px-10 py-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                Request a Quote →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Simple Quote SVG Component
const QuoteIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
  </svg>
);

export default HomePage;
