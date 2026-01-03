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

        // Mark as read if current user is receiver
        const mainMsg = data[0];
        if (mainMsg.receiverId === user.id && !mainMsg.isRead) {
          await api.put(`/api/messages/${messageId}/read`);
          fetchUnreadCount();
          fetchMessages();
        }
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
      <div className="bg-gradient-to-r from-primary to-primary/90 p-6 rounded-lg text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Messages with Form Master</h1>
            <p className="text-white/90 mt-2">Communicate with your child's teacher</p>
          </div>
          {unreadCount > 0 && (
            <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold">
              {unreadCount} Unread
            </div>
          )}
        </div>
      </div>

      {/* Student Selector (only if multiple) */}
      {wards.length > 1 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Child</label>
          <select
            value={selectedStudent?.id || ''}
            onChange={(e) => {
              const student = wards.find(w => w.id === parseInt(e.target.value));
              setSelectedStudent(student);
              setShowNewMessage(false);
              setShowThread(false);
            }}
            className="w-full border border-gray-300 rounded-md px-4 py-2"
          >
            {wards.map(ward => (
              <option key={ward.id} value={ward.id}>
                {ward.user?.firstName} {ward.user?.lastName} - {ward.classModel?.name} {ward.classModel?.arm}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Form Master Info */}
      {formMaster && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div>
              <p className="font-semibold text-blue-900">
                Form Master: {formMaster.formMaster.user.firstName} {formMaster.formMaster.user.lastName}
              </p>
              <p className="text-sm text-blue-700">
                Class: {formMaster.class.name} {formMaster.class.arm}
              </p>
            </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                value={newMessageData.message}
                onChange={(e) => setNewMessageData({ ...newMessageData, message: e.target.value })}
                rows="6"
                placeholder="Write your message here..."
                className="w-full border rounded-md px-3 py-2"
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <button
              onClick={() => {
                setShowThread(false);
                setSelectedMessage(null);
                setThread([]);
                setReplyData({ message: '' });
              }}
              className="text-primary hover:text-primary/80 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Messages
            </button>
            <h3 className="font-semibold text-gray-900">{thread[0]?.subject}</h3>
          </div>

          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {thread.map((msg, index) => (
              <div
                key={msg.id}
                className={`p-4 rounded-lg ${msg.senderId === user.id
                  ? 'bg-primary/5 border-l-4 border-primary ml-8'
                  : 'bg-gray-50 border-l-4 border-gray-300 mr-8'
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {msg.senderId === user.id ? 'You' : `${msg.sender?.firstName} ${msg.sender?.lastName}`}
                      <span className="text-sm text-gray-500 ml-2">({msg.sender?.role})</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {msg.messageType === 'complaint' && (
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">
                      Complaint
                    </span>
                  )}
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{msg.message}</p>
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
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{msg.subject}</h4>
                        {!msg.isRead && msg.receiverId === user.id && (
                          <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-semibold">
                            NEW
                          </span>
                        )}
                        {msg.messageType === 'complaint' && (
                          <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-semibold">
                            Complaint
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {msg.senderId === user.id ? 'To' : 'From'}: {
                          msg.senderId === user.id
                            ? `${msg.receiver?.firstName} ${msg.receiver?.lastName}`
                            : `${msg.sender?.firstName} ${msg.sender?.lastName}`
                        }
                      </p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{msg.message}</p>
                    </div>
                    <div className="text-xs text-gray-500 ml-4">
                      {new Date(msg.createdAt).toLocaleDateString()}
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
