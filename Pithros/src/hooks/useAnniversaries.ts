import { useState, useEffect, useCallback } from 'react';
import { AnniversaryNotificationConfig } from '../types';
import { api } from '../services/api';

export const useAnniversaries = (memorialId: string) => {
  const [settings, setSettings] = useState<AnniversaryNotificationConfig | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchSettings = useCallback(async () => {
    if (!memorialId) return;
    const data = await api.getAnniversarySettings(memorialId);
    setSettings(data);
  }, [memorialId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (newSettings: Partial<AnniversaryNotificationConfig>) => {
      if (!settings || !memorialId) return;
      setIsSaving(true);
      try {
        const merged: AnniversaryNotificationConfig = {
          ...settings,
          ...newSettings,
          channels: {
            ...settings.channels,
            ...(newSettings.channels || {}),
          },
        };
        const saved = await api.saveAnniversarySettings(memorialId, merged);
        setSettings(saved);
        return saved;
      } finally {
        setIsSaving(false);
      }
    },
    [settings, memorialId]
  );

  const toggleOptOut = useCallback(async () => {
    if (!settings || !memorialId) return;
    return updateSettings({ isOptedOut: !settings.isOptedOut });
  }, [settings, memorialId, updateSettings]);

  return {
    settings,
    isSaving,
    updateSettings,
    toggleOptOut,
  };
};
