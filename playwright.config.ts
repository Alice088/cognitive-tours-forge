import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/acceptance',
  globalSetup: './tests/acceptance/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'next build && next start',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 300 * 1000,
    env: {
      CTOUR_HOME: './.tmp/e2e-home',
    },
  },
});
