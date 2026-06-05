import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import FloatingMessageWidget from './FloatingMessageWidget';

const MarketingLayout = () => {
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate bg-surface">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo Area */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-heading font-bold text-xl">SM</span>
                </div>
                <span className="font-heading font-bold text-xl text-slate">SchoolManager</span>
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-[15px] font-medium transition-colors ${
                    location.pathname === link.path ? 'text-primary' : 'text-muted hover:text-primary'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <Link to="/contact" className="btn-primary py-2 px-5">
                Inquiry
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Floating Widget */}
      <FloatingMessageWidget />

      {/* Footer */}
      <footer className="bg-slate text-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                  <span className="text-white font-heading font-bold">SM</span>
                </div>
                <span className="font-heading font-bold text-lg">SchoolManager Tech Hub</span>
              </div>
              <p className="text-gray-400 text-sm max-w-sm mb-6">
                All-in-One School Management System + Free Website for Your School. 
                One platform for results, fees, CBT, alumni, attendance, payroll, and ID cards.
              </p>
            </div>
            
            <div>
              <h4 className="font-heading font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {navLinks.map(link => (
                  <li key={link.name}><Link to={link.path} className="hover:text-white transition-colors">{link.name}</Link></li>
                ))}
                <li><Link to="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-heading font-semibold mb-4">Contact Us</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Email: schools@schoolmanager.com</li>
                <li>Phone/WhatsApp: +234 123 456 7890</li>
                <li className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex space-x-4">
                    <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
                    <a href="#" className="hover:text-white transition-colors">Twitter</a>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-sm text-gray-500">
            Copyright &copy; 2026 SchoolManager Tech Hub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLayout;
