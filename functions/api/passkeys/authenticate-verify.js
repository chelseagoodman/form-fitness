import { authenticationVerify } from '../../../src/passkey-core.js';

// Development-only handler. A successful response here does NOT create a FORM session.
// Do not deploy until the authentication middleware securely issues a session.
export async function onRequestPost({ request, env }) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Origin rejected' }, { status: 403 });
  }
  if (!env.FORM_PASSKEY_DB) {
    return Response.json({ error: 'Passkey database unavailable' }, { status: 503 });
  }
  try {
    const data = await request.json();
    return await authenticationVerify(request, env.FORM_PASSKEY_DB, data);
  } catch (error) {
    console.error('Passkey authentication verification failed', error);
    return Response.json({ error: 'Unable to verify passkey' }, { status: 401 });
  }
}
