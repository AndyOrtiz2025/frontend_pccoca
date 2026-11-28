import { beforeEach, describe, expect, it } from "vitest";
import { ReglaNegocioError, SinPermisoError } from "./api";
import {
  agregarContrasena,
  agregarDato,
  agregarNotaCliente,
  cambiarActivoCliente,
  crearCliente,
  editarContrasena,
  editarDato,
  obtenerClientes,
  obtenerFichaCliente,
  quitarArchivoCliente,
  quitarContrasena,
  quitarDato,
  quitarNotaCliente,
  renombrarCliente,
  subirArchivosCliente,
  verContrasena,
} from "./api-clientes";
import { almacen, reiniciarAlmacen } from "./mocks/store";
import {
  coincideCliente,
  formatearDpi,
  formatearMientrasEscribe,
  largoMaximo,
  sugerencias,
  tipoDeDato,
  validarDato,
} from "./reglas/clientes";
import {
  clienteSchema,
  contrasenaClienteSchema,
  datoClienteSchema,
  editarContrasenaSchema,
  notaClienteSchema,
} from "@/schemas/cliente.schema";

beforeEach(() => reiniciarAlmacen());

const ahora = new Date("2026-11-28T18:00:00Z");
const pdf = new TextEncoder().encode("%PDF-1.4 prueba");

describe("reglas de datos del cliente", () => {
  it("reconoce el tipo por el nombre que escribe Paola", () => {
    expect(tipoDeDato("DPI")).toBe("dpi");
    expect(tipoDeDato("dpi del papá")).toBe("dpi");
    expect(tipoDeDato("Teléfono")).toBe("telefono");
    expect(tipoDeDato("Celular de su hija")).toBe("telefono");
    expect(tipoDeDato("NIT")).toBe("nit");
    expect(tipoDeDato("Correo")).toBe("correo");
    expect(tipoDeDato("Contador")).toBe("texto");
    expect(tipoDeDato("Dirección")).toBe("texto");
  });

  it("arma el DPI con espacios mientras se escribe", () => {
    expect(formatearDpi("1588256841306")).toBe("1588 25684 1306");
    expect(formatearDpi("15882")).toBe("1588 2");
    expect(formatearDpi("1588-25684-1306-99abc")).toBe("1588 25684 1306");
    expect(formatearMientrasEscribe("DPI", "1588a2568")).toBe("1588 2568");
    expect(formatearMientrasEscribe("Teléfono", "541288901")).toBe("5412-8890");
    expect(formatearMientrasEscribe("NIT", "4492019-k!")).toBe("4492019-K");
    expect(formatearMientrasEscribe("Contador", "Lic. Pérez")).toBe("Lic. Pérez");
  });

  it("limita el largo según el tipo", () => {
    expect(largoMaximo("DPI")).toBe(15);
    expect(largoMaximo("Teléfono")).toBe(9);
    expect(largoMaximo("NIT")).toBe(15);
    expect(largoMaximo("Contador")).toBe(120);
  });

  it("el DPI solo acepta 13 números", () => {
    expect(validarDato("DPI", "1588 25684 1306")).toEqual({ ok: true, valor: "1588 25684 1306" });
    expect(validarDato("DPI", "1588256841306")).toEqual({ ok: true, valor: "1588 25684 1306" });
    expect(validarDato("DPI", "1588 25684 130").ok).toBe(false);
    expect(validarDato("DPI", "1588 25684 13066").ok).toBe(false);
    expect(validarDato("DPI", "abcd efghi jklm").ok).toBe(false);
  });

  it("el teléfono solo acepta 8 números", () => {
    expect(validarDato("Teléfono", "54128890")).toEqual({ ok: true, valor: "5412-8890" });
    expect(validarDato("Celular", "5412 8890")).toEqual({ ok: true, valor: "5412-8890" });
    expect(validarDato("Teléfono", "5412889").ok).toBe(false);
    expect(validarDato("Teléfono", "541288901").ok).toBe(false);
  });

  it("revisa NIT, correo y texto libre", () => {
    expect(validarDato("NIT", "4492019-k")).toEqual({ ok: true, valor: "4492019-K" });
    expect(validarDato("NIT", "CF")).toEqual({ ok: true, valor: "CF" });
    expect(validarDato("NIT", "44-92-01").ok).toBe(false);
    expect(validarDato("Correo", "Ana@Gmail.com")).toEqual({ ok: true, valor: "ana@gmail.com" });
    expect(validarDato("Correo", "ana@").ok).toBe(false);
    expect(validarDato("Contador", "  Lic. Pérez ")).toEqual({ ok: true, valor: "Lic. Pérez" });
    expect(validarDato("Contador", "x".repeat(121)).ok).toBe(false);
    expect(validarDato("Contador", "   ").ok).toBe(false);
  });

  it("sugiere sin repetir, ignorando tildes y mayúsculas", () => {
    expect(sugerencias(["DPI", "Teléfono"], ["telefono", "Contador", "contador ", ""])).toEqual([
      "DPI",
      "Teléfono",
      "Contador",
    ]);
  });

  it("busca en el nombre y en los datos, con o sin espacios en los números", () => {
    const c = {
      nombre: "Ana Ramírez",
      datos: [{ valor: "1588 25684 1306" }, { valor: "5412-8890" }],
    };
    expect(coincideCliente(c, "")).toBe(true);
    expect(coincideCliente(c, "ramirez")).toBe(true);
    expect(coincideCliente(c, "1588256841306")).toBe(true);
    expect(coincideCliente(c, "54128890")).toBe(true);
    expect(coincideCliente(c, "1588 25684")).toBe(true);
    expect(coincideCliente(c, "Pedro")).toBe(false);
    expect(coincideCliente(c, "99")).toBe(false);
  });
});

describe("validaciones (schemas)", () => {
  it("el cliente solo pide nombre", () => {
    expect(clienteSchema.safeParse({ nombre: "Ana" }).success).toBe(true);
    expect(clienteSchema.safeParse({ nombre: " A " }).success).toBe(false);
    expect(clienteSchema.safeParse({ nombre: "x".repeat(81) }).success).toBe(false);
  });

  it("el dato se valida según su nombre y queda con formato", () => {
    const r = datoClienteSchema.safeParse({ nombre: "DPI", valor: "1588256841306" });
    expect(r.success && r.data.valor).toBe("1588 25684 1306");
    const malo = datoClienteSchema.safeParse({ nombre: "DPI", valor: "123" });
    expect(malo.success).toBe(false);
    expect(malo.error?.issues[0]?.path).toEqual(["valor"]);
    expect(datoClienteSchema.safeParse({ nombre: "", valor: "x" }).success).toBe(false);
    expect(datoClienteSchema.safeParse({ nombre: "x".repeat(41), valor: "x" }).success).toBe(false);
  });

  it("la contraseña tiene máximo 24 caracteres", () => {
    const base = { servicio: "Agencia Virtual SAT", usuario: "", nota: "" };
    const r = contrasenaClienteSchema.safeParse({ ...base, contrasena: "x".repeat(24) });
    expect(r.success).toBe(true);
    expect(r.success && r.data.usuario).toBeUndefined();
    expect(contrasenaClienteSchema.safeParse({ ...base, contrasena: "x".repeat(25) }).success).toBe(
      false,
    );
    expect(contrasenaClienteSchema.safeParse({ ...base, contrasena: "   " }).success).toBe(false);
    expect(
      contrasenaClienteSchema.safeParse({ ...base, servicio: "", contrasena: "a" }).success,
    ).toBe(false);
  });

  it("al editar, la contraseña vacía conserva la anterior", () => {
    const r = editarContrasenaSchema.safeParse({ servicio: "RENAP", contrasena: "" });
    expect(r.success && r.data.contrasena).toBeUndefined();
    expect(
      editarContrasenaSchema.safeParse({ servicio: "RENAP", contrasena: "x".repeat(25) }).success,
    ).toBe(false);
  });

  it("la nota no puede ir vacía ni pasar de 500", () => {
    expect(notaClienteSchema.safeParse({ texto: "  " }).success).toBe(false);
    expect(notaClienteSchema.safeParse({ texto: "x".repeat(501) }).success).toBe(false);
  });
});

describe("clientes frecuentes (datos)", () => {
  it("solo Paola entra", async () => {
    for (const rol of ["empleado", "oscar"] as const) {
      await expect(obtenerClientes(rol)).rejects.toBeInstanceOf(SinPermisoError);
      await expect(obtenerFichaCliente(rol, "cf-1")).rejects.toBeInstanceOf(SinPermisoError);
      await expect(verContrasena(rol, "cf-1", "pc-1")).rejects.toBeInstanceOf(SinPermisoError);
      await expect(crearCliente(rol, { nombre: "X" })).rejects.toBeInstanceOf(SinPermisoError);
    }
  });

  it("la lista va ordenada y se puede buscar por DPI", async () => {
    const todos = await obtenerClientes("paola");
    expect(todos.map((c) => c.nombre)).toEqual(["Ana Ramírez", "Comité de Feria", "Pedro Gómez"]);
    expect(todos[0]).toMatchObject({ contrasenas: 2, archivos: 0, activo: true });
    const r = await obtenerClientes("paola", "1588256841306");
    expect(r.map((c) => c.id)).toEqual(["cf-1"]);
  });

  it("la ficha NUNCA trae las contraseñas; solo se piden una por una", async () => {
    const ficha = await obtenerFichaCliente("paola", "cf-1");
    expect(JSON.stringify(ficha)).not.toContain("Sat#Ana2026");
    expect(ficha?.cliente.contrasenas[0]).not.toHaveProperty("contrasena");
    expect(ficha?.sugerenciasDatos).toEqual(
      expect.arrayContaining(["DPI", "Teléfono", "Contador"]),
    );
    expect(ficha?.sugerenciasServicios).toEqual(expect.arrayContaining(["RENAP", "Correo Gmail"]));
    expect(await verContrasena("paola", "cf-1", "pc-1")).toBe("Sat#Ana2026");
    await expect(verContrasena("paola", "cf-1", "no")).rejects.toBeInstanceOf(ReglaNegocioError);
    expect(await obtenerFichaCliente("paola", "no-existe")).toBeNull();
  });

  it("crea con solo el nombre, sin repetir, y se puede renombrar", async () => {
    const c = await crearCliente("paola", { nombre: "Luis Pérez" }, ahora);
    expect(c).toMatchObject({ datos: [], contrasenas: [], activo: true });
    await expect(crearCliente("paola", { nombre: "luis pérez" })).rejects.toThrow(/Ya existe/);
    await expect(renombrarCliente("paola", c.id, { nombre: "Ana Ramírez" })).rejects.toThrow(
      /Ya existe/,
    );
    await renombrarCliente("paola", c.id, { nombre: "Luis Alberto Pérez" }, ahora);
    expect(almacen().clientes.find((x) => x.id === c.id)?.nombre).toBe("Luis Alberto Pérez");
  });

  it("agrega, edita y quita datos", async () => {
    await agregarDato("paola", "cf-2", { nombre: "DPI", valor: "1588 25684 1306" }, ahora);
    const c = almacen().clientes.find((x) => x.id === "cf-2")!;
    const dato = c.datos.at(-1)!;
    expect(dato.nombre).toBe("DPI");
    expect(c.actualizado).toBe(ahora.toISOString());
    await editarDato("paola", "cf-2", dato.id, { nombre: "DPI", valor: "2000 00000 0101" });
    expect(c.datos.at(-1)?.valor).toBe("2000 00000 0101");
    await quitarDato("paola", "cf-2", dato.id);
    expect(c.datos.some((d) => d.id === dato.id)).toBe(false);
    await expect(quitarDato("paola", "cf-2", dato.id)).rejects.toThrow(/ya no existe/);
  });

  it("agrega y edita contraseñas; vacía conserva la anterior", async () => {
    await agregarContrasena(
      "paola",
      "cf-2",
      { servicio: "Banco Industrial", usuario: "pgomez", contrasena: "Bi2026!" },
      ahora,
    );
    const c = almacen().clientes.find((x) => x.id === "cf-2")!;
    const p = c.contrasenas.at(-1)!;
    expect(p.actualizada).toBe(ahora.toISOString());
    const despues = new Date("2026-12-01T15:00:00Z");
    await editarContrasena(
      "paola",
      "cf-2",
      p.id,
      { servicio: "Banca BI", usuario: undefined, contrasena: undefined, nota: "Cambió" },
      despues,
    );
    expect(p).toMatchObject({ servicio: "Banca BI", contrasena: "Bi2026!", nota: "Cambió" });
    expect(p.actualizada).toBe(despues.toISOString());
    await editarContrasena("paola", "cf-2", p.id, { servicio: "Banca BI", contrasena: "Nueva1" });
    expect(await verContrasena("paola", "cf-2", p.id)).toBe("Nueva1");
    await quitarContrasena("paola", "cf-2", p.id);
    expect(c.contrasenas.some((x) => x.id === p.id)).toBe(false);
  });

  it("sube archivos de verdad (PDF/imagen) y los puede quitar", async () => {
    const [a] = await subirArchivosCliente(
      "paola",
      "cf-1",
      [{ nombre: "../DPI.pdf", datos: pdf }],
      ahora,
    );
    expect(a).toMatchObject({
      nombre: "DPI.pdf",
      tipo: "application/pdf",
      subido: ahora.toISOString(),
    });
    expect(almacen().archivos.has(a!.id)).toBe(true);
    await expect(
      subirArchivosCliente("paola", "cf-1", [
        { nombre: "virus.pdf", datos: new Uint8Array([1, 2]) },
      ]),
    ).rejects.toThrow(/solo se aceptan/);
    await expect(
      subirArchivosCliente("paola", "cf-1", [
        { nombre: "grande.pdf", datos: new Uint8Array(5 * 1024 * 1024 + 1) },
      ]),
    ).rejects.toThrow(/5 MB/);
    await expect(subirArchivosCliente("paola", "cf-1", [])).rejects.toThrow(/al menos un/);
    await quitarArchivoCliente("paola", "cf-1", a!.id);
    expect(almacen().archivos.has(a!.id)).toBe(false);
    await expect(quitarArchivoCliente("paola", "cf-1", a!.id)).rejects.toThrow(/ya no existe/);
  });

  it("no pasa de 20 archivos por cliente", async () => {
    const veinte = Array.from({ length: 20 }, (_, i) => ({ nombre: `${i}.pdf`, datos: pdf }));
    await subirArchivosCliente("paola", "cf-2", veinte);
    await expect(
      subirArchivosCliente("paola", "cf-2", [{ nombre: "x.pdf", datos: pdf }]),
    ).rejects.toThrow(/Máximo 20/);
  });

  it("notas: la más nueva primero, y se pueden quitar", async () => {
    await agregarNotaCliente("paola", "cf-1", "Trae su DPI original", ahora);
    const c = almacen().clientes.find((x) => x.id === "cf-1")!;
    expect(c.notas[0]?.texto).toBe("Trae su DPI original");
    await quitarNotaCliente("paola", "cf-1", c.notas[0]!.id);
    expect(c.notas).toHaveLength(1);
    await expect(quitarNotaCliente("paola", "cf-1", "no")).rejects.toThrow(/ya no existe/);
  });

  it("desactivado: se ve pero no se cambia hasta reactivarlo", async () => {
    await cambiarActivoCliente("paola", "cf-1", false, ahora);
    await expect(agregarDato("paola", "cf-1", { nombre: "NIT", valor: "CF" })).rejects.toThrow(
      /Reactiva/,
    );
    expect(await verContrasena("paola", "cf-1", "pc-1")).toBe("Sat#Ana2026");
    await cambiarActivoCliente("paola", "cf-1", true);
    await agregarDato("paola", "cf-1", { nombre: "NIT", valor: "CF" });
    await expect(cambiarActivoCliente("paola", "no", true)).rejects.toThrow(/no existe/);
  });

  it("máximo 30 datos y 30 contraseñas", async () => {
    const c = almacen().clientes.find((x) => x.id === "cf-3")!;
    c.activo = true;
    c.datos = Array.from({ length: 30 }, (_, i) => ({ id: `d${i}`, nombre: "X", valor: "y" }));
    c.contrasenas = Array.from({ length: 30 }, (_, i) => ({
      id: `p${i}`,
      servicio: "X",
      contrasena: "y",
      actualizada: "",
    }));
    await expect(agregarDato("paola", "cf-3", { nombre: "X", valor: "z" })).rejects.toThrow(/30/);
    await expect(
      agregarContrasena("paola", "cf-3", { servicio: "X", contrasena: "z" }),
    ).rejects.toThrow(/30/);
  });
});
