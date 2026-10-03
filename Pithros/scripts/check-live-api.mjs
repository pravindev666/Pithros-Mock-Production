// Guard against production-reachable demo/mock data.
//
// The live API client must never bind a method to the localStorage demo client,
// and the client-side MFA helper must not accept a hardcoded PIN in live mode.
// Run in CI: `npm run check:live`.
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);

function read(rel) {
  try {
    return readFileSync(new URL(rel, root), 'utf8');
  } catch {
    return null;
  }
}

function hasUnguardedMfaBypass(source) {
  const marker = "pin === '1234'";
  const idx = source.indexOf(marker);
  if (idx === -1) return false;
  const before = source.slice(Math.max(0, idx - 400), idx);
  return !before.includes('DEMO_MODE');
}

const violations = [];

const liveApi = read('src/services/api/index.ts');
if (liveApi && /demoApi\./.test(liveApi)) {
  violations.push('src/services/api/index.ts: the live API client binds a method to demoApi');
}

const auth = read('src/context/AuthContext.tsx');
if (auth && hasUnguardedMfaBypass(auth)) {
  violations.push(
    'src/context/AuthContext.tsx: the MFA helper accepts a hardcoded PIN without a DEMO_MODE guard',
  );
}

if (violations.length > 0) {
  console.error('Live-mode guard failed:\n' + violations.map((v) => ` - ${v}`).join('\n'));
  process.exit(1);
}

console.log('Live-mode guard OK: no production-reachable demo bindings.');
