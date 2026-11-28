import { entrar, expect, pedir, test } from "./ayuda";

test.describe("Pedidos a proveedores", () => {
  test("armar, imprimir, editar, revisar paquete y cerrar", async ({ page, browser }) => {
    await entrar(page, "paola");
    await page.goto("/paola/pedidos");
    const filas = page.getByRole("row");
    await expect(filas.filter({ hasText: "P-0002" }).filter({ hasText: "Por llegar" })).toHaveCount(
      1,
    );
    await expect(
      filas.filter({ hasText: "P-0001" }).filter({ hasText: "Llegó una parte" }),
    ).toHaveCount(1);

    // Nuevo pedido: trae lo que faltó del P-0001, busca uno y agrega algo que no tenemos.
    await page.getByRole("link", { name: "Nuevo pedido" }).click();
    await page.waitForURL("**/pedidos/nuevo");
    const vis = (etiqueta: string) => page.getByLabel(etiqueta).filter({ visible: true });
    await vis("Proveedor").selectOption({ label: "Librería Progreso (mayorista)" });
    await expect(page.getByText("P-0001 · faltan 6 paquetes")).toBeVisible();
    await page.getByRole("button", { name: "Pasar" }).click();
    await expect(page.getByText("Faltaba del P-0001")).toBeVisible();
    await expect(vis("Cantidad de Folder tamaño oficio")).toHaveValue("6");
    await vis("Agregar producto").fill("fomi");
    await vis("Agregar producto").press("Enter");
    await expect(vis("Pedir Pliego de fomi por")).toHaveValue("paquete");
    await vis("Cantidad de Pliego de fomi").fill("3");
    await vis("¿Algo que no tenemos?").fill("Goma blanca 250 ml");
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    await vis("Cantidad de Goma blanca 250 ml").fill("");
    await page.getByRole("button", { name: "Guardar pedido" }).click();
    await expect(page.getByText("Escribe la cantidad").filter({ visible: true })).toBeVisible();
    await vis("Cantidad de Goma blanca 250 ml").fill("6");
    await vis("Notas para el pedido (opcional)").fill("Llamar antes del martes");
    await page.getByRole("button", { name: "Guardar pedido" }).click();
    await expect(page.getByRole("heading", { name: "Pedido P-0003" })).toBeVisible();

    // Hoja para el proveedor: sin precios ni casilla "Vino".
    await page.getByRole("button", { name: "Imprimir lista" }).click();
    const hoja = page.getByRole("dialog", { name: "Pedido P-0003" });
    await expect(hoja.getByText("6 paquetes")).toBeVisible();
    await expect(hoja.getByText("3 bolsas")).toBeVisible();
    await expect(hoja.getByText("Llamar antes del martes")).toBeVisible();
    const textoHoja = await hoja.innerText();
    expect(textoHoja).not.toContain("Q ");
    expect(textoHoja).not.toContain("Vino");
    await page.keyboard.press("Escape");

    // Editar mientras no ha llegado nada (el proveedor no cambia).
    await page.getByRole("link", { name: "Editar" }).click();
    await page.waitForURL("**/editar");
    await expect(vis("Proveedor")).toBeDisabled();
    await vis("Cantidad de Pliego de fomi").fill("4");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Pliego de fomi" })).toContainText(
      "4 bolsas",
    );

    // Revisar el paquete del P-0002: vino una parte, dañadas y un producto nuevo.
    await page.goto("/paola/pedidos");
    await page.getByRole("link", { name: "P-0002" }).click();
    await page.getByRole("button", { name: "Revisar paquete" }).click();
    let d = page.getByRole("dialog");
    const vino = (n: string) =>
      d
        .getByRole("group", { name: `¿Vino ${n}?` })
        .getByRole("button", { name: "Vino", exact: true });
    await vino("Lapicero azul").click();
    await d.getByLabel("Buenas de Lapicero azul").fill("100");
    await expect(d.getByText("faltan 20 unidades")).toBeVisible();
    await vino("Cuaderno universitario").click();
    await expect(d.getByLabel("Costo de Cuaderno universitario")).toHaveValue("9.5");
    await d.getByLabel("Buenas de Cuaderno universitario").fill("10");
    await d.getByLabel("Dañadas de Cuaderno universitario").fill("2");
    await d.getByLabel("Qué tenían las dañadas de Cuaderno universitario").fill("Mojados");
    await d.getByLabel("Costo de Cuaderno universitario").fill("12");
    await vino("Crayones 12 colores").click();
    await d.getByLabel("No. de factura (opcional)").fill("FAC-7001");
    await d.getByRole("button", { name: "Guardar revisión" }).click();
    await expect(d.getByText("Crea el producto antes de guardar")).toBeVisible();

    await d.getByRole("button", { name: "Crear en Librería" }).click();
    const m = page.getByRole("dialog");
    await expect(m.getByLabel("Nombre del producto")).toHaveValue("Crayones 12 colores");
    await expect(m.getByText("Se crea con stock 0")).toBeVisible();
    await m.getByLabel("Costo de compra por unidad (Q)").fill("8");
    await m.getByLabel("Precio de venta (Q)").fill("12");
    await m.getByLabel("Unidades con semáforo lleno").fill("20");
    await m.getByRole("button", { name: "Agregar producto" }).click();
    d = page.getByRole("dialog", { name: /Revisar paquete/ });
    await expect(d.getByLabel("Buenas de Lapicero azul")).toHaveValue("100");
    await expect(d.getByLabel("Costo de Crayones 12 colores")).toHaveValue("8");
    await expect(d.getByText("Q 314.00")).toBeVisible();
    await d.getByRole("button", { name: "Guardar revisión" }).click();

    // Resultado con el aviso del costo y el nuevo precio (no más bajo que el mayoreo).
    const r = page.getByRole("dialog", { name: "Paquete revisado" });
    await expect(r.getByText("1 producto llegó dañado")).toBeVisible();
    await expect(r.getByText("Hoy se vende a Q 15.00")).toBeVisible();
    await r.getByLabel("Nuevo precio por unidad").fill("12");
    await expect(r.getByText("Ganas Q 0.00")).toBeVisible();
    await r.getByRole("button", { name: "Actualizar precio" }).click();
    await expect(r.getByText("debe quedar más barato")).toBeVisible();
    await r.getByLabel("Nuevo precio por unidad").fill("17");
    await r.getByRole("button", { name: "Actualizar precio" }).click();
    await expect(r.getByText("Precio actualizado a Q 17.00")).toBeVisible();
    await r.getByRole("button", { name: "Listo" }).click();
    await expect(page.getByText("FAC-7001")).toBeVisible();
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: "Crayones 12 colores" })
        .filter({ hasText: "Llegó todo" }),
    ).toHaveCount(1);

    // Segunda revisión: el lapicero ya no se pide; luego "Ya no esperar más".
    await page.getByRole("button", { name: "Revisar paquete" }).click();
    d = page.getByRole("dialog");
    await expect(d.getByText("Faltan 20 unidades")).toBeVisible();
    await d
      .getByRole("group", { name: "¿Vino Lapicero azul?" })
      .getByRole("button", { name: "No vino" })
      .click();
    await d.getByText("Ya no se pide").click();
    await d.getByRole("button", { name: "Guardar revisión" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Listo" }).click();
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: "Lapicero azul" })
        .filter({ hasText: "Ya no se espera el resto" }),
    ).toHaveCount(1);
    await page.getByRole("button", { name: "Ya no esperar más" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Ya no esperar" }).click();
    await expect(page.getByRole("button", { name: "Revisar paquete" })).toHaveCount(0);

    // Inventario: precio, costo y stock del cuaderno; crayones creados con lo que vino.
    await page.goto("/paola/productos/libreria");
    const cuaderno = page.getByRole("row").filter({ hasText: "Cuaderno universitario" });
    await expect(cuaderno).toContainText("Q 17.00");
    await expect(cuaderno).toContainText("Q 12.00");
    await expect(cuaderno).toContainText("70 unidades");
    await expect(page.getByRole("row").filter({ hasText: "Crayones 12 colores" })).toContainText(
      "10 unidades",
    );

    // El empleado no hace pedidos ni cambia precios.
    const c = await (await browser.newContext()).newPage();
    await entrar(c, "empleado");
    const r1 = await pedir(c, "POST", "/api/pedidos", {
      proveedorId: "prov-1",
      lineas: [{ productoId: "p-lib-0021", presentacion: "unidad", cantidad: 1 }],
    });
    const r2 = await pedir(c, "POST", "/api/productos/p-lib-0050/precio", {
      presentacion: "unidad",
      precio: 1,
    });
    expect([r1.status(), r2.status()]).toEqual([403, 403]);
    await c.context().close();
  });
});
