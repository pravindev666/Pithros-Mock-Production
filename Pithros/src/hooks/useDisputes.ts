import { useState, useEffect, useCallback } from 'react';
import { AdminDispute } from '../types';
import { api } from '../services/api';

export const useDisputes = () => {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDisputes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getDisputes();
      setDisputes(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const submitDisputeClaim = useCallback(
    async (payload: Omit<AdminDispute, 'id' | 'status' | 'lastUpdated' | 'internalNotes'>) => {
      const created = await api.submitDisputeClaim(payload);
      await fetchDisputes();
      return created;
    },
    [fetchDisputes]
  );

  const addNote = useCallback(
    async (disputeId: string, author: string, text: string) => {
      await api.addDisputeNote(disputeId, author, text);
      await fetchDisputes();
    },
    [fetchDisputes]
  );

  const updateStatus = useCallback(
    async (disputeId: string, status: AdminDispute['status'], resolutionSummary?: string) => {
      const updated = await api.updateDisputeStatus(disputeId, status, resolutionSummary);
      await fetchDisputes();
      return updated;
    },
    [fetchDisputes]
  );

  return {
    disputes,
    isLoading,
    refetch: fetchDisputes,
    submitDisputeClaim,
    addNote,
    updateStatus,
  };
};
