import { useState, useEffect, useCallback } from 'react';
import { Memorial } from '../types';
import { api } from '../services/api';
import { useObservability } from './useObservability';

export const useMemorials = () => {
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { trackApiLatency, trackError } = useObservability();

  const fetchMemorials = useCallback(async () => {
    const start = performance.now();
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getMemorials();
      setMemorials(data);
      trackApiLatency('/api/memorials', performance.now() - start, 200);
    } catch (err: any) {
      setError(err);
      trackError('FetchMemorialsError', err);
    } finally {
      setIsLoading(false);
    }
  }, [trackApiLatency, trackError]);

  useEffect(() => {
    fetchMemorials();
  }, [fetchMemorials]);

  const createMemorial = useCallback(
    async (payload: Partial<Memorial>) => {
      try {
        const created = await api.createMemorial(payload);
        await fetchMemorials();
        return created;
      } catch (err: any) {
        trackError('CreateMemorialError', err);
        throw err;
      }
    },
    [fetchMemorials, trackError]
  );

  return {
    memorials,
    isLoading,
    error,
    refetch: fetchMemorials,
    createMemorial,
  };
};
