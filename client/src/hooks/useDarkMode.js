import { useState, useEffect } from 'react';

const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const item = window.localStorage.getItem('theme');
      return item ? item === 'dark' : false; // Default to light mode (false) since we are implementing a fresh light mode
    } catch (error) {
      console.warn('Error reading localStorage for theme:', error);
      return false;
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      try {
        window.localStorage.setItem('theme', 'dark');
      } catch (e) {}
    } else {
      root.classList.remove('dark');
      try {
        window.localStorage.setItem('theme', 'light');
      } catch (e) {}
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  return [isDarkMode, toggleDarkMode];
};

export default useDarkMode;
