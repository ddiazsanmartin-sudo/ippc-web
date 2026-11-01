import { getEntry, type CollectionEntry } from 'astro:content';

export type Sitio = CollectionEntry<'sitio'>['data'];
export type Inicio = CollectionEntry<'inicio'>['data'];

/** Datos generales (src/content/ajustes/sitio.yaml). Falla el build con un mensaje claro si falta. */
export async function getSitio(): Promise<Sitio> {
  const entry = await getEntry('sitio', 'sitio');
  if (!entry) throw new Error('Falta src/content/ajustes/sitio.yaml');
  return entry.data;
}

/** Contenido de la portada (src/content/ajustes/inicio.yaml). */
export async function getInicio(): Promise<Inicio> {
  const entry = await getEntry('inicio', 'inicio');
  if (!entry) throw new Error('Falta src/content/ajustes/inicio.yaml');
  return entry.data;
}

/** El primer horario es el culto principal (el esquema exige al menos uno). */
export function cultoPrincipal(sitio: Sitio): Sitio['horarios'][number] {
  const [culto] = sitio.horarios;
  if (!culto) throw new Error('sitio.yaml debe tener al menos un horario');
  return culto;
}
