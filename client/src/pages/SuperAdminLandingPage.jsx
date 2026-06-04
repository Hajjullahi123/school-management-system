import React, { useState, useEffect } from 'react';
import { Shield, BarChart3, Users, Clock, Database, Globe, Menu, X } from 'lucide-react';
import '../styles/super-admin-landing.css';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../api';
import { API_BASE_URL } from '../config';

function SuperAdminLandingPage() {
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        const response = await apiCall('/api/public-school/edutech');
        setSchool(response.data);
      } catch (err) {
        console.error('Failed to fetch super admin school details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchool();
  }, []);

  const getLogoUrl = (src) => {
    if (!src) return null;
    if (src.startsWith('data:image') || src.startsWith('http')) return src;
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const path = src.startsWith('/') ? src : '/' + src;
    return `${baseUrl}${path}`;
  };

  const title = school?.welcomeTitle || 'Transforming Education Through Innovation';
  const subtitle = school?.name || 'Premium School Management';
  const message = school?.welcomeMessage || 'Empowering institutions with cutting-edge technology. Experience seamless administration, data-driven insights, and bank-grade security all in one platform.';
  
  const news = school?.newsEvents && school.newsEvents.length > 0 ? school.newsEvents : [
    { title: 'Edutech System V2.5 Released', content: 'We are thrilled to announce the launch of version 2.5...', date: 'October 15, 2026' }
  ];
  
  const gallery = school?.GalleryImage && school.GalleryImage.length > 0 ? school.GalleryImage : [];
  
  let testimonials = [];
  try {
    if (school?.testimonialsText) {
      testimonials = JSON.parse(school.testimonialsText);
    }
  } catch (e) {
    // fallback
  }

  if (testimonials.length === 0) {
    testimonials = [
      { name: 'Dr. Samuel O.', title: 'Principal, Excellence Academy', text: 'EduTech System has completely revolutionized how we run Excellence Academy. The automated fee tracking alone saved us countless hours.' },
      { name: 'Sarah A.', title: 'System Administrator', text: 'The CBT portal is flawless. Managing thousands of students concurrently during exams used to be a nightmare, but now it\'s seamless.' }
    ];
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f9ff]">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold uppercase tracking-widest animate-pulse">Loading Portal...</p>
      </div>
    );
  }

  return (
    <div className="edutech-landing-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-logo">{school?.name || 'EduTech Systems'}</div>
        
        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-menu-btn md-hidden" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>

        <ul className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
          <li><a href="#home" onClick={() => setIsMobileMenuOpen(false)}>Home</a></li>
          <li><a href="#system" onClick={() => setIsMobileMenuOpen(false)}>The System</a></li>
          <li><a href="#news" onClick={() => setIsMobileMenuOpen(false)}>News & Events</a></li>
          <li><a href="#gallery" onClick={() => setIsMobileMenuOpen(false)}>Gallery</a></li>
          <li><a href="#impact" onClick={() => setIsMobileMenuOpen(false)}>Testimonials</a></li>
          <li><a href="#contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</a></li>
          <li className="mobile-only">
            <button className="btn btn-outline w-full" onClick={() => navigate('/login')}>
              System Login
            </button>
          </li>
        </ul>
        <button className="btn btn-outline desktop-only" onClick={() => navigate('/login')}>
          System Login
        </button>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-content animate-fade-in">
          <span className="hero-subtitle">{subtitle}</span>
          <h1>{title}</h1>
          <p className="delay-1">{message}</p>
          <div className="hero-btns delay-2">
            <a href="#system" className="btn btn-primary">Explore Features</a>
            <button className="btn btn-outline" onClick={() => navigate('/login')}>Admin Portal</button>
          </div>
        </div>
      </section>

      {/* The System Showcase */}
      <section id="system" className="system-section">
        <h2 className="section-title">Why Choose Us?</h2>
        <div className="landing-container features-grid">
          <div className="glass-panel feature-card delay-1">
            <Shield className="feature-icon" />
            <h3>Bank-Grade Security</h3>
            <p>Your data is protected with state-of-the-art encryption and biometric access controls.</p>
          </div>
          <div className="glass-panel feature-card delay-2">
            <BarChart3 className="feature-icon" />
            <h3>Data-Driven Insights</h3>
            <p>Make informed decisions with our advanced analytics and real-time reporting dashboards.</p>
          </div>
          <div className="glass-panel feature-card delay-3">
            <Globe className="feature-icon" />
            <h3>Cloud Infrastructure</h3>
            <p>Access your institution's data from anywhere in the world with 99.9% uptime.</p>
          </div>
        </div>
      </section>

      {/* News & Upcoming Events */}
      <section id="news" className="news-events">
        <h2 className="section-title">Latest News & Events</h2>
        <div className="landing-container news-grid">
          {news.map((n, i) => (
            <div key={i} className="news-card">
              <span className="news-date">{new Date(n.date).toLocaleDateString() === 'Invalid Date' ? n.date : new Date(n.date).toLocaleDateString()}</span>
              <h3>{n.title}</h3>
              <p>{n.content}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery Section */}
      {gallery.length > 0 && (
        <section id="gallery" className="gallery">
          <h2 className="section-title">System In Action</h2>
          <div className="landing-container gallery-grid">
            {gallery.map((img, i) => (
              <img key={i} src={getLogoUrl(img.imageUrl)} alt={img.caption || 'Gallery Image'} className="gallery-img" />
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section id="impact" className="testimonials">
        <h2 className="section-title">Proven Impact</h2>
        <div className="landing-container testimonials-grid">
          {testimonials.map((t, i) => (
            <div key={i} className="testimonial-card">
              <span className="quote-icon">"</span>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl font-bold text-gray-500 mr-3 shrink-0">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div>{t.name}</div>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-dark)'}}>{t.title || t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer id="contact">
        <div className="landing-container">
          <div className="nav-logo" style={{marginBottom: '1rem'}}>{school?.name || 'EduTech Systems'}</div>
          <p style={{color: 'var(--text-dark)', marginBottom: '2rem'}}>Empowering the next generation of digital schools.</p>
          <div style={{display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem'}}>
            <span>{school?.email || 'contact@edutech.com'}</span>
            <span>{school?.phone || '+234 (0) 800 123 4567'}</span>
          </div>
          <p style={{fontSize: '0.9rem', color: 'rgba(0,0,0,0.3)'}}>
            &copy; 2026 {school?.name || 'EduTech Systems'}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default SuperAdminLandingPage;
