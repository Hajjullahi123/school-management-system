import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import emailjs from '@emailjs/browser';

const FloatingMessageWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: '',
    email: '',
    message: ''
  });

  // Use the credentials from your EmailJS setup here
  const EMAILJS_PUBLIC_KEY = "YOUR_EMAILJS_PUBLIC_KEY"; 
  const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
  const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.schoolName || !formData.email || !formData.message) {
      alert('Please fill all fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      // If EmailJS is properly configured, uncomment below.
      // emailjs.init(EMAILJS_PUBLIC_KEY);
      // await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      //   school: formData.schoolName,
      //   email: formData.email,
      //   message: formData.message
      // });
      
      // Simulating network request for now
      await new Promise(r => setTimeout(r, 1000));
      
      alert("Message sent successfully! We'll reply within 24 hours.");
      setIsOpen(false);
      setFormData({ schoolName: '', email: '', message: '' });
    } catch (error) {
      alert("Sorry, could not send. Please use our contact page.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#0F2A6B] hover:scale-105 transition-all z-[1000]"
        aria-label="Toggle Message Widget"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
      </button>

      {/* Widget Container */}
      {isOpen && (
        <div className="fixed bottom-[90px] right-6 w-[320px] bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] border border-gray-200 z-[1000] overflow-hidden flex flex-col animate-fade-up">
          <div className="bg-primary text-white p-4 font-heading font-semibold flex justify-between items-center">
            Send a quick message
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
            <input 
              type="text" 
              name="schoolName"
              placeholder="School name" 
              value={formData.schoolName}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
              required
            />
            <input 
              type="email" 
              name="email"
              placeholder="Your email" 
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
              required
            />
            <textarea 
              name="message"
              rows="3" 
              placeholder="Your question..." 
              value={formData.message}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors resize-none"
              required
            ></textarea>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-[#0F2A6B] transition-colors disabled:opacity-70 mt-1"
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
            <div className="text-center mt-1">
              <small className="text-muted text-xs">We reply within 24 hours</small>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default FloatingMessageWidget;
