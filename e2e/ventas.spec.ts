import { entrar, expect, pedir, test } from "./ayuda";

test.describe("Ventas del empleado", () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, "empleado");
  });

  test("el catálogo no manda costos al navegador", async ({ page }) => {
    await page.goto("/empleado/productos/libreria");
    await expect(page.getByRole("article").first()).toBeVisible();
    expect((await page.content()).includes('"costo"')).toBe(false);
  });

  test("mayoreo, abrir paquete, consumo interno, merma y comprobante", async ({ page }) => {
    await page.goto("/empleado/productos/libreria");

    // Folder por unidad: 12 activan el mayoreo (Q 2.00 → Q 1.50).
    await page.getByRole("button", { name: "Agregar Folder tamaño carta" }).click();
    let d = page.getByRole("dialog");
    await d.getByRole("textbox", { name: "Cantidad" }).fill("12");
    await expect(d.getByText("cambió de Q 2.00 a Q 1.50")).toBeVisible();
    await expect(d.getByText("Q 18.00")).toBeVisible();
    // Solo hay 8 sueltas: se abre un paquete para completar las 12.
    await d.getByRole("button", { name: /^Abrir 1/ }).click();
    await expect(page.getByText(/Se abrió 1/).first()).toBeVisible();
    await d.getByRole("button", { name: "Agregar al carrito" }).click();

    // Hojas de colores sin sueltas: hay que abrir un paquete; va como consumo interno.
    await page.getByRole("button", { name: "Agregar Hojas de colores carta" }).click();
    d = page.getByRole("dialog");
    await d.getByRole("radio", { name: "Por unidad" }).click();
    await expect(d.getByText("No quedan unidades sueltas")).toBeVisible();
    await d.getByRole("button", { name: /^Abrir 1/ }).click();
    await expect(page.getByText(/Se abrió 1/).first()).toBeVisible();
    await expect(d.getByText("No quedan unidades sueltas")).toHaveCount(0);
    await d.getByRole("radio", { name: "Consumo interno" }).click();
    await d.getByRole("button", { name: "Agregar al carrito" }).click();

    // La merma exige motivo.
    await page.getByRole("button", { name: "Agregar Lapicero azul" }).click();
    d = page.getByRole("dialog");
    await d.getByRole("radio", { name: "Merma" }).click();
    await d.getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(d.getByText("El motivo de la merma es obligatorio")).toBeVisible();
    await d.getByLabel("Motivo de la merma").fill("roto");
    await d.getByRole("button", { name: "Agregar al carrito" }).click();

    const carrito = page.getByRole("complementary", { name: "Carrito" });
    await expect(carrito.getByText("Folder tamaño carta cambió de Q 2.00 a Q 1.50")).toBeVisible();

    // El carrito sobrevive a recargar la página.
    await page.reload();
    await expect(carrito.getByText("Lapicero azul")).toBeVisible();

    // Confirmar: revisión y comprobante (solo las ventas).
    await carrito.getByRole("button", { name: "Confirmar venta" }).click();
    const revision = page.getByRole("dialog", { name: "Revisa la venta" });
    await expect(revision.getByText("TOTAL A COBRAR")).toBeVisible();
    const confirmar = revision.getByRole("button", { name: /^Confirmar venta/ });
    await expect(confirmar).toBeEnabled();
    await confirmar.click();
    const comprobante = page.getByRole("dialog", { name: "Comprobante de venta" });
    await expect(comprobante).toBeVisible();
    await expect(comprobante.getByRole("definition").filter({ hasText: "Carlos" })).toBeVisible();
    await expect(comprobante.getByText("Lapicero")).toHaveCount(0);
    await expect(page.getByText("Registrado: 1 consumo interno y 1 merma")).toBeVisible();
    await comprobante.getByRole("button", { name: "Nueva venta" }).click();
    await expect(carrito.getByText("El carrito está vacío")).toBeVisible();
  });

  test("lector de código de barras y buscador con error de dedo", async ({ page }) => {
    await page.goto("/empleado/productos/libreria");
    await expect(page.getByRole("article").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.type("7401234500501", { delay: 5 });
    await page.keyboard.press("Enter");
    // El escáner agrega directo al carrito.
    await expect(
      page.getByRole("complementary", { name: "Carrito" }).getByText("Cuaderno universitario"),
    ).toBeVisible();

    await page.getByRole("combobox", { name: "Buscar producto o código" }).fill("mous");
    await expect(page.getByRole("option").first()).toHaveText(/^Mouse/);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog").getByText("Mouse inalámbrico")).toBeVisible();
  });

  test("un agotado no se puede agregar y el servidor pone el precio", async ({ page }) => {
    await page.goto("/empleado/productos/libreria");
    await expect(page.getByRole("button", { name: "Agregar Regla 30 cm" })).toBeDisabled();
    const r = await pedir(page, "POST", "/api/ventas", {
      lineas: [
        {
          productoId: "p-tec-0012",
          tipo: "venta",
          presentacion: "unidad",
          cantidad: 1,
          precio: 0.01,
        },
      ],
    });
    expect(r.ok()).toBe(true);
    expect((await r.json()).comprobante.total).toBe(65);
    const agotado = await pedir(page, "POST", "/api/ventas", {
      lineas: [{ productoId: "p-lib-0070", tipo: "venta", presentacion: "unidad", cantidad: 1 }],
    });
    expect(agotado.status()).toBe(409);
  });

  test("el inicio del empleado muestra solo sus ventas y los listos para entregar", async ({
    page,
  }) => {
    await expect(page.locator("main h2").first()).toHaveText(
      /^(Buenos días|Buenas tardes|Buenas noches), Carlos$/,
    );
    await expect(page.getByText("3 ventas")).toBeVisible();
    await expect(page.getByText("Marcadores permanentes")).toHaveCount(0);
    await expect(page.getByText("2 trámites y servicios están listos")).toBeVisible();

    const fila = page.getByRole("row").filter({ hasText: "Juan Pérez" });
    await fila.getByRole("button", { name: "Entregar" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByText("Q 150.00")).toBeVisible();
    await d.getByRole("button", { name: "Sí, marcar entregado" }).click();
    await expect(page.getByText("Entregado a Juan Pérez")).toBeVisible();
    await expect(page.getByText("1 trámite o servicio está listo")).toBeVisible();
  });
});
