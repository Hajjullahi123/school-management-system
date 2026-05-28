import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiArrowRight, 
  FiMapPin, 
  FiPhone, 
  FiMail, 
  FiMenu, 
  FiX, 
  FiAward, 
  FiUsers, 
  FiBookOpen, 
  FiActivity, 
  FiCheckCircle, 
  FiChevronRight, 
  FiSend, 
  FiClock, 
  FiStar,
  FiVolume2,
  FiFacebook,
  FiInstagram,
  FiTwitter
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL } from '../../config';

const ThemeModern = ({ school, getLogoUrl }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    grade: '',
    message: ''
  });
  
  const [activeAboutTab, setActiveAboutTab] = useState('profile');
  const [aboutSlideIndex, setAboutSlideIndex] = useState(0);

  const heroImages = school.GalleryImage?.length > 0
    ? school.GalleryImage.map(img => img.imageUrl.startsWith('http') ? img.imageUrl : `${API_BASE_URL}${img.imageUrl.startsWith('/') ? '' : '/'}${img.imageUrl}`)
    : ['https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop'];

  useEffect(() => {
    if (heroImages.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroImages.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [heroImages.length]);

  useEffect(() => {
    if (heroImages.length > 1) {
      const timer = setInterval(() => {
        setAboutSlideIndex((prev) => (prev + 1) % heroImages.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [heroImages.length]);

  const primaryColor = school.primaryColor || '#4f46e5';
  const secondaryColor = school.secondaryColor || '#6366f1';

  // Helper to darken a hex color
  const darkenColor = (hex, percent) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * percent));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent));
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Helper to convert hex to RGBA
  const hexToRgba = (hex, alpha) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16);
    const g = ((num >> 8) & 0x00FF);
    const b = (num & 0x0000FF);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    setFormData({ name: '', email: '', phone: '', grade: '', message: '' });
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    setIsSubscribed(true);
    setNewsletterEmail('');
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex flex-col font-sans" style={{ '--theme-color': primaryColor }}>
      <style>{`
        ::selection {
          background-color: ${hexToRgba(primaryColor, 0.15)} !important;
          color: ${primaryColor} !important;
        }
        @keyframes ticker {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .animate-ticker {
          display: inline-flex;
          white-space: nowrap;
          animation: ticker 30s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
      
      {/* Dynamic Announcement Ticker Bar */}
      <div className="text-white py-2.5 overflow-hidden relative z-50 border-b border-white/10 shadow-sm flex items-center" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${darkenColor(primaryColor, 0.15)})` }}>
        <div className="absolute left-0 bg-black/30 backdrop-blur-sm px-4 py-2.5 h-full z-10 flex items-center gap-2 border-r border-white/10 select-none">
          <FiVolume2 className="w-4 h-4 animate-bounce" />
          <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">Announcements</span>
        </div>
        <div className="w-full overflow-hidden whitespace-nowrap flex items-center relative pl-36">
          <div className="animate-ticker text-xs font-semibold tracking-wide">
            <span className="mx-6">📣 Open Admissions for Next Academic Session is officially live!</span>
            <span className="opacity-40">•</span>
            <span className="mx-6">🏫 Join a Christ-centered secondary school focused on godliness and academic distinction</span>
            <span className="opacity-40">•</span>
            <span className="mx-6">🚀 Blended Curriculums: coding, robotics, arts, and dynamic science laboratories</span>
            <span className="opacity-40">•</span>
            <span className="mx-6">📞 Inquiries? Reach us at {school.phone || 'our admin line'} or email {school.email || 'admissions office'}</span>
            
            {/* Duplicate for infinite loop */}
            <span className="mx-6">📣 Open Admissions for Next Academic Session is officially live!</span>
            <span className="opacity-40">•</span>
            <span className="mx-6">🏫 Join a Christ-centered secondary school focused on godliness and academic distinction</span>
            <span className="opacity-40">•</span>
            <span className="mx-6">🚀 Blended Curriculums: coding, robotics, arts, and dynamic science laboratories</span>
            <span className="opacity-40">•</span>
            <span className="mx-6">📞 Inquiries? Reach us at {school.phone || 'our admin line'} or email {school.email || 'admissions office'}</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 w-full z-45 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
              {school.logoUrl ? (
                <>
                  <img src={getLogoUrl(school.logoUrl)} alt="" className="w-full h-full object-contain p-1" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                  <span className="text-2xl font-black text-gray-300 hidden items-center justify-center w-full h-full">{school.name.charAt(0)}</span>
                </>
              ) : (
                <span className="text-2xl font-black text-gray-300">{school.name.charAt(0)}</span>
              )}
            </div>
            <span className="text-xl md:text-2xl font-black tracking-tight text-gray-900 hidden lg:block">{school.name}</span>
          </div>
          
          <nav className="flex items-center gap-2 md:gap-8">
            <div className="hidden md:flex items-center gap-6">
              {school.customPages?.map(page => (
                <Link key={page.slug} to={`/${school.slug}/page/${page.slug}`} className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
                  {page.title}
                </Link>
              ))}
            </div>
            <Link to={`/${school.slug}/login`} className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-black/10" style={{ backgroundColor: primaryColor }}>
              Portal Login <FiArrowRight />
            </Link>
            <button 
              className="md:hidden p-2 text-gray-900"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </nav>
        </div>
        
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-100 shadow-lg px-6 py-4 flex flex-col gap-4">
            {school.customPages?.map(page => (
              <Link 
                key={page.slug} 
                to={`/${school.slug}/page/${page.slug}`} 
                className="text-lg font-bold text-gray-700 hover:text-[var(--theme-color)] transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {page.title}
              </Link>
            ))}
            {school.customPages?.length > 0 && <div className="h-px bg-gray-100 my-2"></div>}
            <Link 
              to={`/${school.slug}/login`} 
              className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full text-white font-bold transition-all shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              Portal Login <FiArrowRight />
            </Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 flex-1 min-h-[90vh] flex items-center justify-center overflow-hidden bg-black">
        {/* Background Slides */}
        {heroImages.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-40' : 'opacity-0'}`}
          >
            <img src={img} alt="Hero" className="w-full h-full object-cover" />
          </div>
        ))}
        
        {/* Modern Elegant Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}></div>

        {/* Overlay Content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto pt-16 pb-36 md:pt-20 md:pb-48">
          <span className="inline-block py-1.5 px-4 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-bold tracking-widest uppercase mb-6 border border-white/20 animate-pulse">
            ✨ {school.motto || 'Excellence in Education'}
          </span>
          <h1 className="text-4xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-[1.1] drop-shadow-md">
            {school.welcomeTitle || `Welcome to ${school.name}`}
          </h1>
          <p className="text-base md:text-2xl text-gray-200 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
            {school.welcomeMessage || 'Discover a comprehensive, moral-driven secondary education preparing students for global success through blended academic curricula.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={`/${school.slug}/login`} className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-black text-lg hover:scale-105 transition-transform shadow-xl hover:bg-slate-100">
              Access Student Portal
            </Link>
            <a href="#admission-process" className="w-full sm:w-auto px-8 py-4 rounded-full bg-black/40 backdrop-blur-md border border-white/30 text-white font-bold text-lg hover:bg-black/60 transition-colors">
              Apply Now
            </a>
          </div>
        </div>

        {/* Slide Indicators */}
        {heroImages.length > 1 && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-2">
            {heroImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-12 h-1.5 rounded-full transition-all ${idx === currentSlide ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Floating Stat Grid Overlap */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 -mt-16 md:-mt-20 w-full mb-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Stat 1 */}
          <div className="bg-white rounded-[32px] p-6 shadow-xl border border-gray-100 flex flex-col items-center text-center transform hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ backgroundColor: hexToRgba(primaryColor, 0.1), color: primaryColor }}>
              <FiBookOpen className="w-6 h-6" />
            </div>
            <span className="text-3xl md:text-4xl font-black text-gray-900 group-hover:scale-105 transition-transform" style={{ color: primaryColor }}>100%</span>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-2">Graduation Success</span>
          </div>

          {/* Stat 2 */}
          <div className="bg-white rounded-[32px] p-6 shadow-xl border border-gray-100 flex flex-col items-center text-center transform hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ backgroundColor: hexToRgba(primaryColor, 0.1), color: primaryColor }}>
              <FiUsers className="w-6 h-6" />
            </div>
            <span className="text-3xl md:text-4xl font-black text-gray-900 group-hover:scale-105 transition-transform" style={{ color: primaryColor }}>10:1</span>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-2">Student-Teacher Ratio</span>
          </div>

          {/* Stat 3 */}
          <div className="bg-white rounded-[32px] p-6 shadow-xl border border-gray-100 flex flex-col items-center text-center transform hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ backgroundColor: hexToRgba(primaryColor, 0.1), color: primaryColor }}>
              <FiActivity className="w-6 h-6" />
            </div>
            <span className="text-3xl md:text-4xl font-black text-gray-900 group-hover:scale-105 transition-transform" style={{ color: primaryColor }}>15+</span>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-2">Extracurricular Clubs</span>
          </div>

          {/* Stat 4 */}
          <div className="bg-white rounded-[32px] p-6 shadow-xl border border-gray-100 flex flex-col items-center text-center transform hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ backgroundColor: hexToRgba(primaryColor, 0.1), color: primaryColor }}>
              <FiAward className="w-6 h-6" />
            </div>
            <span className="text-3xl md:text-4xl font-black text-gray-900 group-hover:scale-105 transition-transform" style={{ color: primaryColor }}>100%</span>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-2">University Admittance</span>
          </div>

        </div>
      </section>

      {/* About Our School & Core Values */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left side: Accent container with dynamic switch */}
            <div className="relative flex flex-col gap-4">
              
              {/* Segmented Switch Controller */}
              <div className="flex justify-center mb-2">
                <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 shadow-inner border border-slate-200/40 select-none">
                  <button
                    onClick={() => setActiveAboutTab('profile')}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeAboutTab === 'profile' ? 'bg-white text-gray-900 shadow-sm scale-105' : 'text-gray-400 hover:text-gray-700'}`}
                  >
                    School Profile
                  </button>
                  <button
                    onClick={() => setActiveAboutTab('gallery')}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeAboutTab === 'gallery' ? 'bg-white text-gray-900 shadow-sm scale-105' : 'text-gray-400 hover:text-gray-700'}`}
                  >
                    Campus Gallery
                  </button>
                </div>
              </div>

              {activeAboutTab === 'profile' ? (
                <div className="relative bg-white rounded-[32px] overflow-hidden shadow-2xl border border-gray-100 p-8 min-h-[380px] md:min-h-[420px] flex flex-col justify-center transition-all duration-500 animate-fadeIn">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center border shadow-sm">
                      {school.logoUrl ? (
                        <img src={getLogoUrl(school.logoUrl)} alt="" className="w-10 h-10 object-contain" />
                      ) : (
                        <span className="text-2xl font-black text-gray-400">{school.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-black text-gray-900 text-lg">{school.name}</h3>
                      <p className="text-xs text-gray-400 tracking-wider font-bold uppercase mt-0.5">Institution of Excellence</p>
                    </div>
                  </div>
                  
                  {school.aboutUsText ? (
                    <div className="prose prose-slate max-w-none text-gray-600 text-sm leading-relaxed prose-headings:font-black text-left">
                      <ReactMarkdown>{school.aboutUsText}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 leading-relaxed text-left">
                      Providing a supportive and innovative environment where every student can achieve their full potential.
                      Our comprehensive college blends discipline, faith-based godliness, and technological innovation.
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative w-full h-[380px] md:h-[420px] rounded-[40px] overflow-hidden shadow-2xl border-[8px] border-white bg-slate-100 transition-all duration-500 animate-fadeIn group">
                  {heroImages.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`Campus Slide ${index + 1}`}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${index === aboutSlideIndex ? 'opacity-100' : 'opacity-0'}`}
                    />
                  ))}
                  
                  {/* Elegant Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-transparent opacity-80 mix-blend-multiply pointer-events-none"></div>
                  
                  {/* Decorative Brand Badge */}
                  {school.logoUrl && (
                    <div className="absolute bottom-6 left-6 p-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl transform group-hover:scale-105 transition-transform flex items-center gap-3 border border-gray-100">
                      <img src={getLogoUrl(school.logoUrl)} alt="" className="w-10 h-10 object-contain" onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                      <div className="text-left">
                        <h4 className="font-black text-gray-900 text-xs">{school.name}</h4>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Campus View</p>
                      </div>
                    </div>
                  )}

                  {/* Frame Accents just as basic page */}
                  <div className="absolute top-6 right-6 w-16 h-16 border-t-4 border-r-4 border-white/60 rounded-tr-2xl pointer-events-none"></div>
                  <div className="absolute bottom-6 right-6 w-16 h-16 border-b-4 border-r-4 border-white/60 rounded-br-2xl pointer-events-none"></div>
                </div>
              )}
            </div>

            {/* Right side: Core values checklist */}
            <div className="space-y-8">
              <div>
                <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4" style={{ backgroundColor: hexToRgba(primaryColor, 0.1), color: primaryColor }}>
                  Core Pillars
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                  Educational <span style={{ color: primaryColor }}>Foundation</span>
                </h2>
                <p className="text-gray-500 mt-4 leading-relaxed">
                  We blend high-calibre academics with deep moral character development to raise future-ready global leaders.
                </p>
              </div>

              <div className="space-y-6 w-full">
                
                {/* Pillar 1 */}
                <div className="flex gap-5 p-6 rounded-[24px] bg-blue-50/70 border border-blue-100/80 hover:bg-blue-50 hover:border-blue-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300 w-full group transform text-left">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-500 text-white shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                    <FiCheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-950 text-base md:text-lg">Expert Department & Faculty</h4>
                    <p className="text-sm text-gray-700 mt-2 leading-relaxed">Dedicated, certified educators delivering rigorous customized teaching tailored to standard curriculum goals.</p>
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="flex gap-5 p-6 rounded-[24px] bg-blue-50/70 border border-blue-100/80 hover:bg-blue-50 hover:border-blue-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300 w-full group transform text-left">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-500 text-white shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                    <FiCheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-950 text-base md:text-lg">State-of-the-Art Facilities</h4>
                    <p className="text-sm text-gray-700 mt-2 leading-relaxed">Modern classrooms, science/chemistry/physics laboratories, coding labs, and extensive sports facilities.</p>
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="flex gap-5 p-6 rounded-[24px] bg-blue-50/70 border border-blue-100/80 hover:bg-blue-50 hover:border-blue-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300 w-full group transform text-left">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-500 text-white shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                    <FiCheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-950 text-base md:text-lg">Vocational & Tech Blending</h4>
                    <p className="text-sm text-gray-700 mt-2 leading-relaxed">Preparing students directly for university and active entrepreneurship through robotics, coding, and arts programs.</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials & Academic Honors Section */}
      <section className="py-24 bg-white relative overflow-hidden border-t border-gray-100">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle, ${primaryColor} 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}></div>
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4" style={{ backgroundColor: hexToRgba(primaryColor, 0.1), color: primaryColor }}>
              Praise & Results
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">Academic Excellence</h2>
            <p className="text-gray-500 mt-3 text-lg">What our community says about their experience and our outstanding results.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-50/50 p-8 rounded-3xl border border-gray-100 relative shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-1 text-amber-500 mb-4">
                <FiStar className="fill-amber-500" /><FiStar className="fill-amber-500" /><FiStar className="fill-amber-500" /><FiStar className="fill-amber-500" /><FiStar className="fill-amber-500" />
              </div>
              <p className="text-gray-600 italic leading-relaxed text-base">
                "The academic preparation my child received here is second to none. Not only did they score straight A's in their external examinations, but the character building and discipline set them up for university success."
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 font-bold flex items-center justify-center text-sm text-slate-700" style={{ backgroundColor: hexToRgba(primaryColor, 0.15), color: primaryColor }}>
                  MA
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Mrs. Maryam Alabi</h4>
                  <p className="text-xs text-gray-400">Parent since 2021</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 p-8 rounded-3xl border border-gray-100 relative shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-1 text-amber-500 mb-4">
                <FiStar className="fill-amber-500" /><FiStar className="fill-amber-500" /><FiStar className="fill-amber-500" /><FiStar className="fill-amber-500" /><FiStar className="fill-amber-500" />
              </div>
              <p className="text-gray-600 italic leading-relaxed text-base">
                "The coding and robotics curriculum is incredibly hands-on. My son is already building his own simple mobile applications and feels excited to learn science and math every single day."
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 font-bold flex items-center justify-center text-sm text-slate-700" style={{ backgroundColor: hexToRgba(primaryColor, 0.15), color: primaryColor }}>
                  OI
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Dr. Olanrewaju Ibrahim</h4>
                  <p className="text-xs text-gray-400">Parent of SSS-2 Student</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Admissions Roadmap & Request Form */}
      <section id="admission-process" className="py-24 bg-[#f4f6fa] border-t border-b border-gray-200 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-stretch">
            
            {/* Left Column: Admission Steps */}
            <div className="flex flex-col justify-center space-y-8">
              <div>
                <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4" style={{ backgroundColor: hexToRgba(primaryColor, 0.1), color: primaryColor }}>
                  Join Our Family
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                  Admissions <span style={{ color: primaryColor }}>Process</span>
                </h2>
                <p className="text-gray-500 mt-4 max-w-lg leading-relaxed">
                  We are delighted you're considering {school.name} for your child's education. Our admissions process is designed to be streamlined, welcoming, and thorough:
                </p>
              </div>

              {/* Step Roadmap Timeline */}
              <div className="relative border-l-2 pl-6 ml-2 space-y-6" style={{ borderColor: hexToRgba(primaryColor, 0.2) }}>
                {/* Step 1 */}
                <div className="relative">
                  <div className="absolute -left-[35px] w-6 h-6 rounded-full bg-white border-4 flex items-center justify-center shadow-sm" style={{ borderColor: primaryColor }}></div>
                  <h4 className="font-bold text-gray-900 text-base">Step 1: Submit Inquiry</h4>
                  <p className="text-sm text-gray-500 mt-1">Fill out the brief enquiry form on the right to notify our admissions office.</p>
                </div>
                {/* Step 2 */}
                <div className="relative">
                  <div className="absolute -left-[35px] w-6 h-6 rounded-full bg-white border-4 flex items-center justify-center shadow-sm" style={{ borderColor: primaryColor }}></div>
                  <h4 className="font-bold text-gray-900 text-base">Step 2: Entrance Assessment</h4>
                  <p className="text-sm text-gray-500 mt-1">Schedule a physical tour, complete basic assessment, and meet our faculty counselors.</p>
                </div>
                {/* Step 3 */}
                <div className="relative">
                  <div className="absolute -left-[35px] w-6 h-6 rounded-full bg-white border-4 flex items-center justify-center shadow-sm" style={{ borderColor: primaryColor }}></div>
                  <h4 className="font-bold text-gray-900 text-base">Step 3: Registration</h4>
                  <p className="text-sm text-gray-500 mt-1">Submit enrollment documents, complete online portal access setup, and start resumption!</p>
                </div>
              </div>

              {school.admissionGuideFileUrl && (
                <div>
                  <a href={school.admissionGuideFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold transition-all hover:translate-x-1" style={{ color: primaryColor }}>
                    Download Admissions Guide <FiArrowRight />
                  </a>
                </div>
              )}
            </div>

            {/* Right Column: Request Info Form */}
            <div className="bg-white p-8 rounded-[32px] shadow-xl border border-gray-100 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Request Admission Info</h3>
                <p className="text-sm text-gray-500 mb-6">Fill in details and our desk will contact you within 24 hours.</p>
                
                {isSubmitted ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
                    <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl">
                      ✓
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">Request Submitted!</h4>
                    <p className="text-sm text-gray-500 max-w-sm">
                      Thank you for your interest. A representative from {school.name} will contact you at your email or phone number shortly.
                    </p>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="text-xs font-bold underline"
                      style={{ color: primaryColor }}
                    >
                      Submit another request
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Parent Name</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 transition-all text-sm focus:border-transparent"
                        style={{ '--tw-ring-color': primaryColor }}
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>
                        <input
                          type="email"
                          required
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 transition-all text-sm focus:border-transparent"
                          style={{ '--tw-ring-color': primaryColor }}
                          placeholder="johndoe@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</label>
                        <input
                          type="tel"
                          required
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 transition-all text-sm focus:border-transparent"
                          style={{ '--tw-ring-color': primaryColor }}
                          placeholder="+234..."
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Grade Level</label>
                      <select
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 transition-all text-sm focus:border-transparent"
                        style={{ '--tw-ring-color': primaryColor }}
                        value={formData.grade}
                        onChange={(e) => setFormData({...formData, grade: e.target.value})}
                      >
                        <option value="">Select Target Grade</option>
                        <option value="JSS 1">Junior JSS 1</option>
                        <option value="JSS 2">Junior JSS 2</option>
                        <option value="JSS 3">Junior JSS 3</option>
                        <option value="SSS 1">Senior SSS 1</option>
                        <option value="SSS 2">Senior SSS 2</option>
                        <option value="SSS 3">Senior SSS 3</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Message</label>
                      <textarea
                        rows="3"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 transition-all text-sm focus:border-transparent"
                        style={{ '--tw-ring-color': primaryColor }}
                        placeholder="Any questions or special notes..."
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 rounded-xl text-white font-black text-base shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <FiSend /> Send Admission Inquiry
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Subscription */}
      <section className="py-16 bg-[#f4f6fa]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${darkenColor(primaryColor, 0.15)})` }}>
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
              backgroundSize: '20px 20px'
            }}></div>
            
            <div className="relative z-10 md:max-w-md text-left">
              <h3 className="text-2xl md:text-3xl font-black mb-2 text-white">Stay Connected</h3>
              <p className="text-white/80 text-sm">Subscribe to our newsletter for school updates, upcoming event announcements, and academic calendars.</p>
            </div>

            <div className="relative z-10 w-full md:w-auto shrink-0">
              {isSubscribed ? (
                <span className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-xl border border-white/20 text-white font-bold block text-center animate-fadeIn">✓ Subscribed Successfully!</span>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    className="px-4 py-3 rounded-full text-black text-sm focus:outline-none w-full sm:w-64"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                  />
                  <button type="submit" className="bg-white px-6 py-3 rounded-full text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-lg whitespace-nowrap" style={{ color: primaryColor }}>
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section & Real Map */}
      <section className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            
            {/* Left side: Contact Cards */}
            <div className="space-y-6 flex flex-col justify-center text-left">
              <div>
                <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4" style={{ backgroundColor: hexToRgba(primaryColor, 0.1), color: primaryColor }}>
                  Get in Touch
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">Contact Us</h2>
                <p className="text-gray-500 mt-2">Reach out directly with any questions or visit us physically during office hours.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {school.address && (
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
                    <FiMapPin className="w-6 h-6 mb-3" style={{ color: primaryColor }} />
                    <h4 className="font-bold text-gray-900 text-sm mb-1">Our Campus</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{school.address}</p>
                  </div>
                )}
                {school.phone && (
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
                    <FiPhone className="w-6 h-6 mb-3" style={{ color: primaryColor }} />
                    <h4 className="font-bold text-gray-900 text-sm mb-1">Call Directory</h4>
                    <p className="text-xs text-gray-500 leading-relaxed font-mono font-semibold">{school.phone}</p>
                  </div>
                )}
                {school.email && (
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
                    <FiMail className="w-6 h-6 mb-3" style={{ color: primaryColor }} />
                    <h4 className="font-bold text-gray-900 text-sm mb-1">Electronic Mail</h4>
                    <p className="text-xs text-gray-500 leading-relaxed break-words">{school.email}</p>
                  </div>
                )}
                {school.openingHours && (
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
                    <FiClock className="w-6 h-6 mb-3" style={{ color: primaryColor }} />
                    <h4 className="font-bold text-gray-900 text-sm mb-1">Office Hours</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{school.openingHours}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Real Google Map Iframe */}
            <div className="rounded-[32px] overflow-hidden shadow-lg border border-gray-100 h-96 md:h-[420px]">
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(school.address || school.name)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                title="School Location Map"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-16 text-slate-400">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-left mb-12">
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-800">
                  {school.logoUrl ? (
                    <img src={getLogoUrl(school.logoUrl)} alt="" className="w-6 h-6 object-contain" />
                  ) : (
                    <span className="text-sm font-black text-slate-600">{school.name.charAt(0)}</span>
                  )}
                </div>
                <span className="text-lg font-black tracking-tighter text-white">{school.name}</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Empowering the next generation through academic excellence, moral godliness, and vocational innovation.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-6">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <Link to={`/${school.slug}/login`} className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                    <FiChevronRight className="transition-transform group-hover:translate-x-1" /> Student Portal
                  </Link>
                </li>
                <li>
                  <a href="#admission-process" className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                    <FiChevronRight className="transition-transform group-hover:translate-x-1" /> Admissions Info
                  </a>
                </li>
                {school.eLibraryUrl ? (
                  <li>
                    <a href={school.eLibraryUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                      <FiChevronRight className="transition-transform group-hover:translate-x-1" /> E-Library Hub
                    </a>
                  </li>
                ) : (
                  <li>
                    <Link to={`/${school.slug}/login`} className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                      <FiChevronRight className="transition-transform group-hover:translate-x-1" /> Virtual Learning
                    </Link>
                  </li>
                )}
                {school.alumniNetworkUrl ? (
                  <li>
                    <a href={school.alumniNetworkUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                      <FiChevronRight className="transition-transform group-hover:translate-x-1" /> Alumni Relations
                    </a>
                  </li>
                ) : (
                  <li>
                    <a href="#admission-process" className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                      <FiChevronRight className="transition-transform group-hover:translate-x-1" /> Join Our Community
                    </a>
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-6">Documents</h4>
              <ul className="space-y-3">
                {school.brochureFileUrl ? (
                  <li>
                    <a href={school.brochureFileUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                      <FiChevronRight className="transition-transform group-hover:translate-x-1" /> School Prospectus
                    </a>
                  </li>
                ) : (
                  <li>
                    <a href="#admission-process" className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 group" onClick={(e) => {
                      const el = document.getElementById('admission-process');
                      if (el) {
                        e.preventDefault();
                        el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}>
                      <FiChevronRight className="transition-transform group-hover:translate-x-1" /> Request Prospectus (PDF)
                    </a>
                  </li>
                )}
                {school.admissionGuideFileUrl ? (
                  <li>
                    <a href={school.admissionGuideFileUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                      <FiChevronRight className="transition-transform group-hover:translate-x-1" /> Admissions Policy
                    </a>
                  </li>
                ) : (
                  <li>
                    <a href="#admission-process" className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 group" onClick={(e) => {
                      const el = document.getElementById('admission-process');
                      if (el) {
                        e.preventDefault();
                        el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}>
                      <FiChevronRight className="transition-transform group-hover:translate-x-1" /> Admissions Handbook
                    </a>
                  </li>
                )}
                <li>
                  <a href="#admission-process" className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                    <FiChevronRight className="transition-transform group-hover:translate-x-1" /> Curriculum Guide
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-6">Follow Us</h4>
              <div className="flex flex-wrap gap-3">
                {school.facebookUrl ? (
                  <a href={school.facebookUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-[var(--theme-color)] hover:text-white transition-all flex items-center justify-center text-lg border border-slate-800" style={{ '--theme-color': primaryColor }} title="Facebook">
                    <FiFacebook />
                  </a>
                ) : (
                  <a href={`https://facebook.com/search/top/?q=${encodeURIComponent(school.name)}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center text-lg border border-slate-800" title="Facebook Page">
                    <FiFacebook />
                  </a>
                )}
                {school.instagramUrl ? (
                  <a href={school.instagramUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-[var(--theme-color)] hover:text-white transition-all flex items-center justify-center text-lg border border-slate-800" style={{ '--theme-color': primaryColor }} title="Instagram">
                    <FiInstagram />
                  </a>
                ) : (
                  <a href={`https://instagram.com/${school.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-pink-600 hover:text-white transition-all flex items-center justify-center text-lg border border-slate-800" title="Instagram Profile">
                    <FiInstagram />
                  </a>
                )}
                {school.whatsappUrl ? (
                  <a href={school.whatsappUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-green-600 hover:text-white transition-all flex items-center justify-center text-lg border border-slate-800" title="WhatsApp">
                    <FiVolume2 />
                  </a>
                ) : (
                  <a href={`https://wa.me/${school.phone ? school.phone.replace(/[^0-9]/g, '') : ''}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-green-600 hover:text-white transition-all flex items-center justify-center text-lg border border-slate-800" title="WhatsApp Chat">
                    <FiPhone />
                  </a>
                )}
                <a href={`mailto:${school.email || ''}`} className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center text-lg border border-slate-800" title="Email Us">
                  <FiMail />
                </a>
              </div>
            </div>

          </div>

          <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">© {new Date().getFullYear()} {school.name}. All rights reserved.</p>
            <p className="text-xs text-slate-500 font-medium">Powered by <span className="font-black text-white">EduTechAI Platform</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ThemeModern;
