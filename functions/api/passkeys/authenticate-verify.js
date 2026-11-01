// FORM v3.8.2 development branch only. Never deploy without middleware routing tests.
import { authenticationVerify } from '../../_lib/passkey-core.js';

const encoder = new TextEncoder();
const EXPIRY_SECONDS = 30 * 24 * 60 * 60;
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const hash = async value => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
const error = (message, status) => Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (request.headers.get('Origin') !== url.origin) return error('Origin rejected', 403);
  if (!env.FORM_PASSKEY_DB || !env.FORM_AUTH_SESSIONS) return error('Authentication storage unavailable', 503);
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return error('JSON required', 415);
  try {
    const raw = await request.text();
    if (raw.length > 200000) return error('Request too large', 413);
    const data = JSON.parse(raw);
    // This function validates the challenge, signature, RP ID, origin, user verification,
    // and credential counter BEFORE we issue a session.
    const result = await authenticationVerify(request, env.FORM_PASSKEY_DB, data);
    if (!result.ok) return result;
    const body = await result.json();
    if (body?.ok !== true) return error('Passkey verification failed', 401);
    const token = hex(crypto.getRandomValues(new Uint8Array(32)));
    const exp = Date.now() + EXPIRY_SECONDS * 1000;
    await env.FORM_AUTH_SESSIONS.put('session:' + await hash(token), JSON.stringify({ exp }), { expirationTtl: EXPIRY_SECONDS });
    return Response.json({ ok: true }, { headers: {
      'Set-Cookie': `form_app_session=${token}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${EXPIRY_SECONDS}`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }});
  } catch (e) {
    console.error('Passkey login failed', e);
    return error('Passkey authentication failed', 401);
  }
}
