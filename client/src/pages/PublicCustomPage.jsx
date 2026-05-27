import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL } from '../../config';

const PublicCustomPage = () => {
  const { schoolSlug, pageSlug } = useParams();
  const [school, setSchool] = useState(null);
  const [page, setPage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
          
          <nav className="flex items-center gap-6">
            <Link to={`/${schoolSlug}`} className="text-sm font-bold text-gray-500 hover:text-gray-900">Home</Link>
            <Link to={`/${schoolSlug}/login`} className="text-sm font-bold text-white px-5 py-2 rounded-full shadow-md" style={{ backgroundColor: school.primaryColor }}>
              Portal Login
            </Link>
          </nav>
        </div>
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
