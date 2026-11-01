/**
 * Empaqueta el panel (Sveltia CMS, paquete npm) con Vite en public/admin/app/.
 *
 * ¿Por qué no cargarlo desde un CDN (unpkg/jsDelivr)?
 *  - La versión queda fijada por package-lock.json (integridad verificada por npm).
 *  - Fuentes, traducciones y workers se emiten como archivos propios: el navegador del
 *    community manager no descarga nada de terceros.
 *  - Permite una CSP estricta para /admin (`script-src 'self'`, `font-src 'self'`).
 *  - Una caída o compromiso del CDN no afecta al panel.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'admin', 'app');

await build({
  configFile: false,
  root,
  base: '/admin/app/',
  logLevel: 'warn',
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: false,
    modulePreload: false,
    chunkSizeWarningLimit: 4096,
    rolldownOptions: {
      input: join(root, 'src', 'admin', 'cms.js'),
      output: {
        entryFileNames: 'cms.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});

const { version } = JSON.parse(await readFile(join(root, 'node_modules', '@sveltia', 'cms', 'package.json'), 'utf8'));
const entry = await readFile(join(outDir, 'cms.js'));
const sha = createHash('sha384').update(entry).digest('base64');
await writeFile(join(outDir, 'VERSION.txt'), `@sveltia/cms ${version}\ncms.js sha384-${sha}\n`);
console.info(`[build-admin] Sveltia CMS ${version} empaquetado en public/admin/app (sha384-${sha.slice(0, 16)}…)`);
