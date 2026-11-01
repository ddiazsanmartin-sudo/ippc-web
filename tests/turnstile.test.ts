import { describe, expect, it, vi } from 'vitest';
import { isTurnstileTestSecret, TURNSTILE_VERIFY_URL, verifyTurnstile } from '@/lib/contact/turnstile';

describe('isTurnstileTestSecret', () => {
  it('reconoce solo las claves de prueba oficiales', () => {
    // Valores literales publicados por Cloudflare (los mismos de .env.example).
    expect(isTurnstileTestSecret('1x0000000000000000000000000000000AA')).toBe(true);
    expect(isTurnstileTestSecret('2x0000000000000000000000000000000AA')).toBe(true);
    expect(isTurnstileTestSecret('0x4AAAAAAAreal-secret-key')).toBe(false);
  });
});

const respond = (data: unknown, status = 200) => vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(data), { status }));

describe('verifyTurnstile', () => {
  it('aprueba un token válido y envía secreto, token e IP', async () => {
    const fetchFn = respond({ success: true, hostname: 'www.pactodecristo.cl', action: 'contacto' });
    const r = await verifyTurnstile({ secret: 's', token: 't', remoteIp: '203.0.113.9', fetchFn, expectedAction: 'contacto' });
    expect(r).toEqual({ ok: true });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe(TURNSTILE_VERIFY_URL);
    const sent = init!.body as FormData;
    expect(sent.get('secret')).toBe('s');
    expect(sent.get('response')).toBe('t');
    expect(sent.get('remoteip')).toBe('203.0.113.9');
  });

  it('rechaza cuando Cloudflare responde success=false', async () => {
    const r = await verifyTurnstile({
      secret: 's',
      token: 't',
      fetchFn: respond({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    });
    expect(r).toEqual({ ok: false, reason: 'timeout-or-duplicate' });
  });

  it('rechaza tokens resueltos en otro dominio', async () => {
    const r = await verifyTurnstile({
      secret: 's',
      token: 't',
      expectedHostname: 'www.pactodecristo.cl',
      fetchFn: respond({ success: true, hostname: 'sitio-clonado.example' }),
    });
    expect(r).toEqual({ ok: false, reason: 'hostname-mismatch' });
  });

  it('rechaza tokens emitidos para otra acción', async () => {
    const r = await verifyTurnstile({
      secret: 's',
      token: 't',
      expectedAction: 'contacto',
      fetchFn: respond({ success: true, action: 'login' }),
    });
    expect(r).toEqual({ ok: false, reason: 'action-mismatch' });
  });

  it('falla cerrado si Cloudflare no responde', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('network down'));
    expect(await verifyTurnstile({ secret: 's', token: 't', fetchFn })).toEqual({ ok: false, reason: 'unreachable' });
  });

  it('falla cerrado ante errores HTTP', async () => {
    expect(await verifyTurnstile({ secret: 's', token: 't', fetchFn: respond({}, 500) })).toEqual({ ok: false, reason: 'http-500' });
  });
});
