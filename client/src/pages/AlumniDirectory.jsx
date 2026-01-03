import React, { useState, useEffect } from 'react';
import { api } from '../api';
import useSchoolSettings from '../hooks/useSchoolSettings';

const AlumniDirectory = () => {
  const { settings } = useSchoolSettings();
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [years, setYears] = useState([]);

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

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Alumni Directory</h1>
          <p className="text-xl text-gray-600">Reconnect with former classmates and build your professional network.</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-2xl shadow-md mb-10 border border-gray-100">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="sr-only">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, skills, or company..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 focus:border-primary focus:ring-primary shadow-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="absolute left-3 top-3.5 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
              </div>
            </div>

            <div className="w-full md:w-48">
              <select
                className="w-full py-3 rounded-xl border-gray-200 focus:border-primary focus:ring-primary shadow-sm font-medium"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="">Graduation Year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md shadow-primary/20"
            >
              Filter
            </button>
          </form>
        </div>

        {/* Alumni List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : alumni.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {alumni.map(person => (
              <div key={person.id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-8 flex-1">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-primary text-3xl font-bold border border-gray-100 overflow-hidden shadow-inner">
                      {person.profilePicture ? (
                        <img src={person.profilePicture} alt={person.student.user.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{person.student.user.firstName[0]}{person.student.user.lastName[0]}</span>
                      )}
                    </div>
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                      Class of {person.graduationYear}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {person.student.user.firstName} {person.student.user.lastName}
                  </h3>

                  <div className="mb-4">
                    <p className="text-primary font-semibold text-sm">
                      {person.currentJob || 'Graduate'} {person.currentCompany ? `@ ${person.currentCompany}` : ''}
                    </p>
                    {person.university && (
                      <p className="text-gray-500 text-sm mt-1 flex items-center">
                        <svg className="w-4 h-4 mr-1 pb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                        {person.university}
                      </p>
                    )}
                  </div>

                  {person.bio && (
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-6">
                      {person.bio}
                    </p>
                  )}

                  {person.skills && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {person.skills.split(',').slice(0, 3).map((skill, idx) => (
                        <span key={idx} className="bg-primary/5 text-primary text-[10px] uppercase font-bold px-2.5 py-1 rounded-md">
                          {skill.trim()}
                        </span>
                      ))}
                      {person.skills.split(',').length > 3 && <span className="text-gray-400 text-[10px] font-bold self-center">+ more</span>}
                    </div>
                  )}
                </div>

                <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <div className="flex space-x-3">
                    {person.linkedinUrl && (
                      <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                      </a>
                    )}
                    {person.portfolioUrl && (
                      <a href={person.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" /></svg>
                      </a>
                    )}
                  </div>
                  <button className="text-primary font-bold text-sm hover:underline">View Profile</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-40 bg-white rounded-3xl border-2 border-dashed border-gray-200 shadow-inner">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <p className="text-2xl font-bold text-gray-400">No alumni found matching your filters.</p>
            <button
              onClick={() => { setSearch(''); setYear(''); fetchAlumni(); }}
              className="mt-6 text-primary font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlumniDirectory;
