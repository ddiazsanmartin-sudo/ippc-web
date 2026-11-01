import { describe, expect, it } from 'vitest';
import { formatCalendarDate, formatTime, splitByTime } from '@/lib/dates';
import { serializeJsonLd } from '@/lib/json-ld';
import { renderPlainText } from '@/lib/contact/mailer';

describe('serializeJsonLd', () => {
  it('impide cerrar la etiqueta <script> desde contenido del CMS', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>' });
  });

  it('escapa los separadores de línea Unicode U+2028 y U+2029', () => {
    const sep = String.fromCharCode(0x2028, 0x2029);
    const out = serializeJsonLd({ t: `a${sep}b` });
    expect(out).not.toContain(sep[0]);
    expect(out).not.toContain(sep[1]);
    expect(JSON.parse(out).t).toBe(`a${sep}b`);
  });
});

describe('fechas en hora de Chile', () => {
  it('muestra la hora local de Santiago aunque el build corra en UTC', () => {
    expect(formatTime(new Date('2026-11-01T14:00:00Z'))).toBe('11:00 hrs');
  });

  it('no "retrocede" un día las fechas sin hora', () => {
    expect(formatCalendarDate(new Date('2026-10-25'))).toBe('25 de octubre de 2026');
  });

  it('separa actividades próximas y pasadas, ordenadas, y oculta borradores', () => {
    const now = new Date('2026-11-05T12:00:00-03:00');
    const ev = (id: string, fecha: string, publicado = true) => ({ id, data: { fecha: new Date(fecha), publicado } });
    const { upcoming, past } = splitByTime(
      [
        ev('futura-2', '2026-12-20T11:00:00-03:00'),
        ev('pasada', '2026-11-01T11:00:00-03:00'),
        ev('futura-1', '2026-11-06T20:00:00-03:00'),
        ev('en-curso', '2026-11-05T11:00:00-03:00'),
        ev('borrador', '2026-11-10T11:00:00-03:00', false),
      ],
      now,
    );
    expect(upcoming.map((e) => e.id)).toEqual(['en-curso', 'futura-1', 'futura-2']);
    expect(past.map((e) => e.id)).toEqual(['pasada']);
  });
});

describe('renderPlainText', () => {
  it('genera texto plano con referencia y sin HTML', () => {
    const txt = renderPlainText(
      {
        nombre: 'Ana',
        email: 'ana@example.cl',
        asunto: 'general',
        mensaje: '<b>hola</b>',
        consentimiento: true,
        transcurrido: 5000,
        turnstileToken: 't',
      },
      'ref-123',
    );
    expect(txt).toContain('Referencia: ref-123');
    expect(txt).toContain('<b>hola</b>'); // se envía literal como texto, nunca se interpreta como HTML
    expect(txt).toContain('Teléfono: —');
  });
});
