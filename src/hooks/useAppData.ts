import { useEffect, useState } from 'react';
import { getStoredSession } from '../lib/auth';
import { ApiError, apiFetch } from '../lib/api';
import type { AppDataPayload } from '../types';

const emptyData: AppDataPayload | null = null;

export function useAppData() {
  const [data, setData] = useState<AppDataPayload | null>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    const session = getStoredSession();
    if (!session) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = await apiFetch<AppDataPayload>('/api/data');
      setData(payload);
    } catch (fetchError) {
      console.error(fetchError);
      if (fetchError instanceof ApiError && fetchError.status === 401) {
        setData(null);
        setError('Your session has expired. Please sign in again.');
        return;
      }

      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load your learning data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}
