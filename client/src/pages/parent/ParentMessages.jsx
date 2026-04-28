import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatDateVerbose, formatWhatsAppNumber } from '../../utils/formatters';
import { toast } from 'react-hot-toast';

const ParentMessages = () => {
  const { user } = useAuth();
  const [wards, setWards] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [formMaster, setFormMaster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [thread, setThread] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [newMessageData, setNewMessageData] = useState({
    subject: '',
    message: '',
    messageType: 'general'
  });

  const [replyData, setReplyData] = useState({
    message: ''
  });

  useEffect(() => {
    fetchWards();
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchFormMaster();
      fetchMessages();
    }
  }, [selectedStudent]);

  const fetchWards = async () => {
    try {
      const response = await api.get('/api/parents/my-wards');
      if (response.ok) {
        const data = await response.json();
        setWards(data);
        if (data.length > 0) {
          setSelectedStudent(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching wards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormMaster = async () => {
    try {
      const response = await api.get(`/api/messages/form-master/${selectedStudent.id}`);
      if (response.ok) {
        const data = await response.json();
        setFormMaster(data);
      }
    } catch (error) {
      console.error('Error fetching form master:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/api/messages?studentId=${selectedStudent.id}`);
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
        fetchMessages();
      }
    } catch (error) {
      console.error('Error fetching thread:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessageData.subject || !newMessageData.message) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!formMaster) {
      toast.error('Form master not found for this student');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/api/messages', {
        receiverId: formMaster.formMaster.user.id,
        studentId: selectedStudent.id,
        subject: newMessageData.subject,
        message: newMessageData.message,
        messageType: newMessageData.messageType
      });

      if (response.ok) {
        toast.success('Message sent successfully!');
        setNewMessageData({ subject: '', message: '', messageType: 'general' });
        setShowNewMessage(false);
        fetchMessages();
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      toast.error('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyData.message) {
      toast.error('Please enter a message');
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
        fetchMessages();
        toast.success('Reply sent');
      } else {
        toast.error('Failed to send reply');
      }
    } catch (error) {
      toast.error('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message thread?')) return;
    
    try {
      const response = await api.delete(`/api/messages/${messageId}`);
      if (response.ok) {
        toast.success('Thread deleted');
        setMessages(messages.filter(msg => msg.id !== messageId));
        if (showThread && thread[0]?.id === messageId) {
          setShowThread(false);
          setSelectedMessage(null);
          setThread([]);
        }
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-pulse">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-primary animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Communications...</p>
        </div>
      </div>
    );
  }

  if (wards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-20">
        <div className="bg-amber-50 rounded-[40px] p-12 text-center border-4 border-dashed border-amber-200">
          <div className="w-20 h-20 bg-amber-200 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h3 className="text-2xl font-black text-amber-900 uppercase tracking-tighter italic">No Active Links</h3>
          <p className="text-amber-700/60 font-bold uppercase text-xs mt-2 tracking-widest">Contact school administration to link your children.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Dynamic Header */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[40px] p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-secondary/10 blur-[80px] rounded-full -ml-10 -mb-10"></div>
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 bg-primary/20 backdrop-blur-md rounded-full border border-primary/30">
                <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Parent-Staff Bridge</p>
              </div>
              {unreadCount > 0 && (
                <div className="px-4 py-1.5 bg-rose-500 rounded-full shadow-lg shadow-rose-500/30">
                   <p className="text-[10px] font-black uppercase text-white tracking-[0.1em]">{unreadCount} New Signals</p>
                </div>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
              Communication Hub
            </h1>
            <p className="text-slate-400 font-medium text-sm md:text-base max-w-md">
              Secure, direct line to your child's mentors and school facilitators.
            </p>
          </div>

          <div className="flex flex-col gap-4 w-full md:w-auto">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] ml-2">Active Context</label>
            <select
              value={selectedStudent?.id || ''}
              onChange={(e) => {
                const student = wards.find(w => w.id === parseInt(e.target.value));
                setSelectedStudent(student);
                setShowNewMessage(false);
                setShowThread(false);
              }}
              className="w-full md:w-64 bg-white/5 backdrop-blur-xl border-2 border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-primary transition-all cursor-pointer"
            >
              {wards.map(ward => (
                <option key={ward.id} value={ward.id} className="bg-slate-900 text-white">
                  {ward.user?.firstName} {ward.user?.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar / Left Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Form Master Premium Card */}
          {formMaster && (
            <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg className="w-24 h-24 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-[32px] bg-slate-50 border-4 border-white shadow-xl overflow-hidden ring-1 ring-slate-100">
                    {formMaster.formMaster.user?.photoUrl ? (
                      <img
                        src={formMaster.formMaster.user.photoUrl.startsWith('data:') || formMaster.formMaster.user.photoUrl.startsWith('http') ? formMaster.formMaster.user.photoUrl : `${API_BASE_URL}${formMaster.formMaster.user.photoUrl}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-3xl text-primary/30 uppercase">
                        {formMaster.formMaster.user.firstName?.[0]}{formMaster.formMaster.user.lastName?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-8 h-8 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                  </div>
                </div>

                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Mentor / Form Master</p>
                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-2">
                  {formMaster.formMaster.user.firstName} {formMaster.formMaster.user.lastName}
                </h2>
                <div className="px-4 py-1 bg-slate-50 rounded-full text-[10px] font-black text-slate-500 uppercase italic">
                  Class {formMaster.class.name} {formMaster.class.arm}
                </div>

                <div className="grid grid-cols-2 gap-3 w-full mt-8">
                  <a 
                    href={`tel:${formMaster.formMaster.user?.teacher?.publicPhone || formMaster.formMaster.user?.phone}`}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Call</span>
                  </a>
                  <a 
                    href={`https://wa.me/${formatWhatsAppNumber(formMaster.formMaster.user?.teacher?.publicWhatsapp || formMaster.formMaster.user?.teacher?.publicPhone || formMaster.formMaster.user?.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.431 6.516a10.024 10.024 0 01-5.115-1.411l-.367-.218-3.801 1.002.112-3.8-.231-.368A9.994 9.994 0 012.83 10.155c0-5.518 4.482-10 10-10 5.518 0 10 4.482 10 10 0 5.519-4.482 10-10 10z" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setShowThread(false);
              setShowNewMessage(!showNewMessage);
            }}
            className={`w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95 ${showNewMessage ? 'bg-slate-100 text-slate-500' : 'bg-primary text-white shadow-primary/30 hover:brightness-110'}`}
          >
            {showNewMessage ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                Abort Message
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                Draft New Signals
              </>
            )}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-8">
          {/* New Message Form */}
          {showNewMessage && (
            <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-slate-50 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Secure Broadcast</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Drafting message for {formMaster?.formMaster?.user?.firstName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Context / Category</label>
                    <select
                      value={newMessageData.messageType}
                      onChange={(e) => setNewMessageData({ ...newMessageData, messageType: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-slate-900 font-bold transition-all outline-none"
                    >
                      <option value="general">General Inquery</option>
                      <option value="complaint">Urgent Complaint</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Subject Header</label>
                    <input
                      type="text"
                      value={newMessageData.subject}
                      onChange={(e) => setNewMessageData({ ...newMessageData, subject: e.target.value })}
                      placeholder="e.g. Attendance Verification"
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-slate-900 font-bold transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Message Content</label>
                  <textarea
                    value={newMessageData.message}
                    onChange={(e) => setNewMessageData({ ...newMessageData, message: e.target.value })}
                    rows="8"
                    placeholder="Provide full details here..."
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-[32px] px-8 py-6 text-slate-900 font-bold transition-all outline-none resize-none shadow-inner"
                  />
                </div>

                <div className="pt-6">
                  <button
                    onClick={handleSendMessage}
                    disabled={submitting}
                    className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {submitting ? 'Transmitting Signal...' : 'Transmit Message'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Message Thread View */}
          {showThread && (
            <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-50 animate-in slide-in-from-right-8 duration-500 flex flex-col h-[750px]">
              {/* Thread Header */}
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -ml-10 -mt-10"></div>
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
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em] mb-1">Encrypted Signals</p>
                    <h3 className="text-xl font-black italic tracking-tighter truncate max-w-md">{thread[0]?.subject}</h3>
                  </div>
                </div>
                <div className="relative hidden md:block">
                  <div className="px-4 py-1.5 bg-white/10 rounded-full border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest">{thread.length} Events in Log</p>
                  </div>
                </div>
              </div>

              {/* Chat Canvas */}
              <div className="flex-1 p-8 md:p-12 space-y-8 overflow-y-auto scrollbar-hide bg-slate-50/50 shadow-inner">
                {thread.map((msg, index) => {
                  const isMe = msg.senderId === user.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                      <div className={`max-w-[85%] md:max-w-[70%] space-y-2`}>
                        <div className={`flex items-center gap-3 mb-1 px-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-[10px] shadow-sm ring-1 ring-slate-100 ${isMe ? 'bg-primary text-white' : 'bg-white text-slate-400'}`}>
                            {msg.sender?.photoUrl ? (
                              <img src={msg.sender.photoUrl.startsWith('data:') || msg.sender.photoUrl.startsWith('http') ? msg.sender.photoUrl : `${API_BASE_URL}${msg.sender.photoUrl}`} className="w-full h-full object-cover rounded-xl" alt="" />
                            ) : (
                              <span>{msg.sender?.firstName?.[0]}{msg.sender?.lastName?.[0]}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-800 tracking-tight">{isMe ? 'Authorized (You)' : `${msg.sender?.firstName} ${msg.sender?.lastName}`}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{formatDateVerbose(msg.createdAt)}</p>
                          </div>
                        </div>

                        <div className={`relative px-6 py-4 rounded-[28px] shadow-sm transition-all duration-300 ${isMe ? 'bg-primary text-white rounded-tr-none hover:shadow-xl hover:shadow-primary/20' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50'}`}>
                          {msg.messageType === 'complaint' && (
                            <div className="absolute -top-3 right-4 px-2 py-0.5 bg-rose-500 text-white rounded text-[8px] font-black uppercase tracking-widest shadow-lg">Alert</div>
                          )}
                          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Reply Bar */}
              <div className="p-8 bg-white border-t border-slate-50">
                <div className="flex gap-4">
                  <textarea
                    value={replyData.message}
                    onChange={(e) => setReplyData({ message: e.target.value })}
                    rows="2"
                    placeholder="Type your secure response..."
                    className="flex-1 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-slate-900 font-bold transition-all outline-none resize-none text-sm"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={submitting}
                    className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* History Feed */}
          {!showNewMessage && !showThread && (
            <div className="space-y-6 animate-in fade-in duration-1000">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Signal Logs</h3>
                <div className="h-px bg-slate-100 flex-1 ml-6"></div>
              </div>

              {messages.length === 0 ? (
                <div className="bg-slate-50/50 rounded-[40px] p-20 text-center border-4 border-dashed border-slate-100">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-relaxed">No existing communication logs for this context.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {messages.map((msg) => {
                    const isUnread = !msg.isRead && msg.receiverId === user.id;
                    return (
                      <div
                        key={msg.id}
                        onClick={() => {
                          setSelectedMessage(msg);
                          fetchThread(msg.parentMessageId || msg.id);
                        }}
                        className={`group relative bg-white rounded-[32px] p-6 border-2 transition-all duration-500 cursor-pointer flex items-center gap-6 ${isUnread ? 'border-primary/20 shadow-xl shadow-primary/5' : 'border-transparent shadow-sm hover:shadow-2xl hover:shadow-slate-200/50'}`}
                      >
                        <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-lg shadow-sm transition-all duration-500 group-hover:scale-110 ${isUnread ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                          {msg.senderId === user.id ? 'To' : 'Fr'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isUnread && <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>}
                            <h4 className={`text-lg font-black tracking-tight truncate ${isUnread ? 'text-slate-900' : 'text-slate-600'}`}>{msg.subject}</h4>
                          </div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">
                             {msg.senderId === user.id ? `Staff ID: ${msg.receiver?.id}` : `Sender: ${msg.sender?.firstName}`}
                          </p>
                          <p className="text-sm text-slate-400 font-medium line-clamp-1 italic">"{msg.message}"</p>
                        </div>

                        <div className="flex flex-col items-end gap-3 flex-shrink-0">
                           <p className="text-[8px] font-black uppercase text-slate-300 tracking-widest">{formatDateVerbose(msg.createdAt)}</p>
                           {msg.senderId === user.id && (
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleDeleteMessage(msg.id);
                               }}
                               className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                             >
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                           )}
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

export default ParentMessages;
