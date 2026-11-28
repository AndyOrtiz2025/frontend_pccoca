import { defineConfig, devices } from "@playwright/test";

const PUERTO = 3100;
const enCI = !!process.env.CI;

/**
 * Pruebas end-to-end: abren el navegador, entran con cada rol y usan las pantallas como lo
 * haría una persona. Corren contra el build de producción (`next start`) con E2E=1, que
 * habilita la ruta para reiniciar los datos de prueba antes de cada prueba.
 */
export default defineConfig({
  testDir: "./e2e",
  // Los datos de prueba viven en la memoria del servidor: una prueba a la vez.
  fullyParallel: false,
  workers: 1,
  forbidOnly: enCI,
  retries: enCI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: enCI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    viewport: { width: 1440, height: 900 },
    locale: "es-GT",
    timezoneId: "America/Guatemala",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        // Para usar un Chrome ya instalado en lugar del de Playwright (ej. PW_CHROMIUM_PATH=/usr/bin/google-chrome).
        launchOptions: process.env.PW_CHROMIUM_PATH
          ? { executablePath: process.env.PW_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    // En el CI el build ya se hizo en el paso anterior.
    command: enCI
      ? `npm run start -- -p ${PUERTO}`
      : `npm run build && npm run start -- -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}/login/empleado`,
    reuseExistingServer: !enCI,
    timeout: 240_000,
    env: {
      E2E: "1",
      // Solo para las pruebas: no es un secreto real.
      SESSION_SECRET: "e2e-solo-pruebas-no-es-un-secreto-real-0123456789",
    },
  },
});
