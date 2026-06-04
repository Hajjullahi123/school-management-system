import React from 'react';
import { Shield, BarChart3, Users, Clock, Database, Globe } from 'lucide-react';
import '../styles/super-admin-landing.css';
import { useNavigate } from 'react-router-dom';

function SuperAdminLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="edutech-landing-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-logo">EduTech Systems</div>
        <ul className="nav-links">
          <li><a href="#home">Home</a></li>
          <li><a href="#system">The System</a></li>
          <li><a href="#schools">Top Schools</a></li>
          <li><a href="#news">News & Events</a></li>
          <li><a href="#gallery">Gallery</a></li>
          <li><a href="#impact">Testimonials</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
        <button className="btn btn-outline" onClick={() => navigate('/login')}>
          System Login
        </button>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-content animate-fade-in">
          <span className="hero-subtitle">Premium School Management</span>
          <h1>Transforming Education Through Innovation</h1>
          <p className="delay-1">
            Empowering institutions with cutting-edge technology. Experience seamless administration, 
            data-driven insights, and bank-grade security all in one platform.
          </p>
          <div className="hero-btns delay-2">
            <a href="#system" className="btn btn-primary">Explore Features</a>
            <button className="btn btn-outline" onClick={() => navigate('/login')}>Admin Portal</button>
          </div>
        </div>
      </section>

      {/* The System Showcase */}
      <section id="system" className="system-section">
        <h2 className="section-title">Why Choose EduTech?</h2>
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

      {/* Top Schools Showcase */}
      <section id="schools" className="top-schools">
        <h2 className="section-title">Top Performing Schools</h2>
        <div className="landing-container schools-grid">
          <div className="school-card">
            <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80" alt="School" className="school-img" />
            <h3>Excellence Academy</h3>
            <p style={{color: 'var(--text-dark)', marginTop: '0.5rem'}}>5,000+ Students Managed</p>
          </div>
          <div className="school-card">
            <img src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80" alt="School" className="school-img" />
            <h3>Global International</h3>
            <p style={{color: 'var(--text-dark)', marginTop: '0.5rem'}}>Full Digital Transformation</p>
          </div>
          <div className="school-card">
            <img src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80" alt="School" className="school-img" />
            <h3>Crescent High School</h3>
            <p style={{color: 'var(--text-dark)', marginTop: '0.5rem'}}>Award Winning Campus</p>
          </div>
        </div>
      </section>

      {/* News & Upcoming Events */}
      <section id="news" className="news-events">
        <h2 className="section-title">Latest News & Events</h2>
        <div className="landing-container news-grid">
          <div className="news-card">
            <span className="news-date">October 15, 2026</span>
            <h3>Edutech System V2.5 Released</h3>
            <p>We are thrilled to announce the launch of version 2.5, featuring AI-driven analytics, an enhanced parent portal, and seamless biometric attendance integration.</p>
          </div>
          <div className="news-card">
            <span className="news-date">November 2, 2026</span>
            <h3>Ministry of Education Partnership</h3>
            <p>Our system has been officially recognized and partnered with the Ministry of Education to drive the national digital learning initiative.</p>
          </div>
          <div className="news-card">
            <span className="news-date">Upcoming Event: Dec 10</span>
            <h3>Annual Edutech Conference</h3>
            <p>Join us in the capital for our annual summit where school administrators share their success stories and we reveal our 2027 roadmap.</p>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="gallery">
        <h2 className="section-title">System In Action</h2>
        <div className="landing-container gallery-grid">
          <img src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80" alt="System Interface" className="gallery-img" />
          <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80" alt="Students using system" className="gallery-img" />
          <img src="https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80" alt="Admin working" className="gallery-img" />
          <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80" alt="Conference" className="gallery-img" />
        </div>
      </section>

      {/* Testimonials */}
      <section id="impact" className="testimonials">
        <h2 className="section-title" style={{color: 'white'}}>Proven Impact</h2>
        <div className="landing-container testimonials-grid">
          <div className="testimonial-card">
            <span className="quote-icon">"</span>
            <p className="testimonial-text">"EduTech System has completely revolutionized how we run Excellence Academy. The automated fee tracking alone saved us countless hours."</p>
            <div className="testimonial-author">
              <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80" alt="Principal" className="author-img" />
              <div>
                <div>Dr. Samuel O.</div>
                <div style={{fontSize: '0.8rem', color: 'var(--text-dark)'}}>Principal, Excellence Academy</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <span className="quote-icon">"</span>
            <p className="testimonial-text">"The CBT portal is flawless. Managing thousands of students concurrently during exams used to be a nightmare, but now it's seamless."</p>
            <div className="testimonial-author">
              <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80" alt="Admin" className="author-img" />
              <div>
                <div>Sarah A.</div>
                <div style={{fontSize: '0.8rem', color: 'var(--text-dark)'}}>System Administrator</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact">
        <div className="landing-container">
          <div className="nav-logo" style={{marginBottom: '1rem'}}>EduTech Systems</div>
          <p style={{color: 'var(--text-dark)', marginBottom: '2rem'}}>Empowering the next generation of digital schools.</p>
          <div style={{display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem'}}>
            <span>contact@edutech.com</span>
            <span>+234 (0) 800 123 4567</span>
          </div>
          <p style={{fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)'}}>
            &copy; 2026 EduTech Systems. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default SuperAdminLandingPage;
