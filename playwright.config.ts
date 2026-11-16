import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/acceptance',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'next dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120 * 1000,
    env: {
      CTOUR_HOME: './.tmp/e2e-home',
    },
  },
});
