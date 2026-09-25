import { useCallback } from 'react';

export interface ObservabilityEvent {
  id: string;
  type: 'page_load' | 'api_latency' | 'error' | 'upload_failure' | 'tribute_failure' | 'verification_error' | 'security_access';
  name: string;
  durationMs?: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

const eventLog: ObservabilityEvent[] = [];

export const useObservability = () => {
  const trackEvent = useCallback((type: ObservabilityEvent['type'], name: string, metadata?: Record<string, any>, durationMs?: number) => {
    const entry: ObservabilityEvent = {
      id: `obs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      name,
      durationMs,
      metadata,
      timestamp: new Date().toISOString(),
    };
    eventLog.unshift(entry);
    if (eventLog.length > 200) eventLog.pop();

    // Dev logging in console without spamming
    if (process.env.NODE_ENV !== 'production' && type !== 'api_latency') {
      // Quiet observability beacon
      // console.debug(`[Pithros Telemetry] ${type}: ${name}`, metadata);
    }
  }, []);

  const trackPageLoad = useCallback((path: string, durationMs: number) => {
    trackEvent('page_load', `Route: ${path}`, { path }, durationMs);
  }, [trackEvent]);

  const trackApiLatency = useCallback((endpoint: string, durationMs: number, status: number = 200) => {
    trackEvent('api_latency', endpoint, { endpoint, status }, durationMs);
  }, [trackEvent]);

  const trackError = useCallback((errorName: string, errorObj: any) => {
    trackEvent('error', errorName, {
      message: errorObj?.message || String(errorObj),
      stack: errorObj?.stack,
    });
  }, [trackEvent]);

  const trackUploadFailure = useCallback((fileName: string, reason: string) => {
    trackEvent('upload_failure', `Upload failed: ${fileName}`, { fileName, reason });
  }, [trackEvent]);

  const trackTributeSubmissionFailure = useCallback((memorialId: string, reason: string) => {
    trackEvent('tribute_failure', `Tribute submission failed for ${memorialId}`, { memorialId, reason });
  }, [trackEvent]);

  const trackVerificationFlowError = useCallback((memorialId: string, step: string, error: string) => {
    trackEvent('verification_error', `Verification step error: ${step}`, { memorialId, step, error });
  }, [trackEvent]);

  const getRecentEvents = useCallback(() => {
    return [...eventLog];
  }, []);

  return {
    trackEvent,
    trackPageLoad,
    trackApiLatency,
    trackError,
    trackUploadFailure,
    trackTributeSubmissionFailure,
    trackVerificationFlowError,
    getRecentEvents,
  };
};
