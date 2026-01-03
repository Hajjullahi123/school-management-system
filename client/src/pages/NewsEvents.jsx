import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSchoolSettings from '../hooks/useSchoolSettings';
import { API_BASE_URL } from '../api';

const NewsEvents = () => {
  const { settings } = useSchoolSettings();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'news', 'event'

  useEffect(() => {
    if (settings?.schoolId) {
      fetchNewsEvents(settings.schoolId);
    }
  }, [settings?.schoolId]);

  const fetchNewsEvents = async (schoolId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/news-events?school=${schoolId}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching news/events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = filter === 'all'
    ? items
    : items.filter(item => item.type === filter);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={() => navigate('/landing')}
            className="mb-4 flex items-center text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
          <h1 className="text-4xl font-bold mb-2">News & Events</h1>
          <p className="text-white/90">Stay updated with the latest happenings at {settings.schoolName}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-7xl mx-auto px-4 -mt-8">
        <div className="bg-white rounded-lg shadow-md p-2 inline-flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-md font-medium transition-all ${filter === 'all'
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('news')}
            className={`px-6 py-2 rounded-md font-medium transition-all ${filter === 'news'
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            News
          </button>
          <button
            onClick={() => setFilter('event')}
            className={`px-6 py-2 rounded-md font-medium transition-all ${filter === 'event'
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            Events
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No {filter === 'all' ? 'items' : filter} found</h3>
            <p className="text-gray-500">Check back later for updates!</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                {item.imageUrl && (
                  <img
                    src={`${API_BASE_URL}${item.imageUrl}`}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${item.type === 'news'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                      }`}>
                      {item.type === 'news' ? 'News' : 'Event'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(item.eventDate || item.createdAt)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {item.title}
                  </h3>
                  <div
                    className="text-gray-600 text-sm mb-4 line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      By {item.User.firstName} {item.User.lastName}
                    </span>
                    <button className="text-primary hover:text-primary/80 text-sm font-medium flex items-center">
                      Read more
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Call to Action */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Connected</h2>
          <p className="text-white/90 mb-6">Don't miss out on important updates and events</p>
          <button
            onClick={() => navigate('/landing')}
            className="bg-white text-primary px-8 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsEvents;
