import { entrar, expect, hoyGuatemala, pedir, test } from "./ayuda";

test.describe("Devoluciones de clientes", () => {
  test("con comprobante, sin comprobante fuera de plazo y lista de Paola", async ({
    page,
    browser,
  }) => {
    await entrar(page, "empleado");
    const venta = await pedir(page, "POST", "/api/ventas", {
      lineas: [
        { productoId: "p-lib-0050", tipo: "venta", presentacion: "unidad", cantidad: 2 },
        { productoId: "p-tec-0012", tipo: "venta", presentacion: "unidad", cantidad: 1 },
      ],
    });
    const comprobante = (await venta.json()).comprobante;
    const numero = comprobante.id
      .replace(/^V-/, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toUpperCase();
    const usb = comprobante.lineas.find((l: { codigo: string }) =>
      l.codigo.startsWith("TEC"),
    ).precioUnitario;

    await page.goto("/empleado/devoluciones");
    await page.getByLabel("No. del comprobante").fill("ZZZZ9999");
    await page.getByRole("button", { name: "Buscar venta" }).click();
    await expect(page.getByText("No hay ninguna venta con ese número")).toBeVisible();
    await page.getByLabel("No. del comprobante").fill(numero.toLowerCase());
    await page.getByLabel("No. del comprobante").press("Enter");
    await expect(page.getByText("Dentro del plazo: compró hoy")).toBeVisible();
    await expect(page.getByText("Pagó Q 15.00 c/u · puede devolver 2")).toBeVisible();

    const mas = (n: string) => page.getByRole("button", { name: `Más ${n}` });
    const estado = (n: string, e: RegExp) =>
      page.getByRole("radiogroup", { name: `¿Cómo viene ${n}?` }).getByRole("radio", { name: e });
    await mas("Cuaderno universitario").click();
    await mas("Cuaderno universitario").click();
    await expect(mas("Cuaderno universitario")).toBeDisabled();
    await estado("Cuaderno universitario", /Buen estado/).click();
    await mas("Memoria USB 32GB").click();
    await estado("Memoria USB 32GB", /Defectuoso/).click();
    await page.getByLabel("Nota de Memoria USB 32GB").fill("No la reconoce la computadora");

    // El escáner en esta pantalla agrega a "lo que se lleva", no al carrito.
    await page.locator("h2").first().click();
    await page.keyboard.type("LIB-0061\n");
    await expect(page.getByRole("group", { name: "Cantidad de Lapicero azul" })).toBeVisible();
    await expect(page.getByText("Falta escoger")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar cambio" })).toBeDisabled();
    await page.getByRole("button", { name: "Menos Lapicero azul" }).click();

    const llevar = page.getByLabel("El mismo producto u otro");
    await llevar.fill("Memoria USB");
    await llevar.press("Enter");
    await llevar.fill("resma");
    await llevar.press("Enter");
    const diferencia = (42 + usb - (30 + usb)).toFixed(2);
    await expect(page.getByText("El cliente paga la diferencia")).toBeVisible();
    await expect(page.getByText(`Q ${diferencia}`).first()).toBeVisible();
    await page.getByRole("button", { name: "Confirmar cambio" }).click();
    let ticket = page.getByRole("dialog", { name: "Comprobante de cambio" });
    await expect(ticket.getByText("Cambio registrado")).toBeVisible();
    await expect(ticket.getByText("PAGÓ")).toBeVisible();
    const descarga = page.waitForEvent("download");
    await ticket.getByRole("button", { name: "PDF" }).click();
    expect((await descarga).suggestedFilename()).toMatch(/^comprobante-cambio-pc-coca-D-/);
    await ticket.getByRole("button", { name: "Nueva devolución" }).click();

    // La misma venta ya no se puede devolver otra vez.
    await page.getByLabel("No. del comprobante").fill(numero);
    await page.getByLabel("No. del comprobante").press("Enter");
    await expect(page.getByText("Ya se devolvió completo")).toHaveCount(2);

    // Sin comprobante y fuera de plazo: necesita autorización; cambio exacto.
    await page.getByRole("radio", { name: "Sin comprobante" }).click();
    await page.getByLabel("¿Cuándo lo compró?").fill(hoyGuatemala(-6));
    await page.getByLabel("Producto que devuelve").fill("LIB-0045-P");
    await page.getByLabel("Producto que devuelve").press("Enter");
    await expect(page.getByText("Precio actual Q 22.00 c/u")).toBeVisible();
    await expect(page.getByText("Pasaron 6 días")).toBeVisible();
    await estado("Lápiz Mongol No. 2", /Buen estado/).click();
    await llevar.fill("LIB-0045-P");
    await llevar.press("Enter");
    await expect(page.getByText("Cambio exacto")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar cambio" })).toBeDisabled();
    await page.getByLabel("¿Quién autorizó?").selectOption("Paola");
    await page.getByLabel("Motivo de la autorización").fill("Cliente frecuente");
    await page.getByRole("button", { name: "Confirmar cambio" }).click();
    ticket = page.getByRole("dialog", { name: "Comprobante de cambio" });
    await expect(ticket.getByText("CAMBIO EXACTO")).toBeVisible();
    await ticket.getByRole("button", { name: "Nueva devolución" }).click();

    // Paola ve las dos devoluciones y el historial del producto.
    const pa = await (
      await browser.newContext({ viewport: { width: 1440, height: 900 } })
    ).newPage();
    await entrar(pa, "paola");
    await pa.goto("/paola/devoluciones");
    await expect(pa.getByRole("row")).toHaveCount(3);
    await expect(pa.getByText("Defectuoso", { exact: true })).toBeVisible();
    await expect(pa.getByText("Cliente frecuente")).toBeVisible();
    const h = await (await pa.request.get("/api/productos/p-lib-0050/historial")).json();
    expect(h.eventos[0]).toMatchObject({ tipo: "devolucion", cambio: { unidades: 2 } });
    expect((await pedir(pa, "POST", "/api/devoluciones", {})).status()).toBe(403);
    await pa.context().close();
  });
});
