import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'mobile-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 }, isMobile: false, hasTouch: true } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
})
