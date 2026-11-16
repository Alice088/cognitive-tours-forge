import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const palette =
  '(white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['app/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `JSXAttribute[name.name='className'] Literal[value=/(?:^|[\\s:])(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|shadow|decoration|caret|accent)-(?:${palette}(?:-\\d{2,3})?)(?:[\\s/]|$)/]`,
          message:
            'Literal colour utility. Use a design token: bg-background, text-foreground, border-border, text-waypoint-goal-foreground and so on.',
        },
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/#[0-9a-fA-F]{3,8}/]",
          message: 'Raw colour value. Use a design token from app/globals.css.',
        },
        {
          selector:
            "JSXAttribute[name.name='style'] Property[key.name=/color|background|border/] Literal[value=/#[0-9a-fA-F]{3,8}/]",
          message: 'Raw colour value. Use a design token from app/globals.css.',
        },
      ],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
