import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiMapPin, FiPhone, FiMail, FiClock, FiFacebook, FiInstagram, FiMessageCircle, FiTwitter, FiYoutube, FiLinkedin } from 'react-icons/fi';
import { API_BASE_URL } from '../config';

/* ── helpers ── */
const hexToRgba = (hex, a = 1) => {
  const h = hex?.replace('#', '') || '4f46e5';
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

const getLogoUrl = (src) => {
  if (!src) return null;
  if (src.startsWith('data:image') || src.startsWith('http')) return src;
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${base}${src.startsWith('/') ? src : '/' + src}`;
};

const PublicContact = () => {
  const { schoolSlug } = useParams();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/public-school/${schoolSlug}`);
        if (!r.ok) throw new Error('Not found');
        const data = await r.json();
        setSchool(data);
      } catch {
        setError('Unable to load contact information.');
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolSlug]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-14 h-14 border-4 border-t-transparent rounded-full animate-spin mb-4"
        style={{ borderColor: '#4f46e5', borderTopColor: 'transparent' }} />
      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Contact Info...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
      <div>
        <div className="w-20 h-20 bg-red-100 text-red-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">!</div>
        <p className="text-gray-600">{error}</p>
        <Link to={`/${schoolSlug}`} className="mt-6 inline-block text-sm font-bold underline text-gray-500">← Back to Homepage</Link>
      </div>
    </div>
  );

  const primary = school?.primaryColor || '#4f46e5';

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800" style={{ backgroundColor: '#f0f7ff' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .fade-in { animation: fadeIn 0.4s ease both; }
        ::selection { background: ${hexToRgba(primary, 0.15)}; color: ${primary}; }
      `}</style>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between" style={{ height: 68 }}>
          <Link to={`/${schoolSlug}`} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
              {school?.logoUrl
                ? <img src={getLogoUrl(school.logoUrl)} alt="" className="w-full h-full object-contain p-0.5" />
                : <span className="text-lg font-black text-gray-300">{school?.name?.[0]}</span>
              }
            </div>
            <span className="font-black text-gray-900 text-base tracking-tight hidden sm:block">{school?.name}</span>
          </Link>
          <Link to={`/${schoolSlug}`}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all">
            <FiArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </header>

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden py-14 px-5"
        style={{ background: `linear-gradient(135deg, ${hexToRgba(primary, 0.12)} 0%, transparent 60%)`, borderBottom: `3px solid ${hexToRgba(primary, 0.15)}` }}>
        <div className="absolute right-10 top-6 w-40 h-40 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${primary}, transparent)` }} />
        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4"
            style={{ backgroundColor: hexToRgba(primary, 0.12), color: primary }}>
            Get In Touch
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight mb-3">
            Contact <span style={{ color: primary }}>Us</span>
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto leading-relaxed text-sm md:text-base">
            We'd love to hear from you. Reach out to us directly or visit our campus.
          </p>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-5xl mx-auto px-5 py-12 w-full fade-in">
        
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Contact Details */}
          {[
            school?.address && { icon: <FiMapPin className="w-6 h-6" />, label: 'Our Campus', value: school.address },
            school?.phone   && { icon: <FiPhone className="w-6 h-6" />, label: 'Phone Number', value: school.phone, href: `tel:${school.phone}` },
            school?.email   && { icon: <FiMail className="w-6 h-6" />, label: 'Email Address', value: school.email, href: `mailto:${school.email}` },
            school?.openingHours && { icon: <FiClock className="w-6 h-6" />, label: 'Office Hours', value: school.openingHours },
          ].filter(Boolean).map((c, i) => (
            <div key={i} className="flex gap-5 p-6 rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: hexToRgba(primary, 0.1), color: primary }}>
                {c.icon}
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{c.label}</p>
                {c.href
                  ? <a href={c.href} className="text-base font-bold text-gray-900 hover:underline break-all" style={{ color: primary }}>{c.value}</a>
                  : <p className="text-base font-bold text-gray-900">{c.value}</p>
                }
              </div>
            </div>
          ))}
        </div>

        {/* Social Links */}
        <div className="mb-12">
          <h3 className="text-center font-black text-gray-900 text-xl mb-6">Connect on Social Media</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { url: school?.facebookUrl, icon: <FiFacebook className="w-6 h-6" />, label: 'Facebook', bg: 'bg-blue-600', hover: 'hover:bg-blue-700' },
              { url: school?.instagramUrl, icon: <FiInstagram className="w-6 h-6" />, label: 'Instagram', bg: 'bg-pink-600', hover: 'hover:bg-pink-700' },
              { url: school?.twitterUrl, icon: <FiTwitter className="w-6 h-6" />, label: 'Twitter', bg: 'bg-sky-500', hover: 'hover:bg-sky-600' },
              { url: school?.youtubeUrl, icon: <FiYoutube className="w-6 h-6" />, label: 'YouTube', bg: 'bg-red-600', hover: 'hover:bg-red-700' },
              { url: school?.linkedinUrl, icon: <FiLinkedin className="w-6 h-6" />, label: 'LinkedIn', bg: 'bg-blue-800', hover: 'hover:bg-blue-900' },
              { url: school?.whatsappUrl ? `https://wa.me/${school.whatsappUrl}` : null, icon: <FiMessageCircle className="w-6 h-6" />, label: 'WhatsApp', bg: 'bg-green-500', hover: 'hover:bg-green-600' },
            ].filter(s => s.url).map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noreferrer" title={s.label}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform hover:-translate-y-1 hover:scale-105 ${s.bg} ${s.hover}`}>
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Map */}
        {school?.address && (
          <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-xl h-[400px] bg-gray-100">
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(school.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
              width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" title="School Location Map"
            />
          </div>
        )}

      </main>

      {/* ── Mini footer ── */}
      <footer className="border-t border-gray-100 bg-white py-6 text-center text-sm text-gray-400 mt-auto">
        <p>© {new Date().getFullYear()} {school?.name}. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default PublicContact;
