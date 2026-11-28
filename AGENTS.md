# Instrucciones generales del proyecto (`ippc-web`)

Estas reglas aplican a cualquier asistente de IA o desarrollador que trabaje en este repositorio.

## 1. Contexto previo obligatorio

Antes de modificar código o proponer cambios arquitectónicos, revisar la documentación base del proyecto:

- `README.md` (stack, requisitos, scripts y puesta en marcha)
- `docs/ARQUITECTURA.md` (decisiones técnicas, estructura y restricciones)
- `docs/SEGURIDAD.md` (modelo de amenazas, controles y superficie de ataque)
- `.agents/rules/changelog.md` (reglas específicas de registro de cambios)

## 2. Desarrollo y ramas

- Salvo indicación expresa, iniciar el trabajo desde la rama base configurada (`dev` si existe; en su defecto `main`) y dirigir allí los Pull Requests.
- Mantener los cambios acotados a la tarea solicitada, respetando las convenciones y patrones existentes en `src/`.
- Usar español para documentación, contenido y mensajes orientados al usuario.

## 3. Estándares de código y arquitectura

- Aplicar el principio de responsabilidad única: mantener la lógica de negocio, validación (Zod) y utilidades en `src/lib/` separadas de la capa de vista (`.astro` en `src/pages/` y `src/components/`).
- Mantener componentes `.astro` pequeños, reutilizables y tipados con TypeScript estricto (`astro/tsconfigs/strictest`).
- Respetar las reglas de accesibilidad (`eslint-plugin-jsx-a11y-x`) y seguridad (CSP por hashes, sin secretos en cliente ni manipulación insegura del DOM).

## 4. Changelog y versionado

- Registrar funcionalidades nuevas, cambios relevantes y correcciones en `CHANGELOG.md` siguiendo el formato híbrido Keep a Changelog definido en `.agents/rules/changelog.md`.
- El responsable registrado en `CHANGELOG.md` siempre es el desarrollador (nunca el agente de IA ni bots), salvo indicación explícita.
- Cuando corresponda liberar versión, actualizar `version` en `package.json` usando Semantic Versioning (`patch`, `minor`, `major`) y sincronizar `package-lock.json` mediante `npm` (`npm version <tipo> --no-git-tag-version` o `npm install --package-lock-only`).

## 5. Validación antes de commit / Pull Request

- Ejecutar `npm run verify` (`lint`, `format:check`, `astro check`, `vitest run` y `build`) y verificar manualmente los flujos afectados.
- Confirmar que no existan secretos, archivos `.env`, credenciales ni cambios accidentales en carpetas generadas (`dist/`, `.astro/`, `.wrangler/`, `public/admin/app/`).
