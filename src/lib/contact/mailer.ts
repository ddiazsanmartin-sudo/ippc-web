import { ASUNTOS, type ContactMessage } from './schema';

export interface Mailer {
  send(message: ContactMessage, requestId: string): Promise<void>;
}

/** Cuerpo en texto plano: nunca se interpola HTML con datos del usuario. */
export function renderPlainText(m: ContactMessage, requestId: string): string {
  return [
    `Nuevo mensaje desde el sitio web (${ASUNTOS[m.asunto]})`,
    '',
    `Nombre:   ${m.nombre}`,
    `Correo:   ${m.email}`,
    `Teléfono: ${m.telefono ?? '—'}`,
    '',
    m.mensaje,
    '',
    '—',
    `Referencia: ${requestId}`,
    'La persona aceptó la política de privacidad del sitio al enviar este formulario.',
  ].join('\n');
}

/** Envío vía API HTTP de Resend (https://resend.com/docs/api-reference/emails/send-email). */
export function createResendMailer(opts: { apiKey: string; to: string; from: string; fetchFn?: typeof fetch }): Mailer {
  const fetchFn = opts.fetchFn ?? fetch;
  return {
    async send(m, requestId) {
      const res = await fetchFn('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': requestId,
        },
        body: JSON.stringify({
          from: opts.from,
          to: [opts.to],
          reply_to: m.email,
          subject: `[Web IPPC] ${ASUNTOS[m.asunto]} — ${m.nombre}`,
          text: renderPlainText(m, requestId),
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) throw new Error(`Resend respondió ${res.status}`);
    },
  };
}

/** Solo desarrollo: registra el envío SIN datos personales. */
export function createLogMailer(log: (msg: string) => void = console.info): Mailer {
  return {
    async send(m, requestId) {
      log(`[contacto] (modo desarrollo, no se envió correo) ref=${requestId} asunto=${m.asunto} largo=${m.mensaje.length}`);
    },
  };
}
