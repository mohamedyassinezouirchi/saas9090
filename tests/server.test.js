import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after, before } from 'node:test';

const port = 3400 + Math.floor(Math.random() * 300);
const dataDirectory = await mkdtemp(join(tmpdir(), 'ledgerlane-test-'));
const baseUrl = `http://127.0.0.1:${port}`;
let server;

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { const response = await fetch(`${baseUrl}/api/health`); if (response.ok) return; } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw lastError || new Error('Server did not start');
}
async function api(path, options = {}, cookie) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) } });
  return { response, body: await response.json() };
}

before(async () => {
  server = spawn(process.execPath, ['server.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), APP_URL: baseUrl, LEDGERLANE_DATA_DIR: dataDirectory, LEDGERLANE_SESSION_SECRET: 'test-session-secret-that-is-long-enough-for-safe-tests' }, stdio: 'ignore' });
  await waitForServer();
});
after(async () => { server.kill('SIGTERM'); await new Promise(resolve => server.once('exit', resolve)); await rm(dataDirectory, { recursive: true, force: true }); });

test('health and readiness endpoints report availability', async () => {
  const health = await api('/api/health'); const readiness = await api('/api/readiness');
  assert.equal(health.response.status, 200); assert.equal(health.body.status, 'ok');
  assert.equal(readiness.response.status, 200); assert.equal(readiness.body.status, 'ready');
});
test('sign-up creates an isolated workspace and secure session', async () => {
  const created = await api('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name: 'Ada Lovelace', organization: 'Analytical Engines', email: 'ada@example.test', password: 'correct-horse-battery-staple' }) });
  assert.equal(created.response.status, 201); assert.equal(created.body.redirect, '/app');
  const cookie = created.response.headers.get('set-cookie'); assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/);
  const me = await api('/api/me', {}, cookie); assert.equal(me.response.status, 200); assert.equal(me.body.user.email, 'ada@example.test');
  const workflow = await api('/api/workflows', { method: 'POST', body: JSON.stringify({ type: 'evidence' }) }, cookie); assert.equal(workflow.response.status, 201); assert.equal(workflow.body.workflow.type, 'evidence');
});
test('write routes reject cross-site requests and anonymous reads', async () => {
  const anonymous = await api('/api/dashboard'); assert.equal(anonymous.response.status, 401);
  const crossSite = await api('/api/leads', { method: 'POST', headers: { Origin: 'https://attacker.example' }, body: JSON.stringify({}) }); assert.equal(crossSite.response.status, 403);
});
test('lead intake validates requests and deduplicates email safely', async () => {
  const invalid = await api('/api/leads', { method: 'POST', body: JSON.stringify({ name: 'A' }) }); assert.equal(invalid.response.status, 400);
  const body = { name: 'Rina Morris', company: 'Northstar', email: 'rina@northstar.test', teamSize: '11–50', notes: 'We need a more reliable close.' };
  const first = await api('/api/leads', { method: 'POST', body: JSON.stringify(body) }); const second = await api('/api/leads', { method: 'POST', body: JSON.stringify(body) });
  assert.equal(first.response.status, 201); assert.equal(second.response.status, 201); assert.equal(first.body.message, second.body.message);
});
test('Lane intelligence returns a tenant-scoped, evidence-grounded brief', async () => {
  const demo = await api('/api/auth/demo', { method: 'POST', body: JSON.stringify({}) }); const cookie = demo.response.headers.get('set-cookie');
  const brief = await api('/api/intelligence/brief', { method: 'POST', body: JSON.stringify({ question: 'What is blocking the close?' }) }, cookie);
  assert.equal(brief.response.status, 200); assert.match(brief.body.answer, /open close items/); assert.ok(brief.body.sources.length > 0);
});
test('Lemon Squeezy billing routes keep checkout and webhooks protected', async () => {
  const account = await api('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name: 'Grace Hopper', organization: 'Compilers Inc', email: 'grace@example.test', password: 'another-strong-password' }) }); const cookie = account.response.headers.get('set-cookie');
  const billing = await api('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ plan: 'growth' }) }, cookie); assert.equal(billing.response.status, 503);
  const webhook = await api('/api/webhooks/lemonsqueezy', { method: 'POST', body: JSON.stringify({ meta: { event_name: 'subscription_created' } }) }); assert.equal(webhook.response.status, 400);
});
