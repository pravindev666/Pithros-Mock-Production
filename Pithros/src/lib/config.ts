/**
 * Runtime configuration.
 *
 * DEMO_MODE is explicit and opt-in. Outside development it must be set to
 * 'false'; the app never silently falls back to fake data in production.
 */

const rawDemoFlag = import.meta.env.VITE_DEMO_MODE;

export const DEMO_MODE: boolean = rawDemoFlag === 'true';

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:8000';

export const API_PREFIX = '/api/v1';

if (import.meta.env.PROD && DEMO_MODE) {
  // Loud on purpose: shipping a production build in demo mode would serve fake
  // memorials to real families.
  // eslint-disable-next-line no-console
  console.error(
    '[Pithros] DEMO_MODE is enabled in a production build. Set VITE_DEMO_MODE=false.',
  );
}
