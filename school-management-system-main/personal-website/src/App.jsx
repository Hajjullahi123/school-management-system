import React from 'react';
import './App.css';

function App() {
  return (
    <div className="app-container">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-logo">EDUTECH<span className="text-accent">ADMIN</span></div>
        <ul className="nav-links">
          <li><a href="#home">Home</a></li>
          <li><a href="#system">The System</a></li>
          <li><a href="#schools">Top Schools</a></li>
          <li><a href="#news">News & Events</a></li>
          <li><a href="#gallery">Gallery</a></li>
          <li><a href="#impact">Testimonials</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-content">
          <span className="hero-subtitle animate-fade-in">Abdullahi Lawal | Super Admin & Owner</span>
          <h1 className="animate-fade-in delay-1">
            Transforming Education <br />
            Through <span className="text-accent">Innovation</span>
          </h1>
          <p className="animate-fade-in delay-2">
            I am the visionary behind the leading Edutech School Management System, 
            empowering institutions to streamline operations, enhance learning, and 
            build the schools of tomorrow.
          </p>
          <div className="hero-btns animate-fade-in delay-3">
            <a href="#contact" className="btn btn-primary">Partner With Us</a>
            <a href="#system" className="btn btn-outline">Explore System</a>
          </div>
        </div>
      </section>

      {/* The System Section */}
      <section id="system" className="system-section">
        <h2 className="section-title">Why Our System Leads The Market</h2>
        <div className="container features-grid">
          <div className="glass-panel feature-card">
            <div className="feature-icon">🚀</div>
            <h3>Seamless Automation</h3>
            <p>From admissions to grading, we automate all administrative bottlenecks so educators can focus on teaching.</p>
          </div>
          <div className="glass-panel feature-card">
            <div className="feature-icon">📊</div>
            <h3>Data-Driven Insights</h3>
            <p>Comprehensive analytics dashboards providing real-time insights into student performance and school operations.</p>
          </div>
          <div className="glass-panel feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Bank-Grade Security</h3>
            <p>Your data's integrity is our priority. We employ the highest encryption standards to protect sensitive information.</p>
          </div>
        </div>
      </section>

      {/* Testimonials (HiiT Inspired) */}
      <section id="impact" className="testimonials">
        <h2 className="section-title text-center" style={{color: 'white', marginBottom: '1rem'}}>TESTIMONIALS</h2>
        <p className="text-center" style={{color: 'var(--text-light)', marginBottom: '3rem', fontSize: '1.2rem', fontStyle: 'italic'}}>
          "it takes many good deeds to build a good reputation."
        </p>
        <div className="container testimonials-grid">
          <div className="testimonial-card">
            <div className="quote-icon">“</div>
            <p className="testimonial-text">
              On behalf of the Chairman Board of Trustee, we want to express our sincere appreciation for the 
              generous donation you have recently made to the foundation. Your commitment to helping the 
              youth is appreciated by those who help them and most importantly our beneficiaries.
            </p>
            <div className="testimonial-author">
              <img src="https://ui-avatars.com/api/?name=Solomon+Giwa&background=random" alt="Principal" className="author-img" />
              <div>
                Solomon Giwa Amu Foundation<br/>
                <span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>Educational Partner</span>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="quote-icon">“</div>
            <p className="testimonial-text">
              I was truly impressed by the manner and professionalism showcased by the system. I can 
              say for a fact that the program has been priceless and even surpassed my level of 
              expectation. The instructor has vast knowledge and made learning fun & interesting.
            </p>
            <div className="testimonial-author">
              <img src="https://ui-avatars.com/api/?name=IBM+Systems+Engineer&background=random" alt="Administrator" className="author-img" />
              <div>
                IBM Systems Engineer<br/>
                <span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>IBM Service Support Representative</span>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="quote-icon">“</div>
            <p className="testimonial-text">
              The classes are well segmented and very cool for learning. The Instructor is highly skilled & 
              equipped in delivering lectures. The study materials provided are at par compared to 
              anywhere in the world. Learning with Edutech is the best experience anybody can have.
            </p>
            <div className="testimonial-author">
              <img src="https://ui-avatars.com/api/?name=Sarah+O&background=random" alt="Student" className="author-img" />
              <div>
                Sarah O.<br/>
                <span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>System User</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Schools Showcase */}
      <section id="schools" className="top-schools">
        <h2 className="section-title">Top Performing Schools</h2>
        <div className="container schools-grid">
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
        <div className="container news-grid">
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
        <div className="container gallery-grid">
          <img src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80" alt="System Interface" className="gallery-img" />
          <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80" alt="Students using system" className="gallery-img" />
          <img src="https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80" alt="Admin working" className="gallery-img" />
          <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80" alt="Conference" className="gallery-img" />
        </div>
      </section>

      {/* Footer */}
      <footer id="contact">
        <div className="container">
          <h2>Ready to Upgrade Your School?</h2>
          <p style={{margin: '1.5rem 0', color: 'var(--text-dark)'}}>Contact me directly to discuss implementing our Edutech System in your institution.</p>
          <a href="mailto:edutechnig@gmail.com" className="btn btn-primary">Send an Email</a>
          <p style={{marginTop: '4rem', fontSize: '0.9rem', color: 'var(--text-dark)'}}>
            &copy; {new Date().getFullYear()} Abdullahi Lawal. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
