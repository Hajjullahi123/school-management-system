import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLogOut, FiMail, FiPhone, FiMapPin, FiArrowRight, FiFacebook, FiInstagram, FiMessageCircle, FiChevronDown, FiMenu, FiX, FiHeart, FiStar, FiSun } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import FloatingContactWidget from '../../components/FloatingContactWidget';
import InteractiveTimelineWidget from '../../components/InteractiveTimelineWidget';
import TuitionEstimatorWidget from '../../components/TuitionEstimatorWidget';
import AccreditationsBand from '../../components/AccreditationsBand';
import FaqWidget from '../../components/FaqWidget';

const ThemePlayful = ({ school, getLogoUrl }) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);

  const primaryColor = school.primaryColor || '#ff6b6b'; // Playful red/pink fallback
  const secondaryColor = school.secondaryColor || '#4ecdc4'; // Playful teal fallback
  const accentColor = school.accentColor || '#ffe66d'; // Playful yellow fallback

  const heroImages = school?.GalleryImage?.length > 0
    ? school.GalleryImage.map(g => getLogoUrl(g.imageUrl))
    : [
        "/images/hero_students.png",
        "/images/hero_exterior.png"
      ];

  useEffect(() => {
    if (!heroImages || heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [heroImages?.length]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-hidden" style={{ fontFamily: '"Quicksand", "Nunito", sans-serif', '--school-primary': primaryColor, '--school-secondary': secondaryColor, '--school-accent': accentColor }}>
      
      {/* Playful Header */}
      <header className="fixed top-4 left-4 right-4 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-slate-200/50 px-6 h-20 flex items-center justify-between border-4 border-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center overflow-hidden bg-gradient-to-br from-white to-slate-100 shadow-sm border border-slate-100 transform rotate-[-3deg]">
              {school.logoUrl ? (
                <img src={getLogoUrl(school.logoUrl)} alt="" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-2xl font-black text-slate-300">{school.name.charAt(0)}</span>
              )}
            </div>
            <span className="text-xl md:text-2xl font-black tracking-tight text-slate-800 hidden sm:block truncate max-w-[200px]" style={{ color: primaryColor }}>{school.name}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="hidden lg:flex items-center gap-2">
              {school.customPages?.map(page => (
                <Link key={page.slug} to={`/${school.slug}/page/${page.slug}`} className="px-4 py-2 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all">
                  {page.title}
                </Link>
              ))}
              <Link to={`/${school.slug}/staff`} className="px-4 py-2 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all">Teachers</Link>
              <button onClick={() => setIsFaqModalOpen(true)} className="px-4 py-2 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all focus:outline-none">
                Questions?
              </button>
            </nav>
            
            <button
              onClick={() => navigate(`/${school.slug}/login`)}
              className="hidden md:flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-black transition-all shadow-[0_8px_0_0] active:shadow-[0_0px_0_0] active:translate-y-2 hover:-translate-y-1"
              style={{ backgroundColor: primaryColor, shadowColor: secondaryColor, borderColor: secondaryColor }}
            >
              Sign In <FiArrowRight className="text-xl stroke-[3]" />
            </button>
            <button 
              className="lg:hidden p-3 rounded-full text-white shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: secondaryColor }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <FiX className="w-6 h-6 stroke-[3]" /> : <FiMenu className="w-6 h-6 stroke-[3]" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="lg:hidden absolute top-24 left-4 right-4 bg-white rounded-[2rem] shadow-2xl p-6 flex flex-col gap-3 border-4 border-slate-100"
            >
              <Link to={`/${school.slug}/staff`} className="p-4 rounded-[1.5rem] bg-slate-50 text-lg font-bold text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Teachers</Link>
              <button onClick={() => { setIsFaqModalOpen(true); setIsMobileMenuOpen(false); }} className="p-4 rounded-[1.5rem] bg-slate-50 text-left text-lg font-bold text-slate-700 hover:bg-slate-100 transition-colors">Questions & Answers</button>
              <button 
                onClick={() => navigate(`/${school.slug}/login`)}
                className="mt-2 p-4 rounded-[1.5rem] text-center text-lg font-black text-white shadow-lg active:scale-95 transition-transform"
                style={{ backgroundColor: primaryColor }}
              >
                Let's Go! (Sign In)
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative flex-1 flex flex-col justify-center min-h-[90vh]">
        {/* Floating playful shapes */}
        <motion.div animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute top-32 left-10 text-6xl opacity-20" style={{ color: secondaryColor }}><FiStar /></motion.div>
        <motion.div animate={{ y: [0, 30, 0], rotate: [0, -15, 0] }} transition={{ duration: 7, repeat: Infinity }} className="absolute bottom-40 right-10 text-8xl opacity-20" style={{ color: primaryColor }}><FiSun /></motion.div>
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-1/2 left-1/4 text-4xl opacity-20" style={{ color: accentColor }}><FiHeart /></motion.div>
        
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, type: 'spring' }}
            className="space-y-8 text-center lg:text-left order-2 lg:order-1"
          >
            <div className="inline-block px-6 py-2 rounded-full text-sm font-black text-white shadow-md transform -rotate-2" style={{ backgroundColor: accentColor, color: '#333' }}>
              Welcome to {school.name}!
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black leading-[1.1] text-slate-800 tracking-tight" style={{ color: primaryColor }}>
              {school.welcomeTitle || 'Learning is an Adventure!'}
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-600 font-bold leading-relaxed max-w-lg mx-auto lg:mx-0">
              {school.welcomeMessage || 'A safe, fun, and loving place where every child shines bright like a star.'}
            </p>
            
            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={() => navigate(`/${school.slug}/login`)}
                className="flex items-center justify-center gap-3 px-8 py-5 rounded-[2rem] font-black text-xl text-white shadow-[0_8px_0_0] active:shadow-[0_0px_0_0] active:translate-y-2 hover:-translate-y-1 transition-all"
                style={{ backgroundColor: secondaryColor, shadowColor: '#333' }}
              >
                Sign In <FiArrowRight className="stroke-[3]" />
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
            className="relative w-full aspect-square max-w-lg mx-auto lg:max-w-none order-1 lg:order-2 mt-8 lg:mt-0"
          >
            {/* Blob Image Mask */}
            <div className="absolute inset-0 bg-gradient-to-tr shadow-2xl overflow-hidden rounded-[40%_60%_70%_30%/40%_50%_60%_50%] border-8 border-white group" style={{ backgroundImage: `linear-gradient(to top right, ${primaryColor}, ${secondaryColor})` }}>
               {heroImages.map((img, index) => (
                 <motion.img
                   key={index}
                   src={img}
                   alt={`School Image ${index + 1}`}
                   className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-90"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: index === currentImageIndex ? 1 : 0 }}
                   transition={{ duration: 1 }}
                 />
               ))}
            </div>
            
            {/* Playful Floating Badges */}
            {school.motto && (
              <motion.div 
                animate={{ y: [-10, 10, -10] }} transition={{ duration: 4, repeat: Infinity }}
                className="absolute -bottom-6 -left-6 bg-white p-4 rounded-3xl shadow-xl border-4 transform -rotate-6"
                style={{ borderColor: accentColor }}
              >
                <p className="font-black text-slate-700 text-lg">{school.motto}</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* About Us Markdown Section */}
      {school.aboutUsText && (
        <section className="py-24 px-6 relative z-20">
          <div className="absolute inset-0 -skew-y-3 bg-white shadow-sm z-0"></div>
          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <h2 className="text-4xl md:text-5xl font-black mb-8 transform rotate-1 inline-block" style={{ color: secondaryColor }}>Our Story</h2>
            <div className="prose prose-xl prose-slate max-w-none font-medium prose-headings:font-black text-left bg-slate-50 p-8 rounded-[3rem] shadow-inner border-4 border-white" style={{ '--tw-prose-links': primaryColor }}>
              <ReactMarkdown>{school.aboutUsText}</ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      {/* Widgets */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 items-start">
           <div className="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-slate-100 transform hover:-translate-y-2 transition-transform">
             <InteractiveTimelineWidget school={school} />
           </div>
           <div className="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-slate-100 transform hover:-translate-y-2 transition-transform">
             <TuitionEstimatorWidget school={school} />
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-800 text-white pt-20 pb-10 relative overflow-hidden rounded-t-[4rem]">
        {/* Wave SVG */}
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none transform rotate-180">
          <svg className="relative block w-[calc(100%+1.3px)] h-[50px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill={secondaryColor}></path>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 mt-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 text-center md:text-left">
            <div className="flex flex-col items-center md:items-start">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-6 transform rotate-3 shadow-lg">
                 {school.logoUrl ? (
                   <img src={getLogoUrl(school.logoUrl)} alt="" className="w-10 h-10 object-contain" />
                 ) : (
                   <span className="text-3xl font-black" style={{ color: primaryColor }}>{school.name.charAt(0)}</span>
                 )}
              </div>
              <h3 className="text-3xl font-black mb-4">{school.name}</h3>
              
              <div className="flex gap-4 mt-6 justify-center md:justify-start">
                {school.facebookUrl && (
                  <a href={school.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-[#1877F2] transition-colors hover:-translate-y-1 transform">
                    <FiFacebook className="w-6 h-6 text-white" />
                  </a>
                )}
                {school.whatsappUrl && (
                  <a href={school.whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-[#25D366] transition-colors hover:-translate-y-1 transform">
                    <FiMessageCircle className="w-6 h-6 text-white" />
                  </a>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xl font-black mb-6" style={{ color: accentColor }}>Say Hello!</h4>
              <ul className="space-y-4 font-bold text-slate-300">
                {school.phone && (
                  <li className="flex items-center justify-center md:justify-start gap-3">
                    <div className="p-2 rounded-xl bg-white/10"><FiPhone /></div>
                    <a href={`tel:${school.phone}`} className="hover:text-white transition-colors">{school.phone}</a>
                  </li>
                )}
                {school.email && (
                  <li className="flex items-center justify-center md:justify-start gap-3">
                    <div className="p-2 rounded-xl bg-white/10"><FiMail /></div>
                    <a href={`mailto:${school.email}`} className="hover:text-white transition-colors">{school.email}</a>
                  </li>
                )}
                {school.address && (
                  <li className="flex items-start justify-center md:justify-start gap-3">
                    <div className="p-2 rounded-xl bg-white/10 mt-1"><FiMapPin /></div>
                    <span>{school.address}</span>
                  </li>
                )}
              </ul>
            </div>
            
            <div>
              <h4 className="text-xl font-black mb-6" style={{ color: accentColor }}>Explore</h4>
              <ul className="space-y-3 font-bold text-slate-300">
                 <li><Link to={`/${school.slug}/login`} className="hover:text-white transition-colors hover:translate-x-1 inline-block">Portal Login</Link></li>
                 <li><Link to={`/${school.slug}/staff`} className="hover:text-white transition-colors hover:translate-x-1 inline-block">Meet the Teachers</Link></li>
                 <li><Link to={`/${school.slug}/gallery`} className="hover:text-white transition-colors hover:translate-x-1 inline-block">Photo Gallery</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t-4 border-slate-700 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
             <p className="font-bold text-slate-400">
               &copy; {new Date().getFullYear()} {school.name}.
             </p>
             <p className="font-bold text-slate-400 bg-slate-700 px-4 py-2 rounded-full">
               Powered by EduTechAI
             </p>
          </div>
        </div>
      </footer>
      <FloatingContactWidget school={school} getLogoUrl={getLogoUrl} />

      {/* FAQ Modal */}
      <AnimatePresence>
        {isFaqModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsFaqModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.8, rotate: -2 }}
              className="relative w-full max-w-2xl bg-white border-8 border-slate-100 rounded-[3rem] p-6 shadow-2xl z-10"
            >
              <button onClick={() => setIsFaqModalOpen(false)} className="absolute -top-6 -right-6 text-white bg-red-500 rounded-full p-3 shadow-lg hover:scale-110 transition-transform">
                <FiX className="w-8 h-8 stroke-[3]" />
              </button>
              <div className="h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                <FaqWidget school={school} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemePlayful;
