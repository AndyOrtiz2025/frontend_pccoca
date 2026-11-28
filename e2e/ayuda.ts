import { test as base, expect, type Page } from "@playwright/test";

export type Perfil = "empleado" | "paola" | "oscar";

/** Usuario de prueba por perfil (src/lib/auth/mock-users.ts). */
const USUARIO: Record<Perfil, string> = { empleado: "carlos", paola: "paola", oscar: "oscar" };

/** Entra con un perfil y espera su pantalla de inicio. */
export async function entrar(page: Page, perfil: Perfil, usuario = USUARIO[perfil]) {
  await page.goto(`/login/${perfil}`);
  await page.getByLabel("Usuario").fill(usuario);
  await page.getByLabel("Contraseña", { exact: true }).fill("pccoca2026");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL(`**/${perfil}`);
  // Que termine de cargar el inicio, para que una navegación que venga después no se pise con él.
  await expect(page.getByRole("navigation", { name: "Menú principal" })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

/** Día de hoy en Guatemala (AAAA-MM-DD), como lo calcula la app. */
export function hoyGuatemala(desplazamientoDias = 0): string {
  const d = new Date(Date.now() + desplazamientoDias * 86_400_000);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Guatemala" });
}

/** Una petición JSON a la API con la sesión del navegador. */
export function pedir(
  page: Page,
  metodo: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  datos?: unknown,
) {
  return page.request.fetch(url, {
    method: metodo,
    data: datos === undefined ? undefined : JSON.stringify(datos),
    headers: datos === undefined ? undefined : { "Content-Type": "application/json" },
  });
}

/**
 * `test` con dos cosas automáticas:
 * - antes de cada prueba, los datos de prueba vuelven a su estado inicial;
 * - al terminar, falla si hubo errores en la consola del navegador (salvo las respuestas
 *   400/403/404/409 que las pruebas provocan a propósito).
 */
export const test = base.extend<{ consola: string[] }>({
  consola: [
    async ({ page, request }, usar) => {
      const r = await request.post("/api/e2e/reiniciar");
      expect(r.ok(), "La ruta de reinicio necesita el servidor con E2E=1").toBeTruthy();
      const errores: string[] = [];
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        if (/\b(400|401|403|404|409)\b/.test(m.text())) return;
        errores.push(m.text());
      });
      page.on("pageerror", (e) => errores.push(e.message));
      await usar(errores);
      expect(errores, "Errores en la consola del navegador").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
