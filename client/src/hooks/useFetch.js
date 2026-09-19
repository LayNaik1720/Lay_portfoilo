import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * Data fetching with loading/error state and abort-on-unmount.
 * `deps` controls refetching; pass `skip` to defer.
 */
export function useFetch(path, { deps = [], skip = false, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);
  const controllerRef = useRef(null);

  const run = useCallback(async () => {
    if (skip || !path) { setLoading(false); return; }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await api.get(path, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setData(res.data);
        setMeta(res.meta || null);
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError(err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, skip]);

  useEffect(() => {
    run();
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, skip, ...deps]);

  return { data, meta, loading, error, refetch: run, setData };
}

/** Debounce a rapidly-changing value (search inputs). */
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
