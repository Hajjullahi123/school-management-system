import React, { useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

const SERVICES_LIST = [
  "Free Website + Custom Domain",
  "Result Management",
  "Fee Management",
  "Alumni Management",
  "CBT Platform",
  "Attendance Management",
  "Voucher & Payroll",
  "ID Card Generator"
];

const ContactPage = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Normally handle form submission to EmailJS or backend here
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-[70vh] items-center justify-center bg-slate-900 py-20 px-6">
        <div className="bg-slate-800 p-10 rounded-2xl shadow-lg border border-slate-700 max-w-lg text-center animate-fade-up">
          <div className="w-20 h-20 bg-green-900/50 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Thank You!</h2>
          <p className="text-slate-400 mb-6 text-left">
            Your inquiry has been sent. What happens next?
            <ol className="list-decimal list-inside mt-4 space-y-2 text-white font-medium">
              <li>Check your email – we'll reply within 24 hours</li>
              <li>We'll include: demo link, pricing sheet, free website preview</li>
            </ol>
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => window.location.href = '/'} className="btn-primary w-full">Back to Home</button>
            <p className="text-sm text-slate-500 mt-4">Questions? Call/WhatsApp +234 123 456 7890</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <section className="bg-primary py-16 text-center text-white">
        <div className="section-container">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-up">Request Information</h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto animate-fade-up delay-100">
            We'll reply within 24 hours with pricing and a demo link.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-slate-900 flex-grow">
        <div className="section-container">
          <div className="flex flex-col lg:flex-row gap-12 max-w-6xl mx-auto">
            
            {/* Form Side */}
            <div className="flex-grow bg-slate-800 p-8 md:p-10 rounded-2xl shadow-lg border border-slate-700 animate-fade-up delay-200">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">School Name *</label>
                    <input type="text" required className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder="e.g. ABC International School" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Your Full Name *</label>
                    <input type="text" required className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder="John Doe" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Your Role / Title</label>
                    <select className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                      <option value="">Select Role...</option>
                      <option value="Principal">Principal</option>
                      <option value="Administrator">Administrator</option>
                      <option value="IT Head">IT Head</option>
                      <option value="Owner">Owner</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Best time to call</label>
                    <select className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                      <option value="">Select Time...</option>
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address *</label>
                    <input type="email" required className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder="email@school.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Phone Number *</label>
                    <input type="tel" required className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder="+234..." />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Approx. Number of Students *</label>
                  <div className="flex flex-wrap gap-4">
                    {["Under 200", "200–500", "501–1000", "1000+"].map((count) => (
                      <label key={count} className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="radio" name="studentCount" value={count} required className="w-4 h-4 text-primary bg-slate-900 border-slate-700 focus:ring-primary" />
                        <span>{count}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Services You're Interested In</label>
                  <div className="grid sm:grid-cols-2 gap-3 bg-slate-900 p-4 rounded-lg border border-slate-700">
                    {SERVICES_LIST.map((service) => (
                      <label key={service} className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" value={service} className="w-4 h-4 text-primary bg-slate-800 border-slate-600 focus:ring-primary rounded" />
                        <span className="text-sm">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Additional Notes</label>
                  <textarea rows="4" className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none" placeholder="Any specific requirements or questions?"></textarea>
                </div>

                <button type="submit" className="btn-primary w-full text-lg py-4">Send Inquiry →</button>
              </form>
            </div>

            {/* Sidebar info */}
            <div className="lg:w-80 shrink-0">
              <div className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700 sticky top-28">
                <h3 className="font-bold text-xl text-white mb-6">Alternative Contact</h3>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center shrink-0">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-300">Email</p>
                      <a href="mailto:schools@schoolmanager.com" className="text-slate-400 hover:text-primary transition-colors">schools@schoolmanager.com</a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-accent/20 text-accent rounded-full flex items-center justify-center shrink-0">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-300">Phone / WhatsApp</p>
                      <p className="text-slate-400">+234 123 456 7890</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-secondary/20 text-secondary rounded-full flex items-center justify-center shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-300">Office</p>
                      <p className="text-slate-400">123 Tech Hub Avenue,<br/>Innovation District</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
