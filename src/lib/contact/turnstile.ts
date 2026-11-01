/** Verificación server-side de Cloudflare Turnstile (https://developers.cloudflare.com/turnstile/). */

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Claves secretas de prueba oficiales de Cloudflare (siempre aprueban / fallan / token usado).
 * Con ellas siteverify responde hostname y acción ficticios, por lo que no se pueden exigir.
 */
export const isTurnstileTestSecret = (secret: string) => /^[123]x0{31}AA$/.test(secret);

export interface TurnstileOptions {
  secret: string;
  token: string;
  remoteIp?: string | undefined;
  /** Si se indica, se exige que el desafío se haya resuelto en este hostname. */
  expectedHostname?: string | undefined;
  /** Acción declarada en el widget (data-action); evita reutilizar tokens de otros formularios. */
  expectedAction?: string | undefined;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

interface SiteverifyResponse {
  success: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
}

export type TurnstileResult = { ok: true } | { ok: false; reason: string };

export async function verifyTurnstile(opts: TurnstileOptions): Promise<TurnstileResult> {
  const { secret, token, remoteIp, expectedHostname, expectedAction } = opts;
  const fetchFn = opts.fetchFn ?? fetch;

  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (remoteIp) body.append('remoteip', remoteIp);
  body.append('idempotency_key', crypto.randomUUID());

  let data: SiteverifyResponse;
  try {
    const res = await fetchFn(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 5_000),
    });
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    data = (await res.json()) as SiteverifyResponse;
  } catch {
    // Falla cerrada: si no podemos verificar, no aceptamos el envío.
    return { ok: false, reason: 'unreachable' };
  }

  if (!data.success) return { ok: false, reason: data['error-codes']?.join(',') || 'rejected' };
  if (expectedHostname && data.hostname !== expectedHostname) return { ok: false, reason: 'hostname-mismatch' };
  if (expectedAction && data.action !== expectedAction) return { ok: false, reason: 'action-mismatch' };
  return { ok: true };
}
