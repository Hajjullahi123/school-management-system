import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

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
        // Refresh unread count and messages since viewing the thread 
        // now automatically marks them as read in the backend
        fetchUnreadCount();
        fetchMessages();
      }
    } catch (error) {
      console.error('Error fetching thread:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessageData.subject || !newMessageData.message) {
      alert('Please fill in all fields');
      return;
    }

    if (!formMaster) {
      alert('Form master not found for this student');
      return;
    }

    try {
      const response = await api.post('/api/messages', {
        receiverId: formMaster.formMaster.user.id,
        studentId: selectedStudent.id,
        subject: newMessageData.subject,
        message: newMessageData.message,
        messageType: newMessageData.messageType
      });

      if (response.ok) {
        alert('Message sent successfully!');
        setNewMessageData({ subject: '', message: '', messageType: 'general' });
        setShowNewMessage(false);
        fetchMessages();
      } else {
        alert('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message');
    }
  };

  const handleSendReply = async () => {
    if (!replyData.message) {
      alert('Please enter a message');
      return;
    }

    const mainMessage = thread[0];

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
        alert('Reply sent successfully!');
        setReplyData({ message: '' });
        fetchThread(mainMessage.id);
        fetchMessages();
      } else {
        alert('Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Error sending reply');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await api.delete(`/api/messages/${messageId}`);
      if (response.ok) {
        // Remove from list
        setMessages(messages.filter(msg => msg.id !== messageId));
        // If we are viewing the thread of the deleted message, go back to list
        if (showThread && thread[0]?.id === messageId) {
          setShowThread(false);
          setSelectedMessage(null);
          setThread([]);
        }
      } else {
        const error = await response.json();
        alert(`Failed to delete message: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Error deleting message');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (wards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
          <h3 className="font-bold text-yellow-900 mb-2">No Children Linked</h3>
          <p className="text-yellow-700">
            You don't have any children linked to your account yet. Please contact the school admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/90 p-4 sm:p-6 rounded-lg text-white shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Messages</h1>
            <p className="text-xs sm:text-sm text-white/90 mt-1">Communicate with your child's teacher</p>
          </div>
          {unreadCount > 0 && (
            <div className="bg-red-500 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full font-bold text-xs sm:text-sm">
              {unreadCount} Unread
            </div>
          )}
        </div>
      </div>

      {/* Student Selector (only if multiple) */}
      {wards.length > 1 && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
          <label className="block text-xs sm:text-sm font-black text-gray-500 uppercase mb-2">Select Child</label>
          <select
            value={selectedStudent?.id || ''}
            onChange={(e) => {
              const student = wards.find(w => w.id === parseInt(e.target.value));
              setSelectedStudent(student);
              setShowNewMessage(false);
              setShowThread(false);
            }}
            className="w-full border border-gray-300 rounded-md px-3 sm:px-4 py-2 text-sm sm:text-base"
          >
            {wards.map(ward => (
              <option key={ward.id} value={ward.id}>
                {ward.user?.firstName} {ward.user?.lastName} - {ward.classModel?.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Form Master Info - Premium Card */}
      {formMaster && (
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row items-center gap-6 group">
          <div className="h-20 w-20 rounded-[24px] bg-slate-50 border-2 border-slate-100 flex items-center justify-center font-black text-2xl text-primary shadow-inner overflow-hidden group-hover:border-primary/30 transition-all duration-500">
            {formMaster.formMaster.user?.photoUrl ? (
              <img
                src={formMaster.formMaster.user.photoUrl.startsWith('data:') || formMaster.formMaster.user.photoUrl.startsWith('http') ? formMaster.formMaster.user.photoUrl : `${API_BASE_URL}${formMaster.formMaster.user.photoUrl}`}
                alt=""
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <span>{formMaster.formMaster.user.firstName?.[0]}{formMaster.formMaster.user.lastName?.[0]}</span>
            )}
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full mb-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Your Form Master</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {formMaster.formMaster.user.firstName} {formMaster.formMaster.user.lastName}
            </h2>
            <p className="text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-2 mt-1">
              <svg className="w-4 h-4 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Class {formMaster.class.name} {formMaster.class.arm}
            </p>
          </div>

          <div className="flex gap-3">
            {(formMaster.formMaster.user?.teacher?.publicPhone || formMaster.formMaster.user?.phone) && (
              <a 
                href={`tel:${formMaster.formMaster.user?.teacher?.publicPhone || formMaster.formMaster.user?.phone}`}
                className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-95 transition-all text-slate-600 hover:text-primary hover:border-primary/20"
                title="Call Form Master"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </a>
            )}
            {(formMaster.formMaster.user?.teacher?.publicWhatsapp || formMaster.formMaster.user?.teacher?.publicPhone || formMaster.formMaster.user?.phone) && (
              <a 
                href={`https://wa.me/${formMaster.formMaster.user?.teacher?.publicWhatsapp || formMaster.formMaster.user?.teacher?.publicPhone || formMaster.formMaster.user?.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-1 active:scale-95 transition-all text-white"
                title="WhatsApp Form Master"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.431 6.516a10.024 10.024 0 01-5.115-1.411l-.367-.218-3.801 1.002.112-3.8-.231-.368A9.994 9.994 0 012.83 10.155c0-5.518 4.482-10 10-10 5.518 0 10 4.482 10 10 0 5.519-4.482 10-10 10z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

      {/* New Message Button */}
      {!showThread && (
        <button
          onClick={() => setShowNewMessage(!showNewMessage)}
          className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:brightness-90 transition-colors font-semibold flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          {showNewMessage ? 'Cancel' : 'New Message'}
        </button>
      )}

      {/* New Message Form */}
      {showNewMessage && !showThread && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-gray-900 mb-4">Send New Message</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message Type</label>
              <select
                value={newMessageData.messageType}
                onChange={(e) => setNewMessageData({ ...newMessageData, messageType: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="general">General</option>
                <option value="complaint">Complaint</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value={newMessageData.subject}
                onChange={(e) => setNewMessageData({ ...newMessageData, subject: e.target.value })}
                placeholder="E.g., Regarding attendance"
                className="w-full border rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Message</label>
              <textarea
                value={newMessageData.message}
                onChange={(e) => setNewMessageData({ ...newMessageData, message: e.target.value })}
                rows="6"
                placeholder="Write your message here..."
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSendMessage}
                className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:brightness-90"
              >
                Send Message
              </button>
              <button
                onClick={() => {
                  setShowNewMessage(false);
                  setNewMessageData({ subject: '', message: '', messageType: 'general' });
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Thread View */}
      {showThread && (
        <div className="bg-white rounded-[24px] shadow-2xl overflow-hidden border border-gray-100 transition-all duration-500 animate-in slide-in-from-bottom-4">
          <div className="p-4 bg-white/80 backdrop-blur-md border-b sticky top-0 z-10 flex justify-between items-center px-4 sm:px-6">
            <button
              onClick={() => {
                setShowThread(false);
                setSelectedMessage(null);
                setThread([]);
                setReplyData({ message: '' });
              }}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-primary transition-all active:scale-90"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex-1 text-center truncate px-4">
              <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs sm:text-sm">{thread[0]?.subject}</h3>
            </div>
            <div className="w-10"></div> {/* Spacer for balance */}
          </div>

          <div className="p-4 sm:p-6 space-y-4 max-h-[500px] overflow-y-auto">
            {thread.map((msg, index) => (
              <div
                key={msg.id}
                className={`p-3 sm:p-4 rounded-lg ${msg.senderId === user.id
                  ? 'bg-primary/5 border-l-4 border-primary ml-4 sm:ml-8 text-right'
                  : 'bg-gray-50 border-l-4 border-gray-300 mr-4 sm:mr-8'
                  }`}
              >
                <div className={`flex items-start gap-2 sm:gap-3 ${msg.senderId === user.id ? 'flex-row-reverse' : ''}`}>
                  <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden shadow-sm ${msg.senderId === user.id ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {msg.sender?.photoUrl ? (
                      <img
                        src={msg.sender.photoUrl.startsWith('data:') || msg.sender.photoUrl.startsWith('http') ? msg.sender.photoUrl : `${API_BASE_URL}${msg.sender.photoUrl}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{msg.sender?.firstName?.[0]}{msg.sender?.lastName?.[0]}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className={msg.senderId === user.id ? 'text-right' : 'text-left'}>
                        <p className="font-semibold text-xs sm:text-sm text-gray-900">
                          {msg.senderId === user.id ? 'You' : `${msg.sender?.firstName} ${msg.sender?.lastName}`}
                          <span className="text-[10px] sm:text-xs text-gray-500 ml-1 sm:ml-2">({msg.sender?.role})</span>
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {new Date(msg.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                      {msg.messageType === 'complaint' && (
                        <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight">
                          Complaint
                        </span>
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm text-gray-700 whitespace-pre-wrap ${msg.senderId === user.id ? 'text-right' : 'text-left'}`}>{msg.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          <div className="p-4 border-t bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">Reply</label>
            <textarea
              value={replyData.message}
              onChange={(e) => setReplyData({ message: e.target.value })}
              rows="3"
              placeholder="Type your reply..."
              className="w-full border rounded-md px-3 py-2 mb-3"
            />
            <button
              onClick={handleSendReply}
              className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:brightness-90"
            >
              Send Reply
            </button>
          </div>
        </div>
      )}

      {/* Messages List */}
      {!showNewMessage && !showThread && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Message History</h3>
          </div>

          {messages.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>No messages yet. Start a conversation with the form master!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelectedMessage(msg);
                    fetchThread(msg.parentMessageId || msg.id);
                  }}
                  className={`p-4 sm:p-5 hover:bg-gray-50 cursor-pointer transition-all active:scale-[0.98] group relative ${!msg.isRead && msg.receiverId === user.id ? 'bg-primary/5' : ''}`}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-300"></div>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-bold text-sm sm:text-base text-gray-900 truncate max-w-[150px] sm:max-w-none">{msg.subject}</h4>
                        {!msg.isRead && msg.receiverId === user.id && (
                          <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-black uppercase tracking-widest">
                            NEW
                          </span>
                        )}
                        {msg.messageType === 'complaint' && (
                          <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold uppercase">
                            Complaint
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 font-medium">
                        {msg.senderId === user.id ? 'To' : 'From'}: {
                          msg.senderId === user.id
                            ? `${msg.receiver?.firstName} ${msg.receiver?.lastName}`
                            : `${msg.sender?.firstName} ${msg.sender?.lastName}`
                        }
                      </p>
                      <p className="text-[11px] sm:text-sm text-gray-500 mt-1 line-clamp-1 italic">{msg.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-2 sm:ml-4 flex-shrink-0">
                      <div className="text-[10px] text-gray-400 font-medium uppercase">
                        {new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                      {msg.senderId === user.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this message thread?')) {
                              handleDeleteMessage(msg.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                          title="Delete message thread"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParentMessages;
