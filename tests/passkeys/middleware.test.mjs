import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const source = await readFile('functions/_middleware.js', 'utf8');
const moduleURL = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const { onRequest } = await import(moduleURL);
const origin = 'https://form-ai-v22-test.pages.dev';
const kv = new Map();
const env = {
  FORM_AUTH_SESSIONS: {
    async get(key) { return kv.has(key) ? JSON.parse(kv.get(key)) : null; },
    async put(key, value) { kv.set(key, value); },
    async delete(key) { kv.delete(key); }
  },
  FORM_AI: { async fetch() { return Response.json({ok: true}); } },
  FORM_AI_SERVICE_SECRET: 'local-only-placeholder-not-a-real-secret-123456789'
};
let nextCalls = 0;
async function request(path, { method = 'GET', cookie = '', originHeader = null, body = null } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (originHeader) headers.Origin = originHeader;
  if (body) headers['Content-Type'] = 'application/json';
  const req = new Request(origin + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return onRequest({ request: req, env, next: async () => { nextCalls++; return Response.json({passed: true}); } });
}
const authRoutes = ['/api/passkeys/authenticate-options', '/api/passkeys/authenticate-verify'];
const protectedRoutes = ['/api/passkeys/register-options', '/api/passkeys/register-verify', '/api/passkeys/list', '/api/passkeys/revoke'];
for (const path of protectedRoutes) {
  const r = await request(path, {method: path.endsWith('/list') ? 'GET' : 'POST', originHeader: origin});
  assert.equal(r.status, 401, `${path} must reject unauthenticated access`);
}
for (const path of authRoutes) {
  const r = await request(path, {method:'POST', originHeader:'https://attacker.example'});
  assert.equal(r.status, 403, `${path} must reject foreign origins`);
  const get = await request(path);
  assert.equal(get.status, 405, `${path} must reject GET`);
  const valid = await request(path, {method:'POST', originHeader:origin});
  assert.equal(valid.status, 200, `${path} should reach its handler`);
}
const privatePage = await request('/');
assert.equal(privatePage.status, 303, 'private page must redirect without session');
assert.equal(privatePage.headers.get('Location'), '/form-login');
const login = await request('/form-login');
assert.equal(login.status, 200);
assert.match(await login.text(), /form-login/);
const count = nextCalls;
assert.equal(count, 2, 'only the two explicitly public routes should have reached downstream');
console.log('PASS: unauthenticated registration/management blocked');
console.log('PASS: public passkey routes restricted by method and origin');
console.log('PASS: private page redirected to login');
console.log('PASS: login page remains accessible');
console.log('NOTE: these are middleware routing tests, not end-to-end WebAuthn tests.');
