/**
 * Real System Health & Readiness API client.
 * Probes the authoritative FastAPI /health (liveness) and /ready (dependencies) endpoints.
 */

import { http } from './client';

export interface HealthResponse {
  status: string;
  environment: string;
}

export interface ReadinessResponse {
  status: 'ready' | 'degraded';
  checks: {
    database: boolean;
    redis: boolean;
    storage: boolean;
  };
}

export interface SystemHealthProbe {
  health: HealthResponse;
  readiness: ReadinessResponse;
  latencyMs: number;
  timestamp: string;
}

export const systemApi = {
  getHealth: async (): Promise<HealthResponse> => {
    return http.get<HealthResponse>('/health', { anonymous: true });
  },

  getReadiness: async (): Promise<ReadinessResponse> => {
    try {
      return await http.get<ReadinessResponse>('/ready', { anonymous: true });
    } catch (err: unknown) {
      const errorObj = err as { status?: number; details?: unknown };
      if (errorObj?.status === 503 && errorObj?.details) {
        return errorObj.details as ReadinessResponse;
      }
      return {
        status: 'degraded',
        checks: { database: false, redis: false, storage: false },
      };
    }
  },

  probeAll: async (): Promise<SystemHealthProbe> => {
    const start = performance.now();
    const [health, readiness] = await Promise.all([
      systemApi.getHealth().catch(() => ({ status: 'unreachable', environment: 'unknown' })),
      systemApi.getReadiness(),
    ]);
    const latencyMs = Math.max(1, Math.round(performance.now() - start));

    return {
      health,
      readiness,
      latencyMs,
      timestamp: new Date().toISOString(),
    };
  },
};
