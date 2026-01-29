import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const DemoRedirect = () => {
  const { demoLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const performDemoLogin = async () => {
      try {
        const result = await demoLogin();
        if (result.success) {
          toast.success('Welcome to the Demo Dashboard!');
          navigate('/dashboard', { replace: true });
        } else {
          setError('Demo login failed. Please try again later.');
          toast.error('Demo currently unavailable');
          // Optional: redirect back to login after a delay
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (err) {
        console.error('Demo login error:', err);
        setError('Connection error. Please check your internet.');
      }
    };

    performDemoLogin();
  }, [demoLogin, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        {error ? (
          <div className="text-red-500 font-bold animate-pulse">
            {error}
          </div>
        ) : (
          <>
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-2xl font-black text-gray-900">Setting up Demo Environment...</h2>
            <p className="text-gray-500">Please wait while we log you in securely.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default DemoRedirect;
