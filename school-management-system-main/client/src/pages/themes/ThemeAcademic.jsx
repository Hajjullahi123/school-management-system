import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLogOut, FiMail, FiPhone, FiMapPin, FiArrowRight, FiFacebook, FiInstagram, FiMessageCircle, FiChevronDown, FiMenu, FiX, FiBookOpen, FiAward, FiUsers } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import FloatingContactWidget from '../../components/FloatingContactWidget';
import InteractiveTimelineWidget from '../../components/InteractiveTimelineWidget';
import TuitionEstimatorWidget from '../../components/TuitionEstimatorWidget';
import AccreditationsBand from '../../components/AccreditationsBand';
import FaqWidget from '../../components/FaqWidget';

const ThemeAcademic = ({ school, getLogoUrl, isSuperAdmin }) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);

  const primaryColor = school.primaryColor || '#1e3a8a'; // Deep blue fallback
  const secondaryColor = school.secondaryColor || '#0f172a'; // Navy fallback
  const accentColor = school.accentColor || '#b91c1c'; // Crimson fallback

  const heroImages = school?.GalleryImage?.length > 0
    ? school.GalleryImage.map(g => getLogoUrl(g.imageUrl))
    : [
        "/images/hero_library.png",
        "/images/hero_exterior.png"
      ];

  useEffect(() => {
    if (!heroImages || heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [heroImages?.length]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50" style={{ fontFamily: '"Merriweather", "Georgia", serif', '--school-primary': primaryColor, '--school-secondary': secondaryColor, '--school-accent': accentColor }}>
      
      {/* Utility Bar */}
      <div className="hidden md:block py-2 px-8 text-white text-xs font-sans tracking-wider" style={{ backgroundColor: secondaryColor }}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex gap-6 opacity-80">
            {school.phone && <span>{school.phone}</span>}
            {school.email && <span>{school.email}</span>}
          </div>
          <div className="flex gap-4">
            {!isSuperAdmin && (
              <>
                <Link to={`/${school.slug}/staff`} className="hover:text-white opacity-80 hover:opacity-100 transition-opacity">Faculty Directory</Link>
                <span className="opacity-40">|</span>
                <Link to="/alumni" className="hover:text-white opacity-80 hover:opacity-100 transition-opacity">Alumni Network</Link>
                <span className="opacity-40">|</span>
              </>
            )}
            <a href={school.eLibraryUrl || '#'} className="hover:text-white opacity-80 hover:opacity-100 transition-opacity">E-Library</a>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-white border-b-4 shadow-sm" style={{ borderColor: primaryColor }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 lg:py-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 flex items-center justify-center shrink-0">
              {school.logoUrl ? (
                <img src={getLogoUrl(school.logoUrl)} alt="Crest" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-full h-full border-2 flex items-center justify-center text-3xl font-bold" style={{ borderColor: primaryColor, color: primaryColor }}>
                  {school.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex flex-col border-l-2 pl-6 py-1 hidden sm:flex" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
              <span className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 leading-tight max-w-[250px] lg:max-w-none">{school.name}</span>
              {school.motto && (
                <span className="text-sm italic text-slate-600 mt-1 font-serif">{school.motto}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <nav className="hidden lg:flex items-center gap-6 font-sans font-semibold text-sm tracking-wide">
              {school.customPages?.map(page => (
                <Link key={page.slug} to={`/${school.slug}/page/${page.slug}`} className="text-slate-700 hover:text-black transition-colors">
                  {page.title}
                </Link>
              ))}
              {!isSuperAdmin && (
                <button onClick={() => setIsFaqModalOpen(true)} className="text-slate-700 hover:text-black transition-colors focus:outline-none">
                  Admissions & FAQ
                </button>
              )}
              <Link to={`/${school.slug}/gallery`} className="text-slate-700 hover:text-black transition-colors">
                Campus Life
              </Link>
            </nav>
            
            <button
              onClick={() => navigate(`/${school.slug}/login`)}
              className="hidden md:flex items-center gap-2 px-6 py-2.5 text-white font-sans font-bold shadow-md hover:shadow-lg transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              Sign In
            </button>
            <button 
              className="lg:hidden p-2 text-slate-900 border"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-stone-50 border-t border-stone-200 px-6 py-4 flex flex-col gap-4 font-sans font-semibold"
            >
              {!isSuperAdmin && (
                <>
                  <Link to={`/${school.slug}/staff`} className="text-slate-700 p-2" onClick={() => setIsMobileMenuOpen(false)}>Faculty Directory</Link>
                  <button onClick={() => { setIsFaqModalOpen(true); setIsMobileMenuOpen(false); }} className="text-left text-slate-700 p-2">Admissions & FAQ</button>
                  <Link to="/alumni" className="text-slate-700 p-2" onClick={() => setIsMobileMenuOpen(false)}>Alumni Network</Link>
                </>
              )}
              <button 
                onClick={() => navigate(`/${school.slug}/login`)}
                className="mt-2 py-3 text-center text-white font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                Portal Sign In
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative w-full h-[60vh] min-h-[500px] flex items-center">
        {/* Background Images */}
        <div className="absolute inset-0 z-0">
           {heroImages.map((img, index) => (
             <img
               key={index}
               src={img}
               alt="Campus"
               className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
             />
           ))}
           <div className="absolute inset-0 bg-slate-900/70"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl bg-white/95 backdrop-blur-sm p-8 md:p-12 shadow-2xl border-l-8"
            style={{ borderColor: accentColor }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-snug mb-6">
              {school.welcomeTitle || 'Tradition. Rigor. Excellence.'}
            </h1>
            <p className="text-lg text-slate-700 leading-relaxed mb-8 font-serif">
              {school.welcomeMessage || 'Dedicated to intellectual growth, critical thinking, and preparing students for the challenges of tomorrow.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 font-sans">
              <button
                onClick={() => navigate(`/${school.slug}/login`)}
                className="px-8 py-3 text-white font-bold text-sm tracking-wide uppercase transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                Access Portal
              </button>
              <button
                onClick={() => setIsFaqModalOpen(true)}
                className="px-8 py-3 bg-stone-100 text-slate-900 border border-stone-300 font-bold text-sm tracking-wide uppercase hover:bg-stone-200 transition-colors"
              >
                Learn More
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* At a Glance Section */}
      <section className="py-12 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-stone-200 font-sans">
            <div className="py-4 md:py-0">
              <FiBookOpen className="w-8 h-8 mx-auto mb-3" style={{ color: primaryColor }} />
              <h3 className="text-3xl font-black text-slate-900 mb-1 font-serif">Rigorous</h3>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Academic Curriculum</p>
            </div>
            <div className="py-4 md:py-0">
              <FiAward className="w-8 h-8 mx-auto mb-3" style={{ color: primaryColor }} />
              <h3 className="text-3xl font-black text-slate-900 mb-1 font-serif">100%</h3>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Excellence Driven</p>
            </div>
            <div className="py-4 md:py-0">
              <FiUsers className="w-8 h-8 mx-auto mb-3" style={{ color: primaryColor }} />
              <h3 className="text-3xl font-black text-slate-900 mb-1 font-serif">Distinguished</h3>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Faculty & Alumni</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Markdown Section */}
      {school.aboutUsText && (
        <section className="py-20 px-6 lg:px-8 bg-stone-50 relative z-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-6 mb-12">
              <div className="h-px bg-stone-300 flex-1"></div>
              <h2 className="text-3xl font-bold text-slate-900 uppercase tracking-widest font-sans">History & Overview</h2>
              <div className="h-px bg-stone-300 flex-1"></div>
            </div>
            <div className="prose prose-lg prose-slate max-w-none font-serif leading-loose" style={{ '--tw-prose-links': primaryColor }}>
              <ReactMarkdown>{school.aboutUsText}</ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      {/* Widgets Area - Structured Layout */}
      <section className="py-20 px-6 lg:px-8 bg-white border-t border-stone-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
             <div className="lg:col-span-7">
               <h3 className="text-2xl font-bold text-slate-900 mb-8 border-b-2 pb-4 inline-block font-sans" style={{ borderColor: accentColor }}>Academic Timeline</h3>
               <InteractiveTimelineWidget school={school} />
             </div>
             <div className="lg:col-span-5 bg-stone-50 p-8 border border-stone-200 shadow-sm">
               <h3 className="text-2xl font-bold text-slate-900 mb-8 border-b-2 pb-4 inline-block font-sans" style={{ borderColor: accentColor }}>Tuition Overview</h3>
               <TuitionEstimatorWidget school={school} />
             </div>
          </div>
        </div>
      </section>

      <AccreditationsBand primary={primaryColor} />

      {/* Footer */}
      <footer className="bg-slate-900 text-stone-300 pt-20 pb-10 border-t-8 mt-auto font-sans" style={{ borderColor: primaryColor }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white flex items-center justify-center p-1 shrink-0">
                   {school.logoUrl ? (
                     <img src={getLogoUrl(school.logoUrl)} alt="Crest" className="w-full h-full object-contain" />
                   ) : (
                     <span className="text-2xl font-bold text-slate-900 font-serif">{school.name.charAt(0)}</span>
                   )}
                </div>
                <h3 className="text-2xl font-bold text-white font-serif tracking-tight leading-tight max-w-xs">{school.name}</h3>
              </div>
              <p className="text-sm leading-relaxed max-w-md">
                An institution committed to the highest standards of scholarship, research, and moral integrity.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-6 border-b border-slate-700 pb-2 inline-block">Contact</h4>
              <ul className="space-y-4 text-sm">
                {school.address && <li className="flex gap-3"><FiMapPin className="shrink-0 mt-1 opacity-70" /><span>{school.address}</span></li>}
                {school.phone && <li className="flex gap-3"><FiPhone className="shrink-0 mt-1 opacity-70" /><a href={`tel:${school.phone}`} className="hover:text-white">{school.phone}</a></li>}
                {school.email && <li className="flex gap-3"><FiMail className="shrink-0 mt-1 opacity-70" /><a href={`mailto:${school.email}`} className="hover:text-white">{school.email}</a></li>}
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-6 border-b border-slate-700 pb-2 inline-block">Resources</h4>
              <ul className="space-y-3 text-sm font-medium">
                 <li><Link to={`/${school.slug}/login`} className="hover:text-white flex items-center gap-2"><FiArrowRight className="opacity-50" /> Portal Login</Link></li>
                 {!isSuperAdmin && (
                   <>
                     <li><Link to={`/${school.slug}/staff`} className="hover:text-white flex items-center gap-2"><FiArrowRight className="opacity-50" /> Faculty Directory</Link></li>
                     <li><Link to="/alumni" className="hover:text-white flex items-center gap-2"><FiArrowRight className="opacity-50" /> Alumni Network</Link></li>
                   </>
                 )}
                 {school.eLibraryUrl && <li><a href={school.eLibraryUrl} className="hover:text-white flex items-center gap-2"><FiArrowRight className="opacity-50" /> E-Library</a></li>}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs tracking-wider text-slate-500 uppercase">
             <p>&copy; {new Date().getFullYear()} {school.name}. All rights reserved.</p>
             <p>Platform provided by EduTechAI</p>
          </div>
        </div>
      </footer>
      
      <FloatingContactWidget school={school} getLogoUrl={getLogoUrl} />

      {/* Structured FAQ Modal */}
      <AnimatePresence>
        {isFaqModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsFaqModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-3xl bg-white shadow-2xl z-10 border-t-8"
              style={{ borderColor: primaryColor }}
            >
              <div className="flex justify-between items-center p-6 border-b border-stone-200">
                <h2 className="text-2xl font-bold font-serif text-slate-900">Admissions & Frequently Asked Questions</h2>
                <button onClick={() => setIsFaqModalOpen(false)} className="text-slate-500 hover:text-slate-900 bg-stone-100 p-2">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="h-[60vh] overflow-y-auto p-6 bg-stone-50 custom-scrollbar">
                <FaqWidget school={school} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeAcademic;
