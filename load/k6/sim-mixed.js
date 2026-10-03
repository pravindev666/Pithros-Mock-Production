// Pithros production-simulation load profile (mixed).
//
//   k6 run --summary-export=reports/.../load-results.json load/k6/sim-mixed.js
//
// Target: the deployed stack through Caddy. Real Firebase auth in setup(); a real
// public memorial is created once and read by every VU. Not every VU behaves alike.

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://10.153.175.57';
const V1 = `${BASE}/api/v1`;
const API_KEY = __ENV.FIREBASE_API_KEY || 'AIzaSyCHLZnQqgalKjzioZs682ozMSoX6XuW5ds';

export const options = {
  scenarios: {
    stepped: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '60s', target: 25 },
        { duration: '60s', target: 50 },
        { duration: '60s', target: 100 },
        { duration: '60s', target: 200 },
        { duration: '30s', target: 0 },
      ],
      gracefulStop: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function setup() {
  const email = `k6.sim.${Date.now()}@gmail.com`;
  const signup = http.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    JSON.stringify({ email, password: `Sim!${Date.now()}aA1`, returnSecureToken: true }),
    { headers: JSON_HEADERS },
  );
  const token = signup.json('idToken');
  if (!token) {
    throw new Error(`setup signup failed: ${signup.status}`);
  }
  const auth = { ...JSON_HEADERS, Authorization: `Bearer ${token}` };

  const mem = http.post(`${V1}/memorials`, JSON.stringify({ fullName: 'K6 Load Subject' }), {
    headers: auth,
  });
  const id = mem.json('id');
  const slug = mem.json('slug');

  const before = http.get(`${V1}/memorials/${id}`, { headers: auth });
  http.patch(`${V1}/memorials/${id}`, JSON.stringify({ privacy: 'public' }), {
    headers: { ...auth, 'If-Match': String(before.json('version')) },
  });
  const after = http.get(`${V1}/memorials/${id}`, { headers: auth });
  http.post(
    `${V1}/memorials/${id}/publication`,
    JSON.stringify({ publicationState: 'published' }),
    { headers: { ...auth, 'If-Match': String(after.json('version')) } },
  );

  return { token, id, slug };
}

export default function (data) {
  const auth = { Authorization: `Bearer ${data.token}` };
  const r = Math.random();
  let res;

  if (r < 0.40) {
    res = http.get(`${V1}/public/memorials/${data.slug}`, { tags: { name: 'public_memorial' } });
  } else if (r < 0.60) {
    res = http.get(`${V1}/public/search?q=load`, {
      tags: { name: 'public_search' },
      responseCallback: http.expectedStatuses(200, 429),
    });
  } else if (r < 0.90) {
    res = http.get(`${V1}/me`, { headers: auth, tags: { name: 'me' } });
  } else {
    res = http.get(`${V1}/memorials/${data.id}/media`, { headers: auth, tags: { name: 'media_list' } });
  }

  check(res, { ok: (x) => x.status >= 200 && x.status < 400 });
  sleep(Math.random() * 1.5 + 0.5);
}
