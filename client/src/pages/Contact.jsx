import React from 'react';
import { Link } from 'react-router-dom';
import useSchoolSettings from '../hooks/useSchoolSettings';

const Contact = () => {
  const { settings: schoolSettings } = useSchoolSettings();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation - Simple version */}
      <nav className="bg-white shadow-md py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link to="/school-home" className="flex items-center gap-2 text-primary font-bold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            {schoolSettings?.logoUrl ? (
              <img src={schoolSettings.logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                {schoolSettings?.schoolName?.charAt(0) || 'S'}
              </div>
            )}
            <span className="font-bold text-gray-900 hidden sm:block">{schoolSettings?.schoolName || 'School Management'}</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">Contact Our Office</h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Have questions? We're here to help. Reach out to us through any of the channels below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Address Card */}
          <div className="bg-white p-8 rounded-[30px] shadow-xl border border-gray-100 flex flex-col items-center text-center transform transition-transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Our Location</h3>
            <p className="text-gray-500 leading-relaxed font-medium">
              {schoolSettings?.address || 'School address not provided.'}
            </p>
          </div>

          {/* Phone Card */}
          <div className="bg-white p-8 rounded-[30px] shadow-xl border border-gray-100 flex flex-col items-center text-center transform transition-transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Phone Number</h3>
            <p className="text-gray-500 leading-relaxed font-medium text-lg">
              {schoolSettings?.schoolPhone || 'Phone number not provided.'}
            </p>
            {schoolSettings?.whatsappUrl && (
              <a href={`https://wa.me/${schoolSettings.whatsappUrl}`} target="_blank" rel="noopener noreferrer" className="mt-4 text-green-600 font-bold flex items-center gap-2 hover:underline">
                Chat on WhatsApp
              </a>
            )}
          </div>

          {/* Email Card */}
          <div className="bg-white p-8 rounded-[30px] shadow-xl border border-gray-100 flex flex-col items-center text-center transform transition-transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Email Address</h3>
            <p className="text-gray-500 leading-relaxed font-medium">
              {schoolSettings?.schoolEmail || 'Email address not provided.'}
            </p>
          </div>
        </div>

        {/* Social Media & More */}
        <div className="mt-20 bg-gray-900 rounded-[50px] p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px]"></div>
          <div className="relative z-10 text-center">
            <h2 className="text-3xl font-black mb-8 italic text-primary underline underline-offset-8">Follow Our Updates</h2>
            <p className="text-gray-400 mb-10 max-w-xl mx-auto">
              Stay connected with us through our social media platforms for the latest news and events.
            </p>
            <div className="flex justify-center gap-6">
              {schoolSettings?.facebookUrl && (
                <a href={schoolSettings.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /></svg>
                </a>
              )}
              {schoolSettings?.instagramUrl && (
                <a href={schoolSettings.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.44z" /></svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Mini version */}
      <footer className="bg-white border-t py-8 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} {schoolSettings?.schoolName}. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Contact;
