import { authenticationOptions } from '../../_lib/passkey-core.js';

export async function onRequestPost({ request, env }) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'Origin rejected' }, { status: 403 });
  }
  if (!env.FORM_PASSKEY_DB) {
    return Response.json({ error: 'Passkey database unavailable' }, { status: 503 });
  }
  try {
    return await authenticationOptions(request, env.FORM_PASSKEY_DB);
  } catch (error) {
    console.error('Passkey authentication options failed', error);
    return Response.json({ error: 'Unable to prepare passkey authentication' }, { status: 500 });
  }
}
