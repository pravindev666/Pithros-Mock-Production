// Constant-load companion to sim-mixed.js — used to correlate VM resource use with a
// known concurrency level.   k6 run load/k6/capacity-100.js

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://10.153.175.57';
const V1 = `${BASE}/api/v1`;
const API_KEY = __ENV.FIREBASE_API_KEY;

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 100),
      duration: __ENV.DURATION || '90s',
    },
  },
  thresholds: { http_req_failed: ['rate<0.05'] },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function setup() {
  if (!API_KEY) {
    throw new Error('FIREBASE_API_KEY is required (public Firebase web key)');
  }
  const email = `k6.cap.${Date.now()}@gmail.com`;
  const signup = http.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    JSON.stringify({ email, password: `Sim!${Date.now()}aA1`, returnSecureToken: true }),
    { headers: JSON_HEADERS },
  );
  const token = signup.json('idToken');
  const auth = { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
  const mem = http.post(`${V1}/memorials`, JSON.stringify({ fullName: 'K6 Capacity Subject' }), { headers: auth });
  const id = mem.json('id');
  const slug = mem.json('slug');
  const before = http.get(`${V1}/memorials/${id}`, { headers: auth });
  http.patch(`${V1}/memorials/${id}`, JSON.stringify({ privacy: 'public' }), {
    headers: { ...auth, 'If-Match': String(before.json('version')) },
  });
  const after = http.get(`${V1}/memorials/${id}`, { headers: auth });
  http.post(`${V1}/memorials/${id}/publication`, JSON.stringify({ publicationState: 'published' }), {
    headers: { ...auth, 'If-Match': String(after.json('version')) },
  });
  return { token, id, slug };
}

export default function (data) {
  const auth = { Authorization: `Bearer ${data.token}` };
  const r = Math.random();
  if (r < 0.6) {
    http.get(`${V1}/public/memorials/${data.slug}`, { tags: { name: 'public_memorial' } });
  } else if (r < 0.9) {
    http.get(`${V1}/me`, { headers: auth, tags: { name: 'me' } });
  } else {
    http.get(`${V1}/memorials/${data.id}/media`, { headers: auth, tags: { name: 'media_list' } });
  }
  sleep(Math.random() * 1.0 + 0.5);
}
