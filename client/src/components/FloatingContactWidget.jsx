import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FiMessageSquare,
  FiX,
  FiPhone,
  FiMail,
  FiMessageCircle,
  FiClock
} from 'react-icons/fi';

const FloatingContactWidget = ({ school, getLogoUrl }) => {
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.addEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!school) return null;

  const phone = school.phone;
  const email = school.email;
  const whatsappUrl = school.whatsappUrl;

  // Verify at least one contact channel exists, otherwise do not show the widget
  if (!phone && !email && !whatsappUrl) return null;

  const primary = school.primaryColor || '#4f46e5';
  const secondary = school.secondaryColor || '#6366f1';

  // Format dynamic WhatsApp URL
  const getWhatsappLink = () => {
    if (!whatsappUrl && !phone) return null;
    const source = whatsappUrl || phone;
    if (source.startsWith('http')) return source;
    
    // Clean string of non-numeric values
    const digits = source.replace(/\D/g, '');
    
    // Default prefix logic (Nigerian default fallback if starting with 0)
    const targetDigits = digits.startsWith('0') ? '234' + digits.slice(1) : digits;
    const text = encodeURIComponent(`Hello, I am visiting the website and would like to make inquiries about ${school.name}.`);
    return `https://wa.me/${targetDigits}?text=${text}`;
  };

  const wsLink = getWhatsappLink();

  // Helpers to resolve custom opacity for background tokens
  const hexToRgba = (hex = '#4f46e5', alpha = 1) => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const num = parseInt(full, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" ref={widgetRef}>
      {/* Expanded Contact Drawer */}
      <div
        className={`absolute bottom-16 right-0 w-80 rounded-[28px] bg-white border border-gray-100 shadow-2xl overflow-hidden transition-all duration-300 transform origin-bottom-right z-50 ${
          isOpen
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-90 opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Drawer Header */}
        <div
          className="p-6 text-white relative"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
        >
          {/* Subtle decoration circles */}
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/3 pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center overflow-hidden border border-white/20 shrink-0 shadow-sm">
              {school.logoUrl && getLogoUrl ? (
                <img
                  src={getLogoUrl(school.logoUrl)}
                  alt=""
                  className="w-8 h-8 object-contain"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                />
              ) : null}
              <span className="text-xl font-black text-white items-center justify-center hidden">
                {school.name.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <h4 className="font-black text-sm tracking-tight leading-snug truncate">
                {school.name}
              </h4>
              <p className="text-[11px] font-bold text-white/80 mt-0.5 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Admissions Desk
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-white/90 hover:text-white transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Action Options */}
        <div className="p-5 space-y-3 bg-white">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 text-left">
            Connect With Us
          </p>

          {wsLink && (
            <a
              href={wsLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl bg-green-50/60 border border-green-100 text-green-700 hover:bg-green-50 hover:shadow-sm transition-all text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center shrink-0 shadow-sm text-white">
                <FiMessageCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black leading-tight">Chat on WhatsApp</p>
                <p className="text-[10px] text-green-600/70 font-semibold mt-0.5">Quick inquiries & info</p>
              </div>
            </a>
          )}

          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-blue-700 hover:bg-blue-50 hover:shadow-sm transition-all text-left"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm text-white"
                style={{ backgroundColor: primary }}>
                <FiPhone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black leading-tight">Call Admissions</p>
                <p className="text-[10px] text-blue-600/70 font-semibold mt-0.5">{phone}</p>
              </div>
            </a>
          )}

          {email && (
            <a
              href={`mailto:${email}?subject=Admission Inquiry`}
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 text-rose-700 hover:bg-rose-50 hover:shadow-sm transition-all text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center shrink-0 shadow-sm text-white">
                <FiMail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black leading-tight">Email Support</p>
                <p className="text-[10px] text-rose-600/70 font-semibold mt-0.5 truncate">{email}</p>
              </div>
            </a>
          )}
        </div>

        {/* Drawer Footer */}
        {school.openingHours && (
          <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-gray-400 text-left">
            <FiClock className="w-3.5 h-3.5 shrink-0" style={{ color: primary }} />
            <span className="text-[10px] font-bold text-gray-400 leading-none">
              Hours: {school.openingHours}
            </span>
          </div>
        )}
      </div>

      {/* Floating Pulse Launcher */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-all relative outline-none focus:outline-none select-none group"
        style={{
          background: `linear-gradient(135deg, ${primary}, ${secondary})`
        }}
      >
        {/* Launcher Pulse Animation */}
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-25 pointer-events-none scale-105"
          style={{ backgroundColor: primary }}
        />

        {isOpen ? (
          <FiX className="w-6 h-6 transition-transform duration-200" />
        ) : (
          <FiMessageSquare className="w-6 h-6 transition-transform duration-200 group-hover:scale-110" />
        )}
      </button>
    </div>
  );
};

export default FloatingContactWidget;
