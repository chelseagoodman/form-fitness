
import { registrationOptions } from '../../_lib/passkey-core.js';

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);

  if (request.headers.get('Origin') !== url.origin) {
    return Response.json(
      { error: 'Origin rejected' },
      { status: 403 }
    );
  }

  if (!env.FORM_PASSKEY_DB) {
    return Response.json(
      { error: 'Passkey database unavailable' },
      { status: 503 }
    );
  }

  try {
    return await registrationOptions(
      request,
      env.FORM_PASSKEY_DB
    );
  } catch (error) {
    console.error('Passkey registration options failed', error);
    return Response.json(
      { error: 'Unable to prepare passkey registration' },
      { status: 500 }
    );
  }
}
