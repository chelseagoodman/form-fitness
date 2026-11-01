import { listPasskeys } from '../../_lib/passkey-core.js';

export async function onRequestGet({ request, env }) {
  if (!env.FORM_PASSKEY_DB) {
    return Response.json({ error: 'Passkey database unavailable' }, { status: 503 });
  }
  try {
    return await listPasskeys(env.FORM_PASSKEY_DB);
  } catch (error) {
    console.error('Passkey listing failed', error);
    return Response.json({ error: 'Unable to list passkeys' }, { status: 500 });
  }
}
