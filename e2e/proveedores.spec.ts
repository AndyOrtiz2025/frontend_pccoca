import { entrar, expect, hoyGuatemala, pedir, test } from "./ayuda";

test.describe("Proveedores, compras y reclamos", () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, "paola");
    await page.goto("/paola/proveedores");
  });

  test("lista con días de visita y alta con validación de NIT", async ({ page }) => {
    await expect(page.getByText("1 reclamo")).toBeVisible();
    await expect(page.getByText("Pasa martes y viernes")).toBeVisible();
    await expect(page.getByText("Pasa los martes")).toBeVisible();

    await page.getByRole("button", { name: "Nuevo proveedor" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Nombre").fill("Papelería Xela");
    await d.getByLabel("NIT (opcional)").fill("12-34-K");
    await d.getByRole("button", { name: "Agregar proveedor" }).click();
    await expect(d.getByText("NIT no válido")).toBeVisible();
    await d.getByLabel("NIT (opcional)").fill("382901-K");
    await d.getByRole("button", { name: "Viernes" }).click();
    await d.getByLabel("Productos Varios").check();
    await d.getByRole("button", { name: "Agregar proveedor" }).click();
    await expect(page.getByText("Papelería Xela").first()).toBeVisible();

    // Inactivo: no deja registrar compras ni aparece al elegir proveedor de un producto.
    await page.getByRole("link", { name: "Papelería Xela" }).first().click();
    await page.getByRole("button", { name: "Inactivar" }).click();
    await page.getByRole("button", { name: "Sí, inactivar" }).click();
    await expect(page.getByRole("button", { name: "Reactivar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar compra" })).toBeDisabled();
    await page.goto("/paola/productos/libreria");
    await page.getByRole("button", { name: "Nuevo producto" }).click();
    const opciones = await page
      .getByRole("dialog")
      .getByLabel("Proveedor")
      .locator("option")
      .allInnerTexts();
    expect(opciones).toContain("Importadora Xela");
    expect(opciones).not.toContain("Papelería Xela");
  });

  test("compra con dañadas: suma al stock, reclamo, último costo e historial", async ({ page }) => {
    await page.getByRole("button", { name: "Registrar compra" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Proveedor").selectOption({ label: "Importadora Xela" });
    const buscar = d.getByLabel("Agregar producto");
    await buscar.fill("LIB-0045-P");
    await buscar.press("Enter");
    await expect(d.getByLabel("Cómo viene Lápiz Mongol No. 2")).toHaveValue("paquete");
    await expect(d.getByLabel("Costo de Lápiz Mongol No. 2")).toHaveValue("18");
    await buscar.fill("LIB-0045-P");
    await buscar.press("Enter");
    await expect(d.getByLabel("Buenas de Lápiz Mongol No. 2")).toHaveValue("2");
    await d.getByLabel("Buenas de Lápiz Mongol No. 2").fill("9");
    await d.getByLabel("Dañadas de Lápiz Mongol No. 2").fill("1");
    await d.getByLabel("Qué tenían las dañadas de Lápiz Mongol No. 2").fill("Mojada");
    await d.getByLabel("Costo de Lápiz Mongol No. 2").fill("20");
    await buscar.fill("resma");
    await page
      .getByRole("listbox", { name: "Productos encontrados" })
      .getByRole("option")
      .first()
      .click();
    await d.getByLabel("Buenas de Hojas carta 75g (resma)").fill("5");
    await expect(d.getByText("Q 365.00")).toBeVisible();
    await d.getByLabel("No. de factura (opcional)").fill("FAC-9001");
    await d.getByRole("button", { name: "Guardar compra" }).click();

    const r = page.getByRole("dialog");
    await expect(r.getByText("1 producto llegó dañado")).toBeVisible();
    await expect(r.getByText("subió de Q 18.00 a Q 20.00")).toBeVisible();
    await r.getByRole("button", { name: "Listo" }).click();

    // Reclamos: reposición y reembolso (no mayor a lo que costó).
    await page.getByRole("link", { name: "Importadora Xela" }).first().click();
    await expect(page.getByText("FAC-9001").first()).toBeVisible();
    const repusieron = page.getByRole("button", { name: "Nos repusieron" });
    await expect(repusieron).toHaveCount(2);
    await repusieron.first().click();
    await expect(repusieron).toHaveCount(1);
    await page.getByRole("button", { name: "Nos devolvieron dinero" }).first().click();
    await page.getByLabel("Monto del reembolso").fill("50");
    await page.getByRole("button", { name: "Registrar reembolso" }).click();
    await expect(page.getByText("no puede ser mayor")).toBeVisible();
    await page.getByLabel("Monto del reembolso").fill("18");
    await page.getByRole("button", { name: "Registrar reembolso" }).click();
    await expect(page.getByText("Nos devolvieron el dinero Q 18.00")).toBeVisible();

    // Inventario: 20 + 9 buenas + 1 repuesta = 30 cajas; costo por lápiz 20 ÷ 12.
    await page.goto("/paola/productos/libreria");
    const fila = page.getByRole("row").filter({ hasText: "Lápiz Mongol" });
    await expect(fila).toContainText("30 cajas");
    await expect(fila).toContainText("Q 1.67");
    await page.getByRole("button", { name: "Historial de Lápiz Mongol No. 2" }).click();
    const h = page.getByRole("dialog");
    await expect(h.getByText("Reposición del proveedor")).toBeVisible();
    await expect(h.getByText("+9 cajas")).toBeVisible();
    await expect(h.getByText("Importadora Xela · FAC-9001")).toBeVisible();
  });

  test("el empleado no registra compras ni ve el historial", async ({ browser }) => {
    const c = await (await browser.newContext()).newPage();
    await entrar(c, "empleado");
    const compra = await pedir(c, "POST", "/api/compras", {
      proveedorId: "prov-3",
      fecha: hoyGuatemala(),
      lineas: [
        {
          productoId: "p-lib-0021",
          presentacion: "unidad",
          cantidad: 1,
          danadas: 0,
          costoUnitario: 1,
        },
      ],
    });
    expect(compra.status()).toBe(403);
    expect((await c.request.get("/api/productos/p-lib-0021/historial")).status()).toBe(403);
    await c.goto("/paola/proveedores");
    await expect(c).toHaveURL(/\/empleado$/);
    await c.context().close();
  });
});
