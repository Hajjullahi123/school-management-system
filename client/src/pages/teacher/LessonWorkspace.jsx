import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { FiSave, FiSend, FiFileText, FiBook, FiPlus, FiTrash2, FiCpu, FiDownload } from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import Papa from 'papaparse';

const cleanAiContent = (text) => {
    if (!text) return '';
    // Remove markdown bold (**), italic (* or _), and other common AI markers like # or `
    return text
        .replace(/\*\*\*/g, '') // Triple asterisks
        .replace(/\*\*/g, '')    // Double asterisks (bold)
        .replace(/\*/g, '')      // Single asterisks (italic or bullets)
        .replace(/___/g, '')     // Triple underscores
        .replace(/__/g, '')      // Double underscores
        .replace(/_/g, '')       // Single underscores
        .replace(/`/g, '')       // Backticks
        .replace(/#{1,6}\s?/g, '') // Headers
        .replace(/^>\s?/gm, '')    // Blockquotes at start of line
        .replace(/[-*]{3,}/g, '')  // Horizontal rules
        .trim();
};

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
        difficulty: 'medium',
        language: 'English'
    });
    const LANGUAGES = ['English', 'Arabic', 'Hausa', 'Igbo', 'Yoruba'];
    const [generating, setGenerating] = useState(false);
    const [scaffolding, setScaffolding] = useState(false);
    const [scaffoldingEssay, setScaffoldingEssay] = useState(false);
    const [fetchingResources, setFetchingResources] = useState(false);
    const [suggestedResources, setSuggestedResources] = useState([]);

    // Independent content states
    const [planContent, setPlanContent] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [generatedQuestions, setGeneratedQuestions] = useState([]); // Raw data for CSV
    const [isQuestionView, setIsQuestionView] = useState(false); // Sub-view for CBT content

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
                
                // If only one class, auto-select it
                if (uniqueClasses.length === 1) {
                    const singleClass = uniqueClasses[0];
                    const classIdStr = singleClass.id.toString();
                    
                    const relevantSubjects = assignmentsData
                        .filter(a => (a.classId || a.classSubject?.classId) === singleClass.id)
                        .map(a => a.subject || a.classSubject?.subject);
                    
                    setSubjects(relevantSubjects);
                    
                    // If only one subject for this class, auto-select it too
                    const subjectIdStr = relevantSubjects.length === 1 ? relevantSubjects[0].id.toString() : '';
                    
                    setFormData(prev => ({ 
                        ...prev, 
                        classId: classIdStr,
                        subjectId: subjectIdStr
                    }));
                    
                    console.log('[DEBUG] Auto-selected Class/Subject:', { classIdStr, subjectIdStr });
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
        
        if (view === 'plans') setPlanContent(item.content);
        else setNoteContent(item.content);
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
                difficulty: aiParams.difficulty,
                language: aiParams.language
            });

            if (resp.ok) {
                const questions = await resp.json();
                setGeneratedQuestions(questions);
                setIsQuestionView(true);
                toast.success(`Generated ${questions.length} questions! Content updated.`);
                
                const formatted = questions.map((q, i) => 
                   `${i+1}. [${q.bloomLevel || 'Knowledge'}] ${q.questionText}\n   Options: A: ${q.options[0].text}, B: ${q.options[1].text}, C: ${q.options[2].text}, D: ${q.options[3].text}\n   Answer: ${q.correctOption.toUpperCase()}\n   Explanation: ${q.explanation || 'N/A'}`
                ).join('\n\n');
                setFormData({ ...formData, content: formatted });
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
                type: view, // 'plans' or 'notes'
                language: aiParams.language
            });

            if (resp.ok) {
                const data = await resp.json();
                const cleanedContent = cleanAiContent(data.content);
                toast.success('AI Draft Generated!');
                setFormData({ ...formData, content: cleanedContent });
                if (view === 'plans') setPlanContent(cleanedContent);
                else setNoteContent(cleanedContent);
            } else {
                const err = await resp.json();
                toast.error(err.message || err.error || 'AI scaffolding failed');
            }
        } catch (err) {
            toast.error('AI service error');
        } finally {
            setScaffolding(false);
        }
    };

    const handleAiGenerateEssay = async () => {
        if (!formData.classId || !formData.subjectId || !formData.topic) {
            toast.error('Please select Class, Subject and provide a Topic first');
            return;
        }
        setScaffoldingEssay(true);
        try {
            const resp = await api.post('/api/academics/ai/generate-essay', {
                classId: formData.classId,
                subjectId: formData.subjectId,
                topic: formData.topic,
                language: aiParams.language
            });

            if (resp.ok) {
                const data = await resp.json();
                const cleanedContent = cleanAiContent(data.content);
                toast.success('AI Essay Questions Generated!');
                setFormData({ ...formData, content: cleanedContent });
                if (view === 'plans') setPlanContent(cleanedContent);
                else setNoteContent(cleanedContent);
            } else {
                const err = await resp.json();
                toast.error(err.message || err.error || 'AI generation failed');
            }
        } catch (err) {
            toast.error('AI service error');
        } finally {
            setScaffoldingEssay(false);
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

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const margin = 20;
        const width = 170;
        const titleText = `${view === 'plans' ? 'LESSON PLAN' : 'LESSON NOTE'}: ${formData.topic || 'UNTITLED'}`;
        
        doc.setFontSize(20);
        doc.setTextColor(30, 64, 175); // Indigo
        doc.text("EducTechAI Academic System", margin, 20);
        
        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55); // Gray 800
        doc.text(titleText, margin, 35);
        
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128); // Gray 500
        doc.text(`Class: ${classes.find(c => c.id.toString() === formData.classId)?.name || 'N/A'}`, margin, 45);
        doc.text(`Subject: ${subjects.find(s => s.id.toString() === formData.subjectId)?.name || 'N/A'}`, margin, 50);
        doc.text(`Week: ${formData.week || 'N/A'}`, margin, 55);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, 60);
        
        doc.setLineWidth(0.5);
        doc.line(margin, 65, margin + width, 65);
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        const splitContent = doc.splitTextToSize(formData.content, width);
        doc.text(splitContent, margin, 75);
        
        doc.save(`${view}_${formData.topic || 'no_topic'}.pdf`);
        toast.success("PDF Downloaded!");
    };

    const handleExportCSV = () => {
        if (generatedQuestions.length === 0) return;
        
        const csvData = generatedQuestions.map((q, i) => ({
            '#' : i + 1,
            'Question': q.questionText,
            'Option A': q.options[0]?.text || '',
            'Option B': q.options[1]?.text || '',
            'Option C': q.options[2]?.text || '',
            'Option D': q.options[3]?.text || '',
            'Answer': q.correctOption,
            'Bloom Level': q.bloomLevel,
            'Explanation': q.explanation
        }));
        
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `questions_${formData.topic || 'export'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV Exported!");
    };

    const handleToggleView = (newView) => {
        // Save current content before switching
        if (isQuestionView) {
            // we don't stash question text back to plans/notes automatically
        } else if (view === 'plans') {
            setPlanContent(formData.content);
        } else {
            setNoteContent(formData.content);
        }

        setView(newView);
        setIsQuestionView(false);
        setFormData(prev => ({
            ...prev,
            content: newView === 'plans' ? planContent : noteContent
        }));
    };

    const handleToggleQuestions = () => {
        if (!isQuestionView) {
            // Switching to question view
            if (view === 'plans') setPlanContent(formData.content);
            else setNoteContent(formData.content);
            
            setIsQuestionView(true);
            const formatted = generatedQuestions.map((q, i) => 
                `${i+1}. [${q.bloomLevel || 'Knowledge'}] ${q.questionText}\n   Options: A: ${q.options[0].text}, B: ${q.options[1].text}, C: ${q.options[2].text}, D: ${q.options[3].text}\n   Answer: ${q.correctOption.toUpperCase()}\n   Explanation: ${q.explanation || 'N/A'}`
             ).join('\n\n');
            setFormData(prev => ({ ...prev, content: formatted }));
        } else {
            // Switching back to plan/note
            setIsQuestionView(false);
            setFormData(prev => ({ 
                ...prev, 
                content: view === 'plans' ? planContent : noteContent 
            }));
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Academic Workspace</h1>
                    <p className="text-gray-500 mt-1">Manage your lesson plans, notes, and AI-powered assessments.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
                {/* Editor Section */}
                <div className="lg:col-span-12">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center w-full xl:w-auto">
                                <h3 className="font-black text-gray-900 text-xl tracking-tight mb-2 sm:mb-0">
                                    {isQuestionView ? 'Review Generated Questions' : `${editingItem ? 'Edit' : 'Create New'} ${view === 'plans' ? 'Plan' : 'Note'}`}
                                </h3>
                                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                                    <select 
                                        value={formData.classId} 
                                        onChange={e => handleClassChange(e.target.value)}
                                        className="flex-1 sm:flex-none bg-white border-2 border-gray-100 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.arm}</option>)}
                                    </select>
                                    <select 
                                        value={formData.subjectId} 
                                        onChange={e => setFormData({...formData, subjectId: e.target.value})}
                                        className="flex-1 sm:flex-none bg-white border-2 border-gray-100 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <input 
                                        type="number" 
                                        placeholder="Week" 
                                        value={formData.week}
                                        onChange={e => setFormData({...formData, week: e.target.value})}
                                        className="w-24 bg-white border-2 border-gray-100 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3 w-full xl:w-auto justify-start xl:justify-end">
                                <div className="flex bg-gray-100 p-1 rounded-2xl shadow-inner border border-gray-200 overflow-x-auto mr-2">
                                    <button 
                                        onClick={() => handleToggleView('plans')}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${view === 'plans' && !isQuestionView ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <FiFileText /> Plans
                                    </button>
                                    <button 
                                        onClick={() => handleToggleView('notes')}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${view === 'notes' && !isQuestionView ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <FiBook /> Notes
                                    </button>
                                    {generatedQuestions.length > 0 && (
                                        <button 
                                            onClick={handleToggleQuestions}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${isQuestionView ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <FiCpu /> CBT
                                        </button>
                                    )}
                                </div>
                                <div className="flex bg-white border-2 border-indigo-50 p-1.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <select 
                                        value={aiParams.language}
                                        onChange={e => setAiParams({...aiParams, language: e.target.value})}
                                        className="bg-transparent text-[11px] font-black uppercase text-indigo-400 outline-none cursor-pointer px-3 border-r border-indigo-50"
                                    >
                                        {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                    </select>
                                    <button 
                                        onClick={handleAiScaffold}
                                        disabled={scaffolding}
                                        className="text-indigo-600 px-4 py-2 rounded-xl font-bold hover:bg-indigo-50 transition flex items-center gap-2 text-xs whitespace-nowrap"
                                    >
                                        <FiCpu className={scaffolding ? 'animate-spin' : 'animate-pulse text-purple-600'} /> 
                                        {scaffolding ? 'Generating...' : `Generate ${view === 'plans' ? 'Lesson Plan' : 'Lesson Note'} Draft (${aiParams.language})`}
                                    </button>
                                </div>
                                <button 
                                    onClick={() => setShowAiModal(true)}
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-purple-100 hover:shadow-purple-200 transform active:scale-95 transition flex items-center gap-2 text-xs"
                                >
                                    <FiCpu className="animate-pulse" /> AI Generate CBT
                                </button>
                                <button 
                                    onClick={handleAiGenerateEssay}
                                    disabled={scaffoldingEssay}
                                    className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:shadow-blue-200 transform active:scale-95 transition flex items-center gap-2 text-xs"
                                >
                                    <FiCpu className={scaffoldingEssay ? 'animate-spin' : 'animate-pulse'} /> 
                                    {scaffoldingEssay ? 'Generating...' : 'AI Generate Essay'}
                                </button>
                                <button 
                                    onClick={handleSuggestResources}
                                    disabled={fetchingResources}
                                    className="bg-white border-2 border-purple-100 text-purple-600 px-5 py-3 rounded-2xl font-bold shadow-sm hover:bg-purple-50 transform active:scale-95 transition flex items-center gap-2 text-xs"
                                >
                                    <FiFileText className={fetchingResources ? 'animate-spin' : ''} /> {fetchingResources ? 'Searching...' : 'Find Resources'}
                                </button>
                                <button 
                                    onClick={() => handleSave('draft')}
                                    disabled={isQuestionView}
                                    className="bg-white border-2 border-gray-100 text-gray-700 px-5 py-3 rounded-2xl font-bold hover:bg-gray-50 flex items-center gap-2 shadow-sm disabled:opacity-50 text-xs"
                                >
                                    <FiSave /> Save Draft
                                </button>
                                {isQuestionView ? (
                                    <button 
                                        onClick={handleExportCSV}
                                        className="bg-green-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-green-700 flex items-center gap-2 shadow-lg shadow-green-100 text-xs"
                                    >
                                        <FiDownload /> Export CSV
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            onClick={handleDownloadPDF}
                                            className="bg-gray-100 text-gray-700 px-5 py-3 rounded-2xl font-bold hover:bg-gray-200 flex items-center gap-2 shadow-sm text-xs"
                                        >
                                            <FiDownload /> PDF
                                        </button>
                                        <button 
                                            onClick={() => handleSave('published')}
                                            className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-100 text-xs"
                                        >
                                            <FiSend /> Publish
                                        </button>
                                    </>
                                )}
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
                                placeholder={isQuestionView ? "Questions will appear here..." : `Write your ${view === 'plans' ? 'lesson plan' : 'lesson note'} here...`}
                                value={formData.content}
                                readOnly={isQuestionView}
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
                                        min="1" max="100"
                                        value={aiParams.count}
                                        onChange={e => setAiParams({...aiParams, count: parseInt(e.target.value)})}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-lg"
                                    />
                                    {aiParams.count > 40 && (
                                        <p className="text-[10px] text-orange-500 font-bold mt-1 leading-tight">Note: Generating 40+ questions may take longer or be truncated by AI limits.</p>
                                    )}
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

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Language</label>
                                <select 
                                    value={aiParams.language}
                                    onChange={e => setAiParams({...aiParams, language: e.target.value})}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                                >
                                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                </select>
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
