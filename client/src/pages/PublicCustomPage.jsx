import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { FiMenu, FiX, FiArrowRight, FiMapPin, FiPhone, FiMail, FiBookOpen, FiChevronRight } from 'react-icons/fi';
import { API_BASE_URL } from '../config';

const PublicCustomPage = () => {
  const navigate = useNavigate();
  const { schoolSlug, pageSlug } = useParams();
  const [school, setSchool] = useState(null);
  const [page, setPage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schoolRes, pageRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/public-school/${schoolSlug}`),
          axios.get(`${API_BASE_URL}/api/custom-pages/public/${schoolSlug}/${pageSlug}`)
        ]);
        
        setSchool(schoolRes.data);
        setPage(pageRes.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load page');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [schoolSlug, pageSlug]);

  const getLogoUrl = (src) => {
    if (!src) return null;
    if (src.startsWith('data:image') || src.startsWith('http')) return src;
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const path = src.startsWith('/') ? src : '/' + src;
    return `${baseUrl}${path}`;
  };

  // Helper to darken a hex color
  const darkenColor = (hex, percent) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * percent));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent));
    return `rgb(${r}, ${g}, ${b})`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm animate-pulse">Loading Page...</p>
      </div>
    );
  }

  if (error || !school || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">!</div>
          <h1 className="text-4xl font-black text-gray-900 mb-4">404</h1>
          <p className="text-gray-500 mb-8">{error || 'Page not found'}</p>
          <Link to={`/${schoolSlug}`} className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold shadow-xl hover:bg-indigo-700 transition-colors">
            Return to School Home
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = school.primaryColor || '#4f46e5';
  const secondaryColor = school.secondaryColor || '#6366f1';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans" style={{ '--color-primary': primaryColor, '--color-secondary': secondaryColor }}>
      
      {/* ===== HEADER ===== */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to={`/${schoolSlug}`} className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-200 group-hover:border-[var(--color-primary)] transition-colors shadow-sm">
              {school.logoUrl ? (
                <>
                  <img src={getLogoUrl(school.logoUrl)} alt="" className="w-full h-full object-contain p-1" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                  <span className="text-2xl font-black text-gray-300 hidden items-center justify-center w-full h-full">{school.name.charAt(0)}</span>
                </>
              ) : (
                <span className="text-2xl font-black text-gray-300">{school.name.charAt(0)}</span>
              )}
            </div>
            <span className="text-xl md:text-2xl font-black tracking-tight text-gray-900 hidden sm:block group-hover:text-[var(--color-primary)] transition-colors">{school.name}</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 mr-2">
              <Link to={`/${schoolSlug}`} className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Home</Link>
              {school.customPages?.map(p => (
                <Link key={p.slug} to={`/${schoolSlug}/page/${p.slug}`} className={`text-sm font-bold transition-colors ${p.slug === pageSlug ? 'text-gray-900 border-b-2 pb-1' : 'text-gray-500 hover:text-gray-900'}`} style={p.slug === pageSlug ? { borderColor: primaryColor } : {}}>
                  {p.title}
                </Link>
              ))}
            </nav>
            <Link to={`/${schoolSlug}/login`} className="hidden md:flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10" style={{ backgroundColor: primaryColor }}>
              Portal Login <FiArrowRight />
            </Link>
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
            <Link 
              to={`/${schoolSlug}`} 
              className="text-lg font-bold text-gray-700 hover:text-gray-900 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            {school.customPages?.map(p => (
              <Link 
                key={p.slug} 
                to={`/${schoolSlug}/page/${p.slug}`} 
                className={`text-lg font-bold transition-colors ${p.slug === pageSlug ? 'text-gray-900' : 'text-gray-700 hover:text-gray-900'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {p.title}
              </Link>
            ))}
            <div className="h-px bg-gray-100 my-2"></div>
            <Link 
              to={`/${schoolSlug}/login`} 
              className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full text-white font-bold transition-all shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              Portal Login <FiArrowRight />
            </Link>
          </div>
        )}
      </header>

      {/* ===== HERO BANNER ===== */}
      <section className="pt-20 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${darkenColor(primaryColor, 0.15)})` }}>
        {/* Decorative pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 25% 50%, white 1px, transparent 1px), radial-gradient(circle at 75% 50%, white 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}></div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-16 md:py-24 text-left">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/70 text-sm font-medium mb-6">
            <Link to={`/${schoolSlug}`} className="hover:text-white transition-colors">Home</Link>
            <FiChevronRight className="w-4 h-4" />
            <span className="text-white">{page.title}</span>
          </div>
          
          <div className="flex items-start gap-5 mb-4">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 mt-1">
              <FiBookOpen className="w-7 h-7 md:w-8 md:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                {page.title}
              </h1>
              <p className="text-white/70 mt-3 text-base md:text-lg font-medium">
                {school.name} • Official Document
              </p>
            </div>
          </div>
        </div>
        
        {/* Wave separator */}
        <div className="relative -mb-1">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" fill="#f9fafb"/>
          </svg>
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          
          {/* Main Article */}
          <article className="lg:col-span-3">
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-gray-100 text-left relative overflow-hidden">
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor}, transparent)` }}></div>
              
              <div className="prose max-w-none" style={{ '--tw-prose-links': primaryColor, '--tw-prose-quotes': primaryColor, '--tw-prose-headings': '#111827' }}>
                <style>{`
                  .custom-prose * { text-align: left !important; }
                  .custom-prose { width: 100%; }
                  .custom-prose p,
                  .custom-prose li,
                  .custom-prose blockquote,
                  .custom-prose td,
                  .custom-prose th { font-size: 1rem; line-height: 1.75; color: #4b5563; }
                  .custom-prose h1 { font-size: 2rem; font-weight: 900; letter-spacing: -0.025em; color: #111827; margin-top: 2.5rem; margin-bottom: 1rem; }
                  .custom-prose h2 { font-size: 1.65rem; font-weight: 900; letter-spacing: -0.025em; color: #111827; border-left: 4px solid ${primaryColor}; padding-left: 1rem; padding-top: 0.25rem; padding-bottom: 0.25rem; margin-top: 2.5rem; margin-bottom: 1.25rem; }
                  .custom-prose h3 { font-size: 1.35rem; font-weight: 800; color: #111827; margin-top: 2rem; margin-bottom: 0.75rem; }
                  .custom-prose h4 { font-size: 1.15rem; font-weight: 700; color: #1f2937; margin-top: 1.5rem; margin-bottom: 0.5rem; }
                  .custom-prose strong { color: #111827; font-weight: 700; }
                  .custom-prose a { color: ${primaryColor}; font-weight: 600; text-decoration: none; }
                  .custom-prose a:hover { text-decoration: underline; }
                  .custom-prose blockquote { border-left: 4px solid ${primaryColor}40; background: #f9fafb; padding: 1rem 1.5rem; border-radius: 0 0.75rem 0.75rem 0; font-style: normal; margin: 1.5rem 0; }
                  .custom-prose blockquote p { color: #6b7280; }
                  .custom-prose ul, .custom-prose ol { padding-left: 1.5rem; margin: 1rem 0; }
                  .custom-prose li { margin: 0.5rem 0; }
                  .custom-prose li::marker { color: #9ca3af; }
                  .custom-prose img { border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,.1); }
                  .custom-prose hr { border-color: #e5e7eb; margin: 2rem 0; }
                `}</style>
                <div className="custom-prose">
                  <ReactMarkdown>{page.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              {/* School Info Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-24 opacity-10 rounded-t-2xl" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}></div>
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden border border-gray-200 mb-3">
                    {school.logoUrl ? (
                      <>
                        <img src={getLogoUrl(school.logoUrl)} alt="" className="w-full h-full object-contain p-1.5" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                        <span className="text-xl font-black text-gray-300 hidden items-center justify-center w-full h-full">{school.name.charAt(0)}</span>
                      </>
                    ) : (
                      <span className="text-xl font-black text-gray-300">{school.name.charAt(0)}</span>
                    )}
                  </div>
                  <h3 className="font-black text-gray-900 text-sm leading-tight">{school.name}</h3>
                  {school.motto && <p className="text-xs text-gray-400 mt-1 italic">"{school.motto}"</p>}
                </div>
              </div>

              {/* Contact Info Card */}
              {(school.phone || school.email || school.address) && (
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h4 className="font-black text-gray-900 text-sm uppercase tracking-wider mb-4">Contact Us</h4>
                  <div className="space-y-4">
                    {school.phone && (
                      <a href={`tel:${school.phone}`} className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 transition-colors group">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors" style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}>
                          <FiPhone className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{school.phone}</span>
                      </a>
                    )}
                    {school.email && (
                      <a href={`mailto:${school.email}`} className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 transition-colors group">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors" style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}>
                          <FiMail className="w-4 h-4" />
                        </div>
                        <span className="font-medium break-all">{school.email}</span>
                      </a>
                    )}
                    {school.address && (
                      <div className="flex items-start gap-3 text-sm text-gray-600">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}>
                          <FiMapPin className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{school.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Links */}
              {school.customPages?.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h4 className="font-black text-gray-900 text-sm uppercase tracking-wider mb-4">Quick Links</h4>
                  <div className="space-y-2">
                    {school.customPages.map(p => (
                      <Link
                        key={p.slug}
                        to={`/${schoolSlug}/page/${p.slug}`}
                        className={`flex items-center gap-2 text-sm font-semibold py-2 px-3 rounded-xl transition-all ${
                          p.slug === pageSlug
                            ? 'text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        style={p.slug === pageSlug ? { backgroundColor: primaryColor } : {}}
                      >
                        <FiChevronRight className="w-4 h-4 flex-shrink-0" />
                        {p.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA Card */}
              <div className="rounded-2xl p-6 text-white text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${darkenColor(primaryColor, 0.12)})` }}>
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                  backgroundSize: '20px 20px'
                }}></div>
                <div className="relative z-10">
                  <h4 className="font-black text-lg mb-2">Ready to Enroll?</h4>
                  <p className="text-white/80 text-sm mb-4">Begin your child's journey at {school.name}.</p>
                  <Link
                    to={`/${schoolSlug}/login`}
                    className="inline-flex items-center gap-2 bg-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                    style={{ color: primaryColor }}
                  >
                    Get Started <FiArrowRight />
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="mt-auto border-t border-gray-200" style={{ background: `linear-gradient(180deg, #f9fafb 0%, #f1f5f9 100%)` }}>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-gray-200 flex-shrink-0">
                  {school.logoUrl ? (
                    <>
                      <img src={getLogoUrl(school.logoUrl)} alt="" className="w-full h-full object-contain p-1" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                      <span className="text-sm font-black text-gray-400 hidden items-center justify-center w-full h-full">{school.name.charAt(0)}</span>
                    </>
                  ) : (
                    <span className="text-sm font-black text-gray-400">{school.name.charAt(0)}</span>
                  )}
                </div>
                <span className="text-lg font-black text-gray-900 tracking-tight">{school.name}</span>
              </div>
              {school.motto && <p className="text-gray-500 text-sm italic mb-3">"{school.motto}"</p>}
              {school.address && (
                <p className="text-gray-500 text-sm flex items-start gap-2">
                  <FiMapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: primaryColor }} />
                  {school.address}
                </p>
              )}
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-black text-gray-900 text-sm uppercase tracking-wider mb-4">Contact</h4>
              <div className="space-y-3">
                {school.phone && (
                  <a href={`tel:${school.phone}`} className="flex items-center gap-3 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    <FiPhone className="w-4 h-4" style={{ color: primaryColor }} />
                    {school.phone}
                  </a>
                )}
                {school.email && (
                  <a href={`mailto:${school.email}`} className="flex items-center gap-3 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    <FiMail className="w-4 h-4" style={{ color: primaryColor }} />
                    {school.email}
                  </a>
                )}
              </div>
            </div>

            {/* Pages */}
            <div>
              <h4 className="font-black text-gray-900 text-sm uppercase tracking-wider mb-4">Pages</h4>
              <div className="space-y-2">
                <Link to={`/${schoolSlug}`} className="block text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
                  Home
                </Link>
                {school.customPages?.map(p => (
                  <Link key={p.slug} to={`/${schoolSlug}/page/${p.slug}`} className="block text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
                    {p.title}
                  </Link>
                ))}
                <Link to={`/${schoolSlug}/login`} className="block text-sm font-bold transition-colors" style={{ color: primaryColor }}>
                  Portal Login →
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400 font-medium">
              © {new Date().getFullYear()} {school.name}. All rights reserved.
            </p>
            <p className="text-xs text-gray-400">
              Powered by <span className="font-bold text-gray-500">EduTechAI</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicCustomPage;
