// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// Dominio definitivo pendiente: se sobreescribe con SITE_URL en CI/producción.
const site = process.env.SITE_URL ?? 'https://www.pactodecristo.cl';

/**
 * Orígenes externos permitidos por la política de seguridad de contenido (CSP).
 * Cada entrada existe por una razón concreta; agregar una nueva requiere justificarla
 * en docs/SEGURIDAD.md.
 */
const external = {
  turnstile: 'https://challenges.cloudflare.com', // anti-bots del formulario de contacto
  youtubeEmbed: 'https://www.youtube-nocookie.com', // reproductor de sermones (modo sin cookies, solo tras clic)
  map: 'https://www.openstreetmap.org', // mapa embebido (sin cookies de seguimiento)
};

export default defineConfig({
  site,
  trailingSlash: 'never',
  // Astro 7 usa 'jsx' por defecto (elimina espacios entre líneas); `true` compacta sin alterar el texto visible.
  compressHTML: true,
  output: 'static',
  adapter: cloudflare({
    // Las imágenes se optimizan en build (AVIF/WebP) y se sirven como estáticos desde el CDN.
    imageService: 'compile',
  }),
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/api/'),
    }),
  ],
  build: {
    format: 'file',
  },
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'EB Garamond',
      cssVariable: '--font-serif',
      weights: [400, 500, 600],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Open Sans',
      cssVariable: '--font-sans',
      weights: [400, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
  env: {
    schema: {
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public' }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret' }),
      // 'resend' (producción, por defecto) o 'log' (desarrollo: no envía correos).
      CONTACT_DELIVERY: envField.enum({ context: 'server', access: 'public', values: ['resend', 'log'], default: 'resend' }),
      CONTACT_TO_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
    validateSecrets: true,
  },
  security: {
    checkOrigin: true,
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        `connect-src 'self' ${external.turnstile}`,
        `frame-src ${external.youtubeEmbed} ${external.map} ${external.turnstile}`,
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "manifest-src 'self'",
      ],
      scriptDirective: { resources: ["'self'", external.turnstile] },
      styleDirective: { resources: ["'self'"] },
    },
  },
});
