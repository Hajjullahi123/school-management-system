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
  FiTwitter,
  FiYoutube,
  FiLinkedin,
  FiChevronDown,
  FiMoon,
  FiSun,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../../config';
import FloatingContactWidget from '../../components/FloatingContactWidget';
import InteractiveTimelineWidget from '../../components/InteractiveTimelineWidget';
import TuitionEstimatorWidget from '../../components/TuitionEstimatorWidget';
import AccreditationsBand from '../../components/AccreditationsBand';
import FaqWidget from '../../components/FaqWidget';

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
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen flex flex-col font-sans text-gray-800 dark:text-gray-100 overflow-x-hidden transition-colors duration-300" style={{ '--primary': primary, '--secondary': secondary, backgroundColor: isDarkMode ? '#0f172a' : '#f0f7ff' }}>

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
        className="text-white py-2 flex items-stretch relative z-50"
        style={{ background: `linear-gradient(90deg, ${primary}, ${darkenHex(primary, 0.12)})` }}
      >
        <div className="shrink-0 flex items-center gap-2 px-4 bg-black/20 z-10 border-r border-white/10 relative">
          <FiVolume2 className="w-3.5 h-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap hidden sm:inline">Announcements</span>
        </div>
        
        <div className="flex-1 overflow-hidden relative flex items-center">
          <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none" style={{ background: `linear-gradient(to right, ${primary}, transparent)` }}></div>
          <div className="ticker-track text-xs font-medium gap-0 w-full flex items-center shrink-0">
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
              <span key={i} className="mx-8 opacity-90 shrink-0">{t}</span>
            ))}
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-5 h-18 flex items-center justify-between" style={{ height: 68 }}>
          {/* Brand */}
          <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
              {school?.logoUrl
                ? <img src={getLogoUrl(school.logoUrl)} alt="" className="w-full h-full object-contain p-0.5" onError={e => { e.target.style.display = 'none'; }} />
                : <span className="text-lg font-black text-gray-300">{school?.name?.[0]}</span>
              }
            </div>
            <span className="font-black text-gray-900 dark:text-white text-xs md:text-lg tracking-tight leading-tight line-clamp-2">
              {school?.name}
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-2">
            {school?.customPages?.map(p => (
              <Link key={p.slug} to={`/${school.slug}/page/${p.slug}`}
                className="text-sm font-bold text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl border border-transparent hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-100 dark:hover:border-slate-700 hover:shadow-sm transition-all">
                {p.title}
              </Link>
            ))}
            <button onClick={() => setIsFaqModalOpen(true)}
              className="text-sm font-bold text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl border border-transparent hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-100 dark:hover:border-slate-700 hover:shadow-sm transition-all">
              FAQs
            </button>
            <Link to={`/${school?.slug}/staff`}
              className="text-sm font-bold text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl border border-transparent hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-100 dark:hover:border-slate-700 hover:shadow-sm transition-all">
              Our Staff
            </Link>
            <div className="relative group py-2">
              <button className="flex items-center gap-1 text-sm font-bold text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl border border-transparent hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-100 dark:hover:border-slate-700 hover:shadow-sm transition-all focus:outline-none">
                Alumni <FiChevronDown className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" />
              </button>
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-1.5">
                <Link to="/alumni" className="block px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-all rounded-xl mx-1.5">
                  Alumni Portal
                </Link>
                <Link to={`/${school?.slug}/higher-students`} className="block px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-all rounded-xl mx-1.5">
                  Higher Inst. Students
                </Link>
              </div>
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-600 dark:text-gray-300">
              {isDarkMode ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
            </button>
            <Link to={`/${school?.slug}/login`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all ml-2"
              style={{ background: `linear-gradient(135deg, ${primary}, ${darkenHex(primary, 0.14)})` }}>
              Portal Login <FiArrowRight className="w-4 h-4" />
            </Link>
          </nav>

          {/* Mobile Toggle */}
          <button className="lg:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 px-5 py-4 flex flex-col gap-2 fade-in shadow-xl relative z-50">
            {school?.customPages?.map(p => (
              <Link key={p.slug} to={`/${school.slug}/page/${p.slug}`}
                className="text-sm font-bold text-gray-600 dark:text-gray-300 px-4 py-3 rounded-xl border border-transparent hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-100 dark:hover:border-slate-700 transition-all"
                onClick={() => setMobileOpen(false)}>
                {p.title}
              </Link>
            ))}
            <Link to={`/${school?.slug}/higher-students`} className="text-sm font-bold text-gray-600 px-4 py-3 rounded-xl border border-transparent hover:bg-gray-50 hover:border-gray-100 transition-all" onClick={() => setMobileOpen(false)}>Higher Inst. Students</Link>
            <Link to="/alumni" className="text-sm font-bold text-gray-600 px-4 py-3 rounded-xl border border-transparent hover:bg-gray-50 hover:border-gray-100 transition-all" onClick={() => setMobileOpen(false)}>Alumni</Link>
            <Link to={`/${school?.slug}/admissions`} className="text-sm font-bold text-gray-600 px-4 py-3 rounded-xl border border-transparent hover:bg-gray-50 hover:border-gray-100 transition-all" onClick={() => setMobileOpen(false)}>Admissions</Link>
            <Link to={`/${school?.slug}/contact`} className="text-sm font-bold text-gray-600 px-4 py-3 rounded-xl border border-transparent hover:bg-gray-50 hover:border-gray-100 transition-all" onClick={() => setMobileOpen(false)}>Contact</Link>
            <Link to={`/${school?.slug}/login`}
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold text-white shadow-md mt-2"
              style={{ background: `linear-gradient(135deg, ${primary}, ${darkenHex(primary, 0.14)})` }}
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
      <section className="bg-white dark:bg-slate-900 border-b border-blue-100 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-5 py-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
            {[
              { icon: <FiBookOpen className="w-5 h-5" />, value: '100%', label: 'Graduation Rate' },
              { icon: <FiUsers className="w-5 h-5" />, value: '10:1', label: 'Student–Teacher Ratio' },
              { icon: <FiActivity className="w-5 h-5" />, value: '15+', label: 'Extracurricular Clubs' },
              { icon: <FiAward className="w-5 h-5" />, value: '100%', label: 'University Admittance' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center justify-center gap-2 py-5 px-4 group hover:bg-blue-50 transition-colors text-center">
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
      <section className="py-10 md:py-14 bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid lg:grid-cols-2 gap-12 items-stretch">

            {/* Left – school image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-100 min-h-[320px] h-full">
              {heroImages[0] && (
                <img src={heroImages[0]} alt="Campus" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {/* Gradient at bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent" />

              {/* School badge */}
              {school?.logoUrl && (
                <div className="absolute bottom-5 left-5 right-5 sm:right-auto sm:max-w-sm flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-2xl px-3 sm:px-4 py-3 shadow-lg border border-gray-100 overflow-hidden">
                  <div className="shrink-0">
                    <img src={getLogoUrl(school.logoUrl)} alt="" className="w-10 h-10 object-contain"
                      onError={e => { e.target.parentElement.style.display = 'none'; }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 text-sm leading-tight line-clamp-2">{school?.name}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 font-semibold truncate mt-0.5">Institution of Excellence</p>
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
            <div className="space-y-6 w-full">
              <span className="section-label">About Our School</span>

              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight tracking-tight w-full text-left">
                Building Future-Ready <span style={{ color: primary }}>Leaders</span>
              </h2>

              <div className="text-gray-600 dark:text-gray-300 leading-relaxed text-[15px] w-full text-justify">
                {school?.aboutUsText ? (
                  <div className="prose prose-sm max-w-none w-full text-justify prose-headings:font-black prose-a:no-underline prose-p:text-justify">
                    <ReactMarkdown>{school.aboutUsText}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="w-full text-justify">
                    We provide a supportive and innovative learning environment where every student can achieve their full
                    potential. Our comprehensive programmes blend academic rigour, moral character development, and
                    vocational skills to prepare students for success in an ever-changing world.
                  </p>
                )}
              </div>

              {/* Founding Year — full-width prominent card */}
              {school?.foundedYear && (
                <div className="flex items-center gap-2 sm:gap-4 w-full px-3 sm:px-4 py-3 rounded-2xl overflow-hidden"
                  style={{ backgroundColor: hexToRgba(primary, 0.07), border: `1px solid ${hexToRgba(primary, 0.2)}` }}>
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 text-xl"
                    style={{ backgroundColor: hexToRgba(primary, 0.15) }}>
                    🗓️
                  </div>
                  <div className="shrink-0">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Year Established</p>
                    <p className="text-xl sm:text-2xl font-black leading-none mt-1" style={{ color: primary }}>{school.foundedYear}</p>
                  </div>
                  <div className="ml-auto h-8 sm:h-10 w-px shrink-0 mx-1 sm:mx-0" style={{ backgroundColor: hexToRgba(primary, 0.2) }} />
                  <p className="text-[10px] sm:text-xs text-gray-500 font-medium leading-snug text-right flex-1 min-w-0 max-w-[100px] sm:max-w-[120px]">
                    Years of Educational Excellence
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* Core Pillars — Moved below the About grid for a clean, balanced layout */}
          <div className="grid md:grid-cols-3 gap-6 mt-12 w-full">
            {[
              { title: 'Expert Faculty & Departments', body: 'Certified, passionate educators delivering curriculum-aligned, rigorous instruction tailored to each student.' },
              { title: 'Modern Facilities & Labs', body: 'Science labs, coding suites, libraries, and sports infrastructure for holistic student development.' },
              { title: 'Technology & Vocational Blend', body: 'Robotics, digital literacy, and entrepreneurship programmes embedded across all classes.' },
            ].map((pillar, i) => (
              <div key={i}
                className="flex gap-4 p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md transform-gpu"
                style={{ backgroundColor: hexToRgba(primary, 0.04), borderColor: hexToRgba(primary, 0.15) }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{ backgroundColor: primary, color: '#fff' }}>
                  <FiCheckCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1 text-left">{pillar.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-left">{pillar.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════ */}
      <section className="py-10 md:py-14 border-t border-blue-100 dark:border-slate-800 transition-colors duration-300" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#e8f4fd' }}>
        <div className="max-w-6xl mx-auto px-5">
          {/* Header — side by side */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <span className="section-label">What Parents Say</span>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                Community Testimonials
              </h2>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-sm">
              Real experiences from parents and guardians who trust us with their children's future.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col overflow-hidden transform-gpu">
                {/* Accent top bar */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ backgroundColor: primary }} />

                {/* Large decorative quote */}
                <span className="absolute top-5 right-6 text-7xl font-serif leading-none select-none pointer-events-none"
                  style={{ color: hexToRgba(primary, 0.07) }}>❝</span>

                {/* Stars */}
                <div className="flex gap-1 mb-5 mt-2">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <FiStar key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[15px] flex-1 mb-6 relative z-10">
                  "{t.quote}"
                </p>

                <div className="flex items-center gap-3 pt-5 border-t border-gray-100 dark:border-slate-700">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                    {getInitials(t.name)}
                  </div>
                  <div>
                    <p className="font-black text-gray-900 dark:text-white text-sm">{t.name}</p>
                    <p className="text-xs font-semibold" style={{ color: hexToRgba(primary, 0.8) }}>{t.subtitle}</p>
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
      <section className="py-10 md:py-14 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center mb-8">
            <span className="section-label">Excellence Recognised</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              Our Top Performers
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto text-sm">
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
                  className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden">
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
                    <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight mb-0.5">{student.name}</p>
                    <p className="text-xs text-gray-400 mb-3">{student.class}</p>
                    <div className="text-2xl font-black mb-0.5" style={{ color: primary }}>{student.average}</div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Average Score</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 py-14 px-8 text-center"
              style={{ background: isDarkMode ? `linear-gradient(135deg, ${hexToRgba(primary, 0.1)} 0%, #1e293b 100%)` : `linear-gradient(135deg, ${hexToRgba(primary, 0.04)} 0%, #f8fafc 100%)` }}>
              {/* decorative rings */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border-2 border-dashed opacity-10 pointer-events-none" style={{ borderColor: primary }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full border-2 border-dashed opacity-10 pointer-events-none" style={{ borderColor: primary }} />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm"
                  style={{ backgroundColor: hexToRgba(primary, 0.1), color: primary }}>
                  <FiAward className="w-7 h-7" />
                </div>
                <h4 className="font-black text-gray-700 dark:text-white text-base mb-1">Results Not Yet Published</h4>
                <p className="text-gray-400 dark:text-gray-300 text-sm max-w-xs mx-auto leading-relaxed">
                  Top performers will appear here once term results are finalised and published.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════
          NEWS, EVENTS, TIMELINE, FAQ & TUITION
      ══════════════════════════════════ */}
      <section className="py-12 border-t border-blue-100 dark:border-slate-800 transition-colors duration-300" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#e8f4fd' }}>
        <div className="w-[90%] max-w-7xl mx-auto grid lg:grid-cols-2 gap-6 items-start relative z-20">
          <InteractiveTimelineWidget school={school} />
          <TuitionEstimatorWidget school={school} />
        </div>
      </section>



      {/* ══════════════════════════════════
          NEWSLETTER BANNER
      ══════════════════════════════════ */}
      <section className="py-10 border-t border-blue-100 dark:border-slate-800 transition-colors duration-300" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#e8f4fd' }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="rounded-3xl relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${primary} 0%, ${darkenHex(primary, 0.2)} 100%)` }}>

            {/* Decorative blobs */}
            <div className="absolute -top-12 -left-12 w-52 h-52 rounded-full opacity-10 pointer-events-none bg-white" />
            <div className="absolute -bottom-16 -right-12 w-72 h-72 rounded-full opacity-10 pointer-events-none bg-white" />
            {/* Dot grid */}
            <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

            {/* Side-by-side content */}
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 px-10 py-12">
              <div className="text-left">
                <div className="inline-flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                    <FiMail className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white/70 text-xs font-bold uppercase tracking-widest">Newsletter</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2">
                  Stay in the Loop
                </h3>
                <p className="text-white/70 text-sm leading-relaxed max-w-xs">
                  School news, upcoming events, and academic updates — straight to your inbox.
                </p>
              </div>

              <div className="w-full md:w-auto shrink-0">
                {subscribed ? (
                  <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-sm">
                    <span className="text-2xl">✓</span>
                    <div>
                      <p className="font-black text-white text-sm">You're subscribed!</p>
                      <p className="text-white/60 text-xs">Watch your inbox for updates.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <input type="email" required placeholder="Enter your email address"
                      value={newsletter} onChange={e => setNewsletter(e.target.value)}
                      className="flex-1 sm:w-64 px-4 py-3.5 rounded-xl text-gray-800 text-sm focus:outline-none bg-white shadow-lg placeholder-gray-400" />
                    <button type="submit"
                      className="px-6 py-3.5 rounded-xl font-black text-sm border border-white/30 bg-white/15 hover:bg-white/25 text-white transition-all whitespace-nowrap backdrop-blur-sm">
                      Subscribe →
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>



      <AccreditationsBand primary={primary} />

      {/* ══════════════════════════════════
          FOOTER
      ══════════════════════════════════ */}
      <footer style={{ backgroundColor: '#1e293b' }} className="text-gray-400">

        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${primary} 30%, ${darkenHex(primary, -0.2)} 70%, transparent 100%)` }} />

        {/* CTA Banner */}
        <div className="border-b border-white/5" style={{ background: `linear-gradient(135deg, ${hexToRgba(primary, 0.1)} 0%, transparent 60%)` }}>
          <div className="max-w-7xl mx-auto px-5 py-7 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg md:text-xl font-black text-white leading-tight">
                Ready to Join Our School Community?
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">Begin your child's journey with us — enquire today.</p>
            </div>
            <Link to={`/${school?.slug}/admissions`}
              className="shrink-0 px-6 py-2.5 rounded-xl font-black text-sm text-white transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${primary}, ${darkenHex(primary, 0.15)})` }}>
              Start Admission →
            </Link>
          </div>
        </div>

        {/* Main footer grid */}
        <div className="max-w-7xl mx-auto px-5 pt-8 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">

            {/* Brand column */}
            <div className="sm:col-span-2 lg:col-span-1 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-white/10"
                  style={{ background: `linear-gradient(135deg, ${hexToRgba(primary, 0.3)}, ${hexToRgba(primary, 0.1)})` }}>
                  {school?.logoUrl
                    ? <img src={getLogoUrl(school.logoUrl)} alt="" className="w-8 h-8 object-contain" />
                    : <span className="text-lg font-black text-white">{school?.name?.[0]}</span>
                  }
                </div>
                <div>
                  <p className="font-black text-white text-base leading-tight">{school?.name}</p>
                  {school?.foundedYear && (
                    <p className="text-xs font-bold mt-0.5" style={{ color: primary }}>Est. {school.foundedYear}</p>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed text-left">
                {school?.motto || 'Empowering the next generation through academic excellence, moral development, and innovation.'}
              </p>

              {/* Social icons — all platforms horizontally */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { url: school?.facebookUrl, icon: <FiFacebook className="w-4 h-4" />, hover: 'hover:bg-blue-600 hover:border-blue-600', label: 'Facebook' },
                  { url: school?.instagramUrl, icon: <FiInstagram className="w-4 h-4" />, hover: 'hover:bg-pink-600 hover:border-pink-600', label: 'Instagram' },
                  { url: school?.twitterUrl, icon: <FiTwitter className="w-4 h-4" />, hover: 'hover:bg-sky-500 hover:border-sky-500', label: 'Twitter/X' },
                  { url: school?.youtubeUrl, icon: <FiYoutube className="w-4 h-4" />, hover: 'hover:bg-red-600 hover:border-red-600', label: 'YouTube' },
                  { url: school?.linkedinUrl, icon: <FiLinkedin className="w-4 h-4" />, hover: 'hover:bg-blue-700 hover:border-blue-700', label: 'LinkedIn' },
                  { url: school?.whatsappUrl ? `https://wa.me/${school.whatsappUrl}` : null, icon: <FiMessageCircle className="w-4 h-4" />, hover: 'hover:bg-green-600 hover:border-green-600', label: 'WhatsApp' },
                  { url: school?.email ? `mailto:${school.email}` : null, icon: <FiMail className="w-4 h-4" />, hover: 'hover:bg-rose-600 hover:border-rose-600', label: 'Email' },
                ].filter(s => s.url).map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer" title={s.label}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-gray-300 border border-white/10 hover:text-white transition-all duration-200 ${s.hover}`}>
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <span className="block w-4 h-0.5 rounded-full" style={{ backgroundColor: primary }} />
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Quick Links</h4>
              </div>
              <ul className="space-y-3">
                {[
                  { label: 'Student Portal', href: `/${school?.slug}/login`, internal: true },
                  { label: 'School Staff', href: `/${school?.slug}/staff`, internal: true },
                  { label: 'Higher Inst. Students', href: `/${school?.slug}/higher-students`, internal: true },
                  { label: 'Alumni Directory', href: '/alumni', internal: true },
                  { label: 'Admission Enquiry', href: `/${school?.slug}/admissions` },
                  { label: 'Admission Policy', href: `/${school?.slug}/admissions` },
                  school?.eLibraryUrl && { label: 'E-Library', href: school.eLibraryUrl, external: true },
                  school?.alumniNetworkUrl && { label: 'Alumni Network', href: school.alumniNetworkUrl, external: true },
                  school?.academicCalendarUrl && { label: 'Academic Calendar', href: school.academicCalendarUrl, external: true },
                ].filter(Boolean).map((l, i) => (
                  <li key={i}>
                    {l.internal
                      ? <Link to={l.href} className="group flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors duration-200">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 group-hover:w-3 transition-all duration-200" style={{ backgroundColor: primary }} />
                          {l.label}
                        </Link>
                      : <a href={l.href} target={l.external ? '_blank' : undefined} rel="noreferrer"
                          className="group flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors duration-200">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 group-hover:w-3 transition-all duration-200" style={{ backgroundColor: primary }} />
                          {l.label}
                        </a>
                    }
                  </li>
                ))}
              </ul>
            </div>

            {/* Documents */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <span className="block w-4 h-0.5 rounded-full" style={{ backgroundColor: primary }} />
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Documents</h4>
              </div>
              <ul className="space-y-3">
                {[
                  school?.brochureFileUrl && { label: 'School Prospectus', href: school.brochureFileUrl },
                  school?.admissionGuideFileUrl && { label: 'Admissions Guide', href: school.admissionGuideFileUrl },
                  { label: 'Curriculum Overview', href: `/${school?.slug}/admissions` },
                ].filter(Boolean).map((l, i) => (
                  <li key={i}>
                    <a href={l.href} target="_blank" rel="noreferrer"
                      className="group flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors duration-200">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 group-hover:w-3 transition-all duration-200" style={{ backgroundColor: primary }} />
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <span className="block w-4 h-0.5 rounded-full" style={{ backgroundColor: primary }} />
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Contact Us</h4>
              </div>
              <ul className="space-y-3.5">
                {school?.address && (
                  <li className="flex gap-3 text-sm text-gray-300 text-left">
                    <FiMapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: primary }} />
                    <span className="leading-relaxed text-left">{school.address}</span>
                  </li>
                )}
                {school?.phone && (
                  <li>
                    <a href={`tel:${school.phone}`} className="flex gap-3 text-sm text-gray-300 hover:text-white transition-colors group text-left">
                      <FiPhone className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" style={{ color: primary }} />
                      {school.phone}
                    </a>
                  </li>
                )}
                {school?.email && (
                  <li>
                    <a href={`mailto:${school.email}`} className="flex gap-3 text-sm text-gray-300 hover:text-white transition-colors break-all group text-left">
                      <FiMail className="w-4 h-4 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" style={{ color: primary }} />
                      {school.email}
                    </a>
                  </li>
                )}
                {school?.openingHours && (
                  <li className="flex gap-3 text-sm text-gray-300 text-left">
                    <FiClock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: primary }} />
                    {school.openingHours}
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/5 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-400 font-semibold tracking-wide text-center sm:text-left">
              © {new Date().getFullYear()} <span className="text-gray-300">{school?.name}</span>. All Rights Reserved.
            </p>
            <p className="text-xs text-slate-400">
              Powered by <span className="font-black" style={{ color: primary }}>EduTechAI</span> <span className="text-slate-500">Platform</span>
            </p>
          </div>
        </div>
      </footer>
      <FloatingContactWidget school={school} getLogoUrl={getLogoUrl} />

      {/* FAQ Modal */}
      <AnimatePresence>
        {isFaqModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsFaqModalOpen(false)}
              className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl max-h-[90vh] flex flex-col z-10"
            >
              <button 
                onClick={() => setIsFaqModalOpen(false)} 
                className="absolute -top-12 right-0 sm:-right-12 text-white hover:text-gray-300 transition-colors z-20 p-2 focus:outline-none"
              >
                <FiX className="w-8 h-8" />
              </button>
              <div className="w-full overflow-y-auto rounded-[32px] bg-transparent shadow-2xl hide-scrollbar">
                <FaqWidget school={school} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};

export default ThemeModern;
