// 5x spike: baseline 40 VUs -> 200 VUs -> back to 40, to observe saturation and recovery.
//   k6 run --summary-export=... load/k6/spike.js

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://10.153.175.57';
const V1 = `${BASE}/api/v1`;
const API_KEY = __ENV.FIREBASE_API_KEY || 'AIzaSyCHLZnQqgalKjzioZs682ozMSoX6XuW5ds';
const BASE_VUS = Number(__ENV.BASE_VUS || 40);
const SPIKE_VUS = Number(__ENV.SPIKE_VUS || 200);

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: BASE_VUS,
      stages: [
        { duration: '60s', target: BASE_VUS },   // baseline
        { duration: '15s', target: SPIKE_VUS },  // spike up (5x)
        { duration: '90s', target: SPIKE_VUS },  // hold
        { duration: '15s', target: BASE_VUS },   // spike down
        { duration: '60s', target: BASE_VUS },   // recovery
      ],
      gracefulStop: '15s',
    },
  },
  thresholds: { http_req_failed: ['rate<0.05'] },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function setup() {
  const email = `k6.spike.${Date.now()}@gmail.com`;
  const signup = http.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    JSON.stringify({ email, password: `Sim!${Date.now()}aA1`, returnSecureToken: true }),
    { headers: JSON_HEADERS },
  );
  const token = signup.json('idToken');
  const auth = { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
  const mem = http.post(`${V1}/memorials`, JSON.stringify({ fullName: 'K6 Spike Subject' }), { headers: auth });
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
