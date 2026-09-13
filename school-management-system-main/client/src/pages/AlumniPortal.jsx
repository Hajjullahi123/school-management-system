import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE_URL } from '../api';
import useSchoolSettings from '../hooks/useSchoolSettings';

const AlumniPortal = () => {
  const { settings } = useSchoolSettings();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (settings?.schoolId) {
      fetchStories(settings.schoolId);
    }
  }, [settings?.schoolId]);

  const fetchStories = async (schoolId) => {
    try {
      const response = await api.get(`/api/alumni/stories?school=${schoolId}`);
      const data = await response.json();
      setStories(data);
    } catch (error) {
      console.error('Failed to fetch stories');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-primary/20">
      {/* Dynamic Navigation */}
      <nav className="absolute top-0 w-full z-50 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to={settings?.schoolSlug ? `/${settings.schoolSlug}` : '/'} className="flex items-center gap-2 text-white/90 hover:text-white font-bold transition-all group backdrop-blur-md bg-white/10 px-4 py-2 rounded-full border border-white/20">
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Main Website
              </Link>
            </div>
            <div className="flex items-center">
              <div className="flex items-center gap-3 backdrop-blur-md bg-white/10 px-4 py-2 rounded-full border border-white/20">
                <div className="w-8 h-8 bg-white rounded shadow-sm overflow-hidden flex items-center justify-center">
                  {settings?.logoUrl ? (
                    <img src={settings.logoUrl.startsWith('data:') || settings.logoUrl.startsWith('http') ? settings.logoUrl : `${API_BASE_URL}${settings.logoUrl}`} alt="Logo" className="w-full h-full object-contain p-0.5" />
                  ) : (
                    <span className="text-primary font-black text-xs">
                      {settings?.schoolName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'S'}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block font-bold text-white text-sm tracking-widest uppercase">{settings?.schoolName}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center justify-center text-white overflow-hidden bg-gray-900">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-primary/50 to-gray-900 z-10 mix-blend-multiply"></div>
          <img
            src="https://images.unsplash.com/photo-1523050853063-8802a6359461?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
            alt="Graduation"
            className="w-full h-full object-cover transform scale-105 animate-slow-zoom"
          />
        </div>

        {/* Decorative Elements */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-primary/40 rounded-full blur-[150px]"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/30 rounded-full blur-[150px]"></div>
        </div>

        <div className="relative z-20 text-center px-4 max-w-5xl mt-20">
          <span className="inline-block px-4 py-1.5 mb-6 border border-white/30 text-white text-xs font-black tracking-[0.3em] uppercase rounded-full shadow-2xl backdrop-blur-md">
            Alumni & Endowment
          </span>
          <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter drop-shadow-2xl leading-[1.1]">
            A Legacy of <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-500">Excellence</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 opacity-90 font-medium leading-relaxed max-w-3xl mx-auto drop-shadow-lg">
            Join thousands of extraordinary graduates shaping the future. Reconnect, mentor, and continue the legacy of our great institution.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6 flex-wrap">
            <Link
              to="/alumni/directory"
              className="group bg-white text-gray-900 px-8 py-5 rounded-2xl font-black text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 uppercase tracking-widest"
            >
              Search Directory
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
            <Link
              to="/alumni/yearbook"
              className="bg-primary border-2 border-primary text-white px-8 py-5 rounded-2xl font-black text-lg hover:bg-primary/90 transition-all transform hover:-translate-y-1 uppercase tracking-widest flex items-center justify-center"
            >
              Yearbook
            </Link>
            <Link
              to="/alumni/login"
              className="bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-8 py-5 rounded-2xl font-black text-lg hover:bg-white hover:text-gray-900 transition-all transform hover:-translate-y-1 uppercase tracking-widest flex items-center justify-center"
            >
              Alumni Login
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Statistics */}
      <section className="relative z-30 -mt-16 max-w-6xl mx-auto px-4 mb-20">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="text-center p-4">
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary/60 mb-2">2,500+</div>
              <div className="text-gray-500 uppercase tracking-[0.2em] text-xs font-bold">Global Alumni</div>
            </div>
            <div className="text-center p-4">
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-500 to-teal-500 mb-2">15+</div>
              <div className="text-gray-500 uppercase tracking-[0.2em] text-xs font-bold">Countries Represented</div>
            </div>
            <div className="text-center p-4">
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-500 to-orange-500 mb-2">50+</div>
              <div className="text-gray-500 uppercase tracking-[0.2em] text-xs font-bold">Success Stories</div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 max-w-7xl mx-auto px-4 w-full">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <span className="text-primary font-black tracking-[0.2em] uppercase text-xs mb-3 block">Alumni Spotlights</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">Inspiration & <br/>Success</h2>
          </div>
          <Link to="/alumni/directory" className="text-primary font-bold hover:underline flex items-center gap-2 group">
            View All Graduates 
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : stories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {stories.map(story => (
              <div key={story.id} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 flex flex-col">
                <div className="h-72 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent z-10"></div>
                  <img
                    src={story.imageUrl ? (story.imageUrl.startsWith('data:') || story.imageUrl.startsWith('http') ? story.imageUrl : `${API_BASE_URL}${story.imageUrl}`) : 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'}
                    alt={story.alumniName}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-6 right-6 z-20 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg">
                    Class of {story.graduationYear}
                  </div>
                  <div className="absolute bottom-6 left-6 z-20">
                    <h3 className="text-2xl font-black text-white mb-1 leading-tight">{story.title}</h3>
                    <p className="text-sm font-medium text-gray-300">By {story.alumniName}</p>
                  </div>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <p className="text-gray-600 leading-relaxed mb-8 line-clamp-4 flex-1">
                    "{story.content}"
                  </p>
                  <button className="w-full py-4 bg-gray-50 hover:bg-primary text-gray-900 hover:text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors shadow-inner">
                    Read Full Story
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-gray-200 shadow-sm">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🌟</span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Your Story Awaits</h3>
            <p className="text-gray-500 max-w-md mx-auto text-lg mb-8">
              Be the first to inspire current students by sharing your professional journey and success since graduation.
            </p>
            <Link to="/alumni/login" className="text-primary font-bold hover:underline">
              Log in to submit a story →
            </Link>
          </div>
        )}
      </section>

      {/* Modern CTA Section */}
      <section className="bg-gray-900 py-24 relative overflow-hidden mt-10">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNHYtNGgtdjRoLTR2LTRoLTh2NGgtNHY0aC00djRoNHY0aDR2NGg4di00aDR2LTRoNHptLTgtMTJoNHY0aC00di00em0tOCAwaDR2NGgtNHYtNHptLTggMTJoNHY0aC00di00em0yNCAwaDR2NGgtNHYtNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 text-center text-white relative z-10">
          <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight">Join the Directory</h2>
          <p className="text-xl md:text-2xl opacity-80 mb-12 leading-relaxed font-medium">
            Graduated from {settings?.schoolName || 'our school'}? Register or login to join our searchable directory,
            mentor current students, and find old classmates.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link
              to="/login"
              className="inline-block bg-primary text-white px-10 py-5 rounded-2xl font-black text-lg shadow-[0_0_40px_rgba(15,118,110,0.5)] hover:shadow-[0_0_60px_rgba(15,118,110,0.7)] transition-all transform hover:-translate-y-1 uppercase tracking-widest"
            >
              Access Dashboard
            </Link>
            <Link
              to="/contact"
              className="inline-block bg-white/10 backdrop-blur-md border-2 border-white/20 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-white hover:text-gray-900 transition-all transform hover:-translate-y-1 uppercase tracking-widest"
            >
              Contact Office
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes slow-zoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.15); }
        }
        .animate-slow-zoom {
          animation: slow-zoom 20s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
};

export default AlumniPortal;
