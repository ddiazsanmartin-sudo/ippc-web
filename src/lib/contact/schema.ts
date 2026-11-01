import { z } from 'astro/zod';

/**
 * Tiempo mínimo (ms) que el formulario estuvo abierto antes de enviarse. Los bots suelen enviarlo al instante.
 * Lo mide el navegador con `performance.now()` (cronómetro monotónico): no depende de que el reloj del
 * visitante coincida con el del servidor (un celular desfasado 30 s no debe ser tratado como bot).
 */
export const MIN_FILL_TIME_MS = 3_000;
/** Un formulario abierto por más de esto se considera vencido (evita reutilizar envíos capturados). */
export const MAX_FORM_AGE_MS = 2 * 60 * 60 * 1_000;

export const ASUNTOS = {
  visita: 'Quiero visitar la iglesia',
  oracion: 'Petición de oración',
  consejeria: 'Conversar con un pastor',
  general: 'Consulta general',
} as const satisfies Record<string, string>;

const ASUNTO_KEYS = Object.keys(ASUNTOS) as [keyof typeof ASUNTOS, ...(keyof typeof ASUNTOS)[]];

/**
 * Elimina caracteres de control (salvo salto de línea y tabulación) y normaliza saltos de línea.
 * Evita inyección de cabeceras en el correo y caracteres invisibles en el texto.
 */
export function sanitizeText(value: string): string {
  return (
    value
      .replace(/\r\n?/g, '\n')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028-\u202E\u2066-\u2069]/g, '')
      .trim()
  );
}

/** Igual que sanitizeText pero además colapsa saltos de línea: para campos de una sola línea. */
function singleLine(value: string): string {
  return sanitizeText(value).replace(/\s+/g, ' ');
}

const line = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} es obligatorio` })
    .transform(singleLine)
    .pipe(
      z
        .string()
        .min(min, { error: `${label} es demasiado corto` })
        .max(max, { error: `${label} es demasiado largo` }),
    );

export const contactSchema = z
  .object({
    nombre: line(2, 80, 'El nombre'),
    email: z
      .string({ error: 'El correo es obligatorio' })
      .transform(singleLine)
      .pipe(z.email({ error: 'Ingresa un correo válido' }).max(120)),
    telefono: z
      .string()
      .optional()
      .transform((v) => (v ? singleLine(v) : undefined))
      .pipe(
        z
          .string()
          .regex(/^\+?[\d\s()-]{8,20}$/, { error: 'Ingresa un teléfono válido' })
          .optional(),
      ),
    asunto: z.enum(ASUNTO_KEYS, { error: 'Selecciona un asunto' }),
    mensaje: z
      .string({ error: 'El mensaje es obligatorio' })
      .transform(sanitizeText)
      .pipe(
        z
          .string()
          .min(10, { error: 'Cuéntanos un poco más (mínimo 10 caracteres)' })
          .max(2000, { error: 'El mensaje no puede superar 2.000 caracteres' }),
      ),
    consentimiento: z.literal(true, { error: 'Debes aceptar la política de privacidad' }),
    /** Campo trampa ("honeypot"): oculto para personas, los bots lo rellenan. */
    sitio_web: z.string().max(0).optional(),
    /** Momento (epoch ms) en que se mostró el formulario. */
    /** Milisegundos que el formulario estuvo abierto (ver MIN_FILL_TIME_MS). */
    transcurrido: z.coerce.number({ error: 'Formulario incompleto: recarga la página' }).int().nonnegative(),
    turnstileToken: z.string({ error: 'Falta la verificación anti-spam' }).min(1).max(2048),
  })
  .strict();

export type ContactInput = z.input<typeof contactSchema>;
export type ContactMessage = z.output<typeof contactSchema>;

export type ParseResult =
  { ok: true; data: ContactMessage } | { ok: false; reason: 'invalid'; fieldErrors: Record<string, string> } | { ok: false; reason: 'bot' };

/** Valida el payload y aplica las trampas anti-bot (honeypot + tiempo de llenado). */
export function parseContact(input: unknown): ParseResult {
  // Normaliza el checkbox de formularios HTML ("on") a booleano.
  const raw = input && typeof input === 'object' ? { ...(input as Record<string, unknown>) } : input;
  if (raw && typeof raw === 'object' && 'consentimiento' in raw) {
    const c = (raw as Record<string, unknown>).consentimiento;
    (raw as Record<string, unknown>).consentimiento = c === true || c === 'on' || c === 'true';
  }

  const result = contactSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? 'formulario');
      if (key === 'sitio_web') return { ok: false, reason: 'bot' };
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, reason: 'invalid', fieldErrors };
  }

  const elapsed = result.data.transcurrido;
  if (elapsed < MIN_FILL_TIME_MS || elapsed > MAX_FORM_AGE_MS) return { ok: false, reason: 'bot' };

  return { ok: true, data: result.data };
}
