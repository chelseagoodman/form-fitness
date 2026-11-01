
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const encoder = new TextEncoder();
const sha = async value => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(value)
  );
  return Array.from(new Uint8Array(digest), b =>
    b.toString(16).padStart(2, '0')
  ).join('');
};

class MockKV {
  constructor() {
    this.records = new Map();
  }

  async put(key, value) {
    this.records.set(key, JSON.parse(value));
  }

  async get(key) {
    const value = this.records.get(key);
    return value ? JSON.stringify(value) : null;
  }

  async delete(key) {
    this.records.delete(key);
  }
}

async function loadHandler(mockVerify) {
  const source = await readFile(
    'functions/api/passkeys/authenticate-verify.js',
    'utf8'
  );

  const modified = source.replace(
    /import\s*\{\s*authenticationVerify\s*\}\s*from\s*['"][^'"]+['"];?/,
    'const authenticationVerify = globalThis.__formTestVerify;'
  );

  assert.notEqual(
    modified,
    source,
    'Expected verification import was not found'
  );

  globalThis.__formTestVerify = mockVerify;

  return import(
    'data:text/javascript;base64,' +
    Buffer.from(modified).toString('base64') +
    '#' + Math.random()
  );
}

function makeRequest(origin = 'https://form-ai-v22-test.pages.dev') {
  return new Request(
    'https://form-ai-v22-test.pages.dev/api/passkeys/authenticate-verify',
    {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: 'test-token',
        credential: { id: 'test-credential' },
      }),
    }
  );
}

function makeEnvironment() {
  return {
    FORM_AUTH_SESSIONS: new MockKV(),
    FORM_PASSKEY_DB: {},
  };
}

test('Rejected verification cannot create a session', async () => {
  const { onRequestPost } = await loadHandler(
    async () => Response.json(
      { error: 'Invalid passkey' },
      { status: 401 }
    )
  );

  const env = makeEnvironment();
  const result = await onRequestPost({
    request: makeRequest(),
    env,
  });

  assert.equal(result.status, 401);
  assert.equal(env.FORM_AUTH_SESSIONS.records.size, 0);
  assert.equal(result.headers.get('Set-Cookie'), null);
});

test('Successful verification creates a secure session', async () => {
  const { onRequestPost } = await loadHandler(
    async () => Response.json({ ok: true })
  );

  const env = makeEnvironment();
  const result = await onRequestPost({
    request: makeRequest(),
    env,
  });

  assert.equal(result.status, 200);

  const cookie = result.headers.get('Set-Cookie');
  assert.ok(cookie);
  assert.match(cookie, /form_app_session=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.match(cookie, /Max-Age=2592000/);

  assert.equal(env.FORM_AUTH_SESSIONS.records.size, 1);

  const token = cookie.match(/form_app_session=([a-f0-9]+)/)?.[1];
  assert.ok(token);

  const record = env.FORM_AUTH_SESSIONS.records.get(
    'session:' + await sha(token)
  );

  assert.ok(record);
  assert.ok(record.exp > Date.now());
});

test('Requests from another origin are rejected', async () => {
  const { onRequestPost } = await loadHandler(
    async () => Response.json({ ok: true })
  );

  const env = makeEnvironment();

  const result = await onRequestPost({
    request: makeRequest('https://attacker.example'),
    env,
  });

  assert.equal(result.status, 403);
  assert.equal(env.FORM_AUTH_SESSIONS.records.size, 0);
});

test('Revoking a stored session removes its record', async () => {
  const kv = new MockKV();
  const token = 'a'.repeat(64);
  const key = 'session:' + await sha(token);

  await kv.put(key, JSON.stringify({
    exp: Date.now() + 60000,
  }));

  assert.ok(await kv.get(key));

  await kv.delete(key);

  assert.equal(await kv.get(key), null);
});
