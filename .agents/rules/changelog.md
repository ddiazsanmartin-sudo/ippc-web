# Reglas de mantenimiento de `CHANGELOG.md`

Este proyecto documenta sus cambios en `CHANGELOG.md` sin herramientas externas, combinando **Keep a Changelog** con trazabilidad de **rama, responsable y commit** asistida por IA.

## 1. Formato estándar

- Mantener siempre la sección `## [No publicado]` al inicio del archivo para los cambios en curso.
- Al liberar una versión, mover los ítems de `[No publicado]` a `## [X.Y.Z] - YYYY-MM-DD` (sincronizado con `version` en `package.json` usando Semantic Versioning).
- Usar exclusivamente las categorías en español de Keep a Changelog:
  - `### Agregado` (nuevas funcionalidades)
  - `### Modificado` (cambios en funcionalidades existentes o dependencias relevantes)
  - `### Obsoleto` (funcionalidades próximas a retirarse)
  - `### Eliminado` (funcionalidades o archivos retirados)
  - `### Corregido` (corrección de errores)
  - `### Seguridad` (parches o mejoras de seguridad)
- Formato de cada entrada:
  - `- Descripción clara del cambio orientado al impacto (`rama` · **Responsable:** usuario · `hash_corto`)`
- En bloques de versión cerrada donde todos los cambios pertenecen al mismo autor y rama, puede indicarse `**Responsable principal:** usuario (`rama`)` bajo el encabezado de la versión.

## 2. Regla sobre el responsable

- **El responsable siempre es el desarrollador** dueño de la rama, del commit o quien aprueba/fusiona el cambio (obtenido vía `git config user.name` o autor del commit/PR).
- **Nunca registrar al agente de IA ni a bots** como responsables, salvo que el usuario especifique explícitamente otro comportamiento.

## 3. Política para Dependabot y actualizaciones de dependencias

- **Omitir** actualizaciones rutinarias de herramientas de desarrollo (`eslint`, `prettier`, `typescript`, `vitest`, `globals`) y de `github-actions` que no alteren el sitio publicado ni el flujo de build.
- **Registrar únicamente** actualizaciones con impacto en producción, CMS, infraestructura o seguridad:
  - En `### Modificado`: cambios relevantes en `astro`, `@astrojs/*`, `@sveltia/cms` o `wrangler`.
  - En `### Seguridad`: cualquier actualización motivada por una vulnerabilidad o CVE.
- Si se fusionan varias actualizaciones relevantes en un mismo ciclo, agruparlas en una sola entrada resumida en lugar de listar paquete por paquete.
- El responsable registrado en estos casos es el **desarrollador que revisa y fusiona** el PR de Dependabot.

## 4. Flujo de trabajo con IA (sin dependencias externas)

Al cerrar una tarea o antes de abrir un Pull Request, el agente de IA debe:

1. Inspeccionar los cambios reales con Git nativo (`git status`, `git diff`, `git log main..HEAD --pretty=format:"%h | %ad | %an | %s"`, `git branch --show-current`).
2. Clasificar los cambios relevantes en `## [No publicado]` dentro de `CHANGELOG.md` con lenguaje claro y conciso.
3. No inventar hashes ni versiones: si aún no existe el commit de cierre, omitir el hash o actualizarlo tras confirmar el commit.
