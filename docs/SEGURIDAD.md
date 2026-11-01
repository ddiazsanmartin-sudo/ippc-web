# Seguridad

Modelo de amenazas, controles implementados (con su ubicación en el repositorio), cómo se verificaron y qué falta antes
de producción. Complementa [ARQUITECTURA.md](ARQUITECTURA.md).

## 1. Superficie de ataque

| Componente | Exposición | Ejecuta código de servidor |
| --- | --- | --- |
| Páginas públicas (`dist/client/*.html`) | Internet | No — HTML estático |
| `POST /api/contacto` | Internet | Sí — Cloudflare Worker (`src/pages/api/contacto.ts`) |
| Panel `/admin` | Internet (opcionalmente tras Cloudflare Access) | No — SPA estática; habla con la API de GitHub |
| Worker OAuth `sveltia-cms-auth` (Fase 2) | Internet | Sí — intercambio de código OAuth con lista blanca de dominios |
| Repositorio GitHub + Actions | Cuentas autorizadas | Sí — build y despliegue |

Activos a proteger: integridad del sitio publicado, credenciales (GitHub, Cloudflare, Resend, Turnstile), datos
personales del formulario, disponibilidad y reputación de la iglesia.

## 2. Modelo de amenazas (STRIDE)

| # | Categoría | Activo | Amenaza | Control | Implementación |
| --- | --- | --- | --- | --- | --- |
| S1 | Suplantación | Panel | Acceso al panel con credenciales robadas | Autenticación delegada en GitHub con 2FA obligatorio en la organización; Cloudflare Access (OTP/SSO) delante de `/admin` | Configuración GitHub / Cloudflare (Fase 2) |
| S2 | Suplantación | Formulario | Bots que se hacen pasar por personas | Turnstile verificado en servidor, honeypot, tiempo mínimo de llenado | `src/lib/contact/turnstile.ts`, `src/lib/contact/schema.ts` |
| S3 | Suplantación | Formulario | Token Turnstile resuelto en un sitio clonado o en otro formulario | Se exige `hostname` y `action` del token (con claves reales) | `src/pages/api/contacto.ts`, `src/lib/contact/turnstile.ts` |
| S4 | Suplantación | OAuth | Robo de token OAuth desde un dominio ajeno | `ALLOWED_DOMAINS` en `sveltia-cms-auth` | Worker OAuth (Fase 2) |
| T1 | Manipulación | Sitio publicado | Publicar contenido roto o malicioso | Esquemas Zod en cada build; CI bloquea el despliegue si falla | `src/content.config.ts`, CI (`npm run verify`) |
| T2 | Manipulación | Páginas | XSS por enlaces `javascript:` cargados en el panel | Solo URLs `https://` (o rutas internas) en todos los campos de enlace | `src/content.config.ts` (`httpsUrl`), `public/admin/config.yml` (`pattern`) |
| T3 | Manipulación | Páginas | XSS por cierre de `<script>` en JSON-LD | Serialización con escape de `<`, `>`, `&`, U+2028/U+2029 | `src/lib/json-ld.ts` (+ test) |
| T4 | Manipulación | Páginas | Inyección de scripts de terceros | CSP por hashes: solo scripts propios con hash y Turnstile | `astro.config.mjs` (`security.csp`) |
| T5 | Manipulación | Panel | CDN de terceros comprometido sirve un panel alterado | Sveltia se empaqueta con Vite desde npm y se sirve desde nuestro dominio; versión fijada por lockfile; huella sha384 registrada | `scripts/build-admin.mjs`, `src/admin/cms.js`, `public/admin/index.html` |
| T6 | Manipulación | Correo | Inyección de cabeceras en el correo | Campos de una línea sin saltos; cuerpo en texto plano, nunca HTML | `src/lib/contact/schema.ts`, `src/lib/contact/mailer.ts` (+ tests) |
| T7 | Manipulación | Dependencias | Paquete npm malicioso con script de instalación | npm 11 `allowScripts`: solo `workerd` y `esbuild` aprobados; versiones exactas; `npm ci` | `package.json`, `.npmrc`, `package-lock.json` |
| R1 | Repudio | Contenido | «Yo no hice ese cambio» | Cada cambio es un commit con autor, fecha y diff | Git / GitHub |
| R2 | Repudio | Formulario | Trazar un envío sin guardar datos personales | Id de solicitud (UUID) en el correo y en los logs | `src/lib/contact/handler.ts` |
| I1 | Divulgación | Datos personales | Fuga de datos del formulario | No se almacenan; logs sin PII (solo id, asunto y largo) | `src/lib/contact/handler.ts`, `src/lib/contact/mailer.ts` (+ test) |
| I2 | Divulgación | Detalles internos | Stack traces o mensajes de proveedores en respuestas | Errores genéricos; 500/502/503 siempre en JSON sin detalles | `src/lib/contact/handler.ts`, `src/pages/api/contacto.ts` (+ tests) |
| I3 | Divulgación | Visitantes | Rastreo por terceros | Sin cookies; YouTube solo tras clic (`youtube-nocookie.com`); fuentes autoalojadas; mapa OSM | `src/components/SermonPlayer.astro`, `astro.config.mjs` (`fonts`) |
| I4 | Divulgación | Visitantes y fotos | Ubicación GPS en metadatos de fotos de celular | Metadatos EXIF eliminados al importar; Astro re-codifica todo | `src/assets/**`, pipeline de imágenes |
| I5 | Divulgación | Navegación | Filtración de URL a terceros | `Referrer-Policy: strict-origin-when-cross-origin`; `no-referrer` en la API | `public/_headers`, `src/lib/contact/handler.ts` |
| I6 | Divulgación | Secretos | Secretos en el repositorio | `.env`, `.dev.vars*` y `dist/` ignorados; secretos con `wrangler secret put` | `.gitignore`, `wrangler.jsonc` |
| D1 | Denegación | Formulario | Inundación de envíos | Regla de rate limiting en el WAF; Turnstile; tamaño máximo 16 KB | Cloudflare WAF (Fase 2), `src/lib/contact/handler.ts` |
| D2 | Denegación | Sitio | Picos de tráfico | Todo estático desde el CDN | Cloudflare |
| E1 | Elevación | Repositorio | Commit directo con permisos excesivos | Protección de `main`, mínimo privilegio, revisión obligatoria en textos doctrinales (`CODEOWNERS`) | Configuración GitHub (Fase 1) |
| E2 | Elevación | Navegador | Clickjacking del sitio o del panel | `frame-ancestors 'none'` + `X-Frame-Options: DENY` | `public/_headers` |
| E3 | Elevación | Navegador | Iframes de terceros con acceso excesivo | `sandbox` en iframes de YouTube y del mapa | `src/components/SermonPlayer.astro`, `src/components/MapEmbed.astro` |
| E4 | Elevación | Formulario | CSRF desde otro origen | Verificación de `Origin` + `security.checkOrigin` de Astro; sin CORS | `src/lib/contact/handler.ts`, `astro.config.mjs` |

## 3. Controles implementados

### 3.1 Política de seguridad de contenido (CSP)

- **Páginas públicas:** CSP generada por Astro (`security.csp` en `astro.config.mjs`) e insertada como
  `<meta http-equiv>` en cada página. Todo `<script>` y `<style>` en línea lleva su hash SHA-256; **no** se usa
  `'unsafe-inline'`. El HTML no contiene atributos `style=` (comprobado sobre el build).
  - `default-src 'self'`; `img-src 'self' data:`; `font-src 'self'`; `object-src 'none'`; `base-uri 'self'`;
    `form-action 'self'`.
  - Orígenes externos permitidos, cada uno justificado en `astro.config.mjs`: `challenges.cloudflare.com` (Turnstile),
    `www.youtube-nocookie.com` (solo `frame-src`), `www.openstreetmap.org` (solo `frame-src`).
- **Cabeceras HTTP** (`public/_headers`), para lo que un `<meta>` no puede expresar:
  `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `frame-ancestors 'none'`,
  `upgrade-insecure-requests`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Resource-Policy: same-site`, `Permissions-Policy` (cámara, micrófono, geolocalización, pagos, USB y
  *topics* deshabilitados).
- **Panel `/admin`:** CSP propia en `public/_headers` con `default-src 'none'` y solo lo que la SPA necesita:
  `script-src 'self'`, `font-src 'self' data:`, `connect-src` a `api.github.com`, `www.githubstatus.com` (aviso de
  caídas de GitHub) y al Worker OAuth; imágenes de GitHub; `form-action 'none'`, `base-uri 'none'`,
  `X-Robots-Tag: noindex`, `Cache-Control: no-store`. La consulta de «nueva versión disponible» que Sveltia hace a
  `unpkg.com` queda **bloqueada a propósito**: las versiones las controlan el lockfile y Dependabot. `style-src` incluye
  `'unsafe-inline'` porque Sveltia lo requiere según su guía de CSP; el riesgo queda acotado por `script-src 'self'`.

### 3.2 Panel servido desde el propio dominio

`scripts/build-admin.mjs` (se ejecuta en `predev`/`prebuild`) **empaqueta con Vite 8** el paquete npm de Sveltia
(entrada: `src/admin/cms.js`, que llama a `CMS.init()`) en `public/admin/app/`, y registra la huella `sha384` de
`cms.js` en `public/admin/app/VERSION.txt`. `public/admin/index.html` lo carga como
`<script type="module" src="/admin/app/cms.js">`. La carpeta generada no se versiona (`.gitignore`).

Cómo se llegó a esta solución (verificado en Edge con la CSP activa):

1. El bundle «CDN» (`dist/sveltia-cms.js`) descargaba fuentes desde `cdn.jsdelivr.net` y traducciones desde
   `unpkg.com` → la CSP lo bloqueaba (correcto).
2. Servir el módulo npm «crudo» tampoco basta: importa archivos JSON sin *import attributes* (está pensado para pasar
   por un *bundler*) → el navegador rechaza el MIME `application/json`.
3. Empaquetarlo con Vite resuelve JSON, workers, WebAssembly y fuentes y los emite como archivos propios →
   **0 errores de consola y 0 violaciones de CSP**, interfaz en español.

Resultado:

- la versión la fija `package-lock.json` (con integridad verificada por npm);
- la CSP del panel no necesita ningún origen de terceros para código ni fuentes;
- una caída o compromiso de un CDN público no afecta al panel.

Endurecimiento adicional del panel (`public/admin/config.yml`, verificado por `tests/cms-config.test.ts`):

- **Solo OAuth de GitHub** (`auth_methods: [oauth]`): se desactiva el ingreso con tokens personales.
- **Sin SVG en subidas**: los campos de imagen aceptan solo JPEG/PNG/WebP/HEIC/AVIF (un SVG puede contener scripts).
- **Optimización antes de subir**: las fotos se convierten a WebP de máx. 2400 px en el navegador (incluye HEIC de
  iPhone). Esto requiere `'wasm-unsafe-eval'` en la CSP **solo de `/admin`**: habilita WebAssembly, no `eval()` de JS.
- **Esquema oficial**: la configuración se valida contra el JSON Schema que publica Sveltia en cada `npm test`, y
  un test de «deriva» exige que cada clave de los YAML de contenido esté declarada en el panel.

En producción el panel se sirve en `/admin/` (Cloudflare redirige `/admin/index.html` → `/admin/`).

### 3.3 Formulario de contacto: defensa en capas

Lógica en `src/lib/contact/` (independiente de Astro y Cloudflare; probada con `Request` estándar). En orden:

| Capa | Control | Respuesta |
| --- | --- | --- |
| 1 | Solo `POST` | 405 |
| 2 | `Content-Type` JSON o `x-www-form-urlencoded` | 415 |
| 3 | Cuerpo ≤ 16 KB (cabecera y bytes reales) | 413 |
| 4 | `Origin` igual al del sitio (anti-CSRF) | 403 |
| 5 | Esquema Zod **estricto** (rechaza campos desconocidos), largos máximos, correo válido, asunto de lista cerrada, consentimiento explícito | 400 con errores por campo |
| 6 | Saneamiento: elimina caracteres de control y de dirección bidi; campos de una línea sin saltos | — |
| 7 | Honeypot (`sitio_web`) y tiempo de llenado entre 3 s y 2 h | 400 genérico (no revela qué trampa se activó) |
| 8 | Turnstile verificado en servidor; **falla cerrada** si Cloudflare no responde; exige `hostname` y `action` con claves reales | 403 |
| 9 | Envío por Resend con `Idempotency-Key` y timeout | 502 si falla, sin detalles del proveedor |
| 10 | Configuración incompleta en producción | 503 en JSON con mensaje amable |
| 11 | Cualquier excepción inesperada | 500 en JSON, nunca respuesta vacía ni stack trace |

Todas las respuestas llevan `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` y
`Referrer-Policy: no-referrer`. Los logs registran solo id de solicitud y motivo, **nunca** nombre, correo ni mensaje.

- **Modo de entrega:** `CONTACT_DELIVERY` vale `resend` por defecto (producción) y `log` solo en desarrollo, donde se
  registra el envío sin datos personales. Si en `resend` faltan secretos de correo, la API responde 503 en JSON.
- **Claves de prueba de Turnstile** (patrón `^[123]x0{31}AA$`, función `isTurnstileTestSecret` en
  `src/lib/contact/turnstile.ts`): Cloudflare devuelve `hostname` y `action` ficticios, por lo que con ellas no se
  exigen. Con claves reales ambas verificaciones están activas.

### 3.4 Contenido editable

- Validación en build de todo lo que escribe el panel (`src/content.config.ts`): enlaces solo `https://` o rutas
  internas (impide `javascript:` y `data:`), horas `HH:MM`, coordenadas dentro de Chile, rango de fechas coherente,
  texto alternativo obligatorio si hay imagen, PDF solo bajo `/documentos/`, ID de YouTube de 11 caracteres.
- Los textos se renderizan como texto (Astro escapa por defecto). No se aceptan Markdown ni HTML desde el panel: los
  campos largos son texto plano dividido en párrafos.
- JSON-LD escapado para no poder cerrar la etiqueta `<script>` (`src/lib/json-ld.ts`).

### 3.5 Contenido de terceros

- **YouTube:** patrón *facade*: la portada es una imagen local; hasta el clic no hay ninguna petición a Google. Al hacer
  clic se inserta (vía DOM, sin `innerHTML`) un iframe de `youtube-nocookie.com` con `sandbox` y el ID revalidado.
- **Mapa:** iframe de OpenStreetMap con `sandbox="allow-scripts allow-same-origin"` y carga diferida.
- **Enlaces externos:** `rel="noopener noreferrer"`.

### 3.6 Imágenes

Las fotos se importaron con orientación aplicada y **sin metadatos EXIF** (incluidas coordenadas GPS). En el build,
Astro las re-codifica a AVIF/WebP, lo que también descarta metadatos de imágenes subidas desde el panel.

### 3.7 Cadena de suministro

- npm 11 con `allowScripts`: solo `workerd` y `esbuild` pueden ejecutar scripts de instalación (`package.json`).
- Versiones exactas (`.npmrc`: `save-exact=true`, `engine-strict=true`), `package-lock.json` versionado, `npm ci` en CI.
- `overrides` de `undici` a 7.30.1 dentro de `miniflare` por GHSA-4qv8-2p9j-2685 (afecta solo al simulador local de
  desarrollo, no al runtime de producción). Resultado: `npm audit` → **0 vulnerabilidades**.
- CI (`.github/workflows/ci.yml`) ejecuta `npm audit --audit-level=high` en cada PR y push a `main`; los workflows
  corren con `permissions: contents: read`.
- Dependabot (`.github/dependabot.yml`): actualizaciones semanales de npm (agrupadas: Astro / herramientas) y de
  GitHub Actions.
- CodeQL (`.github/workflows/codeql.yml`): consultas `security-extended`, semanal y en cada PR.
- Antes de producción: fijar las GitHub Actions por SHA de commit (hoy van por etiqueta `@v4`/`@v3`).

### 3.8 Secretos

- Producción: `wrangler secret put` (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`,
  `CONTACT_FROM_EMAIL`). `wrangler.jsonc` no contiene secretos.
- Desarrollo: `.env` (ignorado). `.env.example` solo trae las claves **de prueba** públicas de Cloudflare.
- Nota: `astro preview` copia `.env` a `dist/server/.dev.vars`; por eso `dist/` y `.dev.vars*` están en `.gitignore`
  y CI compila sin `.env`.
- Variables tipadas y validadas al iniciar (`env.schema` con `validateSecrets: true` en `astro.config.mjs`).

### 3.9 GitHub

2FA obligatorio en la organización, protección de `main` (CI verde requerido), mínimo privilegio (el community manager
con permiso de escritura solo al repositorio del sitio), revisión obligatoria vía `CODEOWNERS` para textos doctrinales.

### 3.10 Privacidad

Diseñado conforme a la Ley N° 19.628 y a la Ley N° 21.719 (que entra en vigencia el 1 de diciembre de 2026): minimización
(solo los campos necesarios, teléfono opcional), consentimiento explícito, sin almacenamiento en el sitio, sin cookies de
seguimiento, proveedores declarados. Borrador de política en `src/pages/privacidad.astro` (requiere revisión legal).

## 4. Cómo verificamos

| Verificación | Resultado |
| --- | --- |
| `astro check` con `astro/tsconfigs/strictest` | 0 errores, 0 advertencias |
| ESLint (`typescript-eslint` strict + `eslint-plugin-astro` + reglas `jsx-a11y` estrictas) | 0 problemas |
| Prettier | Todo el código formateado |
| Vitest | 49 tests aprobados (esquema, manejador HTTP, Turnstile, JSON-LD, fechas, correo, configuración del panel y deriva panel↔contenido; el test de deriva se comprobó introduciendo un campo no declarado) |
| `npm audit` | 0 vulnerabilidades |
| CSP sobre el build | Todo `<script>`/`<style>` en línea con hash válido; 0 atributos `style=` |
| E2E con Microsoft Edge + Playwright contra `astro preview` (`workerd`) | 10 páginas × 2 tamaños (1440 px y 390 px): sin errores de consola, sin violaciones CSP, sin desborde horizontal |
| Formulario de punta a punta | Inválido → 400 con errores por campo; válido → 200 (`no-store`, `nosniff`); `GET` → 405; `Origin` forjado → 403 |
| Mapa y Turnstile bajo CSP | Cargan correctamente |
| Panel bajo CSP (Edge) | Detectó que el bundle CDN de Sveltia pedía recursos a terceros → se cambió al módulo npm (§3.2) |

**Bugs reales encontrados por las pruebas E2E y corregidos** (la respuesta 500 en JSON y el reconocimiento de claves
de prueba quedaron cubiertos por tests unitarios; el cableado de `src/pages/api/contacto.ts` se valida con la prueba
E2E):

1. Con secretos de correo ausentes, la API lanzaba una excepción y respondía **500 con cuerpo vacío**; la interfaz
   mostraba «problema de conexión». Ahora: 503/500 siempre en JSON y el cliente tolera respuestas no-JSON.
2. Con las claves de prueba de Turnstile, la verificación de `hostname` y `action` rechazaba envíos legítimos
   (Cloudflare devuelve valores ficticios). Ahora esas verificaciones solo se omiten con claves de prueba.
3. La expresión regular que reconoce las claves de prueba esperaba 33 ceros en vez de 31; el test compartía el mismo
   supuesto. Ahora el test usa los valores literales publicados por Cloudflare.

## 5. Checklist antes de producción

- [ ] Claves **reales** de Turnstile (`PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`); con ellas se activa la
      verificación de `hostname` y `action`.
- [ ] Regla de rate limiting en el WAF para `/api/contacto` (por ejemplo, 5 solicitudes por minuto por IP).
- [ ] Cloudflare Access delante de `/admin/*`.
- [ ] Worker `sveltia-cms-auth` con `ALLOWED_DOMAINS` y `backend.base_url` en `public/admin/config.yml`.
- [ ] Organización GitHub con 2FA obligatorio, protección de `main`, `CODEOWNERS`.
- [ ] GitHub Actions fijadas por SHA; secrets `CLOUDFLARE_API_TOKEN` (permisos mínimos: Workers) y
      `CLOUDFLARE_ACCOUNT_ID`, variable `PUBLIC_TURNSTILE_SITE_KEY` y environment `production` con aprobación.
- [ ] Nombres reales de equipos en `.github/CODEOWNERS` y «Require review from Code Owners» activo.
- [ ] Resend con dominio verificado (SPF, DKIM, DMARC) y secretos cargados con `wrangler secret put`.
- [ ] Revisar la CSP de `/admin` en staging con el login real de GitHub.
- [ ] Enviar el dominio a la lista HSTS preload (hstspreload.org) una vez estable HTTPS en todos los subdominios.
- [ ] `public/.well-known/security.txt` y `public/robots.txt` con el dominio y el contacto reales.
- [ ] Revisión de la política de privacidad (`src/pages/privacidad.astro`) por el Consistorio y asesoría legal.
- [ ] Reemplazar contenido de ejemplo (sermones, actividades, redes, coordenadas).
