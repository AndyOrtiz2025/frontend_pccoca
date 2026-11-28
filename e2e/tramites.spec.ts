import { entrar, expect, pedir, test } from "./ayuda";

test.describe("Trámites y servicios: del empleado a Paola y de vuelta", () => {
  test("catálogo del empleado y entradas con validación", async ({ page }) => {
    await entrar(page, "empleado");
    await page.goto("/empleado/tramites");
    await expect(page.getByRole("tab", { name: "SAT (10)" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("article")).toHaveCount(10);
    await expect(page.getByText("Q 35.00 si es solo ratificación")).toBeVisible();
    await expect(page.getByText("Q 700.00 – Q 1,000.00")).toBeVisible();
    await page.getByRole("searchbox", { name: "Buscar trámite" }).fill("cedula");
    await expect(page.getByRole("article")).toHaveCount(3);
    await page.getByRole("searchbox", { name: "Buscar trámite" }).fill("");

    await page
      .getByRole("button", { name: "Enviar entrada: Actualización de NIT", exact: true })
      .click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Tipo de trámite")).toHaveValue("sat-act-nit");
    await d.getByRole("button", { name: "Enviar a Paola" }).click();
    await expect(d.getByText("Escribe el nombre del cliente")).toBeVisible();
    await d.getByLabel("Nombre del cliente").fill("María López");
    await d.getByLabel("Teléfono (opcional)").fill("123");
    await d.getByRole("button", { name: "Enviar a Paola" }).click();
    await expect(d.getByText("Teléfono de 8 dígitos")).toBeVisible();
    await d.getByLabel("Teléfono (opcional)").fill("5412-8890");
    await d.getByLabel("DPI escaneado (ambos lados)").check();
    await d.getByRole("radio", { name: "Cancelado", exact: true }).click();
    await d.getByRole("button", { name: "Enviar a Paola" }).click();
    await expect(page.getByText("Entrada enviada a Paola: Actualización de NIT")).toBeVisible();

    await page.goto("/empleado/servicios");
    await expect(page.getByRole("article")).toHaveCount(7);
    await page.getByRole("button", { name: "Enviar entrada de servicio técnico" }).click();
    const s = page.getByRole("dialog");
    await s.getByRole("button", { name: "Enviar a Oscar" }).click();
    await expect(s.getByText("Elige el tipo de equipo")).toBeVisible();
    await s.getByLabel("Cliente").fill("Juan Pérez");
    await s.getByLabel("Tipo de equipo").selectOption("Laptop");
    await s.getByLabel("Falla reportada o servicio que pide").fill("Se calienta y se apaga");
    await s.getByLabel("Cargador").check();
    await s.getByRole("button", { name: "Enviar a Oscar" }).click();
    await expect(page.getByText("Entrada enviada a Oscar: Laptop de Juan Pérez")).toBeVisible();
  });

  test("entrada con archivo: Paola la procesa y el empleado la entrega", async ({
    page,
    browser,
  }) => {
    // Carlos manda la entrada.
    await entrar(page, "empleado");
    await page.goto("/empleado/tramites");
    await page.getByRole("button", { name: "Enviar entrada de trámite" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Nombre del cliente").fill("Lucía Pérez");
    await d.getByLabel("Tipo de trámite").selectOption("renap-def");
    await d.getByRole("radio", { name: "No cancelado" }).click();
    await d.locator("input[type=file]").setInputFiles({
      name: "dpi.png",
      mimeType: "image/png",
      buffer: Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.alloc(64)]),
    });
    await d.getByLabel("Datos del cliente (opcional)").fill("Correo: lucia@gmail.com");
    await d.getByLabel("Notas (opcional)").fill("Urge para el lunes");
    await d.getByRole("button", { name: "Enviar a Paola" }).click();
    await expect(page.getByText("Entrada enviada").first()).toBeVisible();

    // Paola la revisa, descarga el archivo y la pasa a En proceso.
    const pa = await (
      await browser.newContext({ viewport: { width: 1440, height: 900 } })
    ).newPage();
    await entrar(pa, "paola");
    await pa.goto("/paola/tramites/entradas");
    await expect(pa.getByRole("link", { name: "Entradas" })).toContainText("3");
    await pa.getByRole("button", { name: "Lucía Pérez" }).click();
    await expect(pa.getByText("Correo: lucia@gmail.com")).toBeVisible();
    await expect(pa.getByRole("link", { name: "Entradas" })).toContainText("2");
    const descarga = pa.waitForEvent("download");
    await pa.getByRole("link", { name: "dpi.png" }).click();
    expect((await descarga).suggestedFilename()).toBe("dpi.png");
    await pa.getByRole("button", { name: "Pasar a En proceso" }).click();
    await expect(pa.getByText("Lucía Pérez pasó a En proceso")).toBeVisible();

    await pa.goto("/paola/tramites/en-proceso");
    await pa.getByRole("cell", { name: "Lucía Pérez" }).click();
    await pa.getByRole("button", { name: "Cambiar", exact: true }).click();
    await pa.getByLabel("Total (Q)").fill("35");
    await pa.getByRole("button", { name: "Guardar precio" }).click();
    await expect(pa.getByText("Q 35.00").first()).toBeVisible();
    await pa.getByLabel("Nueva nota").fill("Ya se pidió en RENAP");
    await pa.getByRole("button", { name: "Agregar nota" }).click();
    await expect(pa.getByText("Ya se pidió en RENAP")).toBeVisible();
    await pa.getByRole("radio", { name: "Listo" }).click();
    await expect(pa.getByText("Listo para entregar: el mostrador")).toBeVisible();

    // Carlos la ve lista con el precio, ve la nota pero no los datos del cliente.
    await page.goto("/empleado");
    await expect(page.getByRole("row").filter({ hasText: "Lucía Pérez" })).toContainText("Q 35.00");
    await page.goto("/empleado/seguimiento/tramites");
    await page.getByRole("cell", { name: "Lucía Pérez" }).click();
    await expect(page.getByText("Ya se pidió en RENAP")).toBeVisible();
    await expect(page.getByText("Correo: lucia")).toHaveCount(0);
    const html = await (await page.request.get("/empleado/seguimiento/tramites")).text();
    expect(html).not.toContain("lucia@gmail.com");

    // Permisos.
    expect((await pedir(page, "POST", "/api/entradas/en-1/convertir")).status()).toBe(403);
    expect((await page.request.get("/api/archivos/AR-demo-dpi")).status()).toBe(403);
    expect(
      (await pedir(pa, "POST", "/api/procesos/sp-1/estado", { estado: "listo" })).status(),
    ).toBe(409);
    expect(
      (await pedir(pa, "POST", "/api/procesos/tp-1/estado", { estado: "entregado" })).status(),
    ).toBe(400);
    await pa.context().close();
  });

  test("historial de entregados y descartados, y vaciarlo", async ({ page, browser }) => {
    await entrar(page, "empleado");
    await page
      .getByRole("row")
      .filter({ hasText: "María López" })
      .getByRole("button", { name: "Entregar" })
      .click();
    await page.getByRole("button", { name: "Sí, marcar entregado" }).click();
    await expect(page.getByText("Entregado a María López")).toBeVisible();

    const pa = await (
      await browser.newContext({ viewport: { width: 1440, height: 900 } })
    ).newPage();
    await entrar(pa, "paola");
    await pa.goto("/paola/tramites/entradas");
    await pa.getByRole("button", { name: "Rosa Méndez" }).click();
    await pa.getByRole("button", { name: "Descartar" }).click();
    await pa.getByRole("button", { name: "Sí, descartar" }).click();
    await expect(pa.getByRole("button", { name: "Rosa Méndez" })).toHaveCount(0);

    await pa.goto("/paola/tramites/en-proceso");
    await expect(pa.getByRole("row").filter({ hasText: "María López" })).toContainText("Carlos");
    await pa.getByRole("tab", { name: "Descartadas" }).click();
    await expect(pa.getByRole("row").filter({ hasText: "Rosa Méndez" })).toHaveCount(1);
    await pa.getByRole("button", { name: "Vaciar historial" }).click();
    await expect(pa.getByRole("dialog").getByText("fin de mes")).toBeVisible();
    await pa.getByRole("button", { name: "Sí, vaciar" }).click();
    await expect(pa.getByText("Historial vaciado")).toBeVisible();
    await expect(pa.getByRole("button", { name: "Vaciar historial" })).toBeDisabled();
    expect((await pedir(page, "POST", "/api/historial/vaciar")).status()).toBe(403);
    await pa.context().close();
  });
});
