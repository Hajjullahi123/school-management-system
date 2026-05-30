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
    <div className="bg-[#0f172a] border-y border-[#1e293b] overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-center">
        <div className="flex items-center gap-2 flex-wrap justify-center overflow-x-auto hide-scrollbar w-full">
          {accreditations.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center justify-center gap-1.5 bg-sky-500 rounded-[2px] px-2 h-[20px] transition-all cursor-default"
            >
              {React.cloneElement(item.icon, { className: 'w-2.5 h-2.5 text-white' })}
              <span className="text-[9px] font-black text-white uppercase tracking-wider leading-none mt-[1px]">
                {item.text}
              </span>
            </div>
          ))}
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
