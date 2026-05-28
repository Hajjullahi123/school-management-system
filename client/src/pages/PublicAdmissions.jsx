import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiSend } from 'react-icons/fi';
import { API_BASE_URL } from '../config';

/* ── helpers ── */
const hexToRgba = (hex, a = 1) => {
  const h = hex?.replace('#', '') || '4f46e5';
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

const darkenHex = (hex, percent) => {
  const h = hex?.replace('#', '') || '4f46e5';
  let r = parseInt(h.substring(0, 2), 16);
  let g = parseInt(h.substring(2, 4), 16);
  let b = parseInt(h.substring(4, 6), 16);
  
  r = Math.floor(r * (1 - percent));
  g = Math.floor(g * (1 - percent));
  b = Math.floor(b * (1 - percent));
  
  return `#${(r < 0 ? 0 : r).toString(16).padStart(2, '0')}${(g < 0 ? 0 : g).toString(16).padStart(2, '0')}${(b < 0 ? 0 : b).toString(16).padStart(2, '0')}`;
};

const getLogoUrl = (src) => {
  if (!src) return null;
  if (src.startsWith('data:image') || src.startsWith('http')) return src;
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${base}${src.startsWith('/') ? src : '/' + src}`;
};

const PublicAdmissions = () => {
  const { schoolSlug } = useParams();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', grade: '', message: '' });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/public-school/${schoolSlug}`);
        if (!r.ok) throw new Error('Not found');
        const data = await r.json();
        setSchool(data);
      } catch {
        setError('Unable to load admissions information.');
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolSlug]);

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

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-14 h-14 border-4 border-t-transparent rounded-full animate-spin mb-4"
        style={{ borderColor: '#4f46e5', borderTopColor: 'transparent' }} />
      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Admissions...</p>
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
  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-transparent transition-all';
  const inputFocus = { boxShadow: `0 0 0 3px ${hexToRgba(primary, 0.18)}` };

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
        <div className="max-w-7xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4"
            style={{ backgroundColor: hexToRgba(primary, 0.12), color: primary }}>
            Join Our Community
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight mb-3">
            Admissions <span style={{ color: primary }}>Process</span>
          </h1>
          <p className="text-gray-500 max-w-xl leading-relaxed text-sm md:text-base">
            We are delighted you are considering {school?.name}. Our admissions process is straightforward, transparent, and welcoming.
          </p>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-7xl mx-auto px-5 py-12 w-full fade-in">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          
          {/* Steps */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900">How to Apply</h2>
            <div className="space-y-4">
              {[
                { step: 1, title: 'Submit an Enquiry', body: 'Fill in the enquiry form. Our admissions desk will reach out within 24 hours to guide you through next steps.' },
                { step: 2, title: 'Entrance Assessment', body: 'Visit our campus, meet our dedicated staff, and your child will complete a friendly academic assessment.' },
                { step: 3, title: 'Enrolment & Resumption', body: 'Submit required documents, set up portal access, and your child is ready to start their academic journey!' },
              ].map((s, i) => (
                <div key={i} className="flex gap-5 p-6 rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-xl shrink-0 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${primary}, ${darkenHex(primary, 0.15)})` }}>
                    {s.step}
                  </div>
                  <div className="pt-1">
                    <h4 className="font-black text-gray-900 text-lg mb-1">{s.title}</h4>
                    <p className="text-gray-500 leading-relaxed text-sm">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {school?.admissionGuideFileUrl && (
              <div className="pt-4">
                <a href={getLogoUrl(school.admissionGuideFileUrl)} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-white shadow-lg hover:-translate-y-0.5 transition-all w-full sm:w-auto justify-center"
                  style={{ background: `linear-gradient(135deg, ${primary}, ${darkenHex(primary, 0.15)})` }}>
                  Download Admissions Guide <FiArrowRight className="w-5 h-5" />
                </a>
              </div>
            )}
          </div>

          {/* Enquiry Form */}
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-gray-100 sticky top-24">
            <div className="px-8 py-8 text-white"
              style={{ background: `linear-gradient(135deg, ${primary}, ${darkenHex(primary, 0.14)})` }}>
              <h3 className="text-2xl font-black">Request Admission Info</h3>
              <p className="text-white/80 mt-1">Fill in the form below and we'll respond within 24 hours.</p>
            </div>

            <div className="bg-white px-8 py-8">
              {submitted ? (
                <div className="text-center py-10 fade-in">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ backgroundColor: hexToRgba(primary, 0.1), color: primary }}>
                    <FiCheckCircle className="w-10 h-10" />
                  </div>
                  <h4 className="font-black text-gray-900 text-2xl mb-2">Request Received!</h4>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                    Thank you! Our admissions team will be in touch with you very shortly.
                  </p>
                  <button onClick={() => setSubmitted(false)}
                    className="font-bold underline" style={{ color: primary }}>
                    Submit another request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Parent / Guardian Name</label>
                    <input type="text" required placeholder="e.g. Aisha Musa"
                      className={inputCls}
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      onFocus={e => Object.assign(e.target.style, inputFocus)}
                      onBlur={e => { e.target.style.boxShadow = ''; }} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Grade Level</label>
                    <select required className={inputCls}
                      value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}
                      onFocus={e => Object.assign(e.target.style, inputFocus)}
                      onBlur={e => { e.target.style.boxShadow = ''; }}>
                      <option value="">Select grade level</option>
                      {['Creche', 'Nursery 1', 'Nursery 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Additional Notes (optional)</label>
                    <textarea rows={3} placeholder="Any questions or special notes..."
                      className={`${inputCls} resize-none`}
                      value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                      onFocus={e => Object.assign(e.target.style, inputFocus)}
                      onBlur={e => { e.target.style.boxShadow = ''; }} />
                  </div>

                  <button type="submit"
                    className="w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-2 hover:-translate-y-0.5 shadow-lg hover:shadow-xl transition-all"
                    style={{ background: `linear-gradient(135deg, ${primary}, ${darkenHex(primary, 0.14)})` }}>
                    <FiSend className="w-5 h-5" /> Submit Enquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Mini footer ── */}
      <footer className="border-t border-gray-100 bg-white py-6 text-center text-sm text-gray-400 mt-auto">
        <p>© {new Date().getFullYear()} {school?.name}. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default PublicAdmissions;
