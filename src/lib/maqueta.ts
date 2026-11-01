/**
 * MAQUETA — registro del contenido que NO proviene del documento del cliente
 * («Contenido pagina web ippc.docx») ni de sus materiales: datos de ejemplo y textos redactados
 * por el desarrollador. Se muestran en rojo para revisarlos con la iglesia.
 *
 * Antes de producción: reemplazar el contenido real y poner MARCAR_INVENTADO = false
 * (o vaciar estos registros a medida que se valide cada texto).
 */
export const MARCAR_INVENTADO = true;

export const inventado = {
  /** Actividades de ejemplo (ids = carpetas de src/content/actividades). */
  actividades: new Set([
    'culto-reforma-2026',
    'estudio-confesion-westminster',
    'reunion-pastoral-mujeres-noviembre',
    'culto-de-navidad-2026',
    'retiro-jovenes-2026',
  ]),
  /** Sermones de ejemplo (video de relleno). */
  sermones: new Set(['2026-10-25-el-cordero-nos-pastorea', '2026-10-18-sola-scriptura', '2026-10-11-pacto-de-gracia']),
  /** Recursos inventados por completo (lecturas recomendadas). */
  recursos: new Set(['institucion-religion-cristiana', 'conociendo-a-dios']),
  /** Recursos cuyo título viene del documento pero la descripción es redactada. */
  recursosDescripcion: new Set(['confesion-de-fe-westminster', 'catecismo-mayor-westminster', 'catecismo-menor-westminster']),
  /** Resúmenes de ministerios redactados a partir de una línea del documento (Catecismo ya fue revisado). */
  ministeriosResumen: new Set([
    'escuela-dominical',
    'estudio-biblico',
    'pastoral-juvenil',
    'pastoral-de-mujeres',
    'pastoral-de-hombres',
    'reunion-en-casa',
    'evangelismo',
  ]),
  /** Textos bajo cada ítem de «Nuestra identidad» (los títulos sí vienen del documento). */
  identidadTexto: true,
  /** Texto de la barra de aviso. */
  aviso: true,
  /** Descripciones de horarios inventadas (por posición en sitio.yaml). */
  horariosDescripcion: new Set([1]),
  /** Redes sociales: enlaces genéricos a completar. */
  redes: true,
} as const;

/** Clase CSS para marcar un elemento como inventado (o nada si la marca está desactivada). */
export const marca = (esInventado: boolean) => (MARCAR_INVENTADO && esInventado ? 'inventado' : undefined);
