import { describe, expect, it } from 'vitest';
import { MAX_FORM_AGE_MS, MIN_FILL_TIME_MS, parseContact, sanitizeText } from '@/lib/contact/schema';

const valid = (overrides: Record<string, unknown> = {}) => ({
  nombre: 'María González',
  email: 'maria@example.cl',
  asunto: 'visita',
  mensaje: 'Hola, quisiera visitar la iglesia este domingo con mi familia.',
  consentimiento: true,
  sitio_web: '',
  transcurrido: 20_000,
  turnstileToken: 'token-de-prueba',
  ...overrides,
});

describe('parseContact', () => {
  it('acepta un mensaje válido y normaliza espacios', () => {
    const r = parseContact(valid({ nombre: '  María   González ' }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.nombre).toBe('María González');
  });

  it('acepta el checkbox de formularios HTML ("on")', () => {
    expect(parseContact(valid({ consentimiento: 'on' })).ok).toBe(true);
  });

  it('exige consentimiento explícito', () => {
    const r = parseContact(valid({ consentimiento: false }));
    expect(r).toMatchObject({ ok: false, reason: 'invalid' });
    if (!r.ok && r.reason === 'invalid') expect(r.fieldErrors.consentimiento).toBeDefined();
  });

  it('rechaza correos inválidos con un mensaje por campo', () => {
    const r = parseContact(valid({ email: 'no-es-un-correo' }));
    expect(r).toMatchObject({ ok: false, reason: 'invalid', fieldErrors: { email: 'Ingresa un correo válido' } });
  });

  it('rechaza asuntos fuera de la lista', () => {
    expect(parseContact(valid({ asunto: 'spam' }))).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('limita el largo del mensaje', () => {
    expect(parseContact(valid({ mensaje: 'a'.repeat(2001) }))).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('rechaza campos desconocidos (esquema estricto)', () => {
    expect(parseContact(valid({ admin: true }))).toMatchObject({ ok: false });
  });

  it('detecta bots que rellenan el campo trampa', () => {
    expect(parseContact(valid({ sitio_web: 'https://spam.example' }))).toEqual({ ok: false, reason: 'bot' });
  });

  it('detecta envíos demasiado rápidos', () => {
    expect(parseContact(valid({ transcurrido: MIN_FILL_TIME_MS - 1 }))).toEqual({ ok: false, reason: 'bot' });
  });

  it('rechaza formularios vencidos', () => {
    expect(parseContact(valid({ transcurrido: MAX_FORM_AGE_MS + 1 }))).toEqual({ ok: false, reason: 'bot' });
  });

  it('rechaza entradas que no son objetos', () => {
    expect(parseContact('hola')).toMatchObject({ ok: false });
    expect(parseContact(null)).toMatchObject({ ok: false });
  });
});

describe('sanitizeText', () => {
  const ch = (...codes: number[]) => String.fromCharCode(...codes);

  it('elimina caracteres de control y de dirección (bidi) invisibles', () => {
    const dirty = `Hola${ch(0x00)}${ch(0x07)} mundo${ch(0x202e)}${ch(0x200b)}`;
    expect(sanitizeText(dirty)).toBe('Hola mundo');
  });

  it('normaliza saltos de línea CRLF y conserva los párrafos', () => {
    expect(sanitizeText('uno\r\ndos\r\rtres')).toBe('uno\ndos\n\ntres');
  });

  it('impide inyectar cabeceras de correo en campos de una línea', () => {
    const r = parseContact(valid({ nombre: 'Ana\r\nBcc: victima@example.com' }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.nombre).not.toMatch(/[\r\n]/);
  });
});
