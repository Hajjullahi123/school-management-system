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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white shadow-md z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/landing" className="flex items-center gap-2 text-gray-700 hover:text-primary font-bold transition-all group">
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
            </div>
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded shadow-sm overflow-hidden flex items-center justify-center">
                  {settings?.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                  ) : (
                    <span className="text-white font-bold text-xs">
                      {settings?.schoolName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'S'}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block font-bold text-gray-800 text-sm tracking-tight">{settings?.schoolName}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center justify-center text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary z-10 opacity-90"></div>
        <img
          src="https://images.unsplash.com/photo-1523050853063-8802a6359461?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
          alt="Graduation"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 text-center px-4 max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight">
            Our Alumni Network
          </h1>
          <p className="text-xl md:text-2xl mb-10 opacity-90 font-light leading-relaxed">
            Connecting generations of excellence. Stay linked with your alma mater,
            find classmates, and celebrate our collective success.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/alumni/directory"
              className="bg-white text-primary px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:bg-gray-100 transition-all transform hover:-translate-y-1"
            >
              Search Directory
            </Link>
            <Link
              to="/login"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-primary transition-all transform hover:-translate-y-1"
            >
              Alumni Login
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Statistics */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6">
            <div className="text-4xl font-bold text-primary mb-2">2,500+</div>
            <div className="text-gray-600 uppercase tracking-widest text-sm font-semibold">Global Alumni</div>
          </div>
          <div className="p-6 border-x border-gray-100">
            <div className="text-4xl font-bold text-secondary mb-2">15+</div>
            <div className="text-gray-600 uppercase tracking-widest text-sm font-semibold">Countries Represented</div>
          </div>
          <div className="p-6">
            <div className="text-4xl font-bold text-accent mb-2">50+</div>
            <div className="text-gray-600 uppercase tracking-widest text-sm font-semibold">Success Stories</div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Inspiration & Success</h2>
            <div className="h-1.5 w-24 bg-primary rounded-full"></div>
          </div>
          <Link to="/alumni/directory" className="text-primary font-bold hover:underline">View All Graduates →</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : stories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {stories.map(story => (
              <div key={story.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="h-64 overflow-hidden relative">
                  <img
                    src={story.imageUrl || 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'}
                    alt={story.alumniName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Class of {story.graduationYear}
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{story.title}</h3>
                  <p className="text-sm italic text-primary mb-4">By {story.alumniName}</p>
                  <p className="text-gray-600 leading-relaxed mb-6 line-clamp-4">
                    {story.content}
                  </p>
                  <button className="text-primary font-bold flex items-center group-hover:translate-x-2 transition-transform">
                    Read Story <span className="ml-2">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
            <p className="text-xl">Be the first to share your success story!</p>
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 py-20">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-bold mb-8">Join the Directory Today</h2>
          <p className="text-xl opacity-80 mb-10 leading-relaxed">
            Graduated from {settings?.schoolName || 'our school'}? Register or login to join our searchable directory,
            mentor current students, and find old classmates.
          </p>
          <Link
            to="/login"
            className="inline-block bg-primary text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl hover:bg-primary/90 transition-all transform hover:scale-105"
          >
            Access Alumni Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AlumniPortal;
