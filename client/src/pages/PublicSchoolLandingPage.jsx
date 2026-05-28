import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLogOut, FiMail, FiPhone, FiMapPin, FiArrowRight, FiFacebook, FiInstagram, FiMessageCircle, FiGlobe, FiChevronRight, FiMenu, FiX } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { apiCall } from '../api';
import { API_BASE_URL } from '../config';
import ThemeModern from './themes/ThemeModern';

const PublicSchoolLandingPage = () => {
  const { schoolSlug } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        const response = await apiCall(`/api/public-school/${schoolSlug}`);
        setSchool(response.data);
      } catch (err) {
        console.error('Failed to fetch school details:', err);
        setError('School not found or inactive.');
      } finally {
        setLoading(false);
      }
    };

    fetchSchool();
  }, [schoolSlug]);

  const getLogoUrl = (src) => {
    if (!src) return null;
    if (src.startsWith('data:image') || src.startsWith('http')) return src;
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const path = src.startsWith('/') ? src : '/' + src;
    return `${baseUrl}${path}`;
  };

  const heroImages = school?.GalleryImage?.length > 0
    ? school.GalleryImage.map(g => getLogoUrl(g.imageUrl))
    : [
        "/images/hero_exterior.png",
        "/images/hero_students.png",
        "/images/hero_lab.png",
        "/images/hero_library.png"
      ];

  useEffect(() => {
    if (!heroImages || heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages?.length]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold uppercase tracking-widest animate-pulse">Loading School Portal...</p>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-4xl mb-6">!</div>
        <h1 className="text-4xl font-black text-gray-900 mb-4">Portal Not Found</h1>
        <p className="text-gray-500 mb-8 max-w-md">The school portal you are looking for does not exist or is currently inactive.</p>
        <button
          onClick={() => navigate('/demo')}
          className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold shadow-xl hover:bg-indigo-700 transition-colors"
        >
          Explore EduTechAI Platform
        </button>
      </div>
    );
  }

  // Dynamic Styles based on school colors
  const primaryColor = school.primaryColor || '#4f46e5'; // fallback indigo-600
  const secondaryColor = school.secondaryColor || '#6366f1'; // fallback indigo-500
  const accentColor = school.accentColor || '#818cf8'; // fallback indigo-400

  if (school.websiteTheme === 'modern') {
    return <ThemeModern school={school} getLogoUrl={getLogoUrl} />;
  }

  return (
    <div className="min-h-screen font-inter flex flex-col selection:bg-black/10" style={{ '--school-primary': primaryColor, '--school-secondary': secondaryColor, '--school-accent': accentColor }}>
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
              {school.logoUrl ? (
                <>
                  <img src={getLogoUrl(school.logoUrl)} alt="" className="w-full h-full object-contain p-1" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                  <span className="text-2xl font-black text-gray-300 hidden items-center justify-center w-full h-full">{school.name.charAt(0)}</span>
                </>
              ) : (
                <span className="text-2xl font-black text-gray-300">{school.name.charAt(0)}</span>
              )}
            </div>
            <span className="text-xl md:text-2xl font-black tracking-tight text-gray-900 hidden sm:block">{school.name}</span>
          </div>
          
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 mr-2">
              {school.customPages?.map(page => (
                <Link key={page.slug} to={`/${school.slug}/page/${page.slug}`} className="text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                  {page.title}
                </Link>
              ))}
              <Link to={`/${school.slug}/staff`} className="text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                Staff
              </Link>
              <Link to={`/${school.slug}/higher-students`} className="text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                Higher Inst. Students
              </Link>
              <Link to="/alumni" className="text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                Alumni
              </Link>
              <Link to={`/${school.slug}/gallery`} className="text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                Gallery
              </Link>
            </nav>
            <button
              onClick={() => navigate(`/${school.slug}/login`)}
              className="hidden md:flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              style={{ backgroundColor: primaryColor }}
            >
              Portal Login <FiArrowRight />
            </button>
            <button 
              className="md:hidden p-2 text-gray-900"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-100 shadow-lg px-6 py-4 flex flex-col gap-4">
              {school.customPages?.map(page => (
              <Link 
                key={page.slug} 
                to={`/${school.slug}/page/${page.slug}`} 
                className="text-lg font-bold text-gray-700 hover:text-gray-900 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {page.title}
              </Link>
            ))}
            <Link 
              to={`/${school.slug}/staff`} 
              className="text-lg font-bold text-gray-700 hover:text-gray-900 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Staff
            </Link>
            <Link 
              to={`/${school.slug}/higher-students`} 
              className="text-lg font-bold text-gray-700 hover:text-gray-900 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Higher Inst. Students
            </Link>
            <Link 
              to="/alumni" 
              className="text-lg font-bold text-gray-700 hover:text-gray-900 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Alumni Portal
            </Link>
            <Link 
              to={`/${school.slug}/gallery`} 
              className="text-lg font-bold text-gray-700 hover:text-gray-900 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Gallery
            </Link>
            {school.customPages?.length > 0 && <div className="h-px bg-gray-100 my-2"></div>}
            <button 
              onClick={() => navigate(`/${school.slug}/login`)}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full text-white font-bold transition-all shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              Portal Login <FiArrowRight />
            </button>
          </div>
        )}
      </header>


      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden flex-1 flex flex-col justify-center">
        {/* Dynamic Background Effects */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/3 pointer-events-none" style={{ backgroundColor: primaryColor }}></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[100px] opacity-20 translate-y-1/3 -translate-x-1/4 pointer-events-none" style={{ backgroundColor: secondaryColor }}></div>
        
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {school.motto && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border" style={{ color: primaryColor, backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30` }}>
                {school.motto}
              </div>
            )}
            
            <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tighter text-gray-900">
              {school.welcomeTitle || `Welcome to ${school.name}`}
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 font-medium leading-relaxed max-w-lg">
              {school.welcomeMessage || `Providing a supportive and innovative environment where every student can achieve their full potential.`}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => navigate(`/${school.slug}/login`)}
                className="flex items-center justify-center gap-3 px-8 py-4 rounded-[24px] font-black text-lg text-white shadow-xl hover:-translate-y-1 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                Access Portal <FiArrowRight className="text-xl" />
              </button>
            </div>
            
            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-8 border-t border-gray-100">
               {school.openingHours && (
                 <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Office Hours</p>
                   <p className="font-bold text-gray-900 text-sm">{school.openingHours}</p>
                 </div>
               )}
               {school.studentsCount && (
                 <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Students</p>
                   <p className="font-bold text-gray-900 text-sm">Growing Community</p>
                 </div>
               )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative w-full h-[350px] sm:h-[450px] lg:h-full lg:min-h-[500px] mt-8 lg:mt-0"
          >
            <div className="absolute inset-0 rounded-[40px] overflow-hidden shadow-2xl border-[8px] border-white bg-gray-100 group">
               {heroImages.map((img, index) => (
                 <img
                   key={index}
                   src={img}
                   alt={`School Image ${index + 1}`}
                   className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
                 />
               ))}
               
               {/* Elegant Gradient Overlay */}
               <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-transparent opacity-80 mix-blend-multiply pointer-events-none"></div>
               
               {/* Decorative Logo Badge if available */}
               {school.logoUrl && (
                 <div className="absolute bottom-6 left-6 p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl transform group-hover:scale-105 transition-transform">
                   <img src={getLogoUrl(school.logoUrl)} alt="" className="w-16 h-16 object-contain" onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                 </div>
               )}

               {/* Elegant accents */}
               <div className="absolute top-6 right-6 w-20 h-20 border-t-4 border-r-4 border-white/50 rounded-tr-3xl pointer-events-none"></div>
               <div className="absolute bottom-6 right-6 w-20 h-20 border-b-4 border-r-4 border-white/50 rounded-br-3xl pointer-events-none"></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Us Markdown Section for Classic Theme */}
      {school.aboutUsText && (
        <section className="py-20 px-6 bg-white relative z-20 border-t border-gray-100">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4" style={{ color: primaryColor }}>About Us</h2>
              <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: secondaryColor }}></div>
            </div>
            <div className="prose prose-lg max-w-none text-gray-600 prose-headings:font-black" style={{ '--tw-prose-links': primaryColor }}>
              <ReactMarkdown>{school.aboutUsText}</ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      {/* Footer / Contact Information */}
      <footer className="mt-auto bg-gray-900 text-white py-16 relative overflow-hidden border-t-4" style={{ borderColor: primaryColor }}>
        {/* Abstract overlay */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `linear-gradient(to right bottom, ${primaryColor}, ${secondaryColor})` }}></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="space-y-6 lg:col-span-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                   {school.logoUrl ? (
                     <>
                       <img src={getLogoUrl(school.logoUrl)} alt="" className="w-8 h-8 object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                       <span className="text-xl font-black text-gray-900 hidden items-center justify-center w-full h-full">{school.name.charAt(0)}</span>
                     </>
                   ) : (
                     <span className="text-xl font-black text-gray-900">{school.name.charAt(0)}</span>
                   )}
                </div>
                <span className="text-2xl font-black tracking-tighter">{school.name}</span>
              </div>
              <p className="text-gray-400 font-medium max-w-sm">
                Empowering the next generation through academic excellence, character development, and technological innovation.
              </p>
              
              {/* Social Links */}
              <div className="flex gap-4 pt-4">
                {school.facebookUrl && (
                  <a href={school.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#1877F2] transition-colors" title="Facebook">
                    <FiFacebook className="w-5 h-5 text-white" />
                  </a>
                )}
                {school.instagramUrl && (
                  <a href={school.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#E4405F] transition-colors" title="Instagram">
                    <FiInstagram className="w-5 h-5 text-white" />
                  </a>
                )}
                {school.whatsappUrl && (
                  <a href={school.whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#25D366] transition-colors" title="WhatsApp">
                    <FiMessageCircle className="w-5 h-5 text-white" />
                  </a>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-widest mb-6 text-gray-500">Contact Us</h4>
              <ul className="space-y-4">
                {school.address && (
                  <li className="flex items-start gap-3 text-gray-300 text-sm">
                    <FiMapPin className="mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
                    <span>{school.address}</span>
                  </li>
                )}
                {school.phone && (
                  <li className="flex items-center gap-3 text-gray-300 text-sm">
                    <FiPhone className="flex-shrink-0" style={{ color: accentColor }} />
                    <a href={`tel:${school.phone}`} className="hover:text-white transition-colors">{school.phone}</a>
                  </li>
                )}
                {school.email && (
                  <li className="flex items-center gap-3 text-gray-300 text-sm">
                    <FiMail className="flex-shrink-0" style={{ color: accentColor }} />
                    <a href={`mailto:${school.email}`} className="hover:text-white transition-colors">{school.email}</a>
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-widest mb-6 text-gray-500">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <Link to={`/${school.slug}/login`} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm font-medium">
                    <FiChevronRight style={{ color: accentColor }} /> Portal Login
                  </Link>
                </li>
                <li>
                  <Link to={`/${school.slug}/staff`} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm font-medium">
                    <FiChevronRight style={{ color: accentColor }} /> School Staff
                  </Link>
                </li>
                <li>
                  <Link to={`/${school.slug}/higher-students`} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm font-medium">
                    <FiChevronRight style={{ color: accentColor }} /> Higher Inst. Students
                  </Link>
                </li>
                <li>
                  <Link to="/alumni" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm font-medium">
                    <FiChevronRight style={{ color: accentColor }} /> Alumni Directory
                  </Link>
                </li>
                {school.eLibraryUrl && (
                  <li>
                    <a href={school.eLibraryUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm font-medium">
                      <FiChevronRight style={{ color: accentColor }} /> E-Library
                    </a>
                  </li>
                )}
                {school.alumniNetworkUrl && (
                  <li>
                    <a href={school.alumniNetworkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm font-medium">
                      <FiChevronRight style={{ color: accentColor }} /> Alumni Network
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
             <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
               &copy; {new Date().getFullYear()} {school.name}. All rights reserved.
             </p>
             <p className="text-xs text-gray-600 font-medium">
               Powered by <span className="font-black text-gray-400">EduTechAI Platform</span>
             </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicSchoolLandingPage;
