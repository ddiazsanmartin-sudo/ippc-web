import type { CollectionEntry } from 'astro:content';

/** Caracteres que no pueden aparecer literales dentro de un <script> HTML. */
const UNSAFE_IN_SCRIPT = new RegExp(`[<>&${String.fromCharCode(0x2028, 0x2029)}]`, 'g');

/**
 * Serializa JSON-LD de forma segura para incrustarlo en <script type="application/ld+json">.
 * Escapar `<`, `>` y `&` impide que un texto del CMS como "</script><script>…" cierre la etiqueta.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(UNSAFE_IN_SCRIPT, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

const DAY_CODES: Record<string, string> = {
  Lunes: 'Monday',
  Martes: 'Tuesday',
  Miércoles: 'Wednesday',
  Jueves: 'Thursday',
  Viernes: 'Friday',
  Sábado: 'Saturday',
  Domingo: 'Sunday',
};

/** Datos estructurados schema.org/Church para buscadores (Google, mapas, asistentes de voz). */
export function churchJsonLd(sitio: CollectionEntry<'sitio'>['data'], siteUrl: URL) {
  const sameAs = Object.values(sitio.redes).filter((u): u is string => !!u && new URL(u).pathname.length > 1);
  return {
    '@context': 'https://schema.org',
    '@type': 'Church',
    '@id': new URL('/#iglesia', siteUrl).href,
    name: sitio.nombre.replace(/[«»]/g, ''),
    alternateName: sitio.nombre_corto,
    description: sitio.descripcion,
    url: siteUrl.href,
    logo: new URL('/icon-512.png', siteUrl).href,
    email: sitio.contacto.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: sitio.direccion.calle,
      addressLocality: sitio.direccion.comuna,
      addressRegion: sitio.direccion.region,
      addressCountry: 'CL',
    },
    geo: { '@type': 'GeoCoordinates', latitude: sitio.direccion.lat, longitude: sitio.direccion.lng },
    openingHoursSpecification: sitio.horarios.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      name: h.nombre,
      dayOfWeek: `https://schema.org/${DAY_CODES[h.dia]}`,
      opens: h.hora,
    })),
    ...(sameAs.length ? { sameAs } : {}),
  };
}
