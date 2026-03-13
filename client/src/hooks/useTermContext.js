import { useState, useEffect } from 'react';
import { api } from '../api';

/**
 * Custom hook to fetch and provide current active term and academic session.
 * Used for filtering content contextually (Homework, Resources, CBT, Fees).
 */
const useTermContext = () => {
  const [currentTerm, setCurrentTerm] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchContext = async () => {
      try {
        const [sessionsRes, termsRes] = await Promise.all([
          api.get('/api/academic-sessions'),
          api.get('/api/terms')
        ]);

        if (isMounted) {
          if (sessionsRes.ok) {
            const sessions = await sessionsRes.json();
            setCurrentSession(sessions.find(s => s.isCurrent) || null);
          }

          if (termsRes.ok) {
            const terms = await termsRes.json();
            setCurrentTerm(terms.find(t => t.isCurrent) || null);
          }

          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching term context:', err);
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      }
    };

    fetchContext();

    return () => {
      isMounted = false;
    };
  }, []);

  return { currentTerm, currentSession, loading, error };
};

export default useTermContext;
