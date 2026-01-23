import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useSchoolSettings from '../hooks/useSchoolSettings';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api';

const LandingPage = () => {
  const { settings: schoolSettings } = useSchoolSettings();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  // Using locally generated images for better aesthetics
  const studentImages = [
    "/images/hero_exterior.png",
    "/images/hero_students.png",
    "/images/hero_lab.png",
    "/images/hero_library.png"
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [topStudents, setTopStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [newsItems, setNewsItems] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);

  const faqs = [
    {
      q: "How can I check my child's results?",
      a: "Parents can log in to the Parent Portal using their registered phone number. Once logged in, you can view and download termly report cards."
    },
    {
      q: "What are the school's opening hours?",
      a: schoolSettings?.openingHours || "Our school is open from Monday to Friday, 8:00 AM to 4:00 PM."
    },
    {
      q: "How do I apply for admission?",
      a: "You can download the Admission Guide from our footer or visit the school administrative office for a physical form."
    }
  ];

  // Handle scroll for glass effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fallback data if API is not available or returns no data
  const getFallbackStudents = () => [
    {
      name: 'Fatima Abubakar',
      class: 'SS 3A',
      average: '98.5%',
      position: '1st',
      subjects: 'Mathematics, Physics, Chemistry',
      photo: null,
      achievement: 'Overall Best Student'
    },
    {
      name: 'Ibrahim Yusuf',
      class: 'SS 2B',
      average: '96.8%',
      position: '1st',
      subjects: 'Arabic, Islamic Studies',
      photo: null,
      achievement: 'Best in Islamic Studies'
    },
    {
      name: 'Aisha Mohammed',
      class: 'SS 1A',
      average: '95.2%',
      position: '1st',
      subjects: 'English, Literature',
      photo: null,
      achievement: 'Best in Languages'
    },
    {
      name: 'Usman Abdullahi',
      class: 'JSS 3A',
      average: '94.7%',
      position: '1st',
      subjects: 'Mathematics, Science',
      photo: null,
      achievement: 'Best in Sciences'
    },
    {
      name: 'Zainab Hassan',
      class: 'JSS 2B',
      average: '93.5%',
      position: '1st',
      subjects: 'Computer Studies',
      photo: null,
      achievement: 'Best in Technology'
    },
    {
      name: 'Ahmad Suleiman',
      class: 'JSS 1A',
      average: '92.8%',
      position: '1st',
      subjects: 'All Subjects',
      photo: null,
      achievement: 'Most Improved'
    }
  ];

  const fetchTopStudents = async (schoolId) => {
    try {
      setLoadingStudents(true);
      const response = await fetch(`${API_BASE_URL}/api/top-students/top-students?limit=6&schoolId=${schoolId}`);
      if (!response.ok) throw new Error('Failed to fetch top students');
      const data = await response.json();
      setTopStudents(data);
    } catch (error) {
      console.error('Error fetching top students:', error);
      // Use fallback data if API fails
      setTopStudents(getFallbackStudents());
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchNews = async (schoolId) => {
    try {
      setLoadingNews(true);
      const response = await fetch(`${API_BASE_URL}/api/news-events?limit=3&school=${schoolId}`);
      if (!response.ok) throw new Error('Failed to fetch news');
      const data = await response.json();

      // Transfrom data to match UI needs if necessary
      const transformed = data.map((item, index) => ({
        id: item.id,
        title: item.title,
        date: item.type === 'event' && item.eventDate
          ? new Date(item.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
        summary: item.content,
        color: index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : 'bg-purple-500'
      }));

      setNewsItems(transformed);
    } catch (error) {
      console.error('Error fetching news:', error);
      setNewsItems([]);
    } finally {
      setLoadingNews(false);
    }
  };

  // Fetch top students and news from API
  useEffect(() => {
    if (schoolSettings?.schoolId) {
      fetchTopStudents(schoolSettings.schoolId);
      fetchNews(schoolSettings.schoolId);
    }
  }, [schoolSettings?.schoolId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % studentImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'glass shadow-lg py-2' : 'bg-transparent py-4'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-3 shadow-lg transform transition-transform hover:rotate-12 ${isScrolled ? 'bg-primary' : 'bg-white/20 backdrop-blur-md'
                  }`}>
                  {schoolSettings?.logoUrl ? (
                    <img
                      src={schoolSettings.logoUrl.startsWith('data:') || schoolSettings.logoUrl.startsWith('http') ? schoolSettings.logoUrl : `${API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL}${schoolSettings.logoUrl.startsWith('/') ? schoolSettings.logoUrl : '/' + schoolSettings.logoUrl}`}
                      alt="Logo"
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <span className={`text-2xl font-bold ${isScrolled ? 'text-white' : 'text-white'}`}>
                      {schoolSettings?.schoolName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'S'}
                    </span>
                  )}
                </div>
                <div className="hidden sm:block">
                  <h1 className={`text-2xl font-extrabold tracking-tight transition-colors ${isScrolled ? 'text-gray-900' : 'text-white'
                    }`}>
                    {schoolSettings?.schoolName || 'School Name'}
                  </h1>
                  <p className={`text-[10px] font-bold tracking-[0.2em] uppercase ${isScrolled ? 'text-primary' : 'text-white/80'
                    }`}>
                    {schoolSettings?.schoolMotto || 'Excellence in Education'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <button
                onClick={handleLogout}
                className={`font-semibold text-sm transition-colors flex items-center gap-2 ${isScrolled ? 'text-gray-600 hover:text-red-600' : 'text-white hover:text-white/80'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout / Switch
              </button>
              <Link to="/verify-dashboard" className={`font-semibold text-sm transition-colors ${isScrolled ? 'text-gray-600 hover:text-primary' : 'text-white hover:text-white/80'
                }`}>
                Personal Dashboard
              </Link>
              <Link to="/verify-dashboard" className={`px-6 py-3 rounded-full font-bold text-sm shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 ${isScrolled ? 'bg-primary text-white hover:brightness-90' : 'bg-white text-primary hover:bg-gray-100'
                }`}>
                Enter Portal
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Slider */}
        {studentImages.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-50 z-10"></div>
            <img
              src={img}
              alt={`Student ${index + 1}`}
              className="w-full h-full object-cover transform scale-105 animate-slow-zoom"
            />
          </div>
        ))}

        {/* Geometric Accents */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
          <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
        </div>

        {/* Content */}
        <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
          <div className="reveal-up">
            <span className="inline-block px-4 py-1.5 mb-10 glass text-white text-xs font-bold tracking-[0.3em] uppercase rounded-full shadow-lg">
              Premium Education • High Standards • Character Building
            </span>
            <h1 className="text-5xl md:text-8xl font-black text-white mb-8 tracking-tighter drop-shadow-2xl leading-[0.9]">
              {schoolSettings?.welcomeTitle || "Building Future Leaders Today"}
            </h1>
            <p className="mt-4 max-w-3xl mx-auto text-xl md:text-2xl text-white/90 mb-12 font-medium leading-relaxed drop-shadow-lg">
              {schoolSettings?.welcomeMessage || "Experience a transformative education that balances academic excellence with character development in a modern Islamic environment."}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link
                to="/verify-dashboard"
                className="px-10 py-5 bg-primary text-white font-black rounded-2xl shadow-[0_20px_50px_rgba(15,118,110,0.3)] hover:brightness-110 transition-all transform hover:-translate-y-2 text-lg uppercase tracking-wider active:scale-95"
              >
                Go to My Dashboard
              </Link>
              <Link
                to="/alumni"
                className="px-10 py-5 glass text-white font-black rounded-2xl shadow-xl hover:bg-white/20 transition-all transform hover:-translate-y-2 text-lg uppercase tracking-wider active:scale-95 border-white/30"
              >
                Alumni Network
              </Link>
            </div>
          </div>

          {/* Floating Stats Bar */}
          <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 reveal-up delay-300">
            {[
              { label: "Student Focused", value: "Future Leaders", icon: "👨‍🎓" },
              { label: "Expert Faculty", value: "Qualified Staff", icon: "👨‍🏫" },
              { label: "Academic Depth", value: "High Excellence", icon: "⭐" },
              { label: "Standard Infrastructure", value: "Modern & Safe", icon: "🛡️" }
            ].map((stat, i) => (
              <div key={i} className="glass p-6 rounded-3xl shadow-2xl transform transition-transform hover:scale-105 border-white/10">
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-black text-gray-900">{stat.value}</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust Banner */}
      <div className="py-8 bg-gray-900 overflow-hidden relative">
        <div className="absolute inset-0 bg-primary/10 opacity-50"></div>
        <div className="whitespace-nowrap flex animate-marquee">
          {[1, 2, 3, 4, 5].map((_, i) => (
            <div key={i} className="flex items-center space-x-12 px-12">
              <span className="text-white/30 text-lg font-bold uppercase tracking-[0.5em]">Academic Excellence</span>
              <span className="text-primary/50 text-2xl">✦</span>
              <span className="text-white/30 text-lg font-bold uppercase tracking-[0.5em]">Moral Integrity</span>
              <span className="text-primary/50 text-2xl">✦</span>
              <span className="text-white/30 text-lg font-bold uppercase tracking-[0.5em]">Future Innovation</span>
              <span className="text-primary/50 text-2xl">✦</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features & News Hybrid */}
      <div className="py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row gap-20">
            {/* Left: Content */}
            <div className="lg:w-1/2">
              <span className="text-primary font-black tracking-widest uppercase text-sm mb-6 block">Our DNA</span>
              <h2 className="text-5xl font-black text-gray-900 mb-12 leading-[1.1]">The Core Pillars of Our Excellence</h2>
              <div className="space-y-12">
                {[
                  {
                    title: "Immersive Learning",
                    desc: "State-of-the-art facilities designed to foster creativity and deep understanding.",
                    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253"
                  },
                  {
                    title: "Digital-First Campus",
                    desc: "Integrated result management and online resources accessible anytime, anywhere.",
                    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  }
                ].map((f, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-primary transition-colors group-hover:bg-primary group-hover:text-white shadow-xl">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} /></svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{f.title}</h3>
                      <p className="text-gray-500 leading-relaxed text-lg">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Modern News Preview */}
            <div className="lg:w-1/2">
              <div className="bg-gray-50 rounded-[40px] p-10 border border-gray-100 shadow-inner">
                <div className="flex justify-between items-end mb-10">
                  <h3 className="text-3xl font-black text-gray-900">Latest Updates</h3>
                  <Link to="/news-events" className="text-primary font-bold hover:underline">View All &rarr;</Link>
                </div>
                <div className="space-y-6">
                  {loadingNews ? (
                    <div className="flex justify-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : newsItems.length > 0 ? (
                    newsItems.map(item => (
                      <div key={item.id} className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all border border-gray-100 group cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                          <span className={`px-3 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-widest ${item.color}`}>
                            {item.type}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">{item.date}</span>
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">{item.title}</h4>
                        <p className="text-gray-500 text-sm line-clamp-2">{item.summary}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm">No recent updates at this time.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Students Section */}
      <div className="py-20 bg-gradient-to-br from-gray-50 to-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">🌟 Our Top Performers</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Celebrating academic excellence across all classes. These outstanding students exemplify dedication, hard work, and Islamic values.
            </p>
          </div>

          {/* Top Students Grid */}
          {loadingStudents ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
            </div>
          ) : topStudents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {topStudents.map((student, index) => (
                <div
                  key={index}
                  className="group relative bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:-translate-y-2 cursor-pointer"
                  onClick={() => setSelectedStudent(student)}
                >
                  {/* Achievement Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      🏆 {student.position}
                    </div>
                  </div>

                  {/* Photo Section */}
                  <div className="relative h-64 bg-gradient-to-br from-primary/70 to-primary overflow-hidden">
                    {/* Decorative Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
                      <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-x-20 translate-y-20"></div>
                    </div>

                    {/* Student Photo */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-40 h-40 rounded-full bg-white shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white group-hover:scale-110 transition-transform duration-500">
                        {student.photo ? (
                          <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-32 h-32 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Floating Achievement Badge */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-max max-w-[90%] text-center">
                      <p className="text-xs font-semibold text-primary truncate">{student.achievement}</p>
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="p-6">
                    {/* Name */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors truncate">
                      {student.name}
                    </h3>

                    {/* Class */}
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-sm font-medium text-gray-600">{student.class}</span>
                    </div>

                    {/* Average Score */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Average Score</span>
                        <span className="text-2xl font-bold text-primary">{student.average}</span>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: student.average.replace('%', '') + '%' }}
                        ></div>
                      </div>
                    </div>

                    {/* Best Subjects */}
                    <div className="mb-4 h-12 overflow-hidden">
                      <p className="text-xs text-gray-500 mb-1">Best Subjects:</p>
                      <p className="text-sm text-gray-700 font-medium line-clamp-2">{student.subjects}</p>
                    </div>

                    {/* View Profile Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudent(student);
                      }}
                      className="block w-full text-center bg-gradient-to-r from-primary to-primary/90 text-white py-2 px-4 rounded-lg font-medium hover:brightness-90 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                    >
                      View Full Profile
                    </button>
                  </div>

                  {/* Hover Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-500 pointer-events-none"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">No top performers found for the current session yet.</p>
            </div>
          )}

          {/* View All Button */}
          <div className="text-center mt-12">
            <Link
              to="/verify-dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <span>View All Top Performers</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-32 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Common Questions</h2>
            <p className="text-gray-500">Everything you need to know about our portal and school life.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="group bg-white rounded-3xl p-6 border border-gray-100 shadow-sm transition-all hover:shadow-md cursor-pointer">
                <summary className="list-none flex justify-between items-center font-bold text-gray-900 text-lg">
                  {faq.q}
                  <span className="transition-transform group-open:rotate-180 text-primary">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </summary>
                <p className="mt-4 text-gray-500 leading-relaxed pt-4 border-t border-gray-50">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Modern CTA */}
      <div className="py-20 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto bg-gray-900 rounded-[50px] p-12 md:p-24 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-colors"></div>
          <div className="relative z-10 text-center">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">
              Ready to Shape the <span className="text-primary italic">Next</span> Generation?
            </h2>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-12">
              Join thousands of students and parents already experiencing the future of education management.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link to="/verify-dashboard" className="px-10 py-5 bg-white text-gray-900 font-black rounded-2xl hover:bg-gray-100 transition-all transform hover:-translate-y-2 uppercase tracking-widest active:scale-95">
                Go to Dashboard
              </Link>
              <Link to="/contact" className="px-10 py-5 bg-transparent border-2 border-white/20 text-white font-black rounded-2xl hover:bg-white/5 transition-all transform hover:-translate-y-2 uppercase tracking-widest active:scale-95 text-center">
                Contact Office
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-900/80 transition-opacity backdrop-blur-md"
              aria-hidden="true"
              onClick={() => setSelectedStudent(null)}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-[40px] text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-white/20">

              <button
                onClick={() => setSelectedStudent(null)}
                className="absolute top-6 right-6 z-20 bg-gray-100 hover:bg-gray-200 rounded-full p-2 text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="bg-white">
                <div className="md:flex h-full">
                  <div className="md:w-2/5 bg-primary text-white p-10 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent opacity-50"></div>

                    <div className="relative z-10 w-44 h-44 rounded-[30px] border-4 border-white/20 shadow-2xl overflow-hidden mb-8 bg-white/10 backdrop-blur-md">
                      {selectedStudent.photo ? (
                        <img src={selectedStudent.photo} alt={selectedStudent.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/50">
                          <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <h2 className="relative z-10 text-3xl font-black text-center leading-tight mb-2">{selectedStudent.name}</h2>
                    <span className="relative z-10 px-4 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md mb-8">
                      {selectedStudent.class}
                    </span>

                    <div className="relative z-10 grid grid-cols-2 gap-4 w-full">
                      <div className="bg-white/10 rounded-3xl p-4 text-center backdrop-blur-md border border-white/10">
                        <div className="text-2xl font-black text-yellow-400">{selectedStudent.position}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">Rank</div>
                      </div>
                      <div className="bg-white/10 rounded-3xl p-4 text-center backdrop-blur-md border border-white/10">
                        <div className="text-2xl font-black text-white">{selectedStudent.average}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">Avg</div>
                      </div>
                    </div>
                  </div>

                  <div className="md:w-3/5 p-10 lg:p-12">
                    <div className="mb-8">
                      <h3 className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Academic Achievement</h3>
                      <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
                        <p className="text-primary text-lg font-bold flex items-start gap-3">
                          <span className="text-2xl">🏆</span>
                          {selectedStudent.achievement}
                        </p>
                      </div>
                    </div>

                    <div className="mb-10">
                      <h3 className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Core Strengths</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedStudent.subjects.split(',').map((subject, i) => (
                          <span key={i} className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-bold border border-gray-100 italic">
                            #{subject.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100">
                      <p className="text-gray-400 italic text-sm leading-relaxed">
                        "This student has demonstrated exceptional growth and maintains a gold standard in both academics and character."
                      </p>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="w-8 h-1 bg-primary rounded-full"></div>
                        <span className="text-gray-900 font-bold text-xs uppercase tracking-widest">Office of the Principal</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-20 pb-10 border-t-4 border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

            {/* 1. School Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                {schoolSettings?.logoUrl && (
                  <img src={schoolSettings.logoUrl} alt="Logo" className="h-12 w-12 object-contain bg-white rounded-lg p-1" />
                )}
                <div>
                  <h3 className="text-xl font-bold text-white leading-tight">{schoolSettings?.schoolName || 'School Management'}</h3>
                  <p className="text-xs text-primary font-semibold tracking-wide uppercase">{schoolSettings?.schoolMotto || 'Excellence in Education'}</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Dedicated to nurturing future leaders through a blend of academic excellence and moral upbringing. Join us in shaping the next generation.
              </p>
              <div className="flex space-x-4">
                {/* Facebook */}
                <a
                  href={schoolSettings?.facebookUrl || '#'}
                  target={schoolSettings?.facebookUrl ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  onClick={(e) => !schoolSettings?.facebookUrl && e.preventDefault()}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${schoolSettings?.facebookUrl
                    ? 'bg-gray-800 text-gray-400 hover:bg-blue-600 hover:text-white cursor-pointer'
                    : 'bg-gray-900 text-gray-600 cursor-not-allowed opacity-50'
                    }`}
                  title={schoolSettings?.facebookUrl ? 'Visit our Facebook page' : 'Facebook link not configured'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /></svg>
                </a>

                {/* Instagram */}
                <a
                  href={schoolSettings?.instagramUrl || '#'}
                  target={schoolSettings?.instagramUrl ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  onClick={(e) => !schoolSettings?.instagramUrl && e.preventDefault()}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${schoolSettings?.instagramUrl
                    ? 'bg-gray-800 text-gray-400 hover:bg-pink-600 hover:text-white cursor-pointer'
                    : 'bg-gray-900 text-gray-600 cursor-not-allowed opacity-50'
                    }`}
                  title={schoolSettings?.instagramUrl ? 'Visit our Instagram page' : 'Instagram link not configured'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.44z" /></svg>
                </a>

                {/* WhatsApp */}
                <a
                  href={schoolSettings?.whatsappUrl ? `https://wa.me/${schoolSettings.whatsappUrl}` : '#'}
                  target={schoolSettings?.whatsappUrl ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  onClick={(e) => !schoolSettings?.whatsappUrl && e.preventDefault()}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${schoolSettings?.whatsappUrl
                    ? 'bg-gray-800 text-gray-400 hover:bg-green-600 hover:text-white cursor-pointer'
                    : 'bg-gray-900 text-gray-600 cursor-not-allowed opacity-50'
                    }`}
                  title={schoolSettings?.whatsappUrl ? 'Chat with us on WhatsApp' : 'WhatsApp link not configured'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                </a>
              </div>
            </div>

            {/* 2. Quick Links */}
            <div>
              <h4 className="text-lg font-bold text-white mb-6 border-b border-gray-700 pb-2 inline-block">Quick Links</h4>
              <ul className="space-y-3">
                <li><Link to="/verify-dashboard" className="text-gray-400 hover:text-primary hover:translate-x-1 transition-all duration-200 block">Student Dashboard</Link></li>
                <li><Link to="/verify-dashboard" className="text-gray-400 hover:text-primary hover:translate-x-1 transition-all duration-200 block">Staff Dashboard</Link></li>
                <li><Link to="/verify-dashboard" className="text-gray-400 hover:text-primary hover:translate-x-1 transition-all duration-200 block">Parent Dashboard</Link></li>
                <li><a href="#" className="text-gray-400 hover:text-primary hover:translate-x-1 transition-all duration-200 block">Admission Guide</a></li>
                <li><Link to="/gallery" className="text-gray-400 hover:text-primary hover:translate-x-1 transition-all duration-200 block">School Gallery</Link></li>
              </ul>
            </div>

            {/* 3. Academic Resources */}
            <div>
              <h4 className="text-lg font-bold text-white mb-6 border-b border-gray-700 pb-2 inline-block">Resources</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href={schoolSettings?.academicCalendarUrl || '#'}
                    target={schoolSettings?.academicCalendarUrl ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    onClick={(e) => !schoolSettings?.academicCalendarUrl && e.preventDefault()}
                    className={`hover:translate-x-1 transition-all duration-200 block ${schoolSettings?.academicCalendarUrl ? 'text-gray-400 hover:text-primary cursor-pointer' : 'text-gray-600 cursor-not-allowed'}`}
                    title={schoolSettings?.academicCalendarUrl ? 'View Academic Calendar' : 'Calendar link not configured'}
                  >
                    Academic Calendar
                  </a>
                </li>
                <li>
                  <a href="/news-events" className="text-gray-400 hover:text-primary hover:translate-x-1 transition-all duration-200 block cursor-pointer">
                    News & Events
                  </a>
                </li>
                <li>
                  <a
                    href={schoolSettings?.eLibraryUrl || '#'}
                    target={schoolSettings?.eLibraryUrl ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    onClick={(e) => !schoolSettings?.eLibraryUrl && e.preventDefault()}
                    className={`hover:translate-x-1 transition-all duration-200 block ${schoolSettings?.eLibraryUrl ? 'text-gray-400 hover:text-primary cursor-pointer' : 'text-gray-600 cursor-not-allowed'}`}
                    title={schoolSettings?.eLibraryUrl ? 'Access E-Library' : 'E-Library link not configured'}
                  >
                    E-Library
                  </a>
                </li>
                <li>
                  <a
                    href={schoolSettings?.alumniNetworkUrl || '#'}
                    target={schoolSettings?.alumniNetworkUrl ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    onClick={(e) => !schoolSettings?.alumniNetworkUrl && e.preventDefault()}
                    className={`hover:translate-x-1 transition-all duration-200 block ${schoolSettings?.alumniNetworkUrl ? 'text-gray-400 hover:text-primary cursor-pointer' : 'text-gray-600 cursor-not-allowed'}`}
                    title={schoolSettings?.alumniNetworkUrl ? 'Join Alumni Network' : 'Alumni link not configured'}
                  >
                    Alumni Network
                  </a>
                </li>
                <li>
                  <a
                    href={schoolSettings?.brochureFileUrl ? (schoolSettings.brochureFileUrl.startsWith('http') ? schoolSettings.brochureFileUrl : `${API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL}${schoolSettings.brochureFileUrl.startsWith('/') ? schoolSettings.brochureFileUrl : '/' + schoolSettings.brochureFileUrl}`) : '#'}
                    target={schoolSettings?.brochureFileUrl ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    onClick={(e) => !schoolSettings?.brochureFileUrl && e.preventDefault()}
                    download={schoolSettings?.brochureFileUrl ? true : false}
                    className={`hover:translate-x-1 transition-all duration-200 block ${schoolSettings?.brochureFileUrl ? 'text-gray-400 hover:text-primary cursor-pointer' : 'text-gray-600 cursor-not-allowed'}`}
                    title={schoolSettings?.brochureFileUrl ? 'Download Brochure' : 'Brochure not available'}
                  >
                    Download Brochure
                  </a>
                </li>
                <li>
                  <a
                    href={schoolSettings?.admissionGuideFileUrl ? (schoolSettings.admissionGuideFileUrl.startsWith('http') ? schoolSettings.admissionGuideFileUrl : `${API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL}${schoolSettings.admissionGuideFileUrl.startsWith('/') ? schoolSettings.admissionGuideFileUrl : '/' + schoolSettings.admissionGuideFileUrl}`) : '#'}
                    target={schoolSettings?.admissionGuideFileUrl ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    onClick={(e) => !schoolSettings?.admissionGuideFileUrl && e.preventDefault()}
                    download={schoolSettings?.admissionGuideFileUrl ? true : false}
                    className={`hover:translate-x-1 transition-all duration-200 block ${schoolSettings?.admissionGuideFileUrl ? 'text-gray-400 hover:text-primary cursor-pointer' : 'text-gray-600 cursor-not-allowed'}`}
                    title={schoolSettings?.admissionGuideFileUrl ? 'Download Admission Guide' : 'Admission guide not available'}
                  >
                    Admission Guide
                  </a>
                </li>
              </ul>
            </div>

            {/* 4. Contact Information */}
            <div>
              <h4 className="text-lg font-bold text-white mb-6 border-b border-gray-700 pb-2 inline-block">Contact Us</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-primary mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-gray-400 text-sm">{schoolSettings?.schoolAddress || schoolSettings?.address || 'School Address'}</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <span className="text-gray-400 text-sm">{schoolSettings?.schoolPhone || schoolSettings?.phone || 'School Phone'}</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <a href={`mailto:${schoolSettings?.schoolEmail || 'info@school.edu'}`} className="text-gray-400 hover:text-white transition-colors text-sm">{schoolSettings?.schoolEmail || 'info@school.edu'}</a>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-gray-400 text-sm">{schoolSettings?.openingHours || 'Mon - Fri: 8:00 AM - 4:00 PM'}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright Bar */}
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} {schoolSettings?.schoolName || 'School Management'}. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-primary transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes slow-zoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-slow-zoom {
          animation: slow-zoom 20s linear infinite alternate;
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .reveal-up {
          opacity: 0;
          animation: reveal-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-300 { animation-delay: 0.3s; }
        @keyframes reveal-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
