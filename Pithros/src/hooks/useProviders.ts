import { useState, useEffect, useCallback } from 'react';
import { ServiceProvider, ProviderLead } from '../types';
import { api } from '../services/api';

export const useProviders = () => {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [leads, setLeads] = useState<ProviderLead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProviders = useCallback(async () => {
    setIsLoading(true);
    try {
      const [p, l] = await Promise.all([api.getProviders(), api.getLeads()]);
      setProviders(p);
      setLeads(l);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const submitLead = useCallback(
    async (lead: Omit<ProviderLead, 'id' | 'status' | 'createdAt'>) => {
      const created = await api.createLead(lead);
      await fetchProviders();
      return created;
    },
    [fetchProviders]
  );

  return {
    providers,
    leads,
    isLoading,
    refetch: fetchProviders,
    submitLead,
  };
};
