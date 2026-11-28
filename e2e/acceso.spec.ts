import { entrar, expect, pedir, test } from "./ayuda";

test.describe("Acceso por rol", () => {
  test("cada rol entra a su inicio y no al de otro", async ({ page }) => {
    await entrar(page, "empleado");
    await page.goto("/paola");
    await expect(page).toHaveURL(/\/empleado$/);
    await page.goto("/oscar");
    await expect(page).toHaveURL(/\/empleado$/);
  });

  test("sin sesión vuelve a la pantalla de perfiles", async ({ page }) => {
    await page.goto("/paola/proveedores");
    await expect(page).toHaveURL(/\/$/);
  });

  test("contraseña incorrecta no entra", async ({ page }) => {
    await page.goto("/login/empleado");
    await page.getByLabel("Usuario").fill("carlos");
    await page.getByLabel("Contraseña", { exact: true }).fill("otra-clave");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Usuario o contraseña" })).toBeVisible();
    await expect(page).toHaveURL(/\/login\/empleado/);
  });

  test("la API rechaza sin sesión y con el rol equivocado", async ({ page }) => {
    const sinSesion = await pedir(page, "POST", "/api/ventas", { lineas: [] });
    expect(sinSesion.status()).toBe(401);
    await entrar(page, "paola");
    const r = await pedir(page, "POST", "/api/ventas", {
      lineas: [{ productoId: "p-tec-0012", tipo: "venta", presentacion: "unidad", cantidad: 1 }],
    });
    expect(r.status()).toBe(403);
  });
});
