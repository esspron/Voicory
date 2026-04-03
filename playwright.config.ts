import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 20000,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'tests/report', open: 'never' }]],
  use: {
    baseURL: 'https://voicory-backend-783942490798.asia-south1.run.app',
    extraHTTPHeaders: {
      'Accept': 'application/xml, text/xml, application/json',
    },
  },
});
