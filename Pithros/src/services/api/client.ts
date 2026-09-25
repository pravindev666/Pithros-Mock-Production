/**
 * HTTP client for the Pithros API.
 *
 * Responsibilities:
 *  - attach the Firebase ID token (Firebase handles caching and refresh; we
 *    never mint our own JWTs)
 *  - retry once on 401 after forcing a token refresh, so an expired token is
 *    invisible to the user
 *  - map HTTP statuses onto distinct error classes so callers can react to
 *    "forbidden" and "session expired" differently
 */

import { auth } from '../../lib/firebase';
import { API_BASE_URL, API_PREFIX } from '../../lib/config';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'You need to sign in to continue.', details?: unknown) {
    super(401, 'unauthorized', message, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'You do not have permission to do that.', details?: unknown) {
    super(403, 'forbidden', message, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not found.', details?: unknown) {
    super(404, 'not_found', message, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'That action conflicts with the current state.', details?: unknown) {
    super(409, 'conflict', message, details);
    this.name = 'ConflictError';
  }
}

export class ValidationFailedError extends ApiError {
  constructor(message = 'Please check the details you entered.', details?: unknown) {
    super(422, 'validation_error', message, details);
    this.name = 'ValidationFailedError';
  }
}

export class RateLimitedError extends ApiError {
  constructor(message = 'Too many requests. Please try again shortly.', details?: unknown) {
    super(429, 'rate_limited', message, details);
    this.name = 'RateLimitedError';
  }
}

export class ServerError extends ApiError {
  constructor(status = 500, message = 'Something went wrong on our side.', details?: unknown) {
    super(status, 'server_error', message, details);
    this.name = 'ServerError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Could not reach Pithros. Check your connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** Raised for endpoints the backend has not implemented yet. */
export class FeatureNotAvailableError extends Error {
  constructor(feature: string) {
    super(`${feature} is not available yet.`);
    this.name = 'FeatureNotAvailableError';
  }
}

let sessionExpiredHandler: (() => void) | null = null;

export function onSessionExpired(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

function notifySessionExpired(): void {
  sessionExpiredHandler?.();
}

async function authorizationHeader(forceRefresh = false): Promise<Record<string, string>> {
  const currentUser = auth?.currentUser;
  if (!currentUser) return {};

  try {
    const token = await currentUser.getIdToken(forceRefresh);
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
  /** Skip the auth header entirely (public endpoints). */
  anonymous?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE_URL}${API_PREFIX}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function errorFromResponse(status: number, payload: unknown): ApiError {
  const envelope = (payload as { error?: { code?: string; message?: string; details?: unknown } })
    ?.error;
  const message = envelope?.message;
  const details = envelope?.details;
  const code = envelope?.code ?? `http_${status}`;

  switch (status) {
    case 401:
      return new UnauthorizedError(message || undefined, details);
    case 403:
      return new ForbiddenError(message || undefined, details);
    case 404:
      return new NotFoundError(message || undefined, details);
    case 409:
      return new ConflictError(message || undefined, details);
    case 422:
      return new ValidationFailedError(message || undefined, details);
    case 429:
      return new RateLimitedError(message || undefined, details);
    default:
      return new ServerError(status, message || undefined, details);
  }
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    return text || undefined;
  }
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, anonymous = false } = options;

  const send = async (forceRefresh: boolean): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (!anonymous) {
      Object.assign(headers, await authorizationHeader(forceRefresh));
    }

    try {
      return await fetch(buildUrl(path, query), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
        credentials: 'omit',
      });
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') throw error;
      throw new NetworkError();
    }
  };

  let response = await send(false);

  if (response.status === 401 && !anonymous) {
    // The token may simply have expired. One forced refresh, then give up.
    response = await send(true);
    if (response.status === 401) {
      notifySessionExpired();
    }
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    throw errorFromResponse(response.status, payload);
  }

  return payload as T;
}

export const http = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
