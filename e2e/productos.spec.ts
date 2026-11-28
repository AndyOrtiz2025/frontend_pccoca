import { entrar, expect, test } from "./ayuda";

test.describe("Productos de Paola", () => {
  test("producto en caja con mayoreo: se crea, se vende y descuenta el inventario", async ({
    page,
    browser,
  }) => {
    await entrar(page, "paola");
    await page.goto("/paola/productos/libreria");
    await page.getByRole("button", { name: "Nuevo producto" }).click();
    let d = page.getByRole("dialog");
    await d.getByLabel("Nombre del producto").fill("Lápiz Faber Castell");
    await d.getByLabel("Subcategoría").click();
    const lista = page.getByRole("listbox");
    await expect(lista).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await d.getByLabel("Subcategoría").fill("escri");
    await expect(lista.getByRole("option")).toHaveCount(1);
    await lista.getByRole("option", { name: "Escritura" }).click();
    await d.getByRole("radio", { name: "En caja o paquete" }).click();
    await d.getByLabel("¿Cómo se llama?").selectOption("Caja");
    await d.getByLabel("Unidades por caja").fill("2");
    await d.getByLabel("Costo por caja (Q)").fill("18");
    await d.getByLabel("Precio por caja (Q)").fill("22");
    await expect(d.getByText("+Q 4.00").first()).toBeVisible();
    await d.getByRole("switch").nth(1).click();
    await d.getByLabel("Precio mayoreo (Q)").first().fill("20");
    await d.getByLabel("A partir de (cajas)").fill("5");
    await d.getByLabel("Precio por unidad suelta (Q)").fill("2");
    await d.getByLabel("Cajas sin abrir").fill("20");
    await d.getByRole("button", { name: "Agregar producto" }).click();
    let fila = page.getByRole("row").filter({ hasText: "Lápiz Faber Castell" });
    await expect(fila).toContainText("0 sueltas · 20 cajas");

    // Sin sueltas todavía se pueden corregir las unidades por caja.
    await fila.getByRole("button", { name: "Editar Lápiz Faber Castell" }).click();
    d = page.getByRole("dialog");
    await d.getByLabel("Unidades por caja").fill("12");
    await expect(d.getByText("Q 1.50").first()).toBeVisible();
    await expect(d.getByText("25% de utilidad")).toBeVisible();
    await d.getByRole("button", { name: "Guardar cambios" }).click();
    fila = page.getByRole("row").filter({ hasText: "Lápiz Faber Castell" });
    await expect(fila).toContainText("Caja de 12");
    await expect(fila).toContainText("desde 5 cajas");

    // El empleado lo vende por caja (con mayoreo) y por unidad (abriendo una caja).
    const c = await (
      await browser.newContext({ viewport: { width: 1440, height: 900 } })
    ).newPage();
    await entrar(c, "empleado");
    await c.goto("/empleado/productos/libreria");
    const tarjeta = c.locator("article").filter({ hasText: "Lápiz Faber Castell" });
    await expect(tarjeta).toContainText("Caja (12 u.): Q 22.00");
    await expect(tarjeta).toContainText("Desde 5 cajas: Q 20.00");
    await tarjeta.getByRole("button", { name: "Agregar" }).click();
    let m = c.getByRole("dialog");
    await m.getByRole("radio", { name: "Por caja (12 u.)" }).click();
    await m.getByRole("textbox", { name: "Cantidad" }).fill("5");
    await expect(m.getByText("Q 100.00")).toBeVisible();
    await m.getByRole("button", { name: "Agregar al carrito" }).click();
    await tarjeta.getByRole("button", { name: "Agregar" }).click();
    m = c.getByRole("dialog");
    await m.getByRole("radio", { name: "Por unidad" }).click();
    await expect(m.getByText("No quedan unidades sueltas")).toBeVisible();
    await m.getByRole("button", { name: "Abrir 1 caja" }).click();
    await expect(c.getByText("Se abrió 1 caja: 12 unidades sueltas")).toBeVisible();
    await m.getByRole("textbox", { name: "Cantidad" }).fill("3");
    await m.getByRole("button", { name: "Agregar al carrito" }).click();
    await c.getByRole("button", { name: "Confirmar venta" }).click();
    const revision = c.getByRole("dialog", { name: "Revisa la venta" });
    await expect(revision.getByText("Q 106.00").first()).toBeVisible();
    await revision.getByRole("button", { name: /^Confirmar venta/ }).click();
    await expect(
      c
        .getByRole("dialog", { name: "Comprobante de venta" })
        .getByText("Lápiz Faber Castell (caja)"),
    ).toBeVisible();

    // Paola ve el inventario descontado y ya no puede cambiar las unidades por caja.
    await page.reload();
    fila = page.getByRole("row").filter({ hasText: "Lápiz Faber Castell" });
    await expect(fila).toContainText("9 sueltas · 14 cajas");
    await fila.getByRole("button", { name: "Editar Lápiz Faber Castell" }).click();
    await expect(page.getByRole("dialog").getByLabel("Unidades por caja")).toBeDisabled();
    await c.context().close();
  });
});

test.describe("Códigos de barras", () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, "paola");
    await page.goto("/paola/productos/libreria");
    await expect(page.getByRole("row").nth(1)).toBeVisible();
    await page.waitForLoadState("networkidle");
  });

  test("escanear la caja encuentra el producto y muestra sus dos códigos", async ({ page }) => {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.type("LIB-0045-P", { delay: 8 });
    await page.keyboard.press("Enter");
    const fila = page.getByRole("row").filter({ hasText: "Lápiz Mongol" });
    await expect(fila).toBeVisible();
    await fila.getByRole("button", { name: "Código de barras de Lápiz Mongol No. 2" }).click();
    const d = page.getByRole("dialog");
    await expect(
      d.getByRole("img", { name: "Código de barras LIB-0045", exact: true }),
    ).toBeVisible();
    await expect(
      d.getByRole("img", { name: "Código de barras LIB-0045-P", exact: true }),
    ).toBeVisible();
    const descarga = page.waitForEvent("download");
    await d.getByRole("button", { name: "Descargar imagen" }).last().click();
    expect((await descarga).suggestedFilename()).toBe("codigo-LIB-0045-P.png");
  });

  test("etiquetas: cantidades, empezar en otra etiqueta y una sola hoja carta", async ({
    page,
  }) => {
    await page.getByLabel("Seleccionar Cuaderno universitario").check();
    await page.getByLabel("Seleccionar Marcadores permanentes").check();
    await expect(page.getByText("2 seleccionados")).toBeVisible();
    await page.getByRole("button", { name: "Imprimir etiquetas" }).click();
    const e = page.getByRole("dialog", { name: "Imprimir etiquetas" });
    // El que ya trae código del fabricante empieza en 0.
    await expect(e.getByLabel("Etiquetas por unidad de Cuaderno universitario")).toHaveValue("0");
    await expect(e.getByLabel("Etiquetas por unidad de Marcadores permanentes")).toHaveValue("3");
    await e.getByLabel("Etiquetas por unidad de Marcadores permanentes").fill("4");
    await e.getByLabel("Empezar en la etiqueta número").fill("3");
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ preferCSSPageSize: true });
    await page.emulateMedia({ media: "screen" });
    // Una sola página tamaño carta (8.5 × 11 in = 612 × 792 pt).
    const texto = pdf.toString("latin1");
    expect(texto.match(/\/Type\s*\/Page[^s]/g)?.length).toBe(1);
    expect(texto).toMatch(/\/MediaBox\s*\[\s*0 0 612 792\s*\]/);
  });
});

test.describe("Escaneo al vender", () => {
  test("el código de la caja agrega una caja; el de la unidad sin sueltas abre la ventana", async ({
    page,
  }) => {
    await entrar(page, "empleado");
    await page.goto("/empleado/productos/libreria");
    await expect(page.getByRole("article").first()).toBeVisible();
    const escanear = async (codigo: string) => {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.keyboard.type(codigo, { delay: 8 });
      await page.keyboard.press("Enter");
    };
    await escanear("LIB-0045-P");
    await expect(
      page.getByText("Lápiz Mongol No. 2 (caja) agregado (1 en el carrito)"),
    ).toBeVisible();
    await escanear("LIB-0045");
    await expect(page.getByRole("dialog")).toHaveCount(1);
  });
});
