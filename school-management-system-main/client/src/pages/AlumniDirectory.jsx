import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../api';
import useSchoolSettings from '../hooks/useSchoolSettings';
import { Link } from 'react-router-dom';

const AlumniDirectory = () => {
  const { settings } = useSchoolSettings();
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [years, setYears] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    if (settings?.schoolId) {
      fetchAlumni(settings.schoolId);
      generateYears();
    }
  }, [settings?.schoolId]);

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 1990;
    const yearList = [];
    for (let y = currentYear; y >= startYear; y--) {
      yearList.push(y);
    }
    setYears(yearList);
  };

  const fetchAlumni = async (schoolId) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (year) queryParams.append('year', year);
      if (schoolId) queryParams.append('school', schoolId);

      const response = await api.get(`/api/alumni/directory?${queryParams.toString()}`);
      const data = await response.json();
      setAlumni(data);
    } catch (error) {
      console.error('Failed to fetch alumni');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (settings?.schoolId) {
      fetchAlumni(settings.schoolId);
    }
  };

  // Generate a random gradient based on string (for cover photos)
  const getGradient = (str) => {
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-emerald-400 to-teal-600',
      'from-amber-400 to-orange-600',
      'from-rose-400 to-red-600',
      'from-purple-500 to-fuchsia-600',
      'from-cyan-400 to-blue-600'
    ];
    let hash = 0;
    if (!str) return colors[0];
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-primary/20">
      {/* Dynamic Navigation Bar overlay */}
      <nav className="absolute top-0 w-full z-50 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/alumni" className="flex items-center gap-2 text-white/90 hover:text-white font-bold transition-all group backdrop-blur-md bg-black/10 px-4 py-2 rounded-full border border-white/20">
              <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Alumni Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <div className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden bg-gray-900 flex-shrink-0">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-gray-900 to-black opacity-90 z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80" 
            alt="Alumni Background" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px] mix-blend-screen z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] mix-blend-screen z-10 pointer-events-none"></div>

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1.5 mb-6 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-[0.2em] uppercase rounded-full shadow-lg">
            Global Network
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight drop-shadow-xl leading-tight">
            Alumni <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-primary-light">Directory</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
            Discover and connect with generations of outstanding graduates. Build your network and find professional opportunities.
          </p>

          {/* Glassmorphic Search Bar */}
          <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 p-3 md:p-4 rounded-[2rem] shadow-2xl">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-white/50 group-focus-within:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by name, skills, or company..."
                  className="w-full pl-14 pr-6 py-4 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/10 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all text-lg font-medium"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="w-full md:w-56 relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-white/50 group-focus-within:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <select
                  className="w-full pl-12 pr-10 py-4 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all text-lg font-medium appearance-none cursor-pointer"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  style={{ backgroundImage: 'none' }}
                >
                  <option value="" className="text-gray-900">Any Year</option>
                  {years.map(y => <option key={y} value={y} className="text-gray-900">{y}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-white/50">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              <button
                type="submit"
                className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 rounded-2xl font-black transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transform hover:-translate-y-0.5 active:scale-95 whitespace-nowrap text-lg"
              >
                Find Alumni
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Results Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-6 border-b border-gray-200 gap-4">
          <div className="text-gray-600 font-medium">
            Showing <span className="font-bold text-gray-900">{alumni.length}</span> {alumni.length === 1 ? 'result' : 'results'}
          </div>
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
              title="Grid View"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
              title="List View"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-24 bg-gray-200"></div>
                <div className="p-6 relative">
                  <div className="w-20 h-20 bg-gray-300 rounded-full border-4 border-white absolute -top-10"></div>
                  <div className="mt-12 h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-100 rounded w-1/2 mb-6"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-full"></div>
                    <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : alumni.length > 0 ? (
          /* Alumni Grid/List */
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8" 
            : "flex flex-col gap-4"
          }>
            {alumni.map(person => {
              const firstName = person.student?.user?.firstName || person.name?.split(' ')[0] || 'Anonymous';
              const lastName = person.student?.user?.lastName || person.name?.split(' ').slice(1).join(' ') || '';
              const fullName = `${firstName} ${lastName}`.trim();
              const photoUrl = person.student?.user?.photoUrl || person.profilePicture;
              const coverGradient = getGradient(fullName);

              if (viewMode === 'list') {
                return (
                  <div key={person.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 group">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-full border-2 border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center relative">
                      {photoUrl ? (
                        <img src={photoUrl.startsWith('data:') || photoUrl.startsWith('http') ? photoUrl : `${API_BASE_URL}${photoUrl}`} alt={fullName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl sm:text-2xl font-bold text-gray-400">{firstName[0]}{lastName ? lastName[0] : ''}</span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-1">
                        <h3 className="text-xl font-bold text-gray-900 truncate group-hover:text-primary transition-colors">{fullName}</h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 w-max">
                          Class of {person.graduationYear}
                        </span>
                      </div>
                      <p className="text-gray-600 font-medium mb-1 truncate">
                        {person.currentJob || 'Alumnus'} {person.currentCompany && <span className="text-gray-400 font-normal">at</span>} {person.currentCompany && <span className="text-gray-800">{person.currentCompany}</span>}
                      </p>
                      {person.skills && (
                        <p className="text-xs text-gray-500 truncate">
                          {person.skills.split(',').slice(0, 5).join(' • ')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-4 sm:mt-0 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100 justify-end">
                      {person.linkedinUrl && (
                        <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-[#0077b5] hover:bg-blue-50 rounded-full transition-colors">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                        </a>
                      )}
                      <button className="bg-gray-50 hover:bg-primary hover:text-white text-gray-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                        View Profile
                      </button>
                    </div>
                  </div>
                );
              }

              // Grid View Card
              return (
                <div key={person.id} className="bg-white rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col group relative transform hover:-translate-y-1">
                  {/* LinkedIn Style Banner */}
                  <div className={`h-24 w-full bg-gradient-to-r ${coverGradient} relative`}>
                    <div className="absolute inset-0 bg-white/10 mix-blend-overlay pattern-dots text-white opacity-20"></div>
                  </div>
                  
                  <div className="px-6 pb-6 flex-1 flex flex-col relative">
                    {/* Avatar Overlapping Banner */}
                    <div className="flex justify-between items-end -mt-10 mb-4">
                      <div className="w-20 h-20 rounded-2xl border-4 border-white overflow-hidden bg-white shadow-md flex items-center justify-center relative group-hover:scale-105 transition-transform">
                        {photoUrl ? (
                          <img
                            src={photoUrl.startsWith('data:') || photoUrl.startsWith('http') ? photoUrl : `${API_BASE_URL}${photoUrl}`}
                            alt={fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-50 flex items-center justify-center text-2xl font-black text-gray-300">
                            {firstName[0]}{lastName ? lastName[0] : ''}
                          </div>
                        )}
                      </div>
                      <span className="bg-gray-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">
                        Class '{person.graduationYear.toString().slice(-2)}
                      </span>
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-black text-gray-900 leading-tight mb-1 group-hover:text-primary transition-colors">
                      {fullName}
                    </h3>

                    <div className="mb-4 flex-1">
                      <p className="text-gray-800 font-semibold text-sm mb-1">
                        {person.currentJob || 'Alumnus'} 
                        {person.currentCompany && <span className="text-gray-400 mx-1">at</span>} 
                        {person.currentCompany && <span className="text-primary">{person.currentCompany}</span>}
                      </p>
                      {person.university && (
                        <p className="text-gray-500 text-xs font-medium flex items-start mt-2">
                          <svg className="w-4 h-4 mr-1.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                          <span className="line-clamp-1">{person.university}</span>
                        </p>
                      )}
                    </div>

                    {/* Skills Pills */}
                    {person.skills && (
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {person.skills.split(',').slice(0, 3).map((skill, idx) => (
                          <span key={idx} className="bg-gray-50 border border-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-lg">
                            {skill.trim()}
                          </span>
                        ))}
                        {person.skills.split(',').length > 3 && (
                          <span className="text-gray-400 text-[10px] font-bold self-center ml-1">+{person.skills.split(',').length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center mt-auto">
                      <div className="flex space-x-2">
                        {person.linkedinUrl && (
                          <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-[#0077b5] rounded-xl transition-colors">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                          </a>
                        )}
                        {person.portfolioUrl && (
                          <a href={person.portfolioUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-xl transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" /></svg>
                          </a>
                        )}
                      </div>
                      <button className="text-[11px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-primary">
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Premium Empty State */
          <div className="text-center py-24 bg-white rounded-[3rem] border border-gray-100 shadow-sm max-w-3xl mx-auto">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
              <svg className="w-12 h-12 text-gray-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">No Profiles Found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              We couldn't find any alumni matching your current search filters. Try adjusting your search criteria.
            </p>
            <button
              onClick={() => { setSearch(''); setYear(''); fetchAlumni(settings?.schoolId); }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold transition-colors text-sm"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      <style>{`
        .pattern-dots {
          background-image: radial-gradient(currentColor 1px, transparent 1px);
          background-size: 10px 10px;
        }
      `}</style>
    </div>
  );
};

export default AlumniDirectory;
