import React, { useState, useEffect } from 'react';
import { apiCall } from '../api';

const LoginAdvertSection = () => {
  const [adverts, setAdverts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchAdverts = async () => {
      try {
        const res = await apiCall('/api/adverts/public');
        if (Array.isArray(res.data)) {
          setAdverts(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch adverts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdverts();
  }, []);

  useEffect(() => {
    if (adverts.length <= 1) return;
    
    // Auto cycle
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % adverts.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [adverts.length]);

  if (loading || adverts.length === 0) return null;

  return (
    <div className="w-full relative overflow-hidden bg-white/5 border-t border-white/10 mt-8 rounded-b-2xl md:rounded-none">
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 py-3 pb-0">
          Featured Partners & Announcements
        </p>
        
        <div className="relative h-[120px] md:h-[160px] w-full flex items-center justify-center p-4">
          {adverts.map((ad, index) => {
            const isActive = index === currentIndex;
            return (
              <a
                key={ad.id}
                href={ad.targetUrl || '#'}
                target={ad.targetUrl ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className={`absolute transition-all duration-700 ease-in-out cursor-pointer group flex flex-col items-center
                  ${isActive ? 'opacity-100 translate-x-0 scale-100 z-10' : 'opacity-0 scale-95 z-0'}`}
                style={{
                  transform: !isActive ? (index < currentIndex ? 'translateX(-20px)' : 'translateX(20px)') : 'translateX(0)'
                }}
              >
                <div className="h-16 md:h-24 w-auto flex justify-center items-center overflow-hidden rounded-lg hover:shadow-lg transition-transform hover:scale-105 duration-300 bg-white p-2">
                  <img 
                    src={ad.imageUrl} 
                    alt={ad.title} 
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <span className="mt-2 text-xs font-bold text-gray-300 group-hover:text-primary transition-colors tracking-wide text-center bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-md">
                  {ad.title}
                </span>
              </a>
            );
          })}
        </div>
        
        {/* Navigation Dots */}
        {adverts.length > 1 && (
          <div className="flex justify-center gap-2 pb-4">
            {adverts.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-gray-500 hover:bg-gray-400'}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginAdvertSection;
