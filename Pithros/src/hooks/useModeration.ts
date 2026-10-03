import { useState, useEffect, useCallback } from 'react';
import { AdminReport } from '../types';
import { api } from '../services/api';

export const useModeration = () => {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUnavailable, setIsUnavailable] = useState<boolean>(false);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getReports();
      setReports(data);
      setIsUnavailable(false);
    } catch {
      // The moderation backend is not built yet. Never show invented reports;
      // surface an honest "unavailable" state instead.
      setReports([]);
      setIsUnavailable(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const submitReport = useCallback(
    async (report: Omit<AdminReport, 'id' | 'createdAt' | 'status'>) => {
      const created = await api.submitReport(report);
      await fetchReports();
      return created;
    },
    [fetchReports]
  );

  const updateReportStatus = useCallback(
    async (reportId: string, status: AdminReport['status'], actionTaken?: string) => {
      const updated = await api.updateReportStatus(reportId, status, actionTaken);
      await fetchReports();
      return updated;
    },
    [fetchReports]
  );

  return {
    reports,
    isLoading,
    isUnavailable,
    refetch: fetchReports,
    submitReport,
    updateReportStatus,
  };
};
