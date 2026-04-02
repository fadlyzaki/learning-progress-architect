import { useEffect, useState } from 'react';
import { getAuthHeaders, clearStoredSession, getStoredSession } from '../lib/auth';
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
      const response = await fetch('/api/data', {
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (response.status === 401) {
        clearStoredSession();
        setData(null);
        setError('Your session has expired. Please sign in again.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load your learning data.');
      }

      const payload = (await response.json()) as AppDataPayload;
      setData(payload);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Failed to load your learning data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}
