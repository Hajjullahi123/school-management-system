import React, { useState, useEffect } from 'react';
import { api } from '../api';

const SchoolShowcase = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await api.get('/api/showcase/public');
        const data = await res.json();
        if (Array.isArray(data)) {
          setSchools(data);
        }
      } catch (err) {
        console.error('Failed to fetch showcase schools:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  if (loading || schools.length === 0) return null;

  return (
    <div className="w-full py-8 border-t border-gray-100 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4">
        <p className="text-center text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 mb-6">
          Empowering Leading Institutions
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 hover:opacity-100 transition-opacity duration-500">
          {schools.map(school => (
            <div key={school.id} className="group flex flex-col items-center gap-3">
              <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all duration-300">
                <img 
                  src={school.logoUrl} 
                  alt={school.name} 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <span className="text-[10px] md:text-xs font-bold text-gray-500 group-hover:text-primary transition-colors uppercase tracking-tight">
                {school.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchoolShowcase;
