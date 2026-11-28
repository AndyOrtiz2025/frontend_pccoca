import { beforeEach, describe, expect, it } from "vitest";
import { obtenerCuentas, obtenerResumenPendientes, SinPermisoError } from "./api";
import { almacen, reiniciarAlmacen } from "./mocks/store";
import { debeDesde } from "./reglas/cuentas";
import type { Cargo, PagoCuenta } from "@/types/pendiente";

beforeEach(() => reiniciarAlmacen());

const ahora = new Date("2026-11-28T18:00:00Z");
const cargo = (id: string, fecha: string, total: number, extra: Partial<Cargo> = {}): Cargo => ({
  id,
  cuentaId: "x",
  fecha,
  descripcion: id,
  cantidad: 1,
  precioUnitario: total,
  registradoPor: "Carlos",
  ...extra,
});
const abono = (monto: number): PagoCuenta => ({
  id: `p-${monto}`,
  cuentaId: "x",
  fecha: "2026-11-27T10:00:00-06:00",
  tipo: "abono",
  monto,
  cargoIds: [],
  registradoPor: "Ana",
  saldoDespues: 0,
});

describe("debeDesde", () => {
  const cargos = [
    cargo("c2", "2026-11-10T09:00:00-06:00", 30),
    cargo("c1", "2026-11-01T09:00:00-06:00", 20),
  ];

  it("sin abonos: la fecha del cargo más antiguo sin pagar", () => {
    expect(debeDesde(cargos, [])).toBe("2026-11-01T09:00:00-06:00");
  });

  it("los abonos cubren primero lo más antiguo", () => {
    expect(debeDesde(cargos, [abono(20)])).toBe("2026-11-10T09:00:00-06:00");
    expect(debeDesde(cargos, [abono(15)])).toBe("2026-11-01T09:00:00-06:00");
  });

  it("sin saldo no debe nada; los cargos ya pagados no cuentan", () => {
    expect(debeDesde(cargos, [abono(50)])).toBeUndefined();
    expect(
      debeDesde([cargo("c1", "2026-11-01T09:00:00-06:00", 20, { pagoId: "p" }), cargos[0]!], []),
    ).toBe("2026-11-10T09:00:00-06:00");
  });
});

describe("Pendientes para Paola", () => {
  it("cada cuenta dice desde cuántos días debe", async () => {
    const cuentas = await obtenerCuentas("paola", ahora);
    const dias = (id: string) => cuentas.find((c) => c.cuenta.id === id)?.diasDebiendo;
    expect(dias("cu-1")).toBe(8);
    // Centro Estudiantil: el abono de Q 20 no cubre el primer cargo (Q 25) → sigue desde el 23.
    expect(dias("cu-6")).toBe(5);
    expect(dias("cu-7")).toBeUndefined();
  });

  it("resumen: por cobrar, lo del mes y la actividad más reciente primero", async () => {
    const r = await obtenerResumenPendientes("paola", ahora);
    expect(r).toMatchObject({
      porCobrar: 278.5,
      cuentasConSaldo: 6,
      fiadoMes: 308.5,
      cobradoMes: 30,
    });
    expect(r.actividad[0]).toMatchObject({
      tipo: "abono",
      cuenta: "Centro Estudiantil",
      por: "Carlos",
      monto: 20,
    });
    expect(r.actividad[1]).toMatchObject({ tipo: "cargo", detalle: "10 × Folder tamaño carta" });
  });

  it("lo fiado en otro mes no cuenta en el mes actual", async () => {
    almacen().cargos.push(cargo("viejo", "2026-10-30T09:00:00-06:00", 100, { cuentaId: "cu-1" }));
    const r = await obtenerResumenPendientes("paola", ahora);
    expect(r.fiadoMes).toBe(308.5);
    expect(r.porCobrar).toBe(378.5);
  });

  it("solo Paola ve el resumen", async () => {
    await expect(obtenerResumenPendientes("empleado", ahora)).rejects.toThrow(SinPermisoError);
    await expect(obtenerResumenPendientes("oscar", ahora)).rejects.toThrow(SinPermisoError);
  });
});
