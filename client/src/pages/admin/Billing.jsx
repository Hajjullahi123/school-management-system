import React, { useState, useEffect } from 'react';
import { FiCheck, FiShield, FiBriefcase, FiZap, FiCreditCard, FiAlertCircle, FiClock, FiCalendar } from 'react-icons/fi';
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

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">System Subscription</h1>
        <p className="text-gray-500 font-medium">Manage your institution's license and scale your digital infrastructure</p>
      </div>

      {/* Current Status Card */}
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
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
              {school.packageType} Plan
            </h2>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${school.subscriptionActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {school.subscriptionActive ? 'Active' : 'Expired'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatusDetail icon={<FiUsers />} label="Capacity" value={`${school.maxStudents} Students`} />
            <StatusDetail icon={<FiCalendar />} label="Expires" value={school.expiresAt ? new Date(school.expiresAt).toLocaleDateString() : 'N/A'} />
            <StatusDetail icon={<FiClock />} label="Last Billing" value={school.lastBillingDate ? new Date(school.lastBillingDate).toLocaleDateString() : 'Never'} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Status Summary</p>
            <p className="text-sm font-bold text-gray-700">
              {school.subscriptionActive ? 'Your account is in good standing.' : 'Subscription required to continue services.'}
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
