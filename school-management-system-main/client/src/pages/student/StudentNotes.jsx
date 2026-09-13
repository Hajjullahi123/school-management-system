import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiBook, FiCpu, FiGlobe, FiMessageCircle, FiSend, FiX, FiCheckCircle, FiChevronRight, FiTrash2 } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

const StudentNotes = () => {
    const { user } = useAuth();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState(null);
    const [translation, setTranslation] = useState(null);
    const [translating, setTranslating] = useState(false);

    // AI Chat State
    const [showChat, setShowChat] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', text: 'Hi! I am your AI Tutor for this lesson. Ask me anything about the material.' }
    ]);
    const [input, setInput] = useState('');

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            // Fetch published notes for the student's class
            const classId = user.student?.classId;
            if (!classId) {
                setLoading(false);
                return;
            }

            const resp = await api.get(`/api/academics/lesson-notes?classId=${classId}&status=published`);
            if (resp.ok) {
                setNotes(await resp.json());
            }
        } catch (err) {
            toast.error('Failed to load lesson notes');
        } finally {
            setLoading(false);
        }
    };

    const handleTranslate = async (lang) => {
        if (!selectedNote) return;
        setTranslating(true);
        try {
            const resp = await api.post('/api/academics/ai/translate-lesson', {
                content: selectedNote.content,
                targetLang: lang
            });
            if (resp.ok) {
                const data = await resp.json();
                setTranslation({ lang, content: data.translated });
                toast.success(`Translated to ${lang}!`);
            }
        } catch (err) {
            toast.error('Translation failed');
        } finally {
            setTranslating(false);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || chatLoading || !selectedNote) return;

        const userMsg = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setChatLoading(true);

        try {
            // Format history for Gemini API
            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const resp = await api.post('/api/academics/ai/lesson-chat', {
                lessonNoteId: selectedNote.id,
                message: input,
                history: history
            });

            if (resp.ok) {
                const data = await resp.json();
                setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
            } else {
                toast.error('AI Tutor is busy. Try again later.');
            }
        } catch (err) {
            toast.error('Connection to Tutor lost');
        } finally {
            setChatLoading(false);
        }
    };

    if (!user.student?.classId) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-8">
                <div className="bg-white p-12 rounded-[50px] shadow-2xl border border-gray-100 text-center max-w-md animate-in zoom-in-95 duration-500">
                    <div className="bg-red-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <FiX className="text-red-500 text-4xl" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Record Not Linked</h2>
                    <p className="text-gray-500 font-medium mt-4 leading-relaxed">Your student profile is not correctly linked to a class. Please contact the school administrator to resolve this.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 font-sans bg-gray-50/30 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter flex items-center gap-4">
                        <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-100">
                            <FiBook className="text-white text-3xl" />
                        </div>
                        Digital Study Hall
                    </h1>
                    <p className="text-gray-500 font-bold mt-3 uppercase text-xs tracking-[0.2em] flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Active Learning: {user.student?.classModel?.name}
                    </p>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center font-black text-indigo-600">
                        {notes.length}
                    </div>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Available Notes</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Notes List */}
                <div className="lg:col-span-4 space-y-4 max-h-[75vh] overflow-y-auto pr-4 custom-scrollbar">
                    {loading ? (
                        <div className="p-20 text-center flex flex-col items-center gap-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
                            <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Opening Library Vault...</p>
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="p-16 text-center bg-white border-4 border-dashed rounded-[40px] border-gray-100 shadow-inner">
                            <FiBook className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-300 font-black uppercase text-sm tracking-widest leading-loose">No notes have been<br/>published for your class yet.</p>
                        </div>
                    ) : notes.map(note => (
                        <div 
                            key={note.id}
                            onClick={() => { setSelectedNote(note); setTranslation(null); setShowChat(false); setMessages([{ role: 'model', text: 'Hi! I am your AI Tutor for this lesson. Ask me anything about the material.' }]); }}
                            className={`p-6 rounded-[35px] border-2 transition-all cursor-pointer overflow-hidden relative group ${selectedNote?.id === note.id ? 'border-indigo-600 bg-white shadow-2xl shadow-indigo-100 scale-[1.02]' : 'border-white bg-white/60 hover:border-indigo-200 hover:bg-white'}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${selectedNote?.id === note.id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                                    Week {note.week}
                                </span>
                                <FiChevronRight className={`text-xl transition-transform ${selectedNote?.id === note.id ? 'translate-x-1 text-indigo-600' : 'text-gray-300'}`} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mt-1 uppercase tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">{note.topic}</h3>
                            <div className="flex items-center gap-2 mt-4">
                                <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-black text-gray-400">
                                    {note.teacher?.firstName?.[0]}{note.teacher?.lastName?.[0]}
                                </div>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{note.subject?.name}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Reader */}
                <div className="lg:col-span-8">
                    {!selectedNote ? (
                        <div className="bg-white border-4 border-dashed border-gray-100 rounded-[60px] h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12 transition-all">
                            <div className="relative mb-8">
                                <FiBook className="w-24 h-24 text-gray-100" />
                                <div className="absolute -top-2 -right-2 bg-indigo-100 w-10 h-10 rounded-full flex items-center justify-center animate-bounce">
                                    <FiCheckCircle className="text-indigo-600" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-black text-gray-200 uppercase tracking-tighter italic">Ready to learn?</h2>
                            <p className="text-gray-400 font-bold max-w-xs mt-4 leading-relaxed">Select a digital lesson note from the library to unlock your AI Study Assistant.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[50px] shadow-2xl border border-gray-100 overflow-hidden min-h-[700px] flex flex-col animate-in fade-in zoom-in-95 duration-500">
                            {/* Toolbar */}
                            <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex flex-wrap justify-between items-center gap-6">
                                <div className="flex flex-wrap gap-3">
                                    <div className="flex items-center gap-2 mr-2">
                                        <div className="bg-purple-600 p-1.5 rounded-lg">
                                            <FiGlobe className="text-white text-sm" />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Translate</span>
                                    </div>
                                    <button 
                                        onClick={() => handleTranslate('Yoruba')}
                                        disabled={translating}
                                        className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm ${translation?.lang === 'Yoruba' ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-600'}`}
                                    >
                                        {translating && translation?.lang === 'Yoruba' ? <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : <><FiGlobe /> Yoruba</>}
                                    </button>
                                    <button 
                                        onClick={() => handleTranslate('Hausa')}
                                        disabled={translating}
                                        className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm ${translation?.lang === 'Hausa' ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-600'}`}
                                    >
                                        {translating && translation?.lang === 'Hausa' ? <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : <><FiGlobe /> Hausa</>}
                                    </button>
                                    <button 
                                        onClick={() => handleTranslate('Igbo')}
                                        disabled={translating}
                                        className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm ${translation?.lang === 'Igbo' ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-600'}`}
                                    >
                                        {translating && translation?.lang === 'Igbo' ? <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : <><FiGlobe /> Igbo</>}
                                    </button>
                                </div>
                                <button 
                                    onClick={() => setShowChat(true)}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-8 py-4 rounded-[25px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 flex items-center gap-3 hover:scale-105 transition-all active:scale-95 group"
                                >
                                    <FiCpu className="text-xl group-hover:rotate-12 transition-transform" /> Ask AI Tutor
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-10 md:p-16 overflow-y-auto flex-1 max-h-[85vh] custom-scrollbar bg-white">
                                <div className="mb-12 pb-10 border-b-2 border-gray-50 flex justify-between items-start">
                                    <div className="max-w-2xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-50">Authorized Lesson</span>
                                            <span className="text-gray-300 font-bold">•</span>
                                            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">{selectedNote.subject?.name}</span>
                                        </div>
                                        <h2 className="text-5xl font-black text-gray-900 tracking-tight leading-[1.1] mb-6">{selectedNote.topic}</h2>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-xs font-black text-indigo-600">
                                                {selectedNote.teacher?.firstName?.[0]}
                                            </div>
                                            <p className="text-xs font-bold text-gray-400">PUBLISHED BY <span className="text-gray-900">{selectedNote.teacher?.firstName} {selectedNote.teacher?.lastName}</span></p>
                                        </div>
                                    </div>
                                    <div className="hidden md:block">
                                        <div className="bg-gray-50 p-6 rounded-[35px] border border-gray-100 text-center">
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Week</p>
                                            <p className="text-4xl font-black text-indigo-600">{selectedNote.week}</p>
                                        </div>
                                    </div>
                                </div>

                                {translation ? (
                                    <div className="bg-indigo-50/30 p-10 rounded-[50px] border-2 border-indigo-100 relative animate-in slide-in-from-top-4 duration-500">
                                        <div className="absolute -top-4 left-10 bg-indigo-600 text-white px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100">
                                            Local Language: {translation.lang}
                                        </div>
                                        <button 
                                            onClick={() => setTranslation(null)}
                                            className="absolute top-6 right-6 bg-white w-10 h-10 rounded-2xl flex items-center justify-center text-indigo-200 hover:text-red-500 shadow-sm transition-colors border border-indigo-50"
                                        >
                                            <FiTrash2 className="text-lg" />
                                        </button>
                                        <div className="prose prose-indigo max-w-none prose-p:text-indigo-900 prose-headings:text-indigo-950 font-bold leading-relaxed text-xl">
                                            <ReactMarkdown>{translation.content}</ReactMarkdown>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="prose prose-indigo max-w-none prose-p:text-gray-600 prose-headings:text-gray-900 prose-headings:font-black prose-p:leading-relaxed prose-p:text-xl selection:bg-indigo-100 selection:text-indigo-900">
                                        <ReactMarkdown>{selectedNote.content}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Tutor Chat Overlay */}
            {showChat && (
                <div className="fixed inset-0 md:inset-auto md:bottom-8 md:right-8 w-full md:max-w-md z-[60] animate-in slide-in-from-bottom-20 md:slide-in-from-right-20 duration-500">
                    <div className="bg-white/90 backdrop-blur-xl h-full md:h-[650px] md:rounded-[50px] shadow-2xl border border-white flex flex-col overflow-hidden">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/10 w-14 h-14 rounded-[20px] flex items-center justify-center border border-white/10">
                                    <FiCpu className="w-8 h-8 animate-pulse text-white/80" />
                                </div>
                                <div>
                                    <h4 className="font-black uppercase tracking-tighter text-lg leading-tight">Gemini Tutor</h4>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                        <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">Authenticated Expert</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowChat(false)} className="bg-white/10 w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-colors">
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-gray-50/20">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[90%] p-6 rounded-[30px] shadow-sm font-bold text-sm tracking-tight leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'}`}>
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white p-6 rounded-[30px] rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-duration:0.6s]"></div>
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.1s]"></div>
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.2s]"></div>
                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-2">Consulting Note...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-white border-t border-gray-50">
                            <div className="flex gap-3 bg-gray-50/50 p-2 rounded-[30px] border-2 border-gray-100 focus-within:border-indigo-600 transition-all shadow-inner">
                                <input 
                                    type="text" 
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Ask anything about this lesson..."
                                    className="flex-1 bg-transparent border-none outline-none px-6 font-bold text-sm text-gray-900 placeholder:text-gray-300"
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={!input.trim() || chatLoading}
                                    className="bg-indigo-600 text-white w-14 h-14 rounded-[22px] flex items-center justify-center hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-30 active:scale-90"
                                >
                                    <FiSend className="text-xl" />
                                </button>
                            </div>
                            <p className="text-center text-[9px] font-black text-gray-300 uppercase tracking-widest mt-4">Powered by Google Gemini-1.5 Flash • Contextual RAG</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentNotes;
