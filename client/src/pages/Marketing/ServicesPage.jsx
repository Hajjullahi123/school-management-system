import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Globe, 
  GraduationCap, 
  CreditCard, 
  Users, 
  FileEdit, 
  CalendarCheck, 
  Receipt, 
  Badge 
} from 'lucide-react';

const SERVICES = [
  {
    icon: <Globe className="text-primary mb-4" size={40} />,
    title: 'Free Website + Custom Domain',
    desc: 'We build and host a professional school website. You get your own domain (e.g., yourschool.com). Update news, galleries, and announcements easily.'
  },
  {
    icon: <GraduationCap className="text-primary mb-4" size={40} />,
    title: 'Result Management',
    desc: 'Compute termly results, print report cards, generate transcripts. Supports continuous assessment, exams, and GPA.'
  },
  {
    icon: <CreditCard className="text-primary mb-4" size={40} />,
    title: 'Fee Management',
    desc: 'Set fee schedules, send automatic reminders, accept online payments (card, bank, USSD). Parents get instant receipts.'
  },
  {
    icon: <Users className="text-primary mb-4" size={40} />,
    title: 'Alumni Management',
    desc: 'Alumni directory, event management, fundraising tools. Keep your graduates engaged and giving back.'
  },
  {
    icon: <FileEdit className="text-primary mb-4" size={40} />,
    title: 'CBT Platform',
    desc: 'Create exams with question banks, timers, and randomisation. Auto-grading and instant results for students.'
  },
  {
    icon: <CalendarCheck className="text-primary mb-4" size={40} />,
    title: 'Attendance Management',
    desc: 'Digital register – daily or per subject. Mark attendance via web or app. Get alerts for absent students.'
  },
  {
    icon: <Receipt className="text-primary mb-4" size={40} />,
    title: 'Voucher & Payroll',
    desc: 'Manage staff salaries, deductions, and payslips. Use voucher system for fee discounts or staff welfare.'
  },
  {
    icon: <Badge className="text-primary mb-4" size={40} />,
    title: 'ID Card Generator',
    desc: 'Design and print student/staff ID cards in batches. Include photo, name, class, barcode.'
  }
];

const ServicesPage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <section className="bg-primary py-20 text-white text-center">
        <div className="section-container">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-up">Complete School Management Suite – 8 Powerful Features</h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto animate-fade-up delay-100">
            Everything your school needs, plus a free website.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="py-20 bg-surface">
        <div className="section-container">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {SERVICES.map((service, index) => (
              <div key={index} className="card flex flex-col items-start animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
                {service.icon}
                <h3 className="text-xl font-bold mb-3 text-slate">{index + 1}. {service.title}</h3>
                <p className="text-muted leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Banner */}
      <section className="py-20 bg-white border-t border-gray-200">
        <div className="section-container text-center">
          <h2 className="text-3xl font-bold text-slate mb-6">Get all 8 features – plus a free website.</h2>
          <Link to="/contact" className="btn-primary text-lg px-8 py-4">
            Request a Custom Quote →
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
