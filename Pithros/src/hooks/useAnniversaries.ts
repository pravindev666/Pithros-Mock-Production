import { useState, useEffect, useCallback } from 'react';
import { AnniversaryNotificationConfig } from '../types';
import { api } from '../services/api';

export const useAnniversaries = (memorialId: string) => {
  const [settings, setSettings] = useState<AnniversaryNotificationConfig | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUnavailable, setIsUnavailable] = useState<boolean>(false);

  const fetchSettings = useCallback(async () => {
    if (!memorialId) return;
    try {
      const data = await api.getAnniversarySettings(memorialId);
      setSettings(data);
      setIsUnavailable(false);
    } catch {
      // Anniversary reminders are not persisted server-side yet. Never pretend
      // a reminder was saved on the server when it was not.
      setSettings(null);
      setIsUnavailable(true);
    }
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
      } catch {
        setIsUnavailable(true);
        return null;
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
    isUnavailable,
    updateSettings,
    toggleOptOut,
  };
};
