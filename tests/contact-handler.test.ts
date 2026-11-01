import { describe, expect, it, vi } from 'vitest';
import { handleContactRequest, MAX_BODY_BYTES, type ContactDeps } from '@/lib/contact/handler';
import type { Mailer } from '@/lib/contact/mailer';

const ORIGIN = 'https://www.pactodecristo.cl';

const body = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    nombre: 'Juan Pérez',
    email: 'juan@example.cl',
    asunto: 'oracion',
    mensaje: 'Les pido oración por la salud de mi madre. Gracias.',
    consentimiento: true,
    sitio_web: '',
    transcurrido: 30_000,
    turnstileToken: 'ok',
    ...overrides,
  });

const request = (init: { body?: string; headers?: Record<string, string>; method?: string } = {}) =>
  new Request(`${ORIGIN}/api/contacto`, {
    method: init.method ?? 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', origin: ORIGIN, ...init.headers },
    ...(init.method === 'GET' ? {} : { body: init.body ?? body() }),
  });

function setup(overrides: Partial<ContactDeps> = {}) {
  const send = vi.fn<Mailer['send']>().mockResolvedValue(undefined);
  const deps: ContactDeps = {
    mailer: { send },
    verifyTurnstile: vi.fn().mockResolvedValue({ ok: true }),
    log: vi.fn(),
    requestId: () => 'req-1',
    ...overrides,
  };
  return { deps, send };
}

describe('handleContactRequest', () => {
  it('envía el correo y responde 200 con un mensaje válido', async () => {
    const { deps, send } = setup();
    const res = await handleContactRequest(request(), deps);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(send).toHaveBeenCalledOnce();
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('rechaza métodos distintos de POST', async () => {
    const res = await handleContactRequest(request({ method: 'GET' }), setup().deps);
    expect(res.status).toBe(405);
  });

  it('rechaza tipos de contenido no soportados', async () => {
    const res = await handleContactRequest(request({ headers: { 'content-type': 'text/plain' } }), setup().deps);
    expect(res.status).toBe(415);
  });

  it('rechaza cuerpos demasiado grandes', async () => {
    const big = body({ mensaje: 'x'.repeat(MAX_BODY_BYTES) });
    const res = await handleContactRequest(request({ body: big }), setup().deps);
    expect(res.status).toBe(413);
  });

  it('bloquea peticiones de otro origen (CSRF)', async () => {
    const { deps, send } = setup();
    const res = await handleContactRequest(request({ headers: { origin: 'https://sitio-malicioso.example' } }), deps);
    expect(res.status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it('devuelve errores por campo cuando la validación falla', async () => {
    const res = await handleContactRequest(request({ body: body({ email: 'malo' }) }), setup().deps);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { fieldErrors: Record<string, string> };
    expect(json.fieldErrors.email).toBeDefined();
  });

  it('no revela qué trampa anti-bot se activó', async () => {
    const res = await handleContactRequest(request({ body: body({ sitio_web: 'bot' }) }), setup().deps);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'No pudimos procesar el formulario' });
  });

  it('rechaza si Turnstile no verifica y no envía correo', async () => {
    const { deps, send } = setup({ verifyTurnstile: vi.fn().mockResolvedValue({ ok: false, reason: 'invalid-input-response' }) });
    const res = await handleContactRequest(request(), deps);
    expect(res.status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it('pasa la IP real del visitante (cf-connecting-ip) a Turnstile', async () => {
    const verifyTurnstile = vi.fn().mockResolvedValue({ ok: true });
    await handleContactRequest(request({ headers: { 'cf-connecting-ip': '203.0.113.9' } }), setup({ verifyTurnstile }).deps);
    expect(verifyTurnstile).toHaveBeenCalledWith('ok', '203.0.113.9');
  });

  it('responde 502 si el proveedor de correo falla, sin filtrar el error', async () => {
    const send = vi.fn<Mailer['send']>().mockRejectedValue(new Error('timeout interno del proveedor'));
    const res = await handleContactRequest(request(), setup({ mailer: { send } }).deps);
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('timeout interno');
  });

  it('ante un error inesperado responde 500 en JSON (nunca vacío ni con detalles internos)', async () => {
    const verifyTurnstile = vi.fn().mockRejectedValue(new Error('detalle interno secreto'));
    const res = await handleContactRequest(request(), setup({ verifyTurnstile }).deps);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toMatchObject({ ok: false });
    expect(JSON.stringify(json)).not.toContain('detalle interno');
  });

  it('nunca registra datos personales en los logs', async () => {
    const log = vi.fn();
    await handleContactRequest(request({ body: body({ sitio_web: 'bot' }) }), setup({ log }).deps);
    const logged = log.mock.calls.flat().join(' ');
    expect(logged).not.toContain('juan@example.cl');
    expect(logged).not.toContain('Juan');
  });

  it('acepta formularios HTML sin JavaScript y redirige (PRG)', async () => {
    const form = new URLSearchParams({
      nombre: 'Juan Pérez',
      email: 'juan@example.cl',
      asunto: 'general',
      mensaje: 'Mensaje enviado sin JavaScript.',
      consentimiento: 'on',
      transcurrido: '30000',
      'cf-turnstile-response': 'ok',
    });
    const res = await handleContactRequest(
      request({ body: form.toString(), headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'text/html' } }),
      setup().deps,
    );
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(`${ORIGIN}/visitanos?contacto=enviado#contacto`);
  });
});
