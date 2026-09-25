import { useState, useEffect, useCallback } from 'react';
import { Memorial, Tribute, RemembranceOffering, TimelineEvent, FamilyMember, MediaItem } from '../types';
import { api } from '../services/api';
import { useObservability } from './useObservability';

export const useMemorial = (slugOrId: string) => {
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { trackApiLatency, trackError, trackTributeSubmissionFailure } = useObservability();

  const fetchMemorial = useCallback(async () => {
    if (!slugOrId) return;
    const start = performance.now();
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getMemorialBySlug(slugOrId);
      setMemorial(data);
      trackApiLatency(`/api/memorials/${slugOrId}`, performance.now() - start, 200);
    } catch (err: any) {
      setError(err);
      trackError('FetchMemorialError', err);
    } finally {
      setIsLoading(false);
    }
  }, [slugOrId, trackApiLatency, trackError]);

  useEffect(() => {
    fetchMemorial();
  }, [fetchMemorial]);

  const updateStory = useCallback(
    async (story: Memorial['story']) => {
      if (!memorial) return;
      const updated = await api.updateMemorial(memorial.id, { story });
      if (updated) setMemorial(updated);
      return updated;
    },
    [memorial]
  );

  const updatePrivacy = useCallback(
    async (privacy: Memorial['privacy']) => {
      if (!memorial) return;
      const updated = await api.updateMemorial(memorial.id, { privacy });
      if (updated) setMemorial(updated);
      return updated;
    },
    [memorial]
  );

  const addTribute = useCallback(
    async (tribute: Omit<Tribute, 'id' | 'date' | 'isApproved'>) => {
      if (!memorial) return;
      try {
        const added = await api.addTribute(memorial.id, tribute);
        await fetchMemorial();
        return added;
      } catch (err: any) {
        trackTributeSubmissionFailure(memorial.id, err?.message || 'Submission error');
        throw err;
      }
    },
    [memorial, fetchMemorial, trackTributeSubmissionFailure]
  );

  const addOffering = useCallback(
    async (offering: Omit<RemembranceOffering, 'id' | 'timestamp'>) => {
      if (!memorial) return;
      const added = await api.addOffering(memorial.id, offering);
      await fetchMemorial();
      return added;
    },
    [memorial, fetchMemorial]
  );

  const addTimelineEvent = useCallback(
    async (event: Omit<TimelineEvent, 'id'>) => {
      if (!memorial) return;
      const added = await api.addTimelineEvent(memorial.id, event);
      await fetchMemorial();
      return added;
    },
    [memorial, fetchMemorial]
  );

  const inviteFamily = useCallback(
    async (member: Omit<FamilyMember, 'id' | 'status'>) => {
      if (!memorial) return;
      const invited = await api.inviteFamilyMember(memorial.id, member);
      await fetchMemorial();
      return invited;
    },
    [memorial, fetchMemorial]
  );

  const addMedia = useCallback(
    async (media: Omit<MediaItem, 'id'>) => {
      if (!memorial) return;
      const added = await api.addMedia(memorial.id, media);
      await fetchMemorial();
      return added;
    },
    [memorial, fetchMemorial]
  );

  return {
    memorial,
    isLoading,
    error,
    refetch: fetchMemorial,
    updateStory,
    updatePrivacy,
    addTribute,
    addOffering,
    addTimelineEvent,
    inviteFamily,
    addMedia,
  };
};
