import { entrar, expect, pedir, test } from "./ayuda";

test.describe("Catálogo de trámites (Paola)", () => {
  test("editar precios y requisitos, crear, desactivar y módulos", async ({ page, browser }) => {
    await entrar(page, "paola");
    await page.goto("/paola/tramites");
    const tarjeta = (nombre: string) =>
      page
        .locator("article")
        .filter({ has: page.getByRole("heading", { name: nombre, exact: true }) });

    // Sin precio → precio fijo, con requisitos en orden.
    await page.getByRole("button", { name: /Sin precio/ }).click();
    const n = await page.locator("article").count();
    expect(n).toBeGreaterThanOrEqual(3);
    await expect(page.getByText("Por confirmar")).toHaveCount(n);
    await page.getByRole("button", { name: "Editar Registro de pequeño contribuyente" }).click();
    let d = page.getByRole("dialog");
    await d.getByRole("radio", { name: "Fijo" }).click();
    await d.getByLabel("Precio (Q)").fill("150");
    await d.getByRole("button", { name: "DPI escaneado (ambos lados)" }).click();
    await d.getByLabel("Nuevo requisito").fill("Fotografía reciente");
    await d.getByLabel("Nuevo requisito").press("Enter");
    await d.getByLabel("Nuevo requisito").fill("dpi escaneado (AMBOS lados)");
    await d.getByRole("button", { name: "Agregar", exact: true }).click();
    await expect(d.getByText("Ese requisito ya está en la lista")).toBeVisible();
    await d.getByLabel("Nuevo requisito").fill("");
    await d.getByRole("button", { name: "Bajar DPI escaneado (ambos lados)" }).click();
    await expect(d.getByText("Así lo verá el empleado: Q 150.00")).toBeVisible();
    await d.getByRole("button", { name: "Guardar cambios" }).click();
    await page.getByRole("button", { name: /Sin precio/ }).click();
    const texto = await tarjeta("Registro de pequeño contribuyente").innerText();
    expect(texto).toContain("Q 150.00");
    expect(texto).toContain("Antes Pendiente");
    expect(texto.indexOf("Fotografía reciente")).toBeLessThan(texto.indexOf("DPI escaneado"));

    // Cambio de precio con historial.
    await page.getByRole("button", { name: "Editar NIT por primera vez" }).click();
    d = page.getByRole("dialog");
    await d.getByLabel("Precio (Q)").fill("90");
    await d.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(tarjeta("NIT por primera vez")).toContainText("Antes Q 80.00");
    await page.getByRole("button", { name: "Editar NIT por primera vez" }).click();
    await expect(page.getByRole("dialog").getByText(/Paola: Q 80.00 → Q 90.00/)).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();

    // Nuevo trámite en RENAP: no repite nombre y valida el rango.
    await page.getByRole("tab", { name: /RENAP/ }).click();
    await page.getByRole("button", { name: "Nuevo trámite" }).click();
    d = page.getByRole("dialog");
    await expect(d.getByLabel("Módulo")).toHaveValue("renap");
    await d.getByLabel("Nombre del trámite").fill("certificado de NACIMIENTO");
    await d.getByLabel("Precio (Q)").fill("30");
    await d.getByRole("button", { name: "Agregar trámite" }).click();
    await expect(d.getByText('Ya existe "Certificado de nacimiento" en ese módulo')).toBeVisible();
    await d.getByLabel("Nombre del trámite").fill("DPI por primera vez");
    await d.getByRole("radio", { name: "Rango" }).click();
    await d.getByLabel("Desde (Q)").fill("80");
    await d.getByLabel("Hasta (Q)").fill("50");
    await d.getByRole("button", { name: "Agregar trámite" }).click();
    await expect(d.getByText("El máximo debe ser mayor al mínimo")).toBeVisible();
    await d.getByLabel("Hasta (Q)").fill("120");
    await d.getByRole("button", { name: "Agregar trámite" }).click();
    await expect(tarjeta("DPI por primera vez")).toContainText("Q 80.00 – Q 120.00");

    // Desactivar: sale de la vista y se ve con "Ver desactivados".
    await page.getByRole("button", { name: "Desactivar Certificado de defunción" }).click();
    await expect(tarjeta("Certificado de defunción")).toHaveCount(0);
    await page.getByText(/Ver desactivados/).click();
    await expect(tarjeta("Certificado de defunción")).toContainText("Desactivado");

    // Módulos: no se elimina uno con trámites; se crea, se mueve, se renombra y se elimina.
    await page.getByRole("button", { name: "Módulos" }).click();
    d = page.getByRole("dialog");
    await expect(d.getByRole("button", { name: "Eliminar RENAP" })).toBeDisabled();
    await d.getByLabel("Nombre del nuevo módulo").fill("MINTRAB");
    await d.getByLabel("Nombre del nuevo módulo").press("Enter");
    await expect(d.getByText("MINTRAB")).toBeVisible();
    await d.getByRole("button", { name: "Subir MINTRAB" }).click();
    await d.getByRole("button", { name: "Cambiar nombre de MINTRAB" }).click();
    await d.getByLabel("Nuevo nombre de MINTRAB").fill("Ministerio de Trabajo");
    await d.getByLabel("Nuevo nombre de MINTRAB").press("Enter");
    await d.getByRole("button", { name: "Listo" }).click();
    const pestanas = await page.getByRole("tab").allInnerTexts();
    expect(pestanas.map((t) => t.split(" (")[0]!.trim()).slice(-2)).toEqual([
      "Ministerio de Trabajo",
      "Otros",
    ]);
    await page.getByRole("button", { name: "Módulos" }).click();
    d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Eliminar Ministerio de Trabajo" }).click();
    await expect(d.getByText("Ministerio de Trabajo")).toHaveCount(0);
    await d.getByRole("button", { name: "Listo" }).click();

    // El empleado ve los cambios y no puede editar el catálogo.
    const c = await (
      await browser.newContext({ viewport: { width: 1440, height: 900 } })
    ).newPage();
    await entrar(c, "empleado");
    await c.goto("/empleado/tramites");
    const tarjetaEmpleado = (nombre: string) =>
      c.locator("article").filter({ has: c.getByRole("heading", { name: nombre, exact: true }) });
    await expect(tarjetaEmpleado("NIT por primera vez")).toContainText("Q 90.00");
    await c.getByRole("tab", { name: /RENAP/ }).click();
    await expect(tarjetaEmpleado("Certificado de defunción")).toHaveCount(0);
    await expect(tarjetaEmpleado("DPI por primera vez")).toHaveCount(1);
    expect((await pedir(c, "POST", "/api/tramites", {})).status()).toBe(403);
    await c.context().close();
  });
});
