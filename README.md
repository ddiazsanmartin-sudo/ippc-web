# Sitio web — Iglesia Presbiteriana «Pacto de Cristo»

Sitio institucional de la Iglesia Presbiteriana «Pacto de Cristo» (Alberto Llona 456, Maipú, Santiago de Chile),
con panel de administración para el community manager.

- **Público:** HTML 100 % estático servido desde el CDN de Cloudflare. Sin base de datos, sin PHP, sin servidor que parchar.
- **Única pieza dinámica:** `POST /api/contacto` (Cloudflare Worker) para el formulario de contacto.
- **Panel:** Sveltia CMS (SPA) que guarda el contenido como archivos YAML en el repositorio Git. Cada cambio es un commit
  validado por CI antes de publicarse.

> Estado: **Fase 0 — maqueta en revisión.** Dominio, organización de GitHub y redes sociales reales: *por definir*
> (ver [docs/ARQUITECTURA.md § Pendientes](docs/ARQUITECTURA.md#pendientes--decisiones-del-cliente)).

## Documentación

| Documento | Audiencia | Contenido |
| --- | --- | --- |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Ingeniería | Propuesta de infraestructura, decisiones (ADR), costos, despliegue por fases |
| [docs/SEGURIDAD.md](docs/SEGURIDAD.md) | Ingeniería | Modelo de amenazas STRIDE, controles implementados, verificación, checklist pre-producción |
| [docs/MANUAL-ADMINISTRADOR.md](docs/MANUAL-ADMINISTRADOR.md) | Community manager | Uso del panel paso a paso |
| [SECURITY.md](SECURITY.md) | Público | Política de divulgación responsable |

## Stack

| Pieza | Versión | Rol |
| --- | --- | --- |
| Node.js | 24 LTS («Krypton», ver `.nvmrc`) | Runtime de build (Astro 7 exige ≥ 22.23.4) |
| Astro | 7.4.2 | Generador de sitio estático, CSP por hashes, optimización de imágenes, API de fuentes |
| @astrojs/cloudflare | 14.4.2 | Adaptador: estáticos + Worker para `/api/contacto` |
| Wrangler / workerd | 4.x | Vista previa local en el mismo runtime de producción, despliegue |
| Sveltia CMS | 0.252.0 | Panel de administración Git-based (compatible con la configuración de Decap CMS) |
| TypeScript | 6.0.3 | `astro/tsconfigs/strictest` (TS 7 aún no es compatible con `astro check` ni `typescript-eslint`) |
| Zod | 4 (vía `astro/zod`) | Esquemas del contenido y del formulario |
| Vitest | 5 | Tests unitarios de la lógica de seguridad |
| ESLint | 10 + `typescript-eslint` + `eslint-plugin-astro` + `jsx-a11y` | Calidad y accesibilidad |
| Prettier | 3 + `prettier-plugin-astro` | Formato |

Las versiones quedan fijadas de forma exacta (`.npmrc`: `save-exact=true`, `engine-strict=true`) y por `package-lock.json`.

## Requisitos

- Node.js 24 LTS y npm 11 (`node --version` → `v24.x`).
- Para el panel en modo local: Chrome o Edge (usa la *File System Access API*) y el proyecto como **repositorio Git
  inicializado**; Sveltia lo exige para trabajar sobre los archivos locales. Un `git clone` de este repositorio ya lo cumple.

## Puesta en marcha

```bash
npm ci                     # instala exactamente lo del lockfile
cp .env.example .env       # claves de PRUEBA de Turnstile y CONTACT_DELIVERY=log
npm run dev                # http://localhost:4321
```

Panel de administración en local:

1. Con `npm run dev` corriendo, abrir **http://localhost:4321/admin/index.html** en Chrome o Edge
   (en desarrollo hay que incluir `index.html`; en producción el panel vive en `/admin/`).
2. Elegir **«Work with Local Repository»** y seleccionar la carpeta raíz del proyecto.
3. Los cambios se escriben directamente en `src/content/**` y el servidor de desarrollo recarga la página.

Verificación completa (lo mismo que ejecuta CI):

```bash
npm run verify             # lint + formato + astro check + tests + build
```

Vista previa del build de producción, servida por `workerd` (el runtime de Cloudflare):

```bash
npm run build && npm run preview
```

> La política de seguridad de contenido (CSP) **no se aplica en `npm run dev`** (limitación del servidor de Vite);
> se valida con `build` + `preview`.

## Scripts npm

| Script | Qué hace |
| --- | --- |
| `dev` | Servidor de desarrollo (antes empaqueta el panel con Vite: `predev`) |
| `build` | Build de producción en `dist/` (antes empaqueta el panel con Vite: `prebuild`) |
| `preview` | Sirve `dist/` con `workerd` |
| `check` | `astro check` (tipos estrictos en `.astro` y `.ts`) |
| `lint` | ESLint (incluye reglas de accesibilidad `jsx-a11y`) |
| `format` / `format:check` | Prettier |
| `test` | Vitest |
| `verify` | `lint` → `format:check` → `check` → `test` → `build` |

## Estructura

```
ippc-web/
├─ astro.config.mjs          # sitio, adaptador, CSP, fuentes, variables de entorno tipadas
├─ wrangler.jsonc            # Worker de Cloudflare (sin secretos)
├─ .github/
│  ├─ workflows/ci.yml       # npm ci, npm audit, lint, formato, tipos, tests, build
│  ├─ workflows/deploy.yml   # push a main + cron diario + manual → verify → wrangler deploy
│  ├─ workflows/codeql.yml   # análisis estático (security-extended)
│  ├─ dependabot.yml         # actualizaciones npm y GitHub Actions
│  └─ CODEOWNERS             # revisores obligatorios por área (Consistorio, técnico, comunicaciones)
├─ public/
│  ├─ _headers               # cabeceras HTTP de seguridad (HSTS, frame-ancestors, CSP del panel…)
│  ├─ admin/                 # panel: index.html, config.yml, logo; app/ se genera en cada build
│  ├─ .well-known/security.txt
│  └─ robots.txt, site.webmanifest, íconos, og-image.jpg
├─ scripts/build-admin.mjs   # empaqueta Sveltia CMS con Vite en public/admin/app (+ huella sha384)
├─ src/
│  ├─ admin/cms.js           # entrada del panel (Sveltia CMS) → CMS.init()
│  ├─ content.config.ts      # esquemas Zod del contenido editable (validados en cada build)
│  ├─ content/               # contenido editable desde el panel (YAML + fotos junto a cada entrada)
│  │  ├─ ajustes/            # singletons: sitio.yaml, inicio.yaml, portada.jpg
│  │  ├─ actividades/<slug>/index.yaml
│  │  ├─ ministerios/<slug>/index.yaml (+ foto.jpg)
│  │  ├─ sermones/*.yaml
│  │  └─ recursos/*.yaml
│  ├─ assets/                # marca, ilustraciones y fotos optimizadas en build (AVIF/WebP)
│  ├─ components/            # Header, Footer, ContactForm, SermonPlayer, MapEmbed, Timeline…
│  ├─ layouts/BaseLayout.astro  # SEO, Open Graph, JSON-LD schema.org/Church, fuentes
│  ├─ lib/
│  │  ├─ contact/            # schema.ts, handler.ts, turnstile.ts, mailer.ts (lógica del formulario)
│  │  ├─ content.ts, dates.ts, json-ld.ts, navigation.ts
│  ├─ pages/                 # 9 páginas + 404 + api/contacto.ts
│  └─ styles/global.css      # sistema de diseño (tokens de color derivados del logo)
├─ tests/                    # Vitest: formulario, Turnstile, utilidades
└─ docs/                     # arquitectura, seguridad, manual del administrador
```

## Variables de entorno

Definidas y tipadas en `astro.config.mjs` (`env.schema`, con `validateSecrets: true`). Ver `.env.example`.

| Variable | Tipo | Uso |
| --- | --- | --- |
| `PUBLIC_TURNSTILE_SITE_KEY` | pública (cliente) | Widget anti-bots |
| `TURNSTILE_SECRET_KEY` | secreto (servidor) | Verificación del token en `/api/contacto` |
| `CONTACT_DELIVERY` | pública (servidor) | `resend` (por defecto, producción) o `log` (solo desarrollo) |
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` | secretos (servidor) | Envío del correo |

En producción los secretos se cargan con `wrangler secret put <NOMBRE>`; **nunca** se versionan. Con las claves de
prueba de Turnstile no se exige `hostname` ni `action` del token (Cloudflare devuelve valores ficticios); con claves
reales, sí.

## Integración y despliegue continuos

| Workflow | Disparador | Pasos |
| --- | --- | --- |
| `ci.yml` | Pull requests y push a `main` | `npm ci` → `npm audit --audit-level=high` → lint → formato → `astro check` → tests → build |
| `deploy.yml` | Push a `main`, cron diario `0 7 * * *` UTC (04:00 en horario de verano de Chile, 03:00 en invierno), manual | `npm ci` → lint → tests → build → `npx wrangler deploy` (secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; variable `PUBLIC_TURNSTILE_SITE_KEY`; environment `production`). Si algo falla, no se publica |
| `codeql.yml` | Semanal y en PR | CodeQL `security-extended` |
| `dependabot.yml` | Semanal | npm (agrupado: Astro / herramientas) y GitHub Actions |

## Contenido de ejemplo

Para la maqueta se cargaron datos de ejemplo que deben reemplazarse antes de publicar: sermones con
`youtube_id: XXXXXXXXXXX`, actividades de noviembre–diciembre 2026, lecturas recomendadas y enlaces genéricos de redes
sociales. El correo (`ip.pactodecristo@gmail.com`) y las coordenadas del mapa (`-33.5230223, -70.7559147`) ya son los reales.

### Marcas rojas de maqueta

Todo texto o dato que **no proviene del documento del cliente** se muestra en rojo (subrayado punteado). Un botón
fijo abajo a la izquierda permite ocultar/mostrar las marcas (la preferencia se recuerda en ese navegador), útil para
presentar la maqueta sin rojo.

- Registro central: `src/lib/maqueta.ts` (qué actividades, sermones, recursos y campos son inventados).
- Textos redactados dentro de las páginas: componente `<Inventado>` y props `titleInventado` / `leadInventado`.
- **Antes de producción:** reemplazar el contenido y poner `MARCAR_INVENTADO = false` en `src/lib/maqueta.ts`.

### Lanzador para Windows

`INICIAR-MAQUETA.cmd` (no forma parte de este repositorio: vive en el equipo donde se creó la maqueta, en la carpeta superior): doble clic → usa Node 24 portable solo en esa ventana, instala
dependencias la primera vez, crea `.env` desde `.env.example` y abre el sitio en el navegador.

### Borrador publicado (revisión con clave)

Mientras no exista dominio, la maqueta se revisa en `https://ippc-borrador.pactodecristo.workers.dev`, protegida con
usuario y contraseña (HTTP Basic sobre HTTPS). El Worker del sitio (`ippc-web`) no tiene URL pública propia
(`workers_dev: false`); solo se llega a él a través de la puerta `infra/borrador/` (service binding). Se eligió en vez
de Cloudflare Access porque Zero Trust exige registrar un medio de pago incluso en el plan gratuito.

- Publicar el sitio: `npm run build && npx wrangler deploy` (desde esta carpeta).
- Publicar la puerta: `cd infra/borrador && npx wrangler deploy --config wrangler.jsonc`.
- Cambiar la clave: `npx wrangler secret put BORRADOR_CLAVE --name ippc-borrador`.
- Retirar el borrador: `npx wrangler delete --name ippc-borrador`.
