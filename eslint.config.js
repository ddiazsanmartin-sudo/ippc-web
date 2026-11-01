// @ts-check
import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/', '.astro/', '.wrangler/', 'node_modules/', 'public/admin/app/', 'worker-configuration.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...astro.configs.recommended,
  // Reglas de accesibilidad (jsx-a11y) aplicadas a los componentes .astro.
  ...astro.configs['jsx-a11y-strict'],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // `set:html` solo se permite con contenido estático o serializado de forma segura (ver src/lib/json-ld.ts).
      'astro/no-set-html-directive': 'off',
      // `role="list"` en <ul>/<ol> es intencional: Safari/VoiceOver elimina la semántica de lista
      // cuando se usa `list-style: none`. Ver https://www.scottohara.me/blog/2019/01/12/lists-and-safari.html
      'astro/jsx-a11y/no-redundant-roles': ['error', { ul: ['list'], ol: ['list'] }],
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
