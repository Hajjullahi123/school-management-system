import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLogOut, FiMail, FiPhone, FiMapPin, FiArrowRight, FiFacebook, FiInstagram, FiMessageCircle, FiChevronDown, FiMenu, FiX } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import FloatingContactWidget from '../../components/FloatingContactWidget';
import InteractiveTimelineWidget from '../../components/InteractiveTimelineWidget';
import TuitionEstimatorWidget from '../../components/TuitionEstimatorWidget';
import AccreditationsBand from '../../components/AccreditationsBand';
import FaqWidget from '../../components/FaqWidget';

const ThemeElite = ({ school, getLogoUrl, isSuperAdmin }) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const primaryColor = school.primaryColor || '#b8860b'; // Gold fallback
  const secondaryColor = school.secondaryColor || '#1a1a1a'; // Dark fallback
  const accentColor = school.accentColor || '#d4af37'; // Lighter gold fallback

  const heroImages = school?.GalleryImage?.length > 0
    ? school.GalleryImage.map(g => getLogoUrl(g.imageUrl))
    : [
        "/images/hero_exterior.png",
        "/images/hero_students.png"
      ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!heroImages || heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 6000); // Slower, more elegant crossfade
    return () => clearInterval(interval);
  }, [heroImages?.length]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-gray-200 selection:bg-amber-900/30" style={{ fontFamily: '"Playfair Display", Georgia, serif', '--school-primary': primaryColor, '--school-secondary': secondaryColor, '--school-accent': accentColor }}>
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-md border-white/10 py-3' : 'bg-transparent border-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-5">
            {school.logoUrl && (
              <div className="w-14 h-14 flex items-center justify-center">
                <img src={getLogoUrl(school.logoUrl)} alt="" className="max-w-full max-h-full object-contain filter drop-shadow-lg" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-bold tracking-wider text-white uppercase" style={{ letterSpacing: '0.15em' }}>{school.name}</span>
              {school.motto && (
                <span className="text-xs md:text-sm italic text-gray-400 tracking-widest">{school.motto}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <nav className="hidden lg:flex items-center gap-8">
              {school.customPages?.map(page => (
                <Link key={page.slug} to={`/${school.slug}/page/${page.slug}`} className="text-sm font-medium tracking-widest text-gray-300 hover:text-white transition-colors uppercase">
                  {page.title}
                </Link>
              ))}
              {!isSuperAdmin && (
                <>
                  <Link to={`/${school.slug}/staff`} className="text-sm font-medium tracking-widest text-gray-300 hover:text-white transition-colors uppercase">Faculty</Link>
                  <button onClick={() => setIsFaqModalOpen(true)} className="text-sm font-medium tracking-widest text-gray-300 hover:text-white transition-colors uppercase focus:outline-none">
                    Inquiries
                  </button>
                </>
              )}
              <Link to={`/${school.slug}/gallery`} className="text-sm font-medium tracking-widest text-gray-300 hover:text-white transition-colors uppercase">Campus</Link>
            </nav>
            
            <button
              onClick={() => navigate(`/${school.slug}/login`)}
              className="hidden md:flex items-center gap-3 px-8 py-3 bg-transparent border text-sm font-bold tracking-widest uppercase text-white transition-all duration-300 hover:bg-white hover:text-black"
              style={{ borderColor: primaryColor }}
            >
              Sign In
            </button>
            <button 
              className="lg:hidden p-2 text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <FiX className="w-8 h-8" /> : <FiMenu className="w-8 h-8" />}
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
              className="lg:hidden bg-[#0f0f0f] border-b border-white/10 px-6 py-6 flex flex-col gap-6"
            >
              {!isSuperAdmin && (
                <>
                  <Link to={`/${school.slug}/staff`} className="text-lg tracking-widest text-gray-300 hover:text-white transition-colors uppercase" onClick={() => setIsMobileMenuOpen(false)}>Faculty</Link>
                  <button onClick={() => { setIsFaqModalOpen(true); setIsMobileMenuOpen(false); }} className="text-left text-lg tracking-widest text-gray-300 hover:text-white transition-colors uppercase">Inquiries</button>
                  <Link to="/alumni" className="text-lg tracking-widest text-gray-300 hover:text-white transition-colors uppercase" onClick={() => setIsMobileMenuOpen(false)}>Alumni</Link>
                </>
              )}
              <button 
                onClick={() => navigate(`/${school.slug}/login`)}
                className="py-4 border border-white/20 text-center text-sm font-bold tracking-widest uppercase text-white transition-all hover:bg-white hover:text-black"
              >
                Portal Sign In
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
        {/* Background Images */}
        {heroImages.map((img, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ 
              opacity: index === currentImageIndex ? 1 : 0,
              scale: index === currentImageIndex ? 1 : 1.05
            }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="absolute inset-0 z-0"
          >
            <img src={img} alt="Campus" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 mix-blend-multiply"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent"></div>
          </motion.div>
        ))}

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center mt-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl text-white font-normal leading-tight mb-8 drop-shadow-2xl">
              {school.welcomeTitle || 'Excellence in Education.'}
            </h1>
            <div className="w-24 h-1 mx-auto mb-8" style={{ backgroundColor: primaryColor }}></div>
            <p className="text-lg md:text-2xl text-gray-300 font-light max-w-3xl mx-auto leading-relaxed mb-12" style={{ fontFamily: '"Inter", sans-serif' }}>
              {school.welcomeMessage || 'Fostering a tradition of academic rigor, character development, and visionary leadership.'}
            </p>
            <button
              onClick={() => navigate(`/${school.slug}/login`)}
              className="px-12 py-4 bg-white text-black text-sm tracking-[0.2em] uppercase font-bold hover:bg-gray-200 transition-colors duration-300"
            >
              Explore Portal
            </button>
          </motion.div>
        </div>
      </section>

      {/* Elegant About Section */}
      {school.aboutUsText && (
        <section className="py-32 px-6 bg-[#0a0a0a] relative z-20 border-t border-white/5">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl text-white mb-6">Our Legacy</h2>
            <div className="w-12 h-px bg-white/30 mx-auto mb-12"></div>
            <div className="prose prose-xl prose-invert max-w-none text-gray-400 font-light" style={{ fontFamily: '"Inter", sans-serif', '--tw-prose-links': primaryColor }}>
              <ReactMarkdown>{school.aboutUsText}</ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      {/* Specialized Widgets area */}
      <section className="py-20 bg-[#111] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12">
           {/* Wrap widgets in dark mode containers if they aren't naturally dark */}
           <div className="p-8 border border-white/10 bg-[#0a0a0a]">
             <InteractiveTimelineWidget school={school} />
           </div>
           <div className="p-8 border border-white/10 bg-[#0a0a0a]">
             <TuitionEstimatorWidget school={school} />
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050505] pt-24 pb-12 border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-16 mb-20 text-center md:text-left">
            <div>
              <h3 className="text-2xl text-white mb-6 uppercase tracking-widest">{school.name}</h3>
              <p className="text-sm text-gray-500 leading-loose" style={{ fontFamily: '"Inter", sans-serif' }}>
                Dedicated to shaping the minds of tomorrow through rigorous academics and unyielding character.
              </p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-8">Connect</h4>
              <ul className="space-y-4 text-sm" style={{ fontFamily: '"Inter", sans-serif' }}>
                {school.address && <li className="text-gray-500">{school.address}</li>}
                {school.phone && <li><a href={`tel:${school.phone}`} className="text-gray-400 hover:text-white transition-colors">{school.phone}</a></li>}
                {school.email && <li><a href={`mailto:${school.email}`} className="text-gray-400 hover:text-white transition-colors">{school.email}</a></li>}
              </ul>
            </div>
            <div>
               <h4 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-8">Directories</h4>
               <ul className="space-y-4 text-sm uppercase tracking-wider">
                 <li><Link to={`/${school.slug}/login`} className="text-gray-500 hover:text-white transition-colors">Portal Sign In</Link></li>
                 {!isSuperAdmin && (
                   <>
                     <li><Link to={`/${school.slug}/staff`} className="text-gray-500 hover:text-white transition-colors">Faculty Directory</Link></li>
                     <li><Link to="/alumni" className="text-gray-500 hover:text-white transition-colors">Alumni Society</Link></li>
                   </>
                 )}
               </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs tracking-widest text-gray-600 uppercase" style={{ fontFamily: '"Inter", sans-serif' }}>
             <p>&copy; {new Date().getFullYear()} {school.name}</p>
             <p>Powered by EduTechAI</p>
          </div>
        </div>
      </footer>

      <FloatingContactWidget school={school} getLogoUrl={getLogoUrl} />

      {/* Minimalist FAQ Modal */}
      <AnimatePresence>
        {isFaqModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsFaqModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[#111] border border-white/10 p-8 shadow-2xl z-10"
            >
              <button onClick={() => setIsFaqModalOpen(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white">
                <FiX className="w-6 h-6" />
              </button>
              <div className="h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
                <FaqWidget school={school} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeElite;
