import React from 'react';
import { FiAward, FiShield, FiBookOpen, FiGlobe, FiCheckCircle } from 'react-icons/fi';

const AccreditationsBand = ({ primary }) => {
  const accreditations = [
    { icon: <FiShield />, text: "Ministry of Education Approved" },
    { icon: <FiAward />, text: "WAEC & NECO Certified Center" },
    { icon: <FiGlobe />, text: "Global STEM Curriculum" },
    { icon: <FiBookOpen />, text: "Continuous Professional Development" },
    { icon: <FiCheckCircle />, text: "100% Safety Compliance" }
  ];

  return (
    <div className="bg-white border-y border-gray-100 py-6 overflow-hidden relative">
      {/* Optional faint gradient overlay to ensure readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-white z-10 pointer-events-none hidden md:block"></div>
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 flex-wrap">
          <div className="text-center md:text-left shrink-0 mb-2 md:mb-0">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Trusted By & Certified With
            </h4>
          </div>
          
          <div className="flex items-center gap-8 md:gap-12 flex-wrap justify-center overflow-x-auto hide-scrollbar">
            {accreditations.map((item, index) => (
              <div key={index} className="flex items-center gap-2.5 transition-all cursor-default group">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:-translate-y-1"
                  style={{ backgroundColor: `${primary}15`, color: primary }}
                >
                  {React.cloneElement(item.icon, { className: 'w-4 h-4' })}
                </div>
                <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default AccreditationsBand;
