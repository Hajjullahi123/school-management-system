import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const PricingPage = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    if (openFaq === index) {
      setOpenFaq(null);
    } else {
      setOpenFaq(index);
    }
  };

  const faqs = [
    { q: "Can we switch plans later?", a: "Yes, you can upgrade or downgrade your plan at any time as your student count changes." },
    { q: "Do you offer a free trial?", a: "We offer a fully guided 14-day demo so you can test all features before committing." },
    { q: "Is the website really free?", a: "Yes! As long as you are an active subscriber to any of our management plans, the design, hosting, and maintenance of your school website are completely free." },
    { q: "Do I have to pay for the domain name?", a: "Domain registration (e.g., .com, .edu) is handled separately and usually costs around $10/year depending on the registrar." }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <section className="bg-surface py-20 text-center border-b border-gray-200">
        <div className="section-container">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-slate animate-fade-up">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted max-w-2xl mx-auto animate-fade-up delay-100">
            All plans include a free website + custom domain integration.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-white">
        <div className="section-container">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            
            {/* Basic Tier */}
            <div className="card flex flex-col p-8 animate-fade-up delay-100 relative">
              <h3 className="text-2xl font-bold text-slate mb-2">Basic</h3>
              <p className="text-muted mb-6">Up to 300 students</p>
              <div className="text-4xl font-bold text-slate mb-8">$XX<span className="text-lg text-muted font-normal">/month</span></div>
              
              <ul className="flex-grow space-y-4 mb-8">
                <li className="flex items-start gap-3"><CheckCircle2 className="text-accent shrink-0" size={20}/> <span className="text-slate">Free Website Integration</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="text-accent shrink-0" size={20}/> <span className="text-slate">Result Management</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="text-accent shrink-0" size={20}/> <span className="text-slate">Attendance Management</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="text-accent shrink-0" size={20}/> <span className="text-slate">ID Card Generator</span></li>
              </ul>
              <Link to="/contact" className="btn-secondary text-center w-full mt-auto">Get Started</Link>
            </div>

            {/* Professional Tier */}
            <div className="card flex flex-col p-8 animate-fade-up delay-200 border-2 border-primary shadow-xl relative scale-105 z-10 bg-primary text-white">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-white px-4 py-1 rounded-full text-sm font-bold shadow-md">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
              <p className="text-white/80 mb-6">Up to 1000 students</p>
              <div className="text-4xl font-bold text-white mb-8">$XX<span className="text-lg text-white/70 font-normal">/month</span></div>
              
              <ul className="flex-grow space-y-4 mb-8">
                <li className="flex items-start gap-3"><CheckCircle2 className="text-accent shrink-0" size={20}/> <span className="font-semibold text-white">Everything in Basic, plus:</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="text-accent shrink-0" size={20}/> <span className="text-white/90">Fee Management</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="text-accent shrink-0" size={20}/> <span className="text-white/90">CBT Platform</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="text-accent shrink-0" size={20}/> <span className="text-white/90">Alumni Management</span></li>
              </ul>
              <Link to="/contact" className="btn-accent text-center w-full mt-auto">Get Started</Link>
            </div>

            {/* Enterprise Tier */}
            <div className="card flex flex-col p-8 animate-fade-up delay-300 relative">
              <h3 className="text-2xl font-bold text-slate mb-2">Enterprise</h3>
              <p className="text-muted mb-6">1000+ students</p>
              <div className="text-4xl font-bold text-slate mb-8">Custom<span className="text-lg text-muted font-normal"> pricing</span></div>
              
              <ul className="flex-grow space-y-4 mb-8">
                <li className="flex items-start gap-3"><CheckCircle2 className="text-accent shrink-0" size={20}/> <span className="font-semibold text-slate">All 8 Features</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="text-accent shrink-0" size={20}/> <span className="text-slate">Voucher & Payroll</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="text-accent shrink-0" size={20}/> <span className="text-slate">Priority 24/7 Support</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="text-accent shrink-0" size={20}/> <span className="text-slate">Dedicated Account Manager</span></li>
              </ul>
              <Link to="/contact" className="btn-secondary text-center w-full mt-auto">Contact Sales</Link>
            </div>

          </div>

          <div className="text-center max-w-2xl mx-auto bg-blue-50 border border-blue-100 p-6 rounded-lg mb-20 animate-fade-up">
            <p className="text-primary font-medium">
              Note: Free setup, training, and support are included in all plans. Domain registration is handled separately (approx. $10/year).
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-surface border-t border-gray-200">
        <div className="section-container max-w-3xl">
          <h2 className="text-3xl font-bold text-slate mb-10 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <button 
                  className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none"
                  onClick={() => toggleFaq(index)}
                >
                  <span className="font-bold text-slate">{faq.q}</span>
                  {openFaq === index ? <ChevronUp className="text-primary" /> : <ChevronDown className="text-muted" />}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 pt-2 text-muted border-t border-gray-100 bg-gray-50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-primary text-white text-center">
        <div className="section-container">
          <h2 className="text-3xl font-bold mb-6">Not sure which plan is right for you?</h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">Contact us for a personalized recommendation and quote based on your specific school needs.</p>
          <Link to="/contact" className="btn-accent px-8 py-3">
            Talk to our Team
          </Link>
        </div>
      </section>

    </div>
  );
};

export default PricingPage;
