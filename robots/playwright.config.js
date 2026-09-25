import { defineConfig } from '@playwright/test'

const port = Number(process.env.ROBOT_PORT || 5288)

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.robot\.js$/,
  timeout: 6 * 60 * 1000,
  fullyParallel: true,
  workers: process.env.ROBOT_WORKERS ? Number(process.env.ROBOT_WORKERS) : 4,
  reporter: [['list'], ['./lib/reporter.js']],
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
    actionTimeout: 10 * 1000,
    navigationTimeout: 20 * 1000,
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}
  },
  webServer: {
    command: `node robots/robotServer.mjs`,
    cwd: '..',
    url: `http://localhost:${port}/`,
    reuseExistingServer: true,
    env: { ROBOT_PORT: String(port) },
    timeout: 180 * 1000
  }
})
