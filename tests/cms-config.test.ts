/**
 * Coherencia entre el panel (public/admin/config.yml) y el contenido del repositorio.
 * Si alguien agrega un campo en un lado y no en el otro, CI lo detecta antes de publicar.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const root = join(import.meta.dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

interface Field {
  name: string;
  widget?: string;
  fields?: Field[];
  field?: Field;
}
interface FileEntry {
  name: string;
  file: string;
  fields: Field[];
}
interface Collection {
  name: string;
  folder: string;
  path?: string;
  extension?: string;
  fields: Field[];
}
interface Config {
  backend: { auth_methods?: string[] };
  singletons: FileEntry[];
  collections: Collection[];
}

const config = YAML.parse(read('public/admin/config.yml')) as Config;

/** Rutas "a.b.c" de todas las claves de un objeto YAML (las listas se recorren por elemento). */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => keyPaths(v, prefix));
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.entries(value).flatMap(([k, v]) => [`${prefix}${k}`, ...keyPaths(v, `${prefix}${k}.`)]);
  }
  return [];
}

/** Rutas declaradas en el panel para un conjunto de campos. */
function fieldPaths(fields: Field[], prefix = ''): string[] {
  return fields.flatMap((f) => {
    const own = `${prefix}${f.name}`;
    const nested = f.fields ? fieldPaths(f.fields, `${own}.`) : [];
    return [own, ...nested];
  });
}

describe('configuración del panel (Sveltia CMS)', () => {
  it('es válida según el esquema JSON oficial del paquete instalado', () => {
    const schema = JSON.parse(read('node_modules/@sveltia/cms/schema/sveltia-cms.json'));
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    expect(validate(config), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it('solo permite iniciar sesión con OAuth (sin tokens personales)', () => {
    expect(config.backend.auth_methods).toEqual(['oauth']);
  });

  it('no acepta SVG en los campos de imagen (posible vector XSS)', () => {
    const images = [...config.singletons, ...config.collections]
      .flatMap((c) => c.fields)
      .flatMap(function flat(f: Field): Field[] {
        return [f, ...(f.fields ?? []).flatMap(flat)];
      })
      .filter((f) => f.widget === 'image');
    expect(images.length).toBeGreaterThan(0);
    for (const f of images as (Field & { accept?: string })[]) {
      expect(f.accept, `campo ${f.name}`).toBeDefined();
      expect(f.accept).not.toMatch(/svg/i);
    }
  });

  it.each(config.singletons.map((s) => [s.name, s] as const))(
    'singleton «%s»: cada clave del archivo está declarada en el panel',
    (_, s) => {
      const declared = new Set(fieldPaths(s.fields));
      const data = YAML.parse(read(s.file));
      for (const key of keyPaths(data)) expect(declared, `clave «${key}» de ${s.file}`).toContain(key);
    },
  );

  it.each(config.collections.map((c) => [c.name, c] as const))(
    'colección «%s»: carpeta existe y sus entradas coinciden con el panel',
    (_, c) => {
      expect(existsSync(join(root, c.folder))).toBe(true);
      const declared = new Set(fieldPaths(c.fields));
      const ext = c.extension ?? 'yaml';
      const files = c.path
        ? readdirSync(join(root, c.folder)).map((d) => join(c.folder, d, `index.${ext}`))
        : readdirSync(join(root, c.folder))
            .filter((f) => f.endsWith(`.${ext}`))
            .map((f) => join(c.folder, f));
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        for (const key of keyPaths(YAML.parse(read(file)))) expect(declared, `clave «${key}» de ${file}`).toContain(key);
      }
    },
  );
});
