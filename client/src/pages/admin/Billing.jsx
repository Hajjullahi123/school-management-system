import React, { useState, useEffect } from 'react';
import { FiCheck, FiShield, FiBriefcase, FiZap, FiCreditCard, FiAlertCircle, FiClock, FiCalendar, FiUsers } from 'react-icons/fi';
import { apiCall } from '../../api';
import { toast } from '../../utils/toast';

const Billing = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchBillingStatus();
  }, []);

  const fetchBillingStatus = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/api/platform-billing/status');
      setData(res.data);
    } catch (error) {
      toast.error('Failed to fetch billing status');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeSubscription = async (packageType) => {
    try {
      setProcessingId(packageType);
      const res = await apiCall('/api/platform-billing/initialize-subscription', {
        method: 'POST',
        body: JSON.stringify({ packageType })
      });

      if (res.data.authorization_url) {
        window.location.href = res.data.authorization_url;
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Payment initialization failed');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  const { school, pricing } = data;
  const [editPricing, setEditPricing] = useState({ ...pricing });
  const [updating, setUpdating] = useState(false);

  const handleUpdateGlobalPricing = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      await apiCall('/api/platform-billing/pricing', {
        method: 'PUT',
        body: JSON.stringify(editPricing)
      });
      toast.success('Platform prices updated globally');
      fetchBillingStatus();
    } catch (error) {
      toast.error('Failed to update platform prices');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Billing & Ecosystem</h1>
          <p className="text-gray-500 font-medium text-sm italic underline decoration-primary/20">Manage your institution's license and system-wide economics</p>
        </div>
      </div>

      {/* Global Pricing Editor (Platform Admin Section) */}
      <div className="bg-indigo-900 text-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none">
          <FiZap size={300} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-start">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 bg-indigo-500/30 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-400/30">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              Platform Economics
            </div>
            <h2 className="text-3xl font-black tracking-tighter italic uppercase">Market Price Adjustment</h2>
            <p className="text-indigo-200/80 text-sm leading-relaxed max-w-md">As a platform owner, you can adjust the standard pricing displayed on the public landing page for new schools joining the ecosystem.</p>
          </div>

          <form onSubmit={handleUpdateGlobalPricing} className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row items-end gap-6 w-full lg:w-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
              {['basic', 'standard', 'premium'].map(type => (
                <div key={type} className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-indigo-300 ml-1">{type} (₦)</label>
                  <input
                    type="number"
                    value={editPricing[type]}
                    onChange={(e) => setEditPricing({ ...editPricing, [type]: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-lg font-black focus:ring-4 focus:ring-white/10 outline-none transition-all"
                  />
                </div>
              ))}
            </div>
            <button
              type="submit"
              disabled={updating}
              className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20 flex items-center gap-2 whitespace-nowrap"
            >
              {updating ? 'Applying...' : 'Sync Market Prices'}
            </button>
          </form>
        </div>
      </div>

      {/* Current Status Card */}
      <div className="bg-white rounded-[40px] shadow-xl shadow-gray-100 border border-gray-100 p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
          <FiShield size={200} />
        </div>

        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-white shadow-2xl ${school.packageType === 'premium' ? 'bg-gradient-to-br from-indigo-600 to-blue-700' :
          school.packageType === 'standard' ? 'bg-gradient-to-br from-purple-600 to-indigo-700' :
            'bg-gradient-to-br from-emerald-500 to-teal-600'
          }`}>
          <FiBriefcase size={40} />
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
              {school.packageType} PLan
            </h2>
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${school.subscriptionActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {school.subscriptionActive ? 'ACTIVE' : 'EXPIRED'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatusDetail icon={<FiUsers className="text-primary" />} label="Capacity" value={`${school.maxStudents} Students`} />
            <StatusDetail icon={<FiCalendar className="text-primary" />} label="Expires" value={school.expiresAt ? new Date(school.expiresAt).toLocaleDateString() : 'N/A'} />
            <StatusDetail icon={<FiClock className="text-primary" />} label="Last Billing" value={school.lastBillingDate ? new Date(school.lastBillingDate).toLocaleDateString() : 'Never'} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 px-8">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Summary</p>
            <p className="text-sm font-bold text-gray-700 max-w-[200px]">
              {school.subscriptionActive ? 'Your account is in good standing with all services accessible.' : 'Subscription required to continue services and unlock full analytics.'}
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <PricingCard
          title="Basic"
          price={pricing.basic}
          current={school.packageType === 'basic'}
          students="500"
          features={['Attendance Tracking', 'Result Management', 'Homework System', 'Basic Analytics']}
          onSelect={() => handleInitializeSubscription('basic')}
          processing={processingId === 'basic'}
          color="emerald"
        />
        <PricingCard
          title="Standard"
          price={pricing.standard}
          current={school.packageType === 'standard'}
          students="1,500"
          features={['Everything in Basic', 'CBT Exams', 'ID Card Generator', 'Alumni Portal', 'Fee Management', 'Data Export/Backups']}
          onSelect={() => handleInitializeSubscription('standard')}
          processing={processingId === 'standard'}
          color="purple"
          recommended
        />
        <PricingCard
          title="Premium"
          price={pricing.premium}
          current={school.packageType === 'premium'}
          students="Unlimited"
          features={['Everything in Standard', 'AI Predictive Analytics', 'Custom Branding', 'Advanced Quran Tracker', 'Automated S3 Backups', 'Priority 24/7 Support']}
          onSelect={() => handleInitializeSubscription('premium')}
          processing={processingId === 'premium'}
          color="indigo"
        />
      </div>

      {/* Security Message */}
      <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4">
        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
          <FiShield />
        </div>
        <div className="text-sm">
          <p className="font-black text-blue-900">Secure Platform Billing</p>
          <p className="text-blue-700 font-medium">All billing operations are secured by End-to-End Encryption. Payments are processed via PCI-DSS compliant gateways.</p>
        </div>
      </div>
    </div>
  );
};

const StatusDetail = ({ icon, label, value }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
      {icon} {label}
    </p>
    <p className="font-bold text-gray-800">{value}</p>
  </div>
);

const PricingCard = ({ title, price, current, students, features, onSelect, processing, color, recommended }) => (
  <div className={`relative bg-white rounded-[32px] p-8 border-2 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col h-full ${current ? `border-${color}-600 ring-4 ring-${color}-50` : 'border-gray-100'
    }`}>
    {recommended && (
      <div className="absolute top-0 right-12 -translate-y-1/2 bg-gradient-to-r from-orange-500 to-amber-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
        Most Popular
      </div>
    )}

    <div className="mb-8">
      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 mb-2">{title} Plan</h3>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-black text-gray-900">₦{price.toLocaleString()}</span>
        <span className="text-gray-400 font-bold text-xs uppercase">/ Year</span>
      </div>
    </div>

    <div className="space-y-4 mb-8 flex-1">
      <div className="flex items-center gap-2 text-primary font-black text-sm">
        <FiZap /> up to {students} students
      </div>
      <div className="space-y-3">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-3 text-sm text-gray-600 font-medium">
            <FiCheck className={`mt-0.5 flex-shrink-0 text-${color}-500`} />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>

    <button
      onClick={onSelect}
      disabled={processing || current}
      className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl ${current
        ? 'bg-gray-100 text-gray-400 cursor-default'
        : `bg-gray-900 text-white hover:bg-black shadow-gray-200 active:scale-95`
        }`}
    >
      {processing ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      ) : (
        <>
          <FiCreditCard />
          {current ? 'Active Plan' : `Upgrade to ${title}`}
        </>
      )}
    </button>
  </div>
);

export default Billing;
