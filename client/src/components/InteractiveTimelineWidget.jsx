import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBell,
  FiCalendar,
  FiCoffee,
  FiClock,
  FiInbox,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import { API_BASE_URL } from '../config';

const InteractiveTimelineWidget = ({ school }) => {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All');

  if (!school) return null;

  const primary = school.primaryColor || '#4f46e5';
  const secondary = school.secondaryColor || '#6366f1';

  // Aggregate different data layers into a standardized chronological list
  const getTimelineItems = () => {
    const items = [];

    // 1. notices
    if (Array.isArray(school.notices)) {
      school.notices.forEach((n) => {
        items.push({
          id: `notice-${n.id}`,
          title: n.title,
          content: n.content,
          date: new Date(n.createdAt),
          category: 'Notice',
          badgeText: '🔔 Notice',
          badgeStyle: { backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca' }, // Soft red
          icon: <FiBell className="w-4 h-4 text-red-500" />
        });
      });
    }

    // 2. newsEvents
    if (Array.isArray(school.newsEvents)) {
      school.newsEvents.forEach((e) => {
        items.push({
          id: `event-${e.id}`,
          title: e.title,
          content: e.content,
          date: new Date(e.eventDate),
          category: 'Event',
          badgeText: e.type === 'event' ? '📅 Event' : '📰 News',
          badgeStyle: { backgroundColor: '#dbeafe', color: '#2563eb', border: '1px solid #bfdbfe' }, // Soft blue
          imageUrl: e.imageUrl,
          icon: <FiCalendar className="w-4 h-4 text-blue-500" />
        });
      });
    }

    // 3. schoolHolidays
    if (Array.isArray(school.schoolHolidays)) {
      school.schoolHolidays.forEach((h) => {
        items.push({
          id: `holiday-${h.id}`,
          title: h.name,
          content: h.description || `School holiday on ${new Date(h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
          date: new Date(h.date),
          category: 'Holiday',
          badgeText: '🌴 Holiday',
          badgeStyle: { backgroundColor: '#d1fae5', color: '#059669', border: '1px solid #a7f3d0' }, // Soft green
          icon: <FiCoffee className="w-4 h-4 text-emerald-500" />
        });
      });
    }

    // Sort: newest date first
    return items.sort((a, b) => b.date - a.date);
  };

  const allItems = getTimelineItems();

  // Filter items based on active tab
  const filteredItems = allItems.filter((item) => {
    if (activeTab === 'All') return true;
    return item.category === activeTab;
  });

  const tabs = [
    { name: 'All', label: '🗓️ All Updates' },
    { name: 'Notice', label: '🔔 Notices' },
    { name: 'Event', label: '📅 Events' },
    { name: 'Holiday', label: '🌴 Holidays' }
  ];

  // Helper to convert hex colors to RGBA
  const hexToRgba = (hex = '#4f46e5', alpha = 1) => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
    const num = parseInt(full, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  };

  return (
    <div className="w-full relative z-20 flex flex-col h-full">
      <section 
        className="rounded-2xl shadow-md border border-white/10 relative overflow-hidden transition-all flex-1"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, #1e293b 100%)` }}
      >
        <button
          onClick={() => setIsTimelineOpen(!isTimelineOpen)}
          className="w-full flex items-center justify-between px-6 py-[18px] text-sm font-bold text-white hover:bg-white/5 transition-colors cursor-pointer relative z-10"
        >
        <div className="flex items-center gap-3">
          <FiCalendar className="w-5 h-5 text-white" />
          <span className="uppercase tracking-wide text-white">School Calendar Timeline</span>
        </div>
        <div className="text-white/80">
          {isTimelineOpen ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
        </div>
      </button>

      <AnimatePresence>
        {isTimelineOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white rounded-b-2xl"
          >
            <div className="py-12 px-6 relative border-t border-gray-100">
              {/* Decorative background grid elements */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

              <div className="max-w-5xl mx-auto relative z-10">
                {/* Section Header */}
                <div className="text-center mb-10">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider mb-3"
                    style={{ backgroundColor: hexToRgba(primary, 0.1), color: primary }}
                  >
                    School Calendar
                  </span>
                  <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">
                    Updates &amp; Upcoming <span style={{ color: primary }}>Timeline</span>
                  </h2>
                </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all select-none focus:outline-none border shadow-sm ${
                  isActive
                    ? 'text-white border-transparent'
                    : 'text-gray-500 bg-white border-gray-100 hover:bg-gray-50 hover:text-gray-800'
                }`}
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${primary}, ${secondary})`
                    : undefined
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Timeline Content */}
        <div className="relative">
          {/* Vertical Timeline center-line */}
          {filteredItems.length > 0 && (
            <div className="absolute left-6 md:left-1/2 top-4 bottom-4 w-0.5 bg-gray-100 -translate-x-1/2 pointer-events-none" />
          )}

          <AnimatePresence mode="popLayout">
            {filteredItems.length > 0 ? (
              <div className="space-y-8">
                {filteredItems.map((item, index) => {
                  const isEven = index % 2 === 0;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className={`flex flex-col md:flex-row items-stretch gap-6 relative w-full ${
                        isEven ? 'md:flex-row' : 'md:flex-row-reverse'
                      }`}
                    >
                      {/* Timeline Dot Indicator */}
                      <div className="absolute left-6 md:left-1/2 w-10 h-10 rounded-2xl bg-white border-2 flex items-center justify-center -translate-x-1/2 z-10 shadow-md transition-transform group-hover:scale-115 shrink-0"
                        style={{ borderColor: primary }}>
                        {item.icon}
                      </div>

                      {/* Content Card Side */}
                      <div className="w-full md:w-[46%] pl-12 md:pl-0 text-left">
                        <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative flex flex-col group h-full">
                          {/* Top badge */}
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <span
                              className="px-3 py-1 rounded-full text-[10px] font-black tracking-wide uppercase shadow-sm"
                              style={item.badgeStyle}
                            >
                              {item.badgeText}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
                              <FiClock className="w-3.5 h-3.5" />
                              {item.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>

                          {/* Event Image if available */}
                          {item.imageUrl && (
                            <div className="rounded-xl overflow-hidden mb-4 bg-gray-50 max-h-44 border border-gray-100">
                              <img
                                src={item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          <h3 className="text-base font-extrabold text-gray-900 leading-snug mb-2 group-hover:text-primary transition-colors"
                            style={{ '--primary': primary }}>
                            {item.title}
                          </h3>
                          <p className="text-xs text-gray-500 leading-relaxed text-justify flex-1">
                            {item.content}
                          </p>
                        </div>
                      </div>

                      {/* Spacing card (empty half on large screens) */}
                      <div className="hidden md:block w-[46%]" />
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-16 px-6 border border-dashed border-gray-200 rounded-[32px] bg-slate-50/50 max-w-md mx-auto"
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-400 shadow-sm">
                  <FiInbox className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-gray-800 text-sm mb-1">No Timeline Updates</h4>
                <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                  There are currently no {activeTab === 'All' ? 'notices, events, or holidays' : `${activeTab.toLowerCase()}s`} scheduled for publication. Check back later!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
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

export default InteractiveTimelineWidget;
