import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { FiSave, FiInfo, FiCpu } from 'react-icons/fi';

const CurriculumManagement = () => {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teacherAssignments, setTeacherAssignments] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user.role === 'teacher') {
            fetchTeacherAssignments();
        } else {
            fetchClassesAndSubjects();
        }
    }, []);

    const fetchTeacherAssignments = async () => {
        try {
            const resp = await api.get(`/api/teacher-assignments/teacher/${user.id}`);
            if (resp.ok) {
                const data = await resp.json();
                setTeacherAssignments(data);
                const uniqueClasses = [];
                const classIds = new Set();
                data.forEach(a => {
                    if (a.classSubject?.classModel && !classIds.has(a.classSubject.classId)) {
                        uniqueClasses.push(a.classSubject.classModel);
                        classIds.add(a.classSubject.classId);
                    }
                });
                setClasses(uniqueClasses);
            }
        } catch (err) {}
    };

    const fetchClassesAndSubjects = async () => {
        const [cResp, sResp] = await Promise.all([
            api.get('/api/classes'),
            api.get('/api/subjects')
        ]);
        if (cResp.ok) setClasses(await cResp.json());
        if (sResp.ok) setSubjects(await sResp.json());
    };

    const handleClassChange = (classId) => {
        setSelectedClass(classId);
        setSelectedSubject('');
        setContent('');
        if (user.role === 'teacher') {
            const relevantSubjects = teacherAssignments
                .filter(a => a.classSubject.classId === parseInt(classId))
                .map(a => a.classSubject.subject);
            setSubjects(relevantSubjects);
        }
    };

    const fetchCurriculum = async (subjectId) => {
        setSelectedSubject(subjectId);
        if (!selectedClass || !subjectId) return;
        setLoading(true);
        try {
            const resp = await api.get(`/api/academics/curriculum?classId=${selectedClass}&subjectId=${subjectId}`);
            if (resp.ok) {
                const data = await resp.json();
                setContent(data.content || '');
            }
        } catch (err) {
            toast.error('Failed to load curriculum');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedClass || !selectedSubject || !content) {
            toast.error('Please complete all fields');
            return;
        }
        setSaving(true);
        try {
            const resp = await api.post('/api/academics/curriculum', {
                classId: selectedClass,
                subjectId: selectedSubject,
                content
            });
            if (resp.ok) {
                toast.success('Curriculum updated successfully');
            }
        } catch (err) {
            toast.error('Save failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto font-sans">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                    Curriculum & Syllabus <span className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full uppercase tracking-widest font-bold">AI Base</span>
                </h1>
                <p className="text-gray-500 mt-1 font-medium italic">Define the educational standard and syllabus for AI contextual generation.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-indigo-100/20 border border-gray-100 flex flex-col gap-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Class</label>
                            <select 
                                value={selectedClass}
                                onChange={e => handleClassChange(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 shadow-inner"
                            >
                                <option value="">Select...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.arm}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Subject</label>
                            <select 
                                disabled={!selectedClass}
                                value={selectedSubject}
                                onChange={e => fetchCurriculum(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 shadow-inner disabled:opacity-50"
                            >
                                <option value="">Select...</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <button 
                            disabled={saving || !selectedSubject}
                            onClick={handleSave}
                            className="w-full bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform active:scale-95 transition flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50"
                        >
                            {saving ? <span className="animate-spin text-xl">◌</span> : <><FiSave className="text-lg" /> Save Curriculum</>}
                        </button>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-3xl border border-indigo-100 relative overflow-hidden">
                        <FiCpu className="absolute -bottom-4 -right-4 w-24 h-24 text-indigo-200/50" />
                        <h4 className="text-indigo-900 font-black flex items-center gap-2 mb-2 text-sm uppercase tracking-tight">AI Advantage</h4>
                        <p className="text-indigo-700 text-xs font-semibold leading-relaxed relative z-10">
                            The syllabus you provide here acts as a ground truth for the AI. When a teacher generates CBT questions, the AI ensures they align perfectly with this curriculum.
                        </p>
                    </div>
                </div>

                <div className="md:col-span-3">
                    <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-100/30 overflow-hidden border border-gray-100">
                        <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center px-8 py-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                    <FiInfo className="text-white text-lg" />
                                </div>
                                <h3 className="font-black text-gray-800 uppercase tracking-tighter text-lg">Detailed Syllabus Editor</h3>
                            </div>
                            {loading && <span className="text-indigo-600 font-bold animate-pulse text-xs uppercase tracking-widest">Context Loading...</span>}
                        </div>
                        <div className="p-0">
                            <textarea 
                                placeholder="Example: Topic 1: Algebra - Quadratic equations, discriminant... Topic 2: Geometry..."
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="w-full min-h-[600px] p-10 text-xl font-medium text-gray-700 leading-relaxed border-none outline-none placeholder:text-gray-200 bg-white"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CurriculumManagement;
