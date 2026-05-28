import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiMapPin,
  FiPhone,
  FiMail,
  FiMenu,
  FiX,
  FiAward,
  FiUsers,
  FiBookOpen,
  FiActivity,
  FiCheckCircle,
  FiChevronRight,
  FiSend,
  FiClock,
  FiStar,
  FiVolume2,
  FiFacebook,
  FiInstagram,
  FiMessageCircle,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL } from '../../config';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const hexToRgba = (hex = '#4f46e5', alpha = 1) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
};

const darkenHex = (hex = '#4f46e5', pct = 0.15) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  const r = Math.max(0, ((num >> 16) & 255) - Math.round(255 * pct));
  const g = Math.max(0, ((num >> 8) & 255) - Math.round(255 * pct));
  const b = Math.max(0, (num & 255) - Math.round(255 * pct));
  return `rgb(${r},${g},${b})`;
};

const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'SC';

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
const ThemeModern = ({ school, getLogoUrl }) => {
  const primary   = school?.primaryColor   || '#4f46e5';
  const secondary = school?.secondaryColor || '#6366f1';

  const [slide, setSlide]               = useState(0);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [subscribed, setSubscribed]     = useState(false);
  const [newsletter, setNewsletter]     = useState('');
  const [topStudents, setTopStudents]   = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', phone: '', grade: '', message: '' });

  /* hero images */
  const heroImages =
    school?.GalleryImage?.length > 0
      ? school.GalleryImage.map(g => getLogoUrl(g.imageUrl))
      : ['/images/hero_exterior.png', '/images/hero_students.png', '/images/hero_lab.png'];

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const t = setInterval(() => setSlide(p => (p + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, [heroImages.length]);

  /* top students */
  useEffect(() => {
    if (!school?.id) return;
    fetch(`${API_BASE_URL}/api/top-students/top-students?limit=4&schoolId=${school.id}`)
      .then(r => r.json())
      .then(d => setTopStudents(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, [school?.id]);

  /* testimonials */
  const defaultTestimonials = [
    { name: 'Mrs. Fatima Bello', subtitle: 'Parent of JSS-3 Student', rating: 5, quote: 'The teachers are incredibly dedicated and the academic standard has improved my child tremendously. We are so proud of the results.' },
    { name: 'Mr. Chukwuemeka Obi', subtitle: 'Parent since 2022', rating: 5, quote: 'Excellent school management. Communication is prompt, fees are transparent, and the overall environment is safe and disciplined.' },
  ];
  const parsedTestimonials = school?.testimonialsText
    ? school.testimonialsText.split('\n').map(l => {
        const p = l.split('|').map(x => x.trim());
        if (p.length >= 4) return { name: p[0], subtitle: p[1], rating: parseInt(p[2]) || 5, quote: p[3] };
        return null;
      }).filter(Boolean)
    : [];
  const testimonials = parsedTestimonials.length > 0 ? parsedTestimonials : defaultTestimonials;

  /* form handlers */
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/public-school/${school.slug}/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentName: form.name, email: form.email, phone: form.phone, gradeLevel: form.grade, message: form.message }),
      });
      if (res.ok) { setSubmitted(true); setForm({ name: '', email: '', phone: '', grade: '', message: '' }); }
    } catch {}
  };

  const handleNewsletter = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/public-school/${school.slug}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletter }),
      });
      if (res.ok) { setSubscribed(true); setNewsletter(''); }
    } catch {}
  };

  /* ── shared style tokens ── */
  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-transparent transition-all';
  const inputFocus = { boxShadow: `0 0 0 3px ${hexToRgba(primary, 0.18)}` };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-gray-800" style={{ '--primary': primary, '--secondary': secondary }}>

      {/* ── Global Styles ── */}
      <style>{`
        ::selection { background: ${hexToRgba(primary, 0.15)}; color: ${primary}; }

        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .ticker-track { display: flex; white-space: nowrap; animation: ticker 40s linear infinite; }
        .ticker-track:hover { animation-play-state: paused; }

        .fade-in { animation: fadeIn 0.4s ease both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }

        .section-label {
          display: inline-block;
          padding: 4px 14px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          background: ${hexToRgba(primary, 0.1)};
          color: ${primary};
          margin-bottom: 14px;
        }
      `}</style>

      {/* ══════════════════════════════════
          ANNOUNCEMENT TICKER
      ══════════════════════════════════ */}
      <div
        className="text-white py-2 overflow-hidden flex items-center relative z-50"
        style={{ background: `linear-gradient(90deg, ${primary}, ${darkenHex(primary, 0.12)})` }}
      >
        <div className="shrink-0 flex items-center gap-2 px-4 bg-black/20 h-full absolute left-0 top-0 bottom-0 z-10 border-r border-white/10">
          <FiVolume2 className="w-3.5 h-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Announcements</span>
        </div>
        <div className="overflow-hidden pl-40 w-full">
          <div className="ticker-track text-xs font-medium gap-0">
            {[
              `📣 Admissions open for the new academic session — ${school?.name}`,
              `📞 Contact us: ${school?.phone || 'visit our school'}`,
              `📧 Email: ${school?.email || 'for enquiries'}`,
              `🏫 ${school?.motto || 'Excellence in Education'}`,
              `📣 Admissions open for the new academic session — ${school?.name}`,
              `📞 Contact us: ${school?.phone || 'visit our school'}`,
              `📧 Email: ${school?.email || 'for enquiries'}`,
              `🏫 ${school?.motto || 'Excellence in Education'}`,
            ].map((t, i) => (
              <span key={i} className="mx-8 opacity-90">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          HEADER / NAVIGATION
      ══════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 h-18 flex items-center justify-between" style={{ height: 68 }}>
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
              {school?.logoUrl
                ? <img src={getLogoUrl(school.logoUrl)} alt="" className="w-full h-full object-contain p-0.5" onError={e => { e.target.style.display = 'none'; }} />
                : <span className="text-lg font-black text-gray-300">{school?.name?.[0]}</span>
              }
            </div>
            <span className="font-black text-gray-900 text-base md:text-lg tracking-tight leading-tight hidden sm:block max-w-[200px] md:max-w-none">
              {school?.name}
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {school?.customPages?.map(p => (
              <Link key={p.slug} to={`/${school.slug}/page/${p.slug}`}
                className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
                {p.title}
              </Link>
            ))}
            <a href="#admission-process"
              className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
              Admissions
            </a>
            <a href="#contact-section"
              className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
              Contact
            </a>
            <Link to={`/${school?.slug}/login`}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold text-white shadow-md hover:opacity-90 hover:shadow-lg transition-all"
              style={{ backgroundColor: primary }}>
              Portal Login <FiArrowRight className="w-4 h-4" />
            </Link>
          </nav>

          {/* Mobile Toggle */}
          <button className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-5 py-4 flex flex-col gap-3 fade-in">
            {school?.customPages?.map(p => (
              <Link key={p.slug} to={`/${school.slug}/page/${p.slug}`}
                className="text-sm font-semibold text-gray-700 py-2"
                onClick={() => setMobileOpen(false)}>
                {p.title}
              </Link>
            ))}
            <a href="#admission-process" className="text-sm font-semibold text-gray-700 py-2" onClick={() => setMobileOpen(false)}>Admissions</a>
            <a href="#contact-section" className="text-sm font-semibold text-gray-700 py-2" onClick={() => setMobileOpen(false)}>Contact</a>
            <Link to={`/${school?.slug}/login`}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: primary }}
              onClick={() => setMobileOpen(false)}>
              Portal Login <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════
          HERO SECTION
      ══════════════════════════════════ */}
      <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden bg-gray-950">
        {/* Background image slideshow */}
        {heroImages.map((img, i) => (
          <div key={i}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: i === slide ? 1 : 0 }}>
            <img src={img} alt="" className="w-full h-full object-cover" />
          </div>
        ))}

        {/* Gradient overlays — give legible text on any image */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/70 via-gray-950/50 to-gray-950/80" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${hexToRgba(primary, 0.35)} 0%, transparent 60%)` }} />

        {/* Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-5 py-24">
          {school?.motto && (
            <span className="inline-block mb-5 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-white text-xs font-bold tracking-widest uppercase">
              ✦ {school.motto}
            </span>
          )}

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.08] tracking-tight mb-6 drop-shadow-lg">
            {school?.welcomeTitle || `Welcome to\n${school?.name}`}
          </h1>

          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed mb-10">
            {school?.welcomeMessage || 'Providing an environment where every student achieves their full potential through academic excellence, character, and innovation.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={`/${school?.slug}/login`}
              className="px-8 py-4 rounded-full font-black text-base text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
              style={{ backgroundColor: primary }}>
              Access Student Portal
            </Link>
            <a href="#admission-process"
              className="px-8 py-4 rounded-full font-bold text-base text-white border border-white/30 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all">
              Apply for Admission
            </a>
          </div>

          {/* Slide dots */}
          {heroImages.length > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {heroImages.map((_, i) => (
                <button key={i} onClick={() => setSlide(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === slide ? 28 : 8,
                    height: 8,
                    backgroundColor: i === slide ? 'white' : 'rgba(255,255,255,0.35)',
                  }} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════
          STATS BAR
      ══════════════════════════════════ */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-5 py-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
            {[
              { icon: <FiBookOpen className="w-5 h-5" />, value: '100%', label: 'Graduation Rate' },
              { icon: <FiUsers className="w-5 h-5" />, value: '10:1', label: 'Student–Teacher Ratio' },
              { icon: <FiActivity className="w-5 h-5" />, value: '15+', label: 'Extracurricular Clubs' },
              { icon: <FiAward className="w-5 h-5" />, value: '100%', label: 'University Admittance' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center justify-center gap-2 py-8 px-4 group hover:bg-gray-50 transition-colors text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                  style={{ backgroundColor: hexToRgba(primary, 0.1), color: primary }}>
                  {s.icon}
                </div>
                <span className="text-3xl font-black" style={{ color: primary }}>{s.value}</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          ABOUT + CORE PILLARS
      ══════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left – school image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-100 aspect-[4/3] lg:aspect-auto lg:h-[480px]">
              {heroImages[0] && (
                <img src={heroImages[0]} alt="Campus" className="w-full h-full object-cover" />
              )}
              {/* Gradient at bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent" />

              {/* School badge */}
              {school?.logoUrl && (
                <div className="absolute bottom-5 left-5 flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border border-gray-100">
                  <img src={getLogoUrl(school.logoUrl)} alt="" className="w-10 h-10 object-contain"
                    onError={e => { e.target.parentElement.style.display = 'none'; }} />
                  <div>
                    <p className="font-black text-gray-900 text-sm leading-tight">{school?.name}</p>
                    <p className="text-xs text-gray-400 font-semibold">Institution of Excellence</p>
                  </div>
                </div>
              )}

              {/* About us text overlay pill */}
              {school?.motto && (
                <div className="absolute top-5 right-5 px-3 py-1.5 rounded-full text-xs font-bold text-white border border-white/20 bg-black/30 backdrop-blur-sm">
                  {school.motto}
                </div>
              )}
            </div>

            {/* Right – text content */}
            <div className="space-y-6">
              <span className="section-label">About Our School</span>

              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-tight tracking-tight">
                Building Future-Ready <span style={{ color: primary }}>Leaders</span>
              </h2>

              <div className="text-gray-600 leading-relaxed text-[15px]">
                {school?.aboutUsText ? (
                  <div className="prose prose-sm max-w-none prose-headings:font-black prose-a:no-underline">
                    <ReactMarkdown>{school.aboutUsText}</ReactMarkdown>
                  </div>
                ) : (
                  <p>
                    We provide a supportive and innovative learning environment where every student can achieve their full
                    potential. Our comprehensive programmes blend academic rigour, moral character development, and
                    vocational skills to prepare students for success in an ever-changing world.
                  </p>
                )}
              </div>

              {/* Core Pillars */}
              <div className="space-y-4 pt-2">
                {[
                  { title: 'Expert Faculty & Departments', body: 'Certified, passionate educators delivering curriculum-aligned, rigorous instruction tailored to each student.' },
                  { title: 'Modern Facilities & Labs', body: 'Science labs, coding suites, libraries, and sports infrastructure for holistic student development.' },
                  { title: 'Technology & Vocational Blend', body: 'Robotics, digital literacy, and entrepreneurship programmes embedded across all classes.' },
                ].map((pillar, i) => (
                  <div key={i}
                    className="flex gap-4 p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    style={{ backgroundColor: hexToRgba(primary, 0.04), borderColor: hexToRgba(primary, 0.15) }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: primary, color: '#fff' }}>
                      <FiCheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm mb-1">{pillar.title}</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">{pillar.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="section-label">What Parents Say</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
              Community Testimonials
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm leading-relaxed">
              Real experiences from parents and guardians about the impact of our school.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <div key={i}
                className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col">
                {/* Stars */}
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <FiStar key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="text-gray-700 italic leading-relaxed text-[15px] flex-1 mb-6">
                  "{t.quote}"
                </p>

                <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"
                    style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                    {getInitials(t.name)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          TOP STUDENTS
      ══════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="section-label">Excellence Recognised</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
              Our Top Performers
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm">
              Celebrating outstanding academic achievement across all classes.
            </p>
          </div>

          {loadingStudents ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-64" />
              ))}
            </div>
          ) : topStudents.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {topStudents.map((student, i) => (
                <div key={i}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                  {/* Card top */}
                  <div className="h-28 flex items-center justify-center relative"
                    style={{ background: `linear-gradient(135deg, ${hexToRgba(primary, 0.12)}, ${hexToRgba(secondary, 0.08)})` }}>
                    <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: primary }}>
                      🏆 #{i + 1}
                    </div>
                    <div className="w-16 h-16 rounded-full bg-white border-2 overflow-hidden flex items-center justify-center shadow-md"
                      style={{ borderColor: primary }}>
                      {student.photo
                        ? <img src={student.photo.startsWith('http') || student.photo.startsWith('data:') ? student.photo : `${API_BASE_URL}${student.photo}`}
                            alt={student.name} className="w-full h-full object-cover" />
                        : <span className="text-xl font-black text-gray-300">{getInitials(student.name)}</span>
                      }
                    </div>
                  </div>
                  {/* Card body */}
                  <div className="p-4 text-center">
                    <p className="font-bold text-gray-900 text-sm leading-tight mb-0.5">{student.name}</p>
                    <p className="text-xs text-gray-400 mb-3">{student.class}</p>
                    <div className="text-2xl font-black mb-0.5" style={{ color: primary }}>{student.average}</div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Average Score</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-3xl border border-gray-100">
              <FiAward className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Results not yet published for this term.</p>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════
          NEWS & EVENTS
      ══════════════════════════════════ */}
      {school?.newsEvents?.length > 0 && (
        <section className="py-20 md:py-28 bg-gray-50 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-5">
            <div className="text-center mb-14">
              <span className="section-label">Stay Updated</span>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                News &amp; Events
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {school.newsEvents.map((item, i) => (
                <div key={i}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  <div className="h-44 bg-gray-100 overflow-hidden relative">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: hexToRgba(primary, 0.08) }}>
                        <FiVolume2 className="w-10 h-10" style={{ color: hexToRgba(primary, 0.4) }} />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: primary }}>
                      {item.type}
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <p className="text-xs text-gray-400 font-semibold mb-2">
                      {new Date(item.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2 line-clamp-2">{item.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 flex-1">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════
          ADMISSIONS SECTION
      ══════════════════════════════════ */}
      <section id="admission-process" className="py-20 md:py-28 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid lg:grid-cols-2 gap-12 items-start">

            {/* Steps */}
            <div className="space-y-8">
              <div>
                <span className="section-label">Join Our School</span>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">
                  Admissions <span style={{ color: primary }}>Process</span>
                </h2>
                <p className="text-gray-500 mt-3 text-sm leading-relaxed max-w-md">
                  We are delighted you are considering {school?.name}. Our admissions process is simple and welcoming.
                </p>
              </div>

              <div className="relative pl-8 space-y-8" style={{ borderLeft: `2px solid ${hexToRgba(primary, 0.2)}` }}>
                {[
                  { step: '1', title: 'Submit an Enquiry', body: 'Fill in the form on the right. Our admissions desk will reach out within 24 hours.' },
                  { step: '2', title: 'Entrance Assessment', body: 'Visit the school, meet our staff, and complete a brief academic assessment.' },
                  { step: '3', title: 'Enrolment & Resumption', body: 'Submit documents, complete portal setup, and your child is ready to begin!' },
                ].map((s, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[41px] w-7 h-7 rounded-full bg-white border-2 flex items-center justify-center text-xs font-black shadow-sm"
                      style={{ borderColor: primary, color: primary }}>
                      {s.step}
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{s.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{s.body}</p>
                  </div>
                ))}
              </div>

              {school?.admissionGuideFileUrl && (
                <a href={school.admissionGuideFileUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold hover:gap-3 transition-all"
                  style={{ color: primary }}>
                  Download Admissions Guide <FiArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Enquiry Form */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-8">
              <h3 className="text-xl font-black text-gray-900 mb-1">Request Admission Info</h3>
              <p className="text-sm text-gray-500 mb-6">We will contact you within 24 hours.</p>

              {submitted ? (
                <div className="text-center py-12 fade-in">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
                    style={{ backgroundColor: hexToRgba(primary, 0.1), color: primary }}>
                    ✓
                  </div>
                  <h4 className="font-black text-gray-900 text-lg mb-2">Request Received!</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Thank you. Our admissions team will contact you shortly.
                  </p>
                  <button onClick={() => setSubmitted(false)}
                    className="text-xs font-bold underline" style={{ color: primary }}>
                    Submit another request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Parent / Guardian Name</label>
                    <input type="text" required placeholder="e.g. Aisha Musa"
                      className={inputCls}
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      onFocus={e => Object.assign(e.target.style, inputFocus)}
                      onBlur={e => { e.target.style.boxShadow = ''; }} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
                      <input type="email" required placeholder="you@email.com"
                        className={inputCls}
                        value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                        onFocus={e => Object.assign(e.target.style, inputFocus)}
                        onBlur={e => { e.target.style.boxShadow = ''; }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Phone Number</label>
                      <input type="tel" required placeholder="+234..."
                        className={inputCls}
                        value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                        onFocus={e => Object.assign(e.target.style, inputFocus)}
                        onBlur={e => { e.target.style.boxShadow = ''; }} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Grade Level Seeking</label>
                    <select required className={inputCls}
                      value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}
                      onFocus={e => Object.assign(e.target.style, inputFocus)}
                      onBlur={e => { e.target.style.boxShadow = ''; }}>
                      <option value="">Select grade level</option>
                      {['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Message (optional)</label>
                    <textarea rows={3} placeholder="Any questions or notes..."
                      className={`${inputCls} resize-none`}
                      value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                      onFocus={e => Object.assign(e.target.style, inputFocus)}
                      onBlur={e => { e.target.style.boxShadow = ''; }} />
                  </div>

                  <button type="submit"
                    className="w-full py-3.5 rounded-xl font-black text-white flex items-center justify-center gap-2 hover:opacity-90 hover:shadow-lg transition-all"
                    style={{ backgroundColor: primary }}>
                    <FiSend className="w-4 h-4" /> Send Enquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          NEWSLETTER BANNER
      ══════════════════════════════════ */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-5">
          <div className="rounded-3xl p-10 text-white text-center relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${primary} 0%, ${darkenHex(primary, 0.18)} 100%)` }}>
            {/* Subtle dot grid */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            <div className="relative z-10">
              <h3 className="text-2xl font-black mb-2">Stay Connected</h3>
              <p className="text-white/75 text-sm mb-6 max-w-sm mx-auto">
                Subscribe for school news, event announcements, and academic updates.
              </p>

              {subscribed ? (
                <div className="inline-block px-6 py-3 rounded-xl bg-white/20 border border-white/30 text-white font-bold text-sm">
                  ✓ Subscribed successfully!
                </div>
              ) : (
                <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input type="email" required placeholder="Enter your email address"
                    value={newsletter} onChange={e => setNewsletter(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-full text-gray-800 text-sm focus:outline-none bg-white" />
                  <button type="submit"
                    className="px-6 py-3 rounded-full font-black text-sm bg-white hover:bg-gray-100 transition-colors whitespace-nowrap"
                    style={{ color: primary }}>
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          CONTACT SECTION
      ══════════════════════════════════ */}
      <section id="contact-section" className="py-20 md:py-28 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid lg:grid-cols-2 gap-12">

            {/* Info cards */}
            <div className="space-y-6">
              <div>
                <span className="section-label">Get in Touch</span>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Contact Us</h2>
                <p className="text-gray-500 mt-3 text-sm">
                  Reach out directly or visit us during working hours.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  school?.address && { icon: <FiMapPin className="w-5 h-5" />, label: 'Our Campus', value: school.address },
                  school?.phone   && { icon: <FiPhone className="w-5 h-5" />, label: 'Phone', value: school.phone, href: `tel:${school.phone}` },
                  school?.email   && { icon: <FiMail className="w-5 h-5" />, label: 'Email', value: school.email, href: `mailto:${school.email}` },
                  school?.openingHours && { icon: <FiClock className="w-5 h-5" />, label: 'Office Hours', value: school.openingHours },
                ].filter(Boolean).map((c, i) => (
                  <div key={i} className="p-5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-gray-100/70 transition-colors">
                    <div className="mb-2" style={{ color: primary }}>{c.icon}</div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{c.label}</p>
                    {c.href
                      ? <a href={c.href} className="text-sm font-semibold text-gray-800 hover:underline break-all">{c.value}</a>
                      : <p className="text-sm font-semibold text-gray-800">{c.value}</p>
                    }
                  </div>
                ))}
              </div>
            </div>

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm h-80 lg:h-auto lg:min-h-[360px] bg-gray-100">
              {school?.address ? (
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(school.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  width="100%" height="100%"
                  style={{ border: 0, minHeight: 300 }}
                  allowFullScreen loading="lazy"
                  title="School Location" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <FiMapPin className="w-10 h-10" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          FOOTER
      ══════════════════════════════════ */}
      <footer className="bg-gray-950 text-gray-400 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">

            {/* Brand column */}
            <div className="sm:col-span-2 lg:col-span-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                  {school?.logoUrl
                    ? <img src={getLogoUrl(school.logoUrl)} alt="" className="w-7 h-7 object-contain" />
                    : <span className="text-sm font-black text-gray-600">{school?.name?.[0]}</span>
                  }
                </div>
                <span className="font-black text-white text-base tracking-tight">{school?.name}</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                Empowering the next generation through academic excellence, moral development, and innovation.
              </p>
              {/* Social icons */}
              <div className="flex gap-2 pt-1">
                {school?.facebookUrl && (
                  <a href={school.facebookUrl} target="_blank" rel="noreferrer"
                    className="w-9 h-9 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-blue-600 hover:border-blue-600 transition-all">
                    <FiFacebook className="w-4 h-4" />
                  </a>
                )}
                {school?.instagramUrl && (
                  <a href={school.instagramUrl} target="_blank" rel="noreferrer"
                    className="w-9 h-9 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-pink-600 hover:border-pink-600 transition-all">
                    <FiInstagram className="w-4 h-4" />
                  </a>
                )}
                {school?.whatsappUrl && (
                  <a href={school.whatsappUrl} target="_blank" rel="noreferrer"
                    className="w-9 h-9 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-green-600 hover:border-green-600 transition-all">
                    <FiMessageCircle className="w-4 h-4" />
                  </a>
                )}
                {school?.email && (
                  <a href={`mailto:${school.email}`}
                    className="w-9 h-9 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600 hover:border-red-600 transition-all">
                    <FiMail className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-5">Quick Links</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Student Portal', href: `/${school?.slug}/login`, internal: true },
                  { label: 'Admission Enquiry', href: '#admission-process' },
                  school?.eLibraryUrl && { label: 'E-Library', href: school.eLibraryUrl, external: true },
                  school?.alumniNetworkUrl && { label: 'Alumni Network', href: school.alumniNetworkUrl, external: true },
                ].filter(Boolean).map((l, i) => (
                  <li key={i}>
                    {l.internal
                      ? <Link to={l.href} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors">
                          <FiChevronRight className="w-3.5 h-3.5" style={{ color: primary }} />{l.label}
                        </Link>
                      : <a href={l.href} target={l.external ? '_blank' : undefined} rel="noreferrer"
                          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors">
                          <FiChevronRight className="w-3.5 h-3.5" style={{ color: primary }} />{l.label}
                        </a>
                    }
                  </li>
                ))}
              </ul>
            </div>

            {/* Documents */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-5">Documents</h4>
              <ul className="space-y-3">
                {[
                  school?.brochureFileUrl && { label: 'School Prospectus', href: school.brochureFileUrl },
                  school?.admissionGuideFileUrl && { label: 'Admissions Guide', href: school.admissionGuideFileUrl },
                ].filter(Boolean).map((l, i) => (
                  <li key={i}>
                    <a href={l.href} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors">
                      <FiChevronRight className="w-3.5 h-3.5" style={{ color: primary }} />{l.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="#admission-process"
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors">
                    <FiChevronRight className="w-3.5 h-3.5" style={{ color: primary }} />Curriculum Overview
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-5">Contact</h4>
              <ul className="space-y-3">
                {school?.address && (
                  <li className="flex gap-2 text-sm text-gray-500">
                    <FiMapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: primary }} />
                    <span className="leading-relaxed">{school.address}</span>
                  </li>
                )}
                {school?.phone && (
                  <li>
                    <a href={`tel:${school.phone}`} className="flex gap-2 text-sm text-gray-500 hover:text-white transition-colors">
                      <FiPhone className="w-4 h-4 shrink-0" style={{ color: primary }} />{school.phone}
                    </a>
                  </li>
                )}
                {school?.email && (
                  <li>
                    <a href={`mailto:${school.email}`} className="flex gap-2 text-sm text-gray-500 hover:text-white transition-colors break-all">
                      <FiMail className="w-4 h-4 shrink-0 mt-0.5" style={{ color: primary }} />{school.email}
                    </a>
                  </li>
                )}
                {school?.openingHours && (
                  <li className="flex gap-2 text-sm text-gray-500">
                    <FiClock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: primary }} />{school.openingHours}
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-widest">
              © {new Date().getFullYear()} {school?.name}. All rights reserved.
            </p>
            <p className="text-xs text-gray-700">
              Powered by <span className="text-gray-500 font-black">EduTechAI Platform</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ThemeModern;
