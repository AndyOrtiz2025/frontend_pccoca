import { entrar, expect, pedir, test } from "./ayuda";

test.describe("Clientes frecuentes (Paola)", () => {
  test("crear un cliente, agregar datos con formato, contraseña, archivo y nota", async ({
    page,
  }) => {
    await entrar(page, "paola");
    await page.goto("/paola/clientes");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    let d = page.getByRole("dialog");
    await d.getByLabel("Nombre del cliente").fill("Lucía Méndez");
    await d.getByRole("button", { name: "Crear cliente" }).click();
    await page.waitForURL(/\/paola\/clientes\/CF-/);
    await expect(page.getByRole("heading", { name: "Lucía Méndez" })).toBeVisible();

    // DPI: los espacios se ponen solos y no deja escribir más de 13 números.
    await page.getByRole("button", { name: "Agregar dato" }).click();
    d = page.getByRole("dialog");
    await d.getByLabel("¿Qué dato es?").fill("DPI");
    await d.getByLabel("Valor").fill("15882568413069999");
    await expect(d.getByLabel("Valor")).toHaveValue("1588 25684 1306");
    await d.getByRole("button", { name: "Guardar" }).click();
    const datos = page.getByRole("list", { name: "Datos del cliente" });
    await expect(datos).toContainText("1588 25684 1306");

    // Teléfono incompleto: no se guarda.
    await page.getByRole("button", { name: "Agregar dato" }).click();
    d = page.getByRole("dialog");
    await d.getByLabel("¿Qué dato es?").fill("Teléfono");
    await d.getByLabel("Valor").fill("5412889");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d.getByText("El teléfono lleva 8 números")).toBeVisible();
    await d.getByLabel("Valor").fill("54128890");
    await expect(d.getByLabel("Valor")).toHaveValue("5412-8890");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(datos).toContainText("5412-8890");

    // Dato libre que no estaba en ninguna lista.
    await page.getByRole("button", { name: "Agregar dato" }).click();
    d = page.getByRole("dialog");
    await d.getByLabel("¿Qué dato es?").fill("Contador");
    await d.getByLabel("Valor").fill("Lic. Mario Pérez");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(datos).toContainText("Lic. Mario Pérez");

    // Contraseña nueva: máximo 24 caracteres; sale tapada y se muestra con el ojo.
    await page.getByRole("button", { name: "Agregar contraseña" }).click();
    d = page.getByRole("dialog");
    await d.getByLabel("¿De qué es?").fill("Banco Industrial en línea");
    await d.getByLabel("Usuario o correo (opcional)").fill("lmendez");
    await d.getByLabel("Contraseña", { exact: true }).fill("x".repeat(30));
    await expect(d.getByLabel("Contraseña", { exact: true })).toHaveValue("x".repeat(24));
    await d.getByLabel("Contraseña", { exact: true }).fill("Bi.Lucia2026");
    await d.getByRole("button", { name: "Guardar" }).click();
    const contrasenas = page.getByRole("list", { name: "Contraseñas del cliente" });
    await expect(contrasenas).toContainText("Banco Industrial en línea");
    await expect(contrasenas).not.toContainText("Bi.Lucia2026");
    await page
      .getByRole("button", { name: "Mostrar contraseña de Banco Industrial en línea" })
      .click();
    await expect(contrasenas).toContainText("Bi.Lucia2026");

    // Se cambió la contraseña: se edita.
    await page
      .getByRole("button", { name: "Editar contraseña de Banco Industrial en línea" })
      .click();
    d = page.getByRole("dialog");
    await d.getByLabel("Nueva contraseña").fill("Nueva.2027");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Contraseña actualizada")).toBeVisible();
    await expect(contrasenas).not.toContainText("Bi.Lucia2026");
    await page
      .getByRole("button", { name: "Mostrar contraseña de Banco Industrial en línea" })
      .click();
    await expect(contrasenas).toContainText("Nueva.2027");

    // Archivo
    await page.locator("input[type=file]").setInputFiles({
      name: "dpi.png",
      mimeType: "image/png",
      buffer: Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.alloc(64)]),
    });
    await page.getByRole("button", { name: "Guardar archivo" }).click();
    await expect(page.getByRole("list", { name: "Archivos del cliente" })).toContainText("dpi.png");

    // Nota
    await page.getByLabel("Nueva nota").fill("Viene los lunes");
    await page.getByRole("button", { name: "Agregar nota" }).click();
    await expect(page.getByRole("list", { name: "Notas del cliente" })).toContainText(
      "Viene los lunes",
    );

    // En la lista se encuentra por el DPI escrito sin espacios.
    await page.getByRole("link", { name: "Todos los clientes" }).click();
    await page.getByLabel("Buscar cliente").fill("1588256841306");
    await expect(page.getByRole("link", { name: "Lucía Méndez" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pedro Gómez" })).toHaveCount(0);
  });

  test("desactivar y reactivar un cliente", async ({ page }) => {
    await entrar(page, "paola");
    await page.goto("/paola/clientes/cf-2");
    await page.getByRole("button", { name: "Desactivar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Desactivar" }).click();
    await expect(page.getByText("Este cliente está desactivado")).toBeVisible();
    await expect(page.getByRole("button", { name: "Agregar dato" })).toHaveCount(0);
    await page.getByRole("button", { name: "Reactivar" }).click();
    await expect(page.getByRole("button", { name: "Agregar dato" })).toBeVisible();
  });

  test("el empleado no puede ver clientes ni contraseñas", async ({ page }) => {
    await entrar(page, "empleado");
    expect((await pedir(page, "POST", "/api/clientes", { nombre: "X" })).status()).toBe(403);
    expect((await pedir(page, "GET", "/api/clientes/cf-1/contrasenas/pc-1")).status()).toBe(403);
    await page.goto("/paola/clientes/cf-1");
    await expect(page).not.toHaveURL(/\/paola\/clientes/);
    await expect(page.getByText("1588 25684 1306")).toHaveCount(0);
  });
});
