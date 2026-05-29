import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSliders,
  FiCheck,
  FiUser,
  FiMail,
  FiPhone,
  FiMessageSquare,
  FiInbox,
  FiArrowRight,
  FiShield,
  FiLayers,
  FiAlertCircle,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import { apiCall } from '../api';
import { API_BASE_URL } from '../config';

const TuitionEstimatorWidget = ({ school }) => {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isBoarding, setIsBoarding] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!school) return null;

  const primary = school.primaryColor || '#4f46e5';
  const secondary = school.secondaryColor || '#6366f1';
  const accent = school.accentColor || '#818cf8';

  const classes = Array.isArray(school.classes) ? school.classes.filter(c => c.isActive !== false) : [];

  // Initialize selected class
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id.toString());
    }
  }, [classes]);

  // Fallback classes if none are configured
  const fallbackClasses = [
    { id: 'f-nursery', name: 'Nursery / Creche' },
    { id: 'f-primary', name: 'Primary (Grades 1-6)' },
    { id: 'f-junior', name: 'Junior Secondary (JSS 1-3)' },
    { id: 'f-senior', name: 'Senior Secondary (SSS 1-3)' }
  ];

  const activeClasses = classes.length > 0 ? classes : fallbackClasses;

  let estimatorConfig = null;
  if (school.tuitionEstimatorConfig) {
    try {
      estimatorConfig = JSON.parse(school.tuitionEstimatorConfig);
    } catch(e) {}
  }

  // Surcharges & Add-ons list
  // Dynamically extract boarding and other fees if they exist in the DB
  const dbFees = Array.isArray(school.MiscellaneousFee) ? school.MiscellaneousFee : [];
  
  let boardingFee = 120000;
  let hasBoarding = true;
  let addonsList = [];

  if (estimatorConfig) {
    boardingFee = estimatorConfig.boarding || 120000;
    hasBoarding = estimatorConfig.hasBoarding !== false;
    addonsList = estimatorConfig.addons || [];
  } else {
    const boardingFeeObj = dbFees.find(f => f.title.toLowerCase().includes('boarding') || f.title.toLowerCase().includes('hostel'));
    if (boardingFeeObj) boardingFee = boardingFeeObj.amount;
    if (dbFees.length > 0 && !boardingFeeObj) hasBoarding = false; // if dbFees exist but no boarding, hide it
    
    const dynamicAddons = dbFees
      .filter(f => f.id !== boardingFeeObj?.id)
      .map(f => ({
        id: f.id.toString(),
        name: f.title,
        price: f.amount,
        desc: f.description || (f.isCompulsory ? 'Compulsory fee' : 'Optional service fee')
      }));

    const fallbackAddons = [
      { id: 'bus', name: 'School Bus Transit (Daily Routing)', price: 18000, desc: 'Optional two-way transport logistics.' },
      { id: 'meals', name: 'Premium Lunch & Meal Plan', price: 22000, desc: 'Freshly prepared, balanced hot lunches daily.' },
      { id: 'books', name: 'Textbooks & Stationery Kit', price: 15000, desc: 'All curriculum-aligned books & writing tools.' },
      { id: 'uniforms', name: 'Standard Uniform Set (2 sets + sportwear)', price: 25000, desc: 'Quality customized school attire sets.' }
    ];

    addonsList = dynamicAddons.length > 0 ? dynamicAddons : (classes.length === 0 ? fallbackAddons : []);
  }

  // Helper to convert hex colors to RGBA
  const hexToRgba = (hex = '#4f46e5', alpha = 1) => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const num = parseInt(full, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  };

  const getBaseTuition = (classIdStr) => {
    if (!classIdStr) return 50000;

    // Check ClassFeeStructure first
    if (Array.isArray(school.ClassFeeStructure)) {
      const numericId = parseInt(classIdStr);
      const match = school.ClassFeeStructure.find(fs => fs.classId === numericId);
      if (match) return match.amount;
    }

    const str = classIdStr.toLowerCase();
    let name = '';
    const matchedClass = classes.find(c => c.id.toString() === classIdStr);
    if (matchedClass) name = matchedClass.name.toLowerCase();

    if (estimatorConfig) {
       if (str.includes('nursery') || name.includes('nursery') || name.includes('creche') || name.includes('pre')) return estimatorConfig.nursery || 35000;
       if (str.includes('primary') || name.includes('primary') || name.includes('grade')) return estimatorConfig.primary || 50000;
       if (str.includes('jss') || str.includes('junior') || name.includes('jss') || name.includes('junior')) return estimatorConfig.junior || 80000;
       if (str.includes('sss') || str.includes('senior') || name.includes('sss') || name.includes('senior')) return estimatorConfig.senior || 110000;
       return 60000;
    }

    if (matchedClass) {
      if (name.includes('nursery') || name.includes('creche') || name.includes('pre')) return 35000;
      if (name.includes('primary') || name.includes('grade')) return 50000;
      if (name.includes('jss') || name.includes('junior')) return 80000;
      if (name.includes('sss') || name.includes('senior')) return 110000;
      return 60000;
    }

    if (classIdStr === 'f-nursery') return 35000;
    if (classIdStr === 'f-primary') return 55000;
    if (classIdStr === 'f-junior') return 85000;
    if (classIdStr === 'f-senior') return 115000;

    return 60000;
  };

  const activeClassId = selectedClassId || (activeClasses[0] ? activeClasses[0].id.toString() : '');
  const baseTuition = getBaseTuition(activeClassId);
  const addonsTotal = selectedAddons.reduce((sum, addonId) => {
    const addon = addonsList.find(a => a.id === addonId);
    return sum + (addon ? addon.price : 0);
  }, 0);
  const boardingTotal = isBoarding ? boardingFee : 0;
  const grandTotal = baseTuition + addonsTotal + boardingTotal;

  const getClassName = (idStr) => {
    const c = activeClasses.find(x => x.id.toString() === idStr);
    return c ? `${c.name} ${c.arm ? `(Arm ${c.arm})` : ''}` : 'Selected Grade';
  };

  const handleAddonClick = (addonId) => {
    if (selectedAddons.includes(addonId)) {
      setSelectedAddons(selectedAddons.filter(id => id !== addonId));
    } else {
      setSelectedAddons([...selectedAddons, addonId]);
    }
  };

  // Pre-fill message for inquiry when calculator states change
  useEffect(() => {
    const addonNames = selectedAddons
      .map(id => addonsList.find(a => a.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    const message = `Hello Admissions Team! I used your online tuition fee estimator and generated a per-term cost estimate of ₦${grandTotal.toLocaleString('en-NG')} for ${getClassName(activeClassId)} (${isBoarding ? 'Boarding Enrolment' : 'Day Enrolment'}).

Details of my configuration:
- Base Tuition: ₦${baseTuition.toLocaleString('en-NG')}
- Surcharge (Boarding): ₦${boardingTotal.toLocaleString('en-NG')}
- Selected Options: ${addonNames || 'None selected'}

I would appreciate it if you could verify this setup and schedule a campus tour/admission discussion with me.`;

    setInquiryForm(prev => ({ ...prev, message }));
  }, [activeClassId, isBoarding, selectedAddons, grandTotal]);

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const selectedClassObj = activeClasses.find(x => x.id.toString() === activeClassId);
      const gradeText = selectedClassObj ? selectedClassObj.name : 'Unknown';

      const response = await apiCall(`/api/public-school/${school.slug}/inquiry`, {
        method: 'POST',
        body: JSON.stringify({
          parentName: inquiryForm.name,
          email: inquiryForm.email,
          phone: inquiryForm.phone,
          gradeLevel: gradeText,
          message: inquiryForm.message
        })
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setInquiryForm({ name: '', email: '', phone: '', message: '' });
      } else {
        setErrorMsg(response.data?.error || 'Failed to submit inquiry.');
      }
    } catch (err) {
      console.error('Inquiry Submission Error:', err);
      setErrorMsg('Network transmission failure. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full relative z-20 flex flex-col h-full">
      <section id="tuition-estimator" className="bg-white rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden transition-all hover:shadow-md flex-1">
        {/* Subtle theme gradient background (slightly different opacity to distinguish from timeline) */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
        />
        <button
          onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
          className="w-full flex items-center justify-between px-6 py-[18px] text-sm font-bold text-gray-800 hover:bg-black/[0.02] transition-colors cursor-pointer relative z-10"
        >
        <div className="flex items-center gap-3">
          <FiSliders className="w-5 h-5" style={{ color: primary }} />
          <span className="uppercase tracking-wide">Tuition Fee Estimator</span>
        </div>
        <div className="text-gray-400">
          {isCalculatorOpen ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
        </div>
      </button>

      <AnimatePresence>
        {isCalculatorOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="py-12 px-6 relative">
              {/* Dynamic Background Glowing Accents */}
              <div
                className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.03] pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{ backgroundColor: primary }}
              />
              <div
                className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.03] pointer-events-none translate-x-1/2 translate-y-1/2"
                style={{ backgroundColor: secondary }}
              />

              <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                  <span
                    className="inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-4 border"
                    style={{
                      backgroundColor: hexToRgba(primary, 0.08),
                      color: primary,
                      borderColor: hexToRgba(primary, 0.15)
                    }}
                  >
                    🧮 Interactive Calculator
                  </span>
                  <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">
                    Tuition Fee <span style={{ color: primary }}>Estimator</span>
                  </h2>
                </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Settings Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-[32px] p-6 md:p-8 border border-gray-100 shadow-sm space-y-6 text-left">
              {/* Class Select Dropdown */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block ml-1">
                  Step 1: Select Academic Grade
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-gray-50/70 border-2 border-gray-100 rounded-2xl px-5 py-4 text-xs font-bold text-gray-700 focus:outline-none focus:bg-white focus:border-indigo-500 hover:bg-gray-100/50 transition-all cursor-pointer appearance-none"
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setShowInquiryForm(false);
                    }}
                  >
                    {activeClasses.map((c) => (
                      <option key={c.id} value={c.id.toString()}>
                        {c.name} {c.arm ? `(Arm ${c.arm})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold text-[10px]">
                    ▼
                  </div>
                </div>
              </div>

              {/* Enrolment Type Selection */}
              {hasBoarding && (
                <div className="space-y-3">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block ml-1">
                    Step 2: Choose Enrolment Mode
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Day Student Button */}
                    <button
                      onClick={() => {
                        setIsBoarding(false);
                        setShowInquiryForm(false);
                      }}
                      className={`p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all ${
                        !isBoarding
                          ? 'border-indigo-600 bg-indigo-50/10 shadow-sm'
                          : 'border-gray-100 bg-gray-50/40 hover:bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        !isBoarding ? 'border-indigo-600' : 'border-gray-300'
                      }`}
                    >
                      {!isBoarding && (
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      )}
                    </div>
                    <div>
                      <h4
                        className="text-xs font-black"
                        style={{ color: !isBoarding ? primary : '#1f2937' }}
                      >
                        🌞 Day Student
                      </h4>
                      <p className="text-[10px] text-gray-400 leading-normal mt-1">
                        Attends regular school hours and commutes daily.
                      </p>
                    </div>
                  </button>

                  {/* Boarding Student Button */}
                  <button
                    onClick={() => {
                      setIsBoarding(true);
                      setShowInquiryForm(false);
                    }}
                    className={`p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all ${
                      isBoarding
                        ? 'border-indigo-600 bg-indigo-50/10 shadow-sm'
                        : 'border-gray-100 bg-gray-50/40 hover:bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        isBoarding ? 'border-indigo-600' : 'border-gray-300'
                      }`}
                    >
                      {isBoarding && (
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      )}
                    </div>
                    <div>
                      <h4
                        className="text-xs font-black"
                        style={{ color: isBoarding ? primary : '#1f2937' }}
                      >
                        🏰 Boarding Enrolment
                      </h4>
                      <p className="text-[10px] text-gray-400 leading-normal mt-1">
                        Includes laundry, hostel residency &amp; 3 daily meals (+ ₦{boardingFee.toLocaleString('en-NG')}).
                      </p>
                    </div>
                  </button>
                </div>
              </div>
              )}

              {/* Surcharges & Add-ons Checklist */}
              {addonsList.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block ml-1">
                    Step 3: Add Optional Services / Utilities
                  </label>
                  <div className="space-y-2.5">
                    {addonsList.map((addon) => {
                      const isSelected = selectedAddons.includes(addon.id);
                      return (
                        <button
                          key={addon.id}
                          onClick={() => {
                            handleAddonClick(addon.id);
                            setShowInquiryForm(false);
                          }}
                          className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/5 shadow-sm'
                              : 'border-gray-100 bg-white hover:bg-gray-50/50 hover:border-gray-200'
                          }`}
                        >
                          {/* Checkbox circle */}
                          <div
                            className={`w-5.5 h-5.5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 border-transparent text-white'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            {isSelected && <FiCheck className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0 pr-4">
                            <h4
                              className="text-xs font-bold truncate"
                              style={{ color: isSelected ? primary : '#374151' }}
                            >
                              {addon.name}
                            </h4>
                            <p className="text-[10px] text-gray-400 leading-none mt-1 truncate">
                              {addon.desc}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className="text-xs font-black italic"
                              style={{ color: isSelected ? primary : '#1f2937' }}
                            >
                              + ₦{addon.price.toLocaleString('en-NG')}
                            </span>
                            <span className="text-[8px] text-gray-400 uppercase tracking-widest block mt-0.5">
                              per term
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Calculator Right Column / Glassmorphic Total Cards */}
          <div className="lg:col-span-5 space-y-6">
            <div
              className="rounded-[32px] border border-gray-100/10 p-8 shadow-2xl relative overflow-hidden text-left text-white"
              style={{
                background: `linear-gradient(135deg, ${primary}, ${secondary})`
              }}
            >
              {/* Glowing decor */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/3 pointer-events-none" />
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              />

              <div className="relative z-10 space-y-6">
                <div>
                  <span className="px-3 py-1 rounded-full bg-white/20 text-[9px] font-black uppercase tracking-widest border border-white/25">
                    ₦ Naira (NGN) Estimation
                  </span>
                  <h3 className="text-xl font-black mt-4 leading-tight">
                    Estimated Tuition
                  </h3>
                  <p className="text-[11px] text-white/85 leading-normal mt-1">
                    Applicable for {getClassName(activeClassId)}. Values dynamically calculated.
                  </p>
                </div>

                {/* Main Total Display */}
                <div className="py-6 border-y border-white/10 flex items-baseline justify-between gap-4">
                  <div className="text-left">
                    <span className="text-sm font-bold text-white/70 uppercase tracking-widest block">
                      Estimated Sum
                    </span>
                    <span className="text-4xl md:text-5xl font-black tracking-tight italic drop-shadow-sm">
                      ₦{grandTotal.toLocaleString('en-NG')}
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-white/20 border border-white/20 rounded-xl text-[10px] font-extrabold uppercase tracking-widest">
                    per term
                  </span>
                </div>

                {/* Sub-item breakdowns */}
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between text-white/80">
                    <span className="font-semibold">Base Academic Tuition:</span>
                    <span className="font-black italic">
                      ₦{baseTuition.toLocaleString('en-NG')}
                    </span>
                  </div>
                  {isBoarding && (
                    <div className="flex items-center justify-between text-white/80">
                      <span className="font-semibold">Boarding &amp; Residence:</span>
                      <span className="font-black italic">
                        + ₦{boardingFee.toLocaleString('en-NG')}
                      </span>
                    </div>
                  )}
                  {selectedAddons.length > 0 && (
                    <div className="flex items-center justify-between text-white/80">
                      <span className="font-semibold">
                        Custom Options ({selectedAddons.length}):
                      </span>
                      <span className="font-black italic">
                        + ₦{addonsTotal.toLocaleString('en-NG')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Converter Action Button */}
                <button
                  onClick={() => setShowInquiryForm(!showInquiryForm)}
                  className={`w-full py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-97 transition-all flex items-center justify-center gap-2 select-none ${
                    showInquiryForm
                      ? 'bg-slate-900 text-white shadow-none border border-slate-800'
                      : 'bg-white text-gray-900 hover:bg-gray-50 shadow-white/10 hover:-translate-y-0.5'
                  }`}
                >
                  <FiSliders className="w-4 h-4" />
                  {showInquiryForm ? 'Hide Details Form' : 'Proceed to Inquiry'}
                  <FiArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Smart Application Inquiry Panel */}
            <AnimatePresence>
              {showInquiryForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-xl space-y-6 text-left">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-3">
                      <span className="w-1.5 h-6 bg-indigo-600 rounded-full inline-block" />
                      Instant Admission Inquiry
                    </h3>

                    {submitSuccess ? (
                      <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        className="py-10 text-center space-y-4"
                      >
                        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm border border-emerald-100 text-2xl font-black">
                          ✓
                        </div>
                        <h4 className="font-black text-gray-800 text-sm">
                          Estimate Inquiry Staged!
                        </h4>
                        <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                          Your tuition estimate and parent inquiry have been logged in the admissions engine. We will contact you shortly!
                        </p>
                        <button
                          onClick={() => {
                            setSubmitSuccess(false);
                            setShowInquiryForm(false);
                          }}
                          className="px-6 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          Calculate New Estimate
                        </button>
                      </motion.div>
                    ) : (
                      <form onSubmit={handleInquirySubmit} className="space-y-4">
                        {errorMsg && (
                          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold flex items-center gap-2">
                            <FiAlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          {/* Parent Name */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                              Parent Name
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <FiUser className="w-3.5 h-3.5" />
                              </span>
                              <input
                                type="text"
                                required
                                placeholder="Full Name"
                                className="w-full bg-gray-50/70 border-2 border-gray-100 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-gray-700 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                value={inquiryForm.name}
                                onChange={(e) =>
                                  setInquiryForm({ ...inquiryForm, name: e.target.value })
                                }
                              />
                            </div>
                          </div>

                          {/* Phone Number */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                              Phone Number
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <FiPhone className="w-3.5 h-3.5" />
                              </span>
                              <input
                                type="tel"
                                required
                                placeholder="e.g. +234..."
                                className="w-full bg-gray-50/70 border-2 border-gray-100 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-gray-700 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                value={inquiryForm.phone}
                                onChange={(e) =>
                                  setInquiryForm({ ...inquiryForm, phone: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* Email Address */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                            Email Address
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                              <FiMail className="w-3.5 h-3.5" />
                            </span>
                            <input
                              type="email"
                              required
                              placeholder="parent@example.com"
                              className="w-full bg-gray-50/70 border-2 border-gray-100 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-gray-700 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                              value={inquiryForm.email}
                              onChange={(e) =>
                                setInquiryForm({ ...inquiryForm, email: e.target.value })
                              }
                            />
                          </div>
                        </div>

                        {/* Staged Message (Prefilled & editable) */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                            Detailed Message
                          </label>
                          <textarea
                            rows="4"
                            required
                            className="w-full bg-gray-50/70 border-2 border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-600 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all resize-none leading-relaxed"
                            value={inquiryForm.message}
                            onChange={(e) =>
                              setInquiryForm({ ...inquiryForm, message: e.target.value })
                            }
                          />
                        </div>

                        {/* Submit */}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-97 disabled:opacity-50 transition-all"
                        >
                          {isSubmitting ? 'Transmitting Staged Info...' : 'Send Inquiry to Admissions'}
                        </button>
                      </form>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </section>
    </div>
  );
};

export default TuitionEstimatorWidget;
