/**
 * The single data-access seam for the whole app.
 *
 * `DEMO_MODE` picks between two implementations that share one interface:
 *
 *   - `demoApi`  — the original browser-only implementation, kept verbatim for
 *                  development and previews.
 *   - `liveApi`  — real HTTP against the FastAPI backend.
 *
 * The exhaustive key check below is the important part: if the live client is
 * missing any method the demo client has, `tsc --noEmit` fails. That is how
 * "the frontend was fully wired" is verified mechanically rather than by
 * inspection.
 */

import { DEMO_MODE } from '../lib/config';
import { demoApi } from './demo/demoApi';
import { liveApi } from './api/index';
import type * as liveModule from './api/index';

/** Every method the application expects, derived from the demo implementation. */
export type ApiClient = typeof demoApi;

type LiveClient = typeof liveModule.liveApi;

/**
 * Compile-time proof that the live client implements the whole interface.
 *
 * `keyof ApiClient` must be assignable to `keyof LiveClient` and vice versa — a
 * missing method (or a stray extra one) is a type error here.
 */
type MissingFromLive = Exclude<keyof ApiClient, keyof LiveClient>;
type ExtraInLive = Exclude<keyof LiveClient, keyof ApiClient>;

type AssertNever<T extends never> = T;

export type _NoMethodsMissing = AssertNever<MissingFromLive>;
export type _NoUnexpectedMethods = AssertNever<ExtraInLive>;

export const api: ApiClient = DEMO_MODE ? demoApi : (liveApi as unknown as ApiClient);
