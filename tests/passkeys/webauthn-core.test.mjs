
import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

import {
  registrationOptions,
  registrationVerify,
  authenticationOptions,
  authenticationVerify,
} from '../../functions/_lib/passkey-core.js';

// Simulated D1 database for isolated security tests.
class MockD1 {
  constructor() {
    this.challenges = new Map();
    this.credentials = new Map();
  }

  prepare(sql) {
    const db = this;
    const params = [];

    return {
      bind(...values) {
        params.push(...values);
        return this;
      },

      async run() {
        if (sql.startsWith('INSERT INTO passkey_challenges')) {
          const [hash, challenge, purpose, user, expiry] = params;
          db.challenges.set(hash, {
            challenge,
            purpose,
            user_id: user,
            expires_at: expiry,
          });
          return { success: true };
        }

        return { success: true, meta: { changes: 0 } };
      },

      async first() {
        if (sql.startsWith('DELETE FROM passkey_challenges')) {
          const [hash, purpose] = params;
          const row = db.challenges.get(hash);
          if (!row || row.purpose !== purpose) return null;
          db.challenges.delete(hash);
          return row;
        }

        if (sql.startsWith('SELECT * FROM passkey_credentials')) {
          return db.credentials.get(params[0]) ?? null;
        }

        return null;
      },

      async all() {
        return { results: [] };
      },
    };
  }
}

const request = (path = '/api/passkeys/register-options') =>
  new Request('https://form-ai-v22-test.pages.dev' + path);

test('Registration produces a challenge and token', async () => {
  const db = new MockD1();
  const response = await registrationOptions(request(), db);
  assert.equal(response.status, 200);

  const data = await response.json();
  assert.ok(data.options.challenge);
  assert.ok(data.token);
  assert.equal(db.challenges.size, 1);
});

test('Registration challenge cannot be reused', async () => {
  const db = new MockD1();
  const response = await registrationOptions(request(), db);
  const { token } = await response.json();

  const attempt = () =>
    registrationVerify(request(), db, {
      token,
      credential: { id: 'invalid-test-credential' },
    });

  await assert.rejects(attempt);
  const replay = await attempt();

  assert.equal(replay.status, 409);
  assert.equal(db.challenges.size, 0);
});

test('Expired registration challenge is rejected', async () => {
  const db = new MockD1();
  const response = await registrationOptions(request(), db);
  const { token } = await response.json();

  for (const row of db.challenges.values()) {
    row.expires_at = Date.now() - 1000;
  }

  const result = await registrationVerify(request(), db, {
    token,
    credential: { id: 'invalid-test-credential' },
  });

  assert.equal(result.status, 409);
});

test('Unknown passkey cannot authenticate', async () => {
  const db = new MockD1();
  const response = await authenticationOptions(
    request('/api/passkeys/authenticate-options'),
    db
  );
  const { token } = await response.json();

  const result = await authenticationVerify(
    request('/api/passkeys/authenticate-verify'),
    db,
    {
      token,
      credential: { id: 'unknown-passkey' },
    }
  );

  assert.equal(result.status, 401);
});

test('HTTPS is required', async () => {
  const db = new MockD1();

  await assert.rejects(
    registrationOptions(
      new Request('http://example.com/api/passkeys/register-options'),
      db
    ),
    /HTTPS required/
  );
});
