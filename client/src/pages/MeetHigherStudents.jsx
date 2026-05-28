import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiMail, FiPhone, FiMessageCircle, FiArrowLeft, FiUsers, FiBookOpen, FiStar } from 'react-icons/fi';
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

const initials = (f, l) => `${f?.[0] || ''}${l?.[0] || ''}`.toUpperCase();

/* ── Student Card ── */
const StudentCard = ({ member, primary, index }) => {
  const photo = getLogoUrl(member.teacher?.photoUrl || member.photoUrl);
  const name = [member.firstName, member.middleName, member.lastName].filter(Boolean).join(' ');
  const courseAndInstitution = member.teacher?.specialization;
  const email = member.teacher?.publicEmail || member.email;
  const phone = member.teacher?.publicPhone || member.phone;
  const whatsapp = member.teacher?.publicWhatsapp;

  return (
    <div
      className="flex gap-0 rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Photo strip */}
      <div className="w-24 sm:w-32 shrink-0 relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${hexToRgba(primary, 0.15)}, ${hexToRgba(primary, 0.05)})` }}>
        {photo ? (
          <img src={photo} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-black" style={{ color: primary }}>
              {initials(member.firstName, member.lastName)}
            </span>
          </div>
        )}
        {/* Accent bar on left */}
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: primary }} />
      </div>

      {/* Info */}
      <div className="flex-1 px-5 py-4 flex flex-col justify-center gap-1">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="font-black text-gray-900 text-base leading-tight">{name}</p>
            {courseAndInstitution ? (
              <p className="text-sm font-semibold mt-0.5" style={{ color: primary }}>{courseAndInstitution}</p>
            ) : (
              <p className="text-sm font-semibold mt-0.5 text-gray-500">Alumni in Higher Institution</p>
            )}
          </div>
        </div>

        {/* Contact row */}
        <div className="flex flex-wrap gap-3 mt-2">
          {email && (
            <a href={`mailto:${email}`}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors group">
              <FiMail className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform" style={{ color: primary }} />
              <span className="truncate max-w-[180px]">{email}</span>
            </a>
          )}
          {phone && (
            <a href={`tel:${phone}`}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors group">
              <FiPhone className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform" style={{ color: primary }} />
              {phone}
            </a>
          )}
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-600 transition-colors group">
              <FiMessageCircle className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform text-green-500" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Empty State ── */
const EmptyState = ({ primary, schoolName }) => (
  <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
    <div className="relative mb-8">
      <div className="w-32 h-32 rounded-3xl flex items-center justify-center mx-auto"
        style={{ background: `linear-gradient(135deg, ${hexToRgba(primary, 0.15)}, ${hexToRgba(primary, 0.05)})`, border: `2px dashed ${hexToRgba(primary, 0.3)}` }}>
        <FiUsers className="w-14 h-14" style={{ color: primary, opacity: 0.6 }} />
      </div>
      {[0, 1, 2].map(i => (
        <div key={i}
          className="absolute w-3 h-3 rounded-full animate-bounce"
          style={{
            backgroundColor: hexToRgba(primary, 0.4),
            top: i === 0 ? 0 : i === 1 ? '50%' : 'auto',
            bottom: i === 2 ? 0 : 'auto',
            left: i === 0 ? '100%' : i === 2 ? '100%' : 'auto',
            right: i === 1 ? 0 : 'auto',
            animationDelay: `${i * 200}ms`
          }} />
      ))}
    </div>

    <h2 className="text-2xl font-black text-gray-900 mb-3">Our Students in Higher Institution — Coming Soon</h2>
    <p className="text-gray-500 max-w-md leading-relaxed mb-8">
      We are proud of our alumni who are currently progressing their academic journeys in prestigious universities and colleges worldwide. Check back soon for our student directory!
    </p>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full mb-8">
      {[
        { icon: <FiUsers className="w-5 h-5" />, label: 'Higher Education', desc: 'Universities & Colleges worldwide' },
        { icon: <FiBookOpen className="w-5 h-5" />, label: 'Diverse Courses', desc: 'Medicine, Engineering, Arts & more' },
        { icon: <FiStar className="w-5 h-5" />, label: 'Proud Alumni', desc: 'Inspiring future graduates' },
      ].map((f, i) => (
        <div key={i} className="p-4 rounded-2xl border border-dashed"
          style={{ borderColor: hexToRgba(primary, 0.3), backgroundColor: hexToRgba(primary, 0.04) }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 mx-auto"
            style={{ backgroundColor: hexToRgba(primary, 0.12), color: primary }}>
            {f.icon}
          </div>
          <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-0.5">{f.label}</p>
          <p className="text-xs text-gray-400">{f.desc}</p>
        </div>
      ))}
    </div>
  </div>
);

/* ── Main Page ── */
const MeetHigherStudents = () => {
  const { schoolSlug } = useParams();
  const [school, setSchool] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/public-school/${schoolSlug}/higher-students`);
        if (!r.ok) throw new Error('Not found');
        const data = await r.json();
        setSchool(data.school);
        setStudents(data.students || []);
      } catch {
        setError('Unable to load higher institution student information.');
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolSlug]);

  const primary = school?.primaryColor || '#4f46e5';

  const filtered = students.filter(s => {
    const name = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ').toLowerCase();
    const course = (s.teacher?.specialization || '').toLowerCase();
    const q = search.toLowerCase();
    return !q || name.includes(q) || course.includes(q);
  });

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-14 h-14 border-4 border-t-transparent rounded-full animate-spin mb-4"
        style={{ borderColor: '#4f46e5', borderTopColor: 'transparent' }} />
      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Students...</p>
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

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 overflow-x-hidden" style={{ backgroundColor: '#f0f7ff' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .fade-in { animation: fadeIn 0.4s ease both; }
        ::selection { background: ${hexToRgba(primary, 0.15)}; color: ${primary}; }
      `}</style>

      {/* Header */}
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
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <FiArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative overflow-hidden py-14 px-5"
        style={{ background: `linear-gradient(135deg, ${hexToRgba(primary, 0.12)} 0%, transparent 60%)`, borderBottom: `3px solid ${hexToRgba(primary, 0.15)}` }}>
        <div className="absolute right-10 top-6 w-40 h-40 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${primary}, transparent)` }} />
        <div className="max-w-7xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4"
            style={{ backgroundColor: hexToRgba(primary, 0.12), color: primary }}>
            Higher Education
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight mb-3">
            Students in <span style={{ color: primary }}>Higher Institution</span>
          </h1>
          <p className="text-gray-500 max-w-xl leading-relaxed">
            Proudly presenting our graduates who are currently pursuing their academic careers in various higher institutions of learning.
          </p>
          {students.length > 0 && (
            <div className="flex gap-6 mt-6">
              <div>
                <p className="text-3xl font-black" style={{ color: primary }}>{students.length}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Students</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      {students.length > 0 && (
        <div className="max-w-7xl mx-auto px-5 py-5 w-full flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, university or course..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 outline-none transition-all"
            style={{ boxShadow: search ? `0 0 0 3px ${hexToRgba(primary, 0.15)}` : undefined }}
          />
        </div>
      )}

      {/* Student Grid */}
      <main className="flex-1 max-w-7xl mx-auto px-5 pb-16 w-full">
        {students.length === 0 ? (
          <EmptyState primary={primary} schoolName={school?.name} />
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center text-gray-400">
            <p className="text-4xl mb-4">🔍</p>
            <p className="font-bold">No students match your search.</p>
            <button onClick={() => { setSearch(''); }}
              className="mt-4 text-sm font-bold underline" style={{ color: primary }}>Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((member, i) => (
              <StudentCard key={member.id} member={member} primary={primary} index={i} />
            ))}
          </div>
        )}
      </main>

      {/* Mini footer */}
      <footer className="border-t border-gray-100 bg-white py-5 text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} {school?.name}. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default MeetHigherStudents;
