/**
 * Puerta de acceso del BORRADOR (Cloudflare Worker «ippc-borrador»).
 *
 * Pide usuario y contraseña (HTTP Basic sobre HTTPS) y, si son correctos, reenvía la petición al sitio
 * (Worker «ippc-web») mediante un service binding. El sitio no tiene URL pública propia
 * (`workers_dev: false` en ../../wrangler.jsonc): solo se llega a él a través de esta puerta.
 *
 * Es una protección para revisar la maqueta con pocas personas, sin costo ni tarjeta. En producción se
 * elimina: el sitio se publica en su dominio y el panel queda detrás del login de GitHub.
 */
const encoder = new TextEncoder();

/** Comparación en tiempo constante (evita deducir la clave midiendo tiempos de respuesta). */
async function sameSecret(a, b) {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}

async function authorized(request, env) {
  const [scheme, encoded] = (request.headers.get('Authorization') ?? '').split(' ');
  if (scheme !== 'Basic' || !encoded || !env.BORRADOR_USUARIO || !env.BORRADOR_CLAVE) return false;
  try {
    return await sameSecret(atob(encoded), `${env.BORRADOR_USUARIO}:${env.BORRADOR_CLAVE}`);
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env) {
    if (!(await authorized(request, env))) {
      return new Response('Borrador privado: se requiere usuario y contraseña.', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Borrador IPPC", charset="UTF-8"',
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      });
    }

    // El sitio no necesita la credencial: se quita antes de reenviar.
    const headers = new Headers(request.headers);
    headers.delete('Authorization');
    const response = await env.SITIO.fetch(new Request(request, { headers }));

    const out = new Response(response.body, response);
    out.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return out;
  },
};
