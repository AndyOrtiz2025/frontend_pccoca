import { entrar, expect, pedir, test } from "./ayuda";

test.describe("Pendientes (fiados) del empleado", () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, "empleado");
  });

  test("cargo, abono, pagar seleccionados y estado de cuenta", async ({ page }) => {
    await page.goto("/empleado/pendientes");
    await page.getByRole("tab", { name: "Organizaciones (3)" }).click();
    await page.getByRole("searchbox", { name: "Buscar cliente" }).fill("centro");
    await expect(page.getByRole("row")).toHaveCount(2);
    await page.getByRole("link", { name: "Centro Estudiantil" }).click();
    await page.waitForURL("**/empleado/pendientes/cu-6");
    await expect(page.getByText("Q 20.00").first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "Ana Ruiz" })).toBeVisible();

    // Agregar a la cuenta.
    await page.getByRole("button", { name: "Agregar a la cuenta" }).click();
    let d = page.getByRole("dialog");
    await d.getByLabel("¿Quién se lo lleva?").fill("María Ortiz");
    await d.getByLabel("Producto").fill("cuaderno");
    await d.getByRole("button", { name: "Cuaderno universitario" }).click();
    await d.getByLabel("Cantidad").fill("2");
    await d.getByRole("button", { name: "Agregar a la cuenta" }).click();
    await expect(page.getByText("Agregado a la cuenta de Centro Estudiantil")).toBeVisible();
    await expect(page.getByText("Q 50.00").first()).toBeVisible();

    // El abono no puede pasar del saldo.
    await page.getByRole("button", { name: "Registrar abono" }).click();
    d = page.getByRole("dialog");
    await d.getByLabel("¿Cuánto deja?").fill("60");
    await d.getByRole("button", { name: "Registrar abono" }).click();
    await expect(d.getByText("No puede ser mayor a lo que debe")).toBeVisible();
    await d.getByLabel("¿Cuánto deja?").fill("15");
    await expect(d.getByText("Q 35.00")).toBeVisible();
    await d.getByRole("button", { name: "Registrar abono" }).click();
    const comprobante = page.getByRole("dialog", { name: "Comprobante de pago" });
    await expect(comprobante.getByText("Q 15.00").first()).toBeVisible();
    await expect(page.getByText("Pagó Q 15.00 · Le quedan Q 35.00")).toBeVisible();
    await comprobante.getByRole("button", { name: "Cerrar" }).first().click();

    // Pagar cargos específicos.
    await page.getByLabel("Seleccionar Folder tamaño carta").check();
    await page.getByRole("button", { name: "Pagar seleccionados (Q 15.00)" }).click();
    await page.getByRole("button", { name: "Sí, pagó Q 15.00" }).click();
    await expect(page.getByText("Le quedan Q 20.00")).toBeVisible();
    await page
      .getByRole("dialog", { name: "Comprobante de pago" })
      .getByRole("button", { name: "Cerrar" })
      .first()
      .click();
    await expect(page.getByRole("button", { name: "Eliminar cliente" })).toBeDisabled();

    await page.getByRole("button", { name: "Estado de cuenta" }).click();
    await expect(
      page.getByRole("dialog", { name: "Estado de cuenta" }).getByText("Saldo pendiente"),
    ).toBeVisible();
  });

  test("no duplica clientes y solo elimina cuentas sin saldo", async ({ page }) => {
    await page.goto("/empleado/pendientes");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Nombre del cliente").fill("maria lopez");
    await d.getByRole("button", { name: "Agregar" }).click();
    await expect(page.getByText('Ya existe "maria lopez"')).toBeVisible();
    await d.getByLabel("Nombre del cliente").fill("Lucía Hernández");
    await d.getByRole("button", { name: "Agregar" }).click();
    await expect(page).toHaveURL(/\/empleado\/pendientes\/CU-/);

    await page.goto("/empleado/pendientes/cu-7");
    await page.getByRole("button", { name: "Eliminar cliente" }).click();
    await page.getByRole("button", { name: "Sí, eliminar" }).click();
    await expect(page).toHaveURL(/\/empleado\/pendientes$/);
    await expect(page.getByRole("link", { name: "Ana Ramírez" })).toHaveCount(0);

    const conSaldo = await pedir(page, "DELETE", "/api/cuentas/cu-1");
    expect(conSaldo.status()).toBe(409);
  });

  test("corregir un cargo: queda quién lo editó y el comprobante no dice quién atendió", async ({
    page,
    browser,
  }) => {
    await page.goto("/empleado/pendientes/cu-6");

    // Algo libre mal escrito: se corrige la descripción y la cantidad.
    await page.getByRole("button", { name: "Editar Impresiones blanco y negro" }).click();
    let d = page.getByRole("dialog", { name: "Editar cargo" });
    await d.getByLabel("Descripción").fill("Impresiones de hojas de servicios");
    await d.getByLabel("Cantidad").fill("60");
    await expect(d.getByText("Q 30.00")).toBeVisible();
    await d.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Cargo corregido")).toBeVisible();
    const fila = page.getByRole("row").filter({ hasText: "Impresiones de hojas de servicios" });
    await expect(fila).toContainText("Editado por Carlos");
    await expect(page.getByText("Q 25.00").first()).toBeVisible(); // saldo: 30 + 15 − 20

    // No deja que el total quede por debajo de lo abonado (Q 20).
    await page.getByRole("button", { name: "Editar Impresiones de hojas de servicios" }).click();
    d = page.getByRole("dialog", { name: "Editar cargo" });
    await d.getByLabel("Cantidad").fill("2");
    await d.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(d.getByText("Ya pagó Q 20.00")).toBeVisible();
    await d.getByRole("button", { name: "Cancelar" }).click();

    // Producto del inventario: la cantidad ajusta el precio (mayoreo).
    await page.getByRole("button", { name: "Editar Folder tamaño carta" }).click();
    d = page.getByRole("dialog", { name: "Editar cargo" });
    await expect(d.getByText("el stock se ajusta solo")).toBeVisible();
    await d.getByLabel("Cantidad").fill("5");
    await expect(d.getByText("Q 10.00")).toBeVisible(); // 5 × Q 2.00 (ya sin mayoreo)
    await d.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Folder tamaño carta" })).toContainText(
      "Q 10.00",
    );

    // El comprobante de pago ya no dice quién atendió.
    await page.getByRole("button", { name: "Comprobante" }).first().click();
    const comprobante = page.getByRole("dialog", { name: "Comprobante de pago" });
    await expect(comprobante).toBeVisible();
    await expect(comprobante.getByText("Atendió")).toHaveCount(0);

    // Paola ve la corrección en su vista de solo lectura, sin botón de editar.
    const pa = await (
      await browser.newContext({ viewport: { width: 1440, height: 900 } })
    ).newPage();
    await entrar(pa, "paola");
    await pa.goto("/paola/pendientes/cu-6");
    await expect(pa.getByText(/Editado por Carlos/).first()).toBeVisible();
    await expect(pa.getByRole("button", { name: /^Editar / })).toHaveCount(0);
    const r = await pedir(pa, "PATCH", "/api/cuentas/cu-6/cargos/ca-6", {
      tipo: "libre",
      descripcion: "x y",
      precioUnitario: 1,
      cantidad: 1,
    });
    expect(r.status()).toBe(403);
    await pa.context().close();
  });
});
