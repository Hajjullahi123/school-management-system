import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { FiSave, FiSend, FiFileText, FiBook, FiPlus, FiTrash2, FiCpu } from 'react-icons/fi';

const LessonWorkspace = () => {
    const { user } = useAuth();
    const [view, setView] = useState('plans'); // 'plans' or 'notes'
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teacherAssignments, setTeacherAssignments] = useState([]);

    const [formData, setFormData] = useState({
        classId: '',
        subjectId: '',
        week: '',
        topic: '',
        content: '',
        status: 'draft'
    });

    // AI Generation State
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiParams, setAiParams] = useState({
        topic: '',
        count: 10,
        difficulty: 'medium'
    });
    const [generating, setGenerating] = useState(false);
    const [scaffolding, setScaffolding] = useState(false);
    const [fetchingResources, setFetchingResources] = useState(false);
    const [suggestedResources, setSuggestedResources] = useState([]);

    useEffect(() => {
        fetchItems();
        fetchTeacherData();
    }, [view]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const endpoint = view === 'plans' ? '/api/academics/lesson-plans' : '/api/academics/lesson-notes';
            const resp = await api.get(endpoint);
            if (resp.ok) {
                setItems(await resp.json());
            }
        } catch (err) {
            toast.error(`Failed to fetch ${view}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeacherData = async () => {
        try {
            // 1. Fetch Teacher's specific assignments ALWAYS if role is teacher-like
            let assignmentsData = [];
            const assignResp = await api.get(`/api/teacher-assignments/teacher/${user.id}`);
            if (assignResp.ok) {
                assignmentsData = await assignResp.json();
                console.log('[DEBUG] Teacher Assignments:', assignmentsData);
                setTeacherAssignments(assignmentsData);
            }

            // 2. Fetch Classes/Subjects Based on Role
            if (user.role === 'admin' || user.role === 'principal' || user.role === 'superadmin') {
                console.log('[DEBUG] Fetching all for role:', user.role);
                const [classesResp, subjectsResp] = await Promise.all([
                    api.get('/api/classes'),
                    api.get('/api/subjects')
                ]);
                
                if (classesResp.ok) {
                    const classesData = await classesResp.json();
                    console.log('[DEBUG] All Classes:', classesData);
                    setClasses(classesData);
                }
                if (subjectsResp.ok) {
                    const subjectsData = await subjectsResp.json();
                    console.log('[DEBUG] All Subjects:', subjectsData);
                    setSubjects(subjectsData);
                }
            } else {
                // Regular Teachers see only their assignments
                const uniqueClasses = [];
                const classIds = new Set();
                assignmentsData.forEach(a => {
                    const cls = a.class || a.classSubject?.class;
                    const cid = a.classId || a.classSubject?.classId;
                    if (cls && !classIds.has(cid)) {
                        uniqueClasses.push(cls);
                        classIds.add(cid);
                    }
                });
                console.log('[DEBUG] Unique Teacher Classes:', uniqueClasses);
                setClasses(uniqueClasses);
                
                // If only one class, auto-select and fetch subjects
                if (uniqueClasses.length === 1) {
                    const singleClass = uniqueClasses[0];
                    setFormData(prev => ({ ...prev, classId: singleClass.id.toString() }));
                    const relevantSubjects = assignmentsData
                        .filter(a => (a.classId || a.classSubject?.classId) === singleClass.id)
                        .map(a => a.subject || a.classSubject?.subject);
                    console.log('[DEBUG] Auto-selected subjects:', relevantSubjects);
                    setSubjects(relevantSubjects);
                }
            }
        } catch (err) {
            console.error('Data fetch error:', err);
        }
    };

    const handleClassChange = (classId) => {
        const cid = parseInt(classId);
        console.log('[DEBUG] Class Selected:', cid);
        setFormData({ ...formData, classId, subjectId: '' });
        
        if (user.role === 'admin' || user.role === 'principal' || user.role === 'superadmin') {
            fetchSubjectsForClass(cid);
        } else {
            const relevantSubjects = teacherAssignments
                .filter(a => (a.classId || a.classSubject?.classId) === cid)
                .map(a => a.subject || a.classSubject?.subject);
            console.log('[DEBUG] Subjects for selected class:', relevantSubjects);
            setSubjects(relevantSubjects);
        }
    };

    const fetchSubjectsForClass = async (classId) => {
        try {
            console.log('[DEBUG] Fetching subjects for class:', classId);
            const resp = await api.get(`/api/class-subjects/class/${classId}`);
            if (resp.ok) {
                const data = await resp.json();
                console.log('[DEBUG] Class-Subjects mapped:', data);
                setSubjects(data.map(cs => cs.subject));
            }
        } catch (err) {}
    };

    const handleSave = async (statusOverride) => {
        const payload = { ...formData, status: statusOverride || formData.status };
        if (editingItem) payload.id = editingItem.id;

        try {
            const endpoint = view === 'plans' ? '/api/academics/lesson-plans' : '/api/academics/lesson-notes';
            const resp = await api.post(endpoint, payload);
            if (resp.ok) {
                toast.success(`${view === 'plans' ? 'Lesson Plan' : 'Lesson Note'} saved!`);
                setEditingItem(null);
                setFormData({ classId: '', subjectId: '', week: '', topic: '', content: '', status: 'draft' });
                fetchItems();
            }
        } catch (err) {
            toast.error('Failed to save');
        }
    };

    const editItem = (item) => {
        setEditingItem(item);
        setFormData({
            classId: item.classId.toString(),
            subjectId: item.subjectId.toString(),
            week: item.week.toString(),
            topic: item.topic,
            content: item.content,
            status: item.status
        });
        // Update subjects list for the selected class
        const relevantSubjects = teacherAssignments
            .filter(a => a.classSubject.classId === item.classId)
            .map(a => a.classSubject.subject);
        setSubjects(relevantSubjects);
    };

    const handleAiGenerate = async () => {
        if (!formData.classId || !formData.subjectId) {
            toast.error('Please select Class and Subject first');
            return;
        }
        setGenerating(true);
        try {
            const resp = await api.post('/api/academics/ai/generate-cbt', {
                classId: formData.classId,
                subjectId: formData.subjectId,
                topic: aiParams.topic || formData.topic,
                count: aiParams.count,
                difficulty: aiParams.difficulty
            });

            if (resp.ok) {
                const questions = await resp.json();
                toast.success(`Generated ${questions.length} questions! Content updated.`);
                // For now, let's append it to the content or show it
                const formatted = questions.map((q, i) => 
                   `${i+1}. [${q.bloomLevel || 'Knowledge'}] ${q.questionText}\n   Options: A: ${q.options[0].text}, B: ${q.options[1].text}, C: ${q.options[2].text}, D: ${q.options[3].text}\n   Answer: ${q.correctOption.toUpperCase()}\n   Explanation: ${q.explanation || 'N/A'}`
                ).join('\n\n');
                setFormData({ ...formData, content: (formData.content ? formData.content + '\n\n--- AI GENERATED QUESTIONS ---\n' : '') + formatted });
                setShowAiModal(false);
            } else {
                const err = await resp.json();
                toast.error(err.message || 'AI generation failed');
            }
        } catch (err) {
            toast.error('AI generation service error');
        } finally {
            setGenerating(false);
        }
    };

    const handleAiScaffold = async () => {
        if (!formData.classId || !formData.subjectId || !formData.topic) {
            toast.error('Please select Class, Subject and provide a Topic first');
            return;
        }
        setScaffolding(true);
        try {
            const resp = await api.post('/api/academics/ai/generate-lesson-plan', {
                classId: formData.classId,
                subjectId: formData.subjectId,
                topic: formData.topic,
                type: view // 'plans' or 'notes'
            });

            if (resp.ok) {
                const data = await resp.json();
                toast.success('AI Draft Generated!');
                setFormData({ ...formData, content: data.content });
            } else {
                const err = await resp.json();
                toast.error(err.error || 'AI scaffolding failed');
            }
        } catch (err) {
            toast.error('AI service error');
        } finally {
            setScaffolding(false);
        }
    };

    const handleSuggestResources = async () => {
        if (!formData.topic || !formData.subjectId || !formData.classId) {
            toast.error('Select Class, Subject and enter a Topic');
            return;
        }
        setFetchingResources(true);
        try {
            const resp = await api.post('/api/academics/ai/suggest-resources', {
                topic: formData.topic,
                subjectId: formData.subjectId,
                classId: formData.classId
            });
            if (resp.ok) {
                setSuggestedResources(await resp.json());
                toast.success('Curated resources found!');
            }
        } catch (err) {
            toast.error('Failed to discover resources');
        } finally {
            setFetchingResources(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Academic Workspace</h1>
                    <p className="text-gray-500 mt-1">Manage your lesson plans, notes, and AI-powered assessments.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner border border-gray-200">
                    <button 
                        onClick={() => setView('plans')}
                        className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${view === 'plans' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <FiFileText /> Lesson Plans
                    </button>
                    <button 
                        onClick={() => setView('notes')}
                        className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${view === 'notes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <FiBook /> Lesson Notes
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
                {/* Editor Section */}
                <div className="lg:col-span-12">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap justify-between items-center gap-4">
                            <div className="flex flex-wrap gap-4 items-center">
                                <h3 className="font-bold text-gray-800 text-lg">{editingItem ? 'Edit' : 'Create New'} {view === 'plans' ? 'Plan' : 'Note'}</h3>
                                <div className="flex gap-2">
                                    <select 
                                        value={formData.classId} 
                                        onChange={e => handleClassChange(e.target.value)}
                                        className="bg-white border text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.arm}</option>)}
                                    </select>
                                    <select 
                                        value={formData.subjectId} 
                                        onChange={e => setFormData({...formData, subjectId: e.target.value})}
                                        className="bg-white border text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <input 
                                        type="number" 
                                        placeholder="Week" 
                                        value={formData.week}
                                        onChange={e => setFormData({...formData, week: e.target.value})}
                                        className="w-20 bg-white border text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleAiScaffold}
                                    disabled={scaffolding}
                                    className="bg-indigo-50 border border-indigo-200 text-indigo-600 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-indigo-100 transform active:scale-95 transition flex items-center gap-2"
                                >
                                    <FiCpu className={scaffolding ? 'animate-spin' : 'animate-pulse text-purple-600'} /> {scaffolding ? 'Generating...' : 'AI Draft Assistant'}
                                </button>
                                <button 
                                    onClick={() => setShowAiModal(true)}
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:shadow-lg transform active:scale-95 transition flex items-center gap-2"
                                >
                                    <FiCpu className="animate-pulse" /> AI Generate CBT
                                </button>
                                <button 
                                    onClick={handleSuggestResources}
                                    disabled={fetchingResources}
                                    className="bg-purple-50 border border-purple-200 text-purple-600 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-purple-100 transform active:scale-95 transition flex items-center gap-2"
                                >
                                    <FiFileText className={fetchingResources ? 'animate-spin' : ''} /> {fetchingResources ? 'Searching...' : 'Find Resources'}
                                </button>
                                <button 
                                    onClick={() => handleSave('draft')}
                                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 flex items-center gap-2 shadow-sm"
                                >
                                    <FiSave /> Save Draft
                                </button>
                                <button 
                                    onClick={() => handleSave('published')}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-md shadow-indigo-100"
                                >
                                    <FiSend /> Publish
                                </button>
                            </div>
                        </div>
                        <div className="p-6 bg-white space-y-4">
                            <input 
                                type="text"
                                placeholder="Lesson Topic / Content Title"
                                value={formData.topic}
                                onChange={e => setFormData({...formData, topic: e.target.value})}
                                className="w-full text-2xl font-bold text-gray-900 border-none outline-none placeholder:text-gray-300"
                            />
                            <textarea 
                                placeholder={`Write your ${view === 'plans' ? 'lesson plan' : 'lesson note'} here...`}
                                value={formData.content}
                                onChange={e => setFormData({...formData, content: e.target.value})}
                                className="w-full min-h-[400px] text-lg text-gray-700 border-none resize-none outline-none font-mono bg-gray-50/10 p-4 rounded-xl placeholder:text-gray-300 focus:bg-white transition-colors duration-300"
                            />
                        </div>
                    </div>

                    {/* Resources Sidebar Suggestions */}
                    {suggestedResources.length > 0 && (
                        <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-3xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-extrabold text-indigo-900 flex items-center gap-2">
                                    <FiBook className="text-purple-600" /> AI Suggested Multi-modal Resources
                                </h3 >
                                <button onClick={() => setSuggestedResources([])} className="text-gray-400 hover:text-red-500 transition-colors"><FiTrash2 /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {suggestedResources.map((res, i) => (
                                    <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100/50 hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                                                res.type === 'video' ? 'bg-red-50 text-red-600' :
                                                res.type === 'simulation' ? 'bg-green-50 text-green-600' :
                                                'bg-blue-50 text-blue-600'
                                            }`}>
                                                {res.type}
                                            </span>
                                            <h4 className="font-bold text-gray-900 text-xs line-clamp-1">{res.title}</h4>
                                        </div>
                                        <p className="text-[11px] text-gray-500 line-clamp-2 mb-3 leading-relaxed">{res.description}</p>
                                        <a 
                                            href={res.type === 'video' ? `https://www.youtube.com/results?search_query=${encodeURIComponent(res.searchQuery || res.title)}` : `https://www.google.com/search?q=${encodeURIComponent(res.searchQuery || res.title)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] font-black text-indigo-600 uppercase hover:underline flex items-center gap-1"
                                        >
                                            View Resource →
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* List Section */}
                <div className="lg:col-span-12 mt-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FiFileText className="text-indigo-600" /> Recent {view === 'plans' ? 'Lesson Plans' : 'Lesson Notes'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                           <div className="col-span-full py-20 text-center animate-pulse text-gray-400">Loading workspace library...</div>
                        ) : items.length === 0 ? (
                           <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl text-gray-400 font-medium">No items found. Start by creating a new document above.</div>
                        ) : items.map(item => (
                            <div key={item.id} className="group bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 relative overflow-hidden">
                                <div className={`absolute top-0 right-0 h-1 w-full ${item.status === 'published' ? 'bg-green-500' : 'bg-yellow-400'}`} />
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md ${item.status === 'published' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                                        {item.status}
                                    </span>
                                    <div className="flex gap-2">
                                        <button onClick={() => editItem(item)} className="text-indigo-600 hover:text-indigo-800 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><FiPlus /></button>
                                        <button className="text-red-500 hover:text-red-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><FiTrash2 /></button>
                                    </div>
                                </div>
                                <h4 className="font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.topic || 'Untitled Document'}</h4>
                                <p className="text-xs text-indigo-500 font-bold mb-3">{item.class?.name} - {item.subject?.name}</p>
                                <p className="text-sm text-gray-500 line-clamp-3 mb-4 leading-relaxed">{item.content || 'No content provided.'}</p>
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 pt-3 border-t border-gray-50">
                                    <span>WEEK {item.week}</span>
                                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Generator Modal */}
            {showAiModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-sans">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white relative">
                            <FiCpu className="absolute top-6 right-8 w-16 h-16 text-white/10" />
                            <h2 className="text-2xl font-black mb-2 flex items-center gap-2">
                                AI CBT Generator
                            </h2>
                            <p className="text-indigo-100 text-sm font-medium">Generate high-quality exam questions in seconds based on your lesson details.</p>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Target Topic</label>
                                <input 
                                    type="text"
                                    placeholder={formData.topic || "What topic should AI cover?"}
                                    value={aiParams.topic}
                                    onChange={e => setAiParams({...aiParams, topic: e.target.value})}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium placeholder:text-gray-300"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Question Count</label>
                                    <input 
                                        type="number"
                                        min="1" max="50"
                                        value={aiParams.count}
                                        onChange={e => setAiParams({...aiParams, count: parseInt(e.target.value)})}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Difficulty</label>
                                    <select 
                                        value={aiParams.difficulty}
                                        onChange={e => setAiParams({...aiParams, difficulty: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowAiModal(false)}
                                    className="flex-1 px-4 py-4 rounded-xl font-black text-gray-500 hover:bg-gray-50 transition uppercase tracking-widest text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    disabled={generating}
                                    onClick={handleAiGenerate}
                                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-4 rounded-xl font-black shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transform active:scale-95 transition flex items-center justify-center gap-2 uppercase tracking-widest text-sm disabled:opacity-50"
                                >
                                    {generating ? <span className="animate-spin text-xl">◌</span> : 'Generate Questions'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonWorkspace;
