import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiMapPin, FiPhone, FiMail, FiMenu, FiX } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL } from '../../config';

const ThemeModern = ({ school, getLogoUrl }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-black selection:text-white" style={{ '--theme-color': school.primaryColor }}>
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-200">
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
            <Link to={`/${school.slug}/login`} className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-black/10" style={{ backgroundColor: school.primaryColor }}>
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
              style={{ backgroundColor: school.primaryColor }}
            >
              Portal Login <FiArrowRight />
            </Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 flex-1 min-h-[90vh] flex items-center justify-center overflow-hidden bg-black">
        {/* Background Slides */}
        {heroImages.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-50' : 'opacity-0'}`}
          >
            <img src={img} alt="Hero" className="w-full h-full object-cover" />
          </div>
        ))}
        
        {/* Overlay Content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <span className="inline-block py-1 px-3 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold tracking-widest uppercase mb-6 border border-white/30">
            {school.motto || 'Excellence in Education'}
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-[1.1]">
            {school.welcomeTitle || `Welcome to ${school.name}`}
          </h1>
          <p className="text-lg md:text-2xl text-gray-200 mb-10 max-w-2xl mx-auto font-medium">
            {school.welcomeMessage}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={`/${school.slug}/login`} className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-black text-lg hover:scale-105 transition-transform shadow-xl">
              Access Portal
            </Link>
            {school.admissionGuideFileUrl && (
              <a href={school.admissionGuideFileUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto px-8 py-4 rounded-full bg-black/40 backdrop-blur-md border border-white/30 text-white font-bold text-lg hover:bg-black/60 transition-colors">
                Admission Guide
              </a>
            )}
          </div>
        </div>

        {/* Slide Indicators */}
        {heroImages.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
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

      {/* About Us Markdown Section */}
      {school.aboutUsText && (
        <section className="py-24 bg-white relative">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">About Our School</h2>
              <div className="w-24 h-1.5 rounded-full mx-auto" style={{ backgroundColor: school.primaryColor }}></div>
            </div>
            <div className="prose prose-lg md:prose-xl max-w-none text-gray-600 prose-headings:font-black prose-a:text-[var(--theme-color)]">
              <ReactMarkdown>{school.aboutUsText}</ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      {/* Quick Info Grid */}
      <section className="py-12 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {school.address && (
              <div className="bg-white p-8 rounded-3xl border border-gray-100 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: `${school.primaryColor}15`, color: school.primaryColor }}>
                  <FiMapPin className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Location</h3>
                <p className="text-gray-500">{school.address}</p>
              </div>
            )}
            {school.phone && (
              <div className="bg-white p-8 rounded-3xl border border-gray-100 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: `${school.primaryColor}15`, color: school.primaryColor }}>
                  <FiPhone className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Call Us</h3>
                <p className="text-gray-500 font-mono text-lg">{school.phone}</p>
              </div>
            )}
            {school.email && (
              <div className="bg-white p-8 rounded-3xl border border-gray-100 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: `${school.primaryColor}15`, color: school.primaryColor }}>
                  <FiMail className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Email</h3>
                <p className="text-gray-500">{school.email}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                {school.logoUrl ? (
                  <>
                    <img src={getLogoUrl(school.logoUrl)} alt="" className="w-6 h-6 object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                    <span className="text-sm font-black text-gray-400 hidden items-center justify-center w-full h-full">{school.name.charAt(0)}</span>
                  </>
                ) : (
                  <span className="text-sm font-black text-gray-400">{school.name.charAt(0)}</span>
                )}
            </div>
            <span className="text-lg font-black tracking-tighter text-gray-900">{school.name}</span>
          </div>
          <div className="flex items-center gap-6">
            {school.facebookUrl && <a href={school.facebookUrl} className="text-gray-400 hover:text-gray-900">Facebook</a>}
            {school.instagramUrl && <a href={school.instagramUrl} className="text-gray-400 hover:text-gray-900">Instagram</a>}
          </div>
          <p className="text-sm text-gray-500 font-medium">© {new Date().getFullYear()} {school.name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default ThemeModern;
