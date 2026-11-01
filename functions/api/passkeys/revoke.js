import { revokePasskey } from '../../_lib/passkey-core.js';

export async function onRequestPost({ request, env }) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Origin rejected' }, { status: 403 });
  }
  if (!env.FORM_PASSKEY_DB) {
    return Response.json({ error: 'Passkey database unavailable' }, { status: 503 });
  }
  try {
    const data = await request.json();
    return await revokePasskey(env.FORM_PASSKEY_DB, data?.id);
  } catch (error) {
    console.error('Passkey revocation failed', error);
    return Response.json({ error: 'Unable to revoke passkey' }, { status: 400 });
  }
}
