import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatDateVerbose } from '../../utils/formatters';
import { toast } from 'react-hot-toast';

const TeacherMessages = () => {
  const { user } = useAuth();
  const [myClass, setMyClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [thread, setThread] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [newMessageData, setNewMessageData] = useState({
    subject: '',
    message: '',
    messageType: 'update'
  });

  const [replyData, setReplyData] = useState({
    message: ''
  });

  useEffect(() => {
    fetchMyClass();
    fetchAllMessages();
    fetchUnreadCount();
  }, []);

  const fetchMyClass = async () => {
    try {
      const response = await api.get('/api/classes/my-class');
      if (response.ok) {
        const data = await response.json();
        setMyClass(data);
        if (data && data.students) {
          setStudents(data.students);
        }
      }
    } catch (error) {
      console.error('Error fetching my class:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMessages = async () => {
    try {
      const response = await api.get('/api/messages');
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/api/messages/unread-count');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchThread = async (messageId) => {
    try {
      const response = await api.get(`/api/messages/thread/${messageId}`);
      if (response.ok) {
        const data = await response.json();
        setThread(data);
        setShowThread(true);
        fetchUnreadCount();
        fetchAllMessages();
      }
    } catch (error) {
      console.error('Error fetching thread:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessageData.subject || !newMessageData.message || !selectedStudent) {
      toast.error('Please fill in all fields and select a student');
      return;
    }

    const student = students.find(s => s.id === parseInt(selectedStudent));
    if (!student || !student.parent) {
      toast.error('Student does not have a parent linked');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/api/messages', {
        receiverId: student.parent.userId,
        studentId: student.id,
        subject: newMessageData.subject,
        message: newMessageData.message,
        messageType: newMessageData.messageType
      });

      if (response.ok) {
        toast.success('Broadcast sent');
        setNewMessageData({ subject: '', message: '', messageType: 'update' });
        setSelectedStudent(null);
        setShowNewMessage(false);
        fetchAllMessages();
      } else {
        toast.error('Transmission failed');
      }
    } catch (error) {
      toast.error('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyData.message) {
      toast.error('Reply cannot be empty');
      return;
    }

    const mainMessage = thread[0];
    setSubmitting(true);

    try {
      const response = await api.post('/api/messages', {
        receiverId: mainMessage.senderId === user.id ? mainMessage.receiverId : mainMessage.senderId,
        studentId: mainMessage.studentId,
        subject: `Re: ${mainMessage.subject}`,
        message: replyData.message,
        messageType: 'response',
        parentMessageId: mainMessage.id
      });

      if (response.ok) {
        setReplyData({ message: '' });
        fetchThread(mainMessage.id);
        fetchAllMessages();
        toast.success('Response delivered');
      } else {
        toast.error('Failed to reply');
      }
    } catch (error) {
      toast.error('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Erase this message thread from logs?')) return;
    
    try {
      const response = await api.delete(`/api/messages/${messageId}`);
      if (response.ok) {
        toast.success('Thread erased');
        setMessages(messages.filter(msg => msg.id !== messageId));
        if (showThread && thread[0]?.id === messageId) {
          setShowThread(false);
          setSelectedMessage(null);
          setThread([]);
        }
      }
    } catch (error) {
      toast.error('Erase failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-20 h-20 bg-primary/5 rounded-[40px] flex items-center justify-center mb-6 mx-auto animate-bounce">
            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Initializing Faculty Relay...</p>
        </div>
      </div>
    );
  }

  if (!myClass) {
    return (
      <div className="max-w-2xl mx-auto py-20">
        <div className="bg-rose-50 rounded-[40px] p-12 text-center border-4 border-dashed border-rose-100">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h3 className="text-2xl font-black text-rose-900 uppercase tracking-tighter italic">No Context Assigned</h3>
          <p className="text-rose-700/60 font-bold uppercase text-xs mt-2 tracking-widest leading-relaxed">You must be assigned as a form master to access parental relays.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Faculty Header */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[40px] p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 blur-[120px] rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 blur-[100px] rounded-full -ml-20 -mb-20"></div>
        
        <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <p className="text-[10px] font-black uppercase text-white tracking-[0.2em] italic">{myClass.name} {myClass.arm} • Relay Console</p>
              </div>
              {unreadCount > 0 && (
                <div className="px-4 py-1.5 bg-rose-500 rounded-full shadow-lg shadow-rose-500/30 animate-pulse">
                   <p className="text-[10px] font-black uppercase text-white tracking-[0.1em]">{unreadCount} Inbound Signals</p>
                </div>
              )}
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
              Parental <span className="text-primary">Relay</span>
            </h1>
            <p className="text-slate-400 font-medium text-sm md:text-base max-w-xl leading-relaxed">
              Maintain critical communication channels with guardians and provide periodic performance synchronizations.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Fleet Management</p>
              <p className="text-2xl font-black text-white italic">{students.length} Students</p>
            </div>
            <div className="w-16 h-16 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center text-primary backdrop-blur-xl">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Actions / Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <button
            onClick={() => {
              setShowThread(false);
              setShowNewMessage(!showNewMessage);
            }}
            className={`w-full py-6 rounded-[28px] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95 ${showNewMessage ? 'bg-slate-100 text-slate-500' : 'bg-primary text-white shadow-primary/30 hover:brightness-110'}`}
          >
            {showNewMessage ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                Abort Sync
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                Sync with Parent
              </>
            )}
          </button>

          {/* Quick Stats Section */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-200/40">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6">Channel Health</h4>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Response Latency</p>
                  <p className="text-xl font-black text-slate-900 italic leading-none">Optimal</p>
                </div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              </div>
              <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[85%] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Console / Main View */}
        <div className="lg:col-span-8">
          {/* Outbound Sync Form */}
          {showNewMessage && (
            <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-slate-50 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-14 h-14 bg-primary/10 rounded-[24px] flex items-center justify-center text-primary shadow-inner">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic leading-none">Outbound Sync</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Configuring transmission for guardian fleet</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 italic">Target Student Identity</label>
                    <select
                      value={selectedStudent || ''}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-slate-900 font-bold transition-all outline-none"
                    >
                      <option value="">-- Select Target --</option>
                      {students.map(student => (
                        <option key={student.id} value={student.id} className="font-bold">
                          {student.user?.firstName} {student.user?.lastName} ({student.admissionNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 italic">Relay Protocol</label>
                      <select
                        value={newMessageData.messageType}
                        onChange={(e) => setNewMessageData({ ...newMessageData, messageType: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-slate-900 font-bold transition-all outline-none"
                      >
                        <option value="update">Performance Update</option>
                        <option value="general">Standard Briefing</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 italic">Sync Header</label>
                      <input
                        type="text"
                        value={newMessageData.subject}
                        onChange={(e) => setNewMessageData({ ...newMessageData, subject: e.target.value })}
                        placeholder="Subject of transmission"
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-slate-900 font-bold transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 italic">Sync Payload</label>
                    <textarea
                      value={newMessageData.message}
                      onChange={(e) => setNewMessageData({ ...newMessageData, message: e.target.value })}
                      rows="6"
                      placeholder="Enter detailed sync information..."
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-[32px] px-8 py-6 text-slate-900 font-bold transition-all outline-none resize-none shadow-inner"
                    />
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={handleSendMessage}
                      disabled={submitting}
                      className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {submitting ? 'Transmitting Sync...' : 'Initialize Transmission'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Secure Thread Console */}
          {showThread && (
            <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-50 animate-in slide-in-from-right-8 duration-500 flex flex-col h-[800px]">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none"></div>
                <div className="relative flex items-center gap-6">
                  <button
                    onClick={() => {
                      setShowThread(false);
                      setSelectedMessage(null);
                      setThread([]);
                    }}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-90"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  </button>
                  <div>
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em] mb-1">Encrypted Payload Log</p>
                    <h3 className="text-xl font-black italic tracking-tighter truncate max-w-md">{thread[0]?.subject}</h3>
                  </div>
                </div>
                <div className="relative hidden sm:block">
                  <div className="px-5 py-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                     <p className="text-[10px] font-black uppercase tracking-widest leading-none">Context: {thread[0]?.student?.user?.firstName} {thread[0]?.student?.user?.lastName}</p>
                  </div>
                </div>
              </div>

              {/* Interaction Map (Chat Content) */}
              <div className="flex-1 p-8 md:p-12 space-y-10 overflow-y-auto bg-slate-50/50 shadow-inner custom-scrollbar">
                {thread.map((msg, index) => {
                  const isMe = msg.senderId === user.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group animate-in slide-in-from-bottom-2`}>
                      <div className={`max-w-[90%] md:max-w-[75%] space-y-3`}>
                        <div className={`flex items-center gap-3 px-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-xs shadow-sm ring-2 ring-white overflow-hidden ${isMe ? 'bg-primary text-white shadow-primary/20' : 'bg-white text-slate-400'}`}>
                            {msg.sender?.photoUrl ? (
                              <img src={msg.sender.photoUrl.startsWith('data:') || msg.sender.photoUrl.startsWith('http') ? msg.sender.photoUrl : `${API_BASE_URL}${msg.sender.photoUrl}`} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <span>{msg.sender?.firstName?.[0]}{msg.sender?.lastName?.[0]}</span>
                            )}
                          </div>
                          <div className={isMe ? 'text-right' : 'text-left'}>
                            <p className="text-[11px] font-black text-slate-800 tracking-tight leading-none mb-1">{isMe ? 'Internal Relay' : `${msg.sender?.firstName} (Guardian)`}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{formatDateVerbose(msg.createdAt)}</p>
                          </div>
                        </div>

                        <div className={`relative px-8 py-6 rounded-[32px] shadow-sm transition-all duration-300 border ${isMe ? 'bg-primary text-white border-primary/20 rounded-tr-none' : 'bg-white text-slate-700 border-slate-100 rounded-tl-none'}`}>
                          {msg.messageType === 'complaint' && (
                            <div className="absolute -top-3 right-6 px-3 py-1 bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-xl">Critical Sync</div>
                          )}
                          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sync Reply Interface */}
              <div className="p-8 bg-white border-t border-slate-50">
                <div className="flex gap-4">
                  <textarea
                    value={replyData.message}
                    onChange={(e) => setReplyData({ message: e.target.value })}
                    rows="2"
                    placeholder="Enter relay response..."
                    className="flex-1 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-3xl px-8 py-5 text-slate-900 font-bold transition-all outline-none resize-none text-sm shadow-inner"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={submitting}
                    className="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-2xl hover:bg-black hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Historical Logs Feed */}
          {!showNewMessage && !showThread && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Transmission Logs</h3>
                <div className="h-px bg-slate-100 flex-1 ml-8"></div>
              </div>

              {messages.length === 0 ? (
                <div className="bg-slate-50/50 rounded-[40px] p-24 text-center border-4 border-dashed border-slate-100 opacity-60">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">No historical transmissions recorded.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isUnread = !msg.isRead && msg.receiverId === user.id;
                    return (
                      <div
                        key={msg.id}
                        onClick={() => {
                          setSelectedMessage(msg);
                          fetchThread(msg.parentMessageId || msg.id);
                        }}
                        className={`group relative bg-white rounded-[32px] p-8 border-2 transition-all duration-500 cursor-pointer flex items-center gap-8 ${isUnread ? 'border-primary/20 shadow-2xl shadow-primary/5' : 'border-transparent shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1'}`}
                      >
                        <div className={`w-16 h-16 rounded-[24px] flex-shrink-0 flex items-center justify-center font-black text-xl shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${isUnread ? 'bg-primary text-white shadow-primary/20' : 'bg-slate-50 text-slate-400'}`}>
                          {msg.senderId === user.id ? 'Out' : 'In'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            {isUnread && <div className="w-3 h-3 bg-rose-500 rounded-full animate-ping"></div>}
                            <h4 className={`text-xl font-black tracking-tight truncate leading-none ${isUnread ? 'text-slate-900' : 'text-slate-600'}`}>{msg.subject}</h4>
                            <div className="px-3 py-1 bg-slate-50 rounded-lg text-[9px] font-black uppercase text-slate-400 tracking-widest hidden md:block">{msg.messageType}</div>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none italic">Context: {msg.student?.user?.firstName} {msg.student?.user?.lastName}</p>
                            <span className="text-slate-300">•</span>
                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest leading-none">Guardian: {msg.senderId === user.id ? msg.receiver?.firstName : msg.sender?.firstName}</p>
                          </div>
                          <p className="text-sm text-slate-400 font-medium line-clamp-1 italic leading-relaxed">"{msg.message}"</p>
                        </div>

                        <div className="flex flex-col items-end gap-4 flex-shrink-0">
                           <div className="text-[9px] font-black uppercase text-slate-300 tracking-[0.2em] bg-slate-50/50 px-3 py-1.5 rounded-full">{formatDateVerbose(msg.createdAt)}</div>
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               handleDeleteMessage(msg.id);
                             }}
                             className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                           >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherMessages;
