// Punto de entrada del panel de administración (Sveltia CMS).
// Se empaqueta con Vite en scripts/build-admin.mjs y se sirve desde /admin/app/ (sin CDNs de terceros).
// La configuración se lee de /admin/config.yml.
import CMS from '@sveltia/cms';

CMS.init();
