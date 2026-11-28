import { entrar, expect, pedir, test } from "./ayuda";

test.describe("Pendientes de Paola (solo lectura)", () => {
  test("resumen, lista con 'debe desde', ordenar y exportar", async ({ page }) => {
    await entrar(page, "paola");
    await page.goto("/paola/pendientes");
    await expect(page.getByText("Se actualiza sola cada 30 segundos")).toBeVisible();
    await expect(page.getByText("Q 278.50")).toBeVisible();
    await expect(page.getByRole("button", { name: "Nuevo cliente" })).toHaveCount(0);

    // La actividad más reciente arriba: el abono de Centro Estudiantil.
    const actividad = page.getByRole("list", { name: "Actividad reciente" });
    await expect(actividad.getByRole("listitem").first()).toContainText(
      "Carlos registró un abono de Centro Estudiantil",
    );

    // "Debe desde" es solo un dato, y se puede ordenar por la deuda más antigua.
    await page.getByLabel("Ordenar").selectOption("antigua");
    const filas = page.getByRole("row");
    await expect(filas.nth(1)).toContainText("Rosa Méndez");
    await expect(filas.nth(1)).toContainText(/hace \d+ días/);

    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    expect((await descarga).suggestedFilename()).toMatch(/^pendientes-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test("el detalle no tiene botones para modificar y la API lo rechaza", async ({ page }) => {
    await entrar(page, "paola");
    await page.goto("/paola/pendientes");
    await page.getByRole("tab", { name: /Organizaciones/ }).click();
    await page.getByRole("link", { name: "Centro Estudiantil", exact: true }).click();
    await page.waitForURL("**/paola/pendientes/cu-6");
    await expect(page.getByText("Registró Carlos").first()).toBeVisible();
    for (const boton of [
      "Agregar a la cuenta",
      "Registrar abono",
      "Editar datos",
      "Eliminar cliente",
    ]) {
      await expect(page.getByRole("button", { name: boton })).toHaveCount(0);
    }
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await page.getByRole("button", { name: "Estado de cuenta" }).click();
    await expect(
      page.getByRole("dialog", { name: "Estado de cuenta" }).getByText("Saldo pendiente"),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "Todos los pendientes" }).click();
    await expect(page).toHaveURL(/\/paola\/pendientes$/);

    const cargo = await pedir(page, "POST", "/api/cuentas/cu-6/cargos", {
      tipo: "libre",
      descripcion: "Copias",
      precioUnitario: 1,
      cantidad: 1,
    });
    const abono = await pedir(page, "POST", "/api/cuentas/cu-6/abonos", { monto: 5 });
    expect([cargo.status(), abono.status()]).toEqual([403, 403]);
  });

  test("lo que fía un empleado le aparece a Paola sin recargar", async ({ page, browser }) => {
    test.setTimeout(120_000);
    await entrar(page, "paola");
    await page.goto("/paola/pendientes");
    const actividad = page.getByRole("list", { name: "Actividad reciente" });
    await expect(actividad).toBeVisible();

    const c = await (await browser.newContext()).newPage();
    await entrar(c, "empleado");
    const r = await pedir(c, "POST", "/api/cuentas/cu-6/cargos", {
      tipo: "libre",
      descripcion: "Papel bond para afiches",
      precioUnitario: 3,
      cantidad: 4,
      llevadoPor: "Ana Ruiz",
    });
    expect(r.ok()).toBe(true);
    await c.context().close();

    // Sin recargar: la página se actualiza sola en menos de 30 segundos.
    await expect(actividad.getByRole("listitem").first()).toContainText(
      "Carlos fió a Centro Estudiantil",
      { timeout: 45_000 },
    );
    await expect(actividad.getByRole("listitem").first()).toContainText(
      "4 × Papel bond para afiches",
    );
  });
});
