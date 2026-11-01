/**
 * Única ruta dinámica del sitio. Se ejecuta como Cloudflare Worker; todo lo demás es HTML estático.
 * Este archivo solo conecta dependencias: la lógica vive en src/lib/contact (con tests).
 */
import type { APIRoute } from 'astro';
import { CONTACT_DELIVERY, CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL, RESEND_API_KEY, TURNSTILE_SECRET_KEY } from 'astro:env/server';
import { handleContactRequest } from '@/lib/contact/handler';
import { createLogMailer, createResendMailer, type Mailer } from '@/lib/contact/mailer';
import { isTurnstileTestSecret, verifyTurnstile } from '@/lib/contact/turnstile';

export const prerender = false;

/** `log` solo existe para desarrollo local; en producción (valor por defecto) se exige Resend. */
function buildMailer(): Mailer | null {
  if (CONTACT_DELIVERY === 'log') return createLogMailer();
  if (RESEND_API_KEY && CONTACT_TO_EMAIL && CONTACT_FROM_EMAIL) {
    return createResendMailer({ apiKey: RESEND_API_KEY, to: CONTACT_TO_EMAIL, from: CONTACT_FROM_EMAIL });
  }
  return null;
}

export const POST: APIRoute = ({ request }) => {
  const mailer = buildMailer();
  if (!mailer) {
    // Falla cerrada pero con una respuesta bien formada para la interfaz.
    console.error('[contacto] configuración incompleta: faltan RESEND_API_KEY, CONTACT_TO_EMAIL o CONTACT_FROM_EMAIL');
    return Response.json(
      { ok: false, error: 'El formulario no está disponible en este momento. Escríbenos directamente por correo.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // Con claves reales se exige que el desafío se haya resuelto en nuestro dominio y para este formulario.
  // Las claves de prueba de Cloudflare devuelven valores ficticios para ambos campos.
  const strict = !isTurnstileTestSecret(TURNSTILE_SECRET_KEY);

  return handleContactRequest(request, {
    mailer,
    verifyTurnstile: (token, remoteIp) =>
      verifyTurnstile({
        secret: TURNSTILE_SECRET_KEY,
        token,
        remoteIp,
        expectedAction: strict ? 'contacto' : undefined,
        expectedHostname: strict ? new URL(request.url).hostname : undefined,
      }),
  });
};

export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } });
