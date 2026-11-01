import { registrationVerify } from '../../_lib/passkey-core.js';

export async function onRequestPost({ request, env }) {
  const session = request.headers.get('Cookie')
    ?.match(/(?:^|;\s*)form_app_session=([a-f0-9]{64})/)?.[1];
  if (!session) return Response.json({error:'Login required'},{status:401});
  const bytes = new TextEncoder().encode(session);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sessionId = Array.from(new Uint8Array(digest), b =>
    b.toString(16).padStart(2,'0')).join('');
  const record = await env.FORM_AUTH_SESSIONS?.get('session:'+sessionId,'json');
  if (!record || record.exp <= Date.now())
    return Response.json({error:'Login required'},{status:401});

  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Origin rejected' }, { status: 403 });
  }
  if (!env.FORM_PASSKEY_DB) {
    return Response.json({ error: 'Passkey database unavailable' }, { status: 503 });
  }
  try {
    const data = await request.json();
    return await registrationVerify(request, env.FORM_PASSKEY_DB, data, sessionId);
  } catch (error) {
    console.error('Passkey registration verification failed', error);
    return Response.json({ error: 'Unable to verify passkey registration' }, { status: 400 });
  }
}
