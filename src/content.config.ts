/**
 * Modelo de contenido editable desde el panel (Sveltia CMS → archivos YAML en el repositorio).
 *
 * Cada esquema se valida en cada build: si el panel guardara un dato inválido, el build falla
 * y el sitio publicado NO se actualiza (nunca se despliega contenido roto).
 * Los nombres de campos deben coincidir con public/admin/config.yml.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Solo enlaces https: impide `javascript:`, `data:` y otros esquemas peligrosos en atributos href. */
const httpsUrl = z.url({ protocol: /^https$/, error: 'Debe ser una URL que comience con https://' });
const optionalHttpsUrl = z.union([httpsUrl, z.literal('')]).optional();
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Formato HH:MM (24 h)' });
const textoCorto = (max: number) => z.string().trim().min(1).max(max);

/** Carga un único archivo YAML como "singleton". */
const singleton = (file: string) => glob({ pattern: `${file}.yaml`, base: './src/content/ajustes' });

/** Colecciones con una carpeta por entrada (`<slug>/index.yaml`) para guardar imágenes junto al texto. */
const folderPerEntry = (base: string) =>
  glob({
    pattern: '*/index.yaml',
    base,
    generateId: ({ entry }) => entry.replace(/\/index\.yaml$/, ''),
  });

const sitio = defineCollection({
  loader: singleton('sitio'),
  schema: z.object({
    nombre: textoCorto(120),
    nombre_corto: textoCorto(40),
    lema: textoCorto(120),
    descripcion: textoCorto(170),
    denominacion: z.object({
      nombre: textoCorto(120),
      sigla: textoCorto(12),
      url: optionalHttpsUrl,
    }),
    direccion: z.object({
      calle: textoCorto(120),
      comuna: textoCorto(60),
      ciudad: textoCorto(60),
      region: textoCorto(80),
      lat: z.number().min(-56).max(-17),
      lng: z.number().min(-110).max(-66),
    }),
    contacto: z.object({
      email: z.email(),
      telefono: z.string().trim().max(20).optional(),
    }),
    redes: z.object({
      youtube: optionalHttpsUrl,
      instagram: optionalHttpsUrl,
      facebook: optionalHttpsUrl,
    }),
    horarios: z
      .array(
        z.object({
          nombre: textoCorto(60),
          dia: z.enum(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']),
          hora,
          descripcion: z.string().trim().max(200).optional(),
        }),
      )
      .min(1),
    otros_servicios: z.array(textoCorto(60)),
    nota_calendario: z.string().trim().max(200).optional(),
  }),
});

const inicio = defineCollection({
  loader: singleton('inicio'),
  schema: ({ image }) =>
    z.object({
      aviso: z.object({
        activo: z.boolean(),
        texto: z.string().trim().max(140).optional(),
        enlace: z.union([httpsUrl, z.string().regex(/^\/[\w\-/#]*$/), z.literal('')]).optional(),
      }),
      versiculo: z.object({
        texto: textoCorto(320),
        referencia: textoCorto(60),
      }),
      portada: z.object({
        imagen: image(),
        alt: textoCorto(200),
      }),
      bienvenida: z.object({
        titulo: textoCorto(120),
        texto: textoCorto(1200),
      }),
      identidad: z
        .array(z.object({ titulo: textoCorto(40), texto: textoCorto(140) }))
        .min(1)
        .max(6),
    }),
});

const actividades = defineCollection({
  loader: folderPerEntry('./src/content/actividades'),
  schema: ({ image }) =>
    z
      .object({
        titulo: textoCorto(100),
        fecha: z.coerce.date(),
        fecha_fin: z.coerce.date().optional(),
        categoria: z.enum(['Culto', 'Estudio', 'Pastoral', 'Evangelismo', 'Especial']),
        lugar: textoCorto(120),
        resumen: textoCorto(220),
        descripcion: z.string().trim().max(2000).optional(),
        imagen: image().optional(),
        imagen_alt: z.string().trim().max(200).optional(),
        publicado: z.boolean().default(true),
      })
      .refine((a) => !a.fecha_fin || a.fecha_fin >= a.fecha, {
        error: 'La fecha de término no puede ser anterior al inicio',
        path: ['fecha_fin'],
      })
      .refine((a) => !a.imagen || !!a.imagen_alt, {
        error: 'Toda imagen necesita un texto alternativo (accesibilidad)',
        path: ['imagen_alt'],
      }),
});

const ministerios = defineCollection({
  loader: folderPerEntry('./src/content/ministerios'),
  schema: ({ image }) =>
    z.object({
      nombre: textoCorto(60),
      orden: z.number().int().min(0).max(99),
      resumen: textoCorto(220),
      horario: z.string().trim().max(80).optional(),
      imagen: image(),
      imagen_alt: textoCorto(200),
    }),
});

const sermones = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/sermones' }),
  schema: z.object({
    titulo: textoCorto(120),
    fecha: z.coerce.date(),
    predicador: textoCorto(80),
    pasaje: textoCorto(60),
    serie: z.string().trim().max(80).optional(),
    youtube_id: z.string().regex(/^[\w-]{11}$/, { error: 'ID de YouTube inválido (11 caracteres)' }),
    resumen: z.string().trim().max(400).optional(),
  }),
});

const recursos = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/recursos' }),
  schema: z.object({
    titulo: textoCorto(120),
    tipo: z.enum(['Confesión', 'Catecismo', 'Artículo', 'Libro', 'Enlace']),
    autor: z.string().trim().max(80).optional(),
    descripcion: textoCorto(300),
    url: optionalHttpsUrl,
    archivo: z
      .string()
      .regex(/^\/documentos\/[\w\-.]+\.pdf$/, { error: 'Debe ser un PDF dentro de /documentos/' })
      .optional(),
    orden: z.number().int().min(0).max(99),
  }),
});

export const collections = { sitio, inicio, actividades, ministerios, sermones, recursos };
