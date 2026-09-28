import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api, hasToken, messageFor, setToken } from './client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(hasToken());
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const loadUser = useCallback(async (signal) => {
    if (!hasToken()) return;
    try {
      const result = await api('/auth/me', { signal });
      if (!signal?.aborted) setUser(result.user);
    } catch (error) {
      if (!signal?.aborted && error.status !== 401) setError(messageFor(error));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  function restore() {
    setLoading(true);
    setError('');
    return loadUser();
  }
  useEffect(() => {
    const controller = new AbortController();
    const onExpired = () => {
      setUser(null);
      setExpired(true);
      setError('');
    };
    window.addEventListener('fieldwork:expired', onExpired);
    // State updates in loadUser happen only after the awaited network request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUser(controller.signal);
    return () => {
      controller.abort();
      window.removeEventListener('fieldwork:expired', onExpired);
    };
  }, [loadUser]);
  async function signIn(email, password) {
    const result = await api('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setToken(result.token);
    setUser(result.user);
    setExpired(false);
  }
  function signOut() {
    setToken(null);
    setUser(null);
    setError('');
    setExpired(false);
  }
  return (
    <AuthContext.Provider
      value={{ user, loading, error, expired, restore, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
