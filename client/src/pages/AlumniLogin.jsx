import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import useSchoolSettings from '../hooks/useSchoolSettings';

const AlumniLogin = () => {
  const { settings } = useSchoolSettings();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { schoolSlug } = useParams();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', {
        username: formData.username,
        password: formData.password,
        schoolSlug: schoolSlug || 'default'
      });

      if (response.ok) {
        const data = await response.json();

        // Store token
        localStorage.setItem('token', data.token);

        // Initialize auth
        await login(data.token);

        // Redirect to alumni dashboard
        navigate('/dashboard/alumni-dashboard');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and School Info */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-white rounded-full shadow-xl overflow-hidden flex items-center justify-center p-3">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-primary font-bold text-2xl">
                  {settings?.schoolName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AL'}
                </span>
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Alumni Portal</h1>
          <p className="text-white/80">{settings?.schoolName || 'School Management System'}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Alumni Login</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username or Admission Number
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Not an alumni yet?{' '}
              <a href="/alumni" className="text-primary font-semibold hover:underline">
                Visit Alumni Portal
              </a>
            </p>
            <p className="mt-2">
              <a href="/school-home" className="text-gray-500 hover:text-primary transition">
                ← Back to School Home
              </a>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-white/80 text-sm">
          <p>For assistance, contact the school administration</p>
        </div>
      </div>
    </div>
  );
};

export default AlumniLogin;
