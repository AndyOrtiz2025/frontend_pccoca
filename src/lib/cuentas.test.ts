import { beforeEach, describe, expect, it } from "vitest";
import {
  agregarCargo,
  crearCuenta,
  eliminarCuenta,
  obtenerContadores,
  obtenerCuenta,
  obtenerCuentas,
  pagarCargos,
  registrarAbono,
  ReglaNegocioError,
  SinPermisoError,
} from "./api";
import { almacen, reiniciarAlmacen } from "./mocks/store";

beforeEach(() => reiniciarAlmacen());

const saldo = async (id: string) => (await obtenerCuenta("empleado", id))!.saldo;

describe("lista de cuentas", () => {
  it("una fila por cliente, primero los que deben", async () => {
    const lista = await obtenerCuentas("empleado");
    expect(lista.map((c) => c.cuenta.nombre)).toContain("Centro Estudiantil");
    expect(lista.at(-1)!.saldo).toBe(0); // Ana Ramírez, saldada, al final
    expect(lista.find((c) => c.cuenta.id === "cu-6")).toMatchObject({
      cargosPendientes: 2,
      saldo: 20,
    });
  });

  it("Oscar no tiene acceso; Paola sí (lectura)", async () => {
    await expect(obtenerCuentas("oscar")).rejects.toThrow(SinPermisoError);
    await expect(obtenerCuentas("paola")).resolves.toBeDefined();
  });
});

describe("crearCuenta", () => {
  it("no permite dos clientes con el mismo nombre (sin importar tildes ni mayúsculas)", async () => {
    await expect(crearCuenta({ nombre: "maria lopez", grupo: "individual" })).rejects.toThrow(
      /Ya existe/,
    );
    await expect(
      crearCuenta({ nombre: "Maria Lopez", grupo: "organizacion" }),
    ).resolves.toBeDefined();
  });
});

describe("agregarCargo", () => {
  it("de producto: precio del servidor con mayoreo, descuenta stock y guarda quién se lo llevó", async () => {
    const c = await agregarCargo(
      "cu-6",
      {
        tipo: "producto",
        productoId: "p-lib-0050",
        cantidad: 12,
        llevadoPor: " Ana Ruiz ",
        nota: "Para el concurso",
      },
      "Carlos",
    );
    expect(c).toMatchObject({
      precioUnitario: 13,
      llevadoPor: "Ana Ruiz",
      nota: "Para el concurso",
    });
    expect(almacen().productos.find((p) => p.id === "p-lib-0050")!.stock).toMatchObject({
      disponible: 48,
    });
    expect(await saldo("cu-6")).toBe(20 + 156);
  });

  it("en clientes individuales no guarda 'llevado por'", async () => {
    const c = await agregarCargo(
      "cu-1",
      { tipo: "libre", descripcion: "Copias", cantidad: 2, precioUnitario: 0.5, llevadoPor: "X" },
      "Ana",
    );
    expect(c.llevadoPor).toBeUndefined();
  });

  it("sin stock no se registra", async () => {
    await expect(
      agregarCargo("cu-1", { tipo: "producto", productoId: "p-lib-0070", cantidad: 1 }, "Ana"),
    ).rejects.toThrow(/stock/);
  });
});

describe("pagos", () => {
  it("abono: baja el saldo y dice cuánto queda", async () => {
    const { pago } = await registrarAbono("cu-4", 50, "Pagó la directora", "Carlos"); // debe 84
    expect(pago).toMatchObject({ tipo: "abono", monto: 50, saldoDespues: 34 });
    expect(await saldo("cu-4")).toBe(34);
  });

  it("el abono no puede pasar de lo que debe", async () => {
    await expect(registrarAbono("cu-4", 84.01, undefined, "Carlos")).rejects.toThrow(
      /mayor a lo que debe/,
    );
    await expect(registrarAbono("cu-7", 1, undefined, "Carlos")).rejects.toThrow(/no tiene saldo/);
  });

  it("pagar seleccionados: marca esos cargos y cobra su total", async () => {
    await agregarCargo(
      "cu-3",
      { tipo: "libre", descripcion: "Copias", cantidad: 10, precioUnitario: 1 },
      "Ana",
    ); // +10 → 42
    const { pago, detalle } = await pagarCargos("cu-3", ["ca-3"], undefined, "Carlos");
    expect(pago).toMatchObject({ tipo: "cargos", monto: 32, saldoDespues: 10 });
    expect(detalle.cargos.find((c) => c.id === "ca-3")!.pagoId).toBe(pago.id);
  });

  it("con abonos previos nunca cobra más que el saldo", async () => {
    // Centro Estudiantil: cargos 25 + 15 = 40, abonó 20 → debe 20. Paga el cargo de 25 → cobra 20.
    const { pago } = await pagarCargos("cu-6", ["ca-6"], undefined, "Carlos");
    expect(pago.monto).toBe(20);
    expect(await saldo("cu-6")).toBe(0);
  });

  it("no paga cargos ajenos ni ya pagados", async () => {
    await expect(pagarCargos("cu-3", ["ca-1"], undefined, "X")).rejects.toThrow(/no pertenece/);
    await expect(pagarCargos("cu-7", ["ca-8"], undefined, "X")).rejects.toThrow(/ya estaba pagado/);
  });

  it("el contador del menú cuenta clientes con saldo", async () => {
    const antes = (await obtenerContadores("empleado")).pendientes!;
    await registrarAbono("cu-1", 45, undefined, "Carlos");
    expect((await obtenerContadores("empleado")).pendientes).toBe(antes - 1);
  });
});

describe("eliminarCuenta", () => {
  it("solo con saldo Q 0.00, y borra sus cargos y pagos", async () => {
    await expect(eliminarCuenta("cu-1")).rejects.toThrow(ReglaNegocioError);
    await eliminarCuenta("cu-7");
    expect(await obtenerCuenta("empleado", "cu-7")).toBeNull();
    expect(almacen().cargos.some((c) => c.cuentaId === "cu-7")).toBe(false);
  });
});
