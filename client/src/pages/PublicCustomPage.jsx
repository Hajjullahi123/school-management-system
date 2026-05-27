import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { FiMenu, FiX, FiArrowRight } from 'react-icons/fi';
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
          axios.get(`${API_BASE_URL}/api/public/${schoolSlug}`),
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !school || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-4">404</h1>
          <p className="text-gray-500 mb-8">{error || 'Page not found'}</p>
          <Link to={`/${schoolSlug}`} className="bg-primary text-white px-6 py-3 rounded-full font-bold">
            Return to School Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ '--color-primary': school.primaryColor }}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to={`/${schoolSlug}`} className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-200 group-hover:border-[var(--color-primary)] transition-colors">
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
                <Link key={p.slug} to={`/${schoolSlug}/page/${p.slug}`} className={`text-sm font-bold transition-colors ${p.slug === pageSlug ? 'text-gray-900 border-b-2 border-gray-900 pb-1' : 'text-gray-500 hover:text-gray-900'}`}>
                  {p.title}
                </Link>
              ))}
            </nav>
            <Link to={`/${schoolSlug}/login`} className="hidden md:flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95 shadow-md" style={{ backgroundColor: school.primaryColor }}>
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
              style={{ backgroundColor: school.primaryColor }}
            >
              Portal Login <FiArrowRight />
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <article className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-8 tracking-tight" style={{ color: school.primaryColor }}>
            {page.title}
          </h1>
          <div className="prose prose-lg max-w-none prose-headings:font-black prose-a:text-[var(--color-primary)]">
            <ReactMarkdown>{page.content}</ReactMarkdown>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 mt-20">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-500">
          <p className="font-medium">© {new Date().getFullYear()} {school.name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicCustomPage;
