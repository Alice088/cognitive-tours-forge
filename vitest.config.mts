import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = { '@': resolve(process.cwd()) };

export default defineConfig({
  test: {
    passWithNoTests: false,
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['tests/setup.ts'],
          include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'cli',
          environment: 'node',
          globals: true,
          include: ['tests/cli/**/*.test.ts'],
        },
      },
    ],
  },
});
