import { useCallback, useEffect, useRef, useState } from 'react';
import { api, messageFor } from './client.js';

export function useResource(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const load = useCallback(
    async (signal) => {
      const current = ++sequence.current;
      try {
        const result = await api(path, { signal });
        if (current === sequence.current && !signal?.aborted) {
          setData(result);
          setError('');
        }
      } catch (error) {
        if (current === sequence.current && !signal?.aborted)
          setError(messageFor(error));
      } finally {
        if (current === sequence.current && !signal?.aborted) setLoading(false);
      }
    },
    [path],
  );
  const refresh = useCallback(() => {
    setLoading(true);
    setError('');
    return load();
  }, [load]);
  useEffect(() => {
    const controller = new AbortController();
    // State updates in load happen only after the awaited network request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  return { data, loading, error, refresh, dismissError: () => setError('') };
}
