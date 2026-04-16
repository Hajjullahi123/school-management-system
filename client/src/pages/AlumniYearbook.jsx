import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../api';
import useSchoolSettings from '../hooks/useSchoolSettings';
import useAuth from '../hooks/useAuth';
import { toast } from '../utils/toast';
import { FiUsers, FiAward, FiBookOpen, FiCamera, FiChevronLeft, FiChevronRight, FiUpload, FiCheckCircle } from 'react-icons/fi';

const AlumniYearbook = () => {
    const { year: urlYear } = useParams();
    const navigate = useNavigate();
    const { settings } = useSchoolSettings();
    const { user } = useAuth();
    const [year, setYear] = useState(urlYear || new Date().getFullYear());
    const [data, setData] = useState({ alumni: [], teachers: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [section, setSection] = useState('students'); // 'students' or 'teachers'
    const [uploading, setUploading] = useState(null); // id of the person being uploaded
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (settings?.schoolId) {
            fetchYearbookData();
        }
    }, [settings?.schoolId, year]);

    const fetchYearbookData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/api/alumni/yearbook/${year}?school=${settings.schoolId}`);
            if (res.ok) {
                const result = await res.json();
                setData(result);
            } else {
                setError('Failed to load yearbook data');
            }
        } catch (err) {
            setError('An error occurred while fetching data');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e, id, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB');
            return;
        }

        const formData = new FormData();
        formData.append('photo', file);

        setUploading(id);
        try {
            const endpoint = type === 'student' 
                ? `/api/alumni/${id}/photo` 
                : `/api/teachers/${id}/photo`;

            const res = await api.post(endpoint, formData);
            if (res.ok) {
                toast.success('Photograph updated successfully');
                fetchYearbookData();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Upload failed');
            }
        } catch (err) {
            toast.error('Connection error');
        } finally {
            setUploading(null);
        }
    };

    const canUpload = (person, type) => {
        if (!user) return false;
        if (['admin', 'superadmin', 'principal'].includes(user.role)) return true;
        if (type === 'student' && user.id === person.userId) return true;
        if (type === 'teacher' && user.id === person.userId) return true;
        return false;
    };

    const handleYearChange = (newYear) => {
        setYear(newYear);
        navigate(`/alumni/yearbook/${newYear}`);
    };

    const years = [];
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1990; y--) {
        years.push(y);
    }

    const getPhoto = (url) => {
        if (!url) return null;
        if (url.startsWith('data:') || url.startsWith('http')) return url;
        return `${API_BASE_URL}${url}`;
    };

    return (
        <div className="min-h-screen bg-[#faf9f6] text-gray-900 font-serif">
            {/* Elegant Header */}
            <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary transition-all hover:rotate-12">
                            <FiBookOpen size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-gray-900 uppercase">Yearbook Edition</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Class of {year}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <select 
                            value={year}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>Year {y}</option>
                            ))}
                        </select>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button 
                                onClick={() => setSection('students')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${section === 'students' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}
                            >
                                Students
                            </button>
                            <button 
                                onClick={() => setSection('teachers')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${section === 'teachers' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}
                            >
                                Educators
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="relative py-20 overflow-hidden bg-gray-900 text-white">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="grid grid-cols-12 h-full gap-4 p-4">
                        {[...Array(24)].map((_, i) => (
                            <div key={i} className="border border-white/5 rounded-2xl aspect-square"></div>
                        ))}
                    </div>
                </div>

                <div className="max-w-5xl mx-auto px-4 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-8">
                        <FiAward className="text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Official School Records</span>
                    </div>
                    <h2 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter leading-none">
                        THE <span className="text-primary italic">GOLDEN</span> <br />
                        ARCHIVES
                    </h2>
                    <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10 font-sans">
                        Preserving the legacy, friendships, and achievements of the cohort that defined 
                        excellence in the year {year}. Every face tells a story of ambition and growth.
                    </p>

                    <div className="flex justify-center gap-12">
                        <div className="text-center">
                            <p className="text-4xl font-black text-white">{data.alumni.length}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Graduates</p>
                        </div>
                        <div className="w-[1px] bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-4xl font-black text-white">{data.teachers.length}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Educators</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-7xl mx-auto px-4 py-20">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Accessing Archives...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-40">
                        <p className="text-rose-500 font-bold text-lg">{error}</p>
                        <button onClick={fetchYearbookData} className="mt-4 text-primary underline font-bold">Try Again</button>
                    </div>
                ) : (
                    <div className="space-y-24">
                        {section === 'students' ? (
                            <section>
                                <div className="flex items-center gap-4 mb-12">
                                    <div className="h-[1px] bg-gray-200 flex-1"></div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">The Graduating Class</h3>
                                    <div className="h-[1px] bg-gray-200 flex-1"></div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
                                    {data.alumni.length > 0 ? (
                                        data.alumni.map((alum) => (
                                            <div key={alum.id} className="group relative">
                                                <div className="relative aspect-[4/5] mb-6 overflow-hidden bg-gray-100 rounded-3xl shadow-xl transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
                                                    {alum.photoUrl ? (
                                                        <img 
                                                            src={getPhoto(alum.photoUrl)} 
                                                            alt={alum.name}
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 border-2 border-dashed border-gray-300">
                                                            <FiUsers size={64} className="text-gray-400 mb-4" />
                                                            {canUpload(alum, 'student') && (
                                                                <label className="cursor-pointer bg-white px-4 py-2 rounded-full shadow-md text-[10px] font-black uppercase text-primary hover:bg-primary hover:text-white transition-all">
                                                                    {uploading === alum.id ? 'Uploading...' : 'Upload Photo'}
                                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, alum.id, 'student')} disabled={uploading} />
                                                                </label>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                                        <p className="text-white text-xs italic font-sans">{alum.bio || "No motto recorded."}</p>
                                                        {alum.photoUrl && canUpload(alum, 'student') && (
                                                            <label className="mt-4 cursor-pointer self-start bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg text-[8px] font-black uppercase text-white hover:bg-white/40 transition-all">
                                                                Change Photo
                                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, alum.id, 'student')} disabled={uploading} />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="text-xl font-black text-gray-900 tracking-tight mb-1">{alum.name}</h4>
                                                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{alum.specialization || 'Alumni'}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                                            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No alumni records found for this year</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        ) : (
                            <section>
                                <div className="flex items-center gap-4 mb-12">
                                    <div className="h-[1px] bg-gray-200 flex-1"></div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Our Distinguished Educators</h3>
                                    <div className="h-[1px] bg-gray-200 flex-1"></div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
                                    {data.teachers.map((teacher) => (
                                        <div key={teacher.id} className="group relative">
                                            <div className="relative aspect-square mb-6 overflow-hidden bg-gray-800 rounded-full border-4 border-white shadow-xl transition-all duration-500 group-hover:shadow-2xl group-hover:scale-105">
                                                {teacher.photoUrl ? (
                                                    <img 
                                                        src={getPhoto(teacher.photoUrl)} 
                                                        alt={teacher.name}
                                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-700 text-gray-500">
                                                        <FiUsers size={48} className="mb-2" />
                                                        {canUpload(teacher, 'teacher') && (
                                                            <label className="cursor-pointer text-[8px] font-black uppercase text-white hover:text-primary transition-colors">
                                                                {uploading === teacher.id ? '...' : 'Upload'}
                                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, teacher.id, 'teacher')} disabled={uploading} />
                                                            </label>
                                                        )}
                                                    </div>
                                                )}
                                                {teacher.photoUrl && canUpload(teacher, 'teacher') && (
                                                    <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Update Photo</span>
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, teacher.id, 'teacher')} disabled={uploading} />
                                                    </label>
                                                )}
                                            </div>
                                            <div className="text-center">
                                                <h4 className="text-xl font-black text-gray-900 tracking-tight mb-1">{teacher.name}</h4>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{teacher.specialization}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Message */}
            <footer className="bg-white border-t border-gray-100 py-20">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <div className="w-16 h-[2px] bg-primary mx-auto mb-8"></div>
                    <p className="italic text-gray-500 text-lg leading-relaxed mb-6 font-serif">
                        "The beautiful thing about learning is that no one can take it away from you. 
                        As you turn these pages, remember that your roots will always be here, 
                        watching you grow into the giants you were meant to be."
                    </p>
                    <p className="font-black text-gray-900 uppercase tracking-widest text-xs">— The School Administration</p>
                </div>
            </footer>
        </div>
    );
};

export default AlumniYearbook;
