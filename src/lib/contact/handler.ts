/**
 * Lógica HTTP del formulario de contacto, independiente de Astro/Cloudflare para poder probarla
 * con `Request` estándar (ver tests/contact-handler.test.ts).
 *
 * Capas de defensa, en orden:
 *  1. Método, tipo de contenido y tamaño máximo del cuerpo.
 *  2. Mismo origen (anti-CSRF; complementa `security.checkOrigin` de Astro).
 *  3. Validación estricta del esquema + honeypot + tiempo de llenado.
 *  4. Cloudflare Turnstile verificado en el servidor (falla cerrada).
 *  5. (Fuera del código) Regla de rate limiting en el WAF de Cloudflare para /api/contacto.
 *
 * Nunca se registran datos personales: solo un id de solicitud y el tipo de error.
 */
import type { Mailer } from './mailer';
import { parseContact } from './schema';
import type { TurnstileResult } from './turnstile';

export const MAX_BODY_BYTES = 16 * 1024;

export interface ContactDeps {
  verifyTurnstile: (token: string, remoteIp: string | undefined) => Promise<TurnstileResult>;
  mailer: Mailer;
  log?: (msg: string) => void;
  requestId?: () => string;
}

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
} as const;

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS, ...extra },
  });
}

/** Responde JSON a clientes con JS y redirige (PRG) a formularios HTML sin JS. */
function reply(request: Request, status: number, body: { ok: boolean; error?: string; fieldErrors?: Record<string, string> }): Response {
  const wantsJson = request.headers.get('accept')?.includes('application/json');
  if (wantsJson) return json(status, body);
  const target = new URL('/visitanos', request.url);
  target.searchParams.set('contacto', body.ok ? 'enviado' : 'error');
  target.hash = 'contacto';
  return new Response(null, { status: 303, headers: { Location: target.toString(), ...SECURITY_HEADERS } });
}

async function readBody(request: Request): Promise<unknown> {
  const type = request.headers.get('content-type') ?? '';
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new RangeError('too-large');
  if (type.startsWith('application/json')) return JSON.parse(text);
  const params = new URLSearchParams(text);
  const data: Record<string, string> = {};
  for (const [k, v] of params) data[k === 'cf-turnstile-response' ? 'turnstileToken' : k] = v;
  return data;
}

export async function handleContactRequest(request: Request, deps: ContactDeps): Promise<Response> {
  const log = deps.log ?? console.warn;
  const requestId = (deps.requestId ?? (() => crypto.randomUUID()))();
  try {
    return await processContact(request, deps, log, requestId);
  } catch (err) {
    // Último recurso: nunca una respuesta vacía ni un stack trace hacia el cliente.
    log(`[contacto] ref=${requestId} error=inesperado ${(err as Error).name}`);
    return json(500, { ok: false, error: 'Ocurrió un error inesperado. Inténtalo más tarde o escríbenos por correo.' });
  }
}

async function processContact(request: Request, deps: ContactDeps, log: (msg: string) => void, requestId: string): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Método no permitido' }, { Allow: 'POST' });

  const type = request.headers.get('content-type') ?? '';
  if (!type.startsWith('application/json') && !type.startsWith('application/x-www-form-urlencoded'))
    return json(415, { ok: false, error: 'Tipo de contenido no soportado' });

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return json(413, { ok: false, error: 'Mensaje demasiado grande' });

  const origin = request.headers.get('origin');
  if (origin !== null && origin !== new URL(request.url).origin) {
    log(`[contacto] ref=${requestId} rechazado=origen-cruzado`);
    return json(403, { ok: false, error: 'Origen no permitido' });
  }

  let payload: unknown;
  try {
    payload = await readBody(request);
  } catch (err) {
    if (err instanceof RangeError) return json(413, { ok: false, error: 'Mensaje demasiado grande' });
    return reply(request, 400, { ok: false, error: 'Formulario ilegible' });
  }

  const parsed = parseContact(payload);
  if (!parsed.ok) {
    if (parsed.reason === 'bot') {
      log(`[contacto] ref=${requestId} rechazado=trampa-antibot`);
      // Respuesta genérica: no revelamos al bot qué trampa activó.
      return reply(request, 400, { ok: false, error: 'No pudimos procesar el formulario' });
    }
    return reply(request, 400, {
      ok: false,
      error: 'Revisa los campos marcados',
      fieldErrors: parsed.fieldErrors,
    });
  }

  const ip = request.headers.get('cf-connecting-ip') ?? undefined;
  const captcha = await deps.verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!captcha.ok) {
    log(`[contacto] ref=${requestId} rechazado=turnstile motivo=${captcha.reason}`);
    return reply(request, 403, {
      ok: false,
      error: 'No pudimos verificar que eres una persona. Recarga la página e inténtalo nuevamente.',
    });
  }

  try {
    await deps.mailer.send(parsed.data, requestId);
  } catch (err) {
    log(`[contacto] ref=${requestId} error=envio ${(err as Error).message}`);
    return reply(request, 502, {
      ok: false,
      error: 'No pudimos enviar tu mensaje. Escríbenos directamente por correo, por favor.',
    });
  }

  return reply(request, 200, { ok: true });
}
