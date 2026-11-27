import { beforeEach, describe, expect, it } from "vitest";
import {
  agregarNotaProceso,
  cambiarEstadoProceso,
  convertirEntrada,
  definirCobro,
  descartarEntrada,
  marcarEntradaLeida,
  marcarEntregado,
  obtenerHistorial,
  vaciarHistorial,
  obtenerContadores,
  obtenerEntradas,
  obtenerProcesos,
  ReglaNegocioError,
  SinPermisoError,
} from "./api";
import { almacen, reiniciarAlmacen } from "./mocks/store";
import { cobroConPago, porCobrar, precioFijo } from "./reglas/procesos";

beforeEach(() => reiniciarAlmacen());

describe("cobroConPago y precioFijo", () => {
  it("respeta lo acordado en mostrador", () => {
    expect(cobroConPago(50, { estado: "pendiente" })).toEqual({ total: 50 });
    expect(cobroConPago(50, { estado: "cancelado" })).toEqual({ total: 50, anticipo: 50 });
    expect(porCobrar(cobroConPago(50, { estado: "anticipo", anticipo: 20 }))).toBe(30);
    expect(() => cobroConPago(10, { estado: "anticipo", anticipo: 20 })).toThrow(/ya dejó/);
  });

  it("solo los precios fijos pasan directo", () => {
    expect(precioFijo({ monto: 50 })).toBe(50);
    expect(precioFijo({ monto: 50, montoMax: 90 })).toBeUndefined();
    expect(precioFijo({ monto: null })).toBeUndefined();
  });
});

describe("Bandeja de entradas de Paola", () => {
  it("abrirla la marca como leída y baja el contador", async () => {
    const antes = (await obtenerContadores("paola")).entradas!;
    await marcarEntradaLeida("paola", "en-1");
    expect((await obtenerContadores("paola")).entradas).toBe(antes - 1);
  });

  it("Paola no toca entradas de Oscar ni el Empleado las de nadie", async () => {
    await expect(marcarEntradaLeida("paola", "en-3")).rejects.toThrow(ReglaNegocioError);
    await expect(convertirEntrada("oscar", "en-1")).rejects.toThrow(ReglaNegocioError);
    await expect(convertirEntrada("empleado", "en-1")).rejects.toThrow(SinPermisoError);
    await expect(obtenerEntradas("empleado")).rejects.toThrow(SinPermisoError);
  });

  it("pasar a En proceso crea el expediente con el precio y el anticipo, y sale de la bandeja", async () => {
    const p = await convertirEntrada("paola", "en-2"); // Antecedentes penales, cancelado
    expect(p).toMatchObject({ tipo: "tramite", estado: "recibido", entradaId: "en-2" });
    expect(p.cobro).toEqual({ total: 15, anticipo: 15 });
    expect((await obtenerEntradas("paola")).some((e) => e.id === "en-2")).toBe(false);
    expect((await obtenerProcesos("empleado")).some((x) => x.id === p.id)).toBe(true);
    await expect(convertirEntrada("paola", "en-2")).rejects.toThrow(/ya está En proceso/);
  });

  it("las notas del mostrador pasan al expediente", async () => {
    const p = await convertirEntrada("paola", "en-1");
    expect(p.notas[0]).toMatchObject({ autor: "Carlos", texto: "Viene a recoger el viernes" });
    expect(p.pagoEntrada).toEqual({ estado: "anticipo", anticipo: 25 });
  });

  it("descartar la quita de la bandeja pero se conserva", async () => {
    await descartarEntrada("paola", "en-2", "Paola");
    expect((await obtenerEntradas("paola")).some((e) => e.id === "en-2")).toBe(false);
    expect(almacen().entradas.find((e) => e.id === "en-2")?.descartada?.por).toBe("Paola");
  });
});

describe("Trámites en proceso de Paola", () => {
  it("cambia de estado y al estar Listo lo ve el mostrador", async () => {
    await cambiarEstadoProceso("paola", "tp-3", "en_proceso");
    await cambiarEstadoProceso("paola", "tp-3", "listo");
    const listos = (await obtenerProcesos("empleado")).filter((p) => p.estado === "listo");
    expect(listos.some((p) => p.id === "tp-3")).toBe(true);
  });

  it("no puede marcar entregado ni tocar servicios de Oscar", async () => {
    await expect(cambiarEstadoProceso("paola", "tp-1", "entregado")).rejects.toThrow(
      ReglaNegocioError,
    );
    await expect(cambiarEstadoProceso("paola", "sp-1", "listo")).rejects.toThrow(ReglaNegocioError);
    await expect(cambiarEstadoProceso("paola", "tp-4", "listo")).rejects.toThrow(/entregó/);
  });

  it("define el cobro descontando lo que ya dejó el cliente", async () => {
    const p = await convertirEntrada("paola", "en-1"); // anticipo Q 25
    const conCobro = await definirCobro("paola", p.id, 100, "Actualización de NIT");
    expect(conCobro.cobro).toEqual({ total: 100, anticipo: 25, detalle: "Actualización de NIT" });
    expect(porCobrar(conCobro.cobro!)).toBe(75);
    await expect(definirCobro("paola", p.id, 20)).rejects.toThrow(/ya dejó/);
  });

  it("cambiar el cobro de uno que ya tenía anticipo lo conserva", async () => {
    const p = await definirCobro("paola", "tp-1", 35); // tenía total 30, anticipo 10
    expect(p.cobro).toMatchObject({ total: 35, anticipo: 10 });
  });

  it("agrega notas que ve el mostrador", async () => {
    await agregarNotaProceso("paola", "tp-2", "Paola", "  Falta la boleta  ");
    const tp2 = (await obtenerProcesos("empleado")).find((p) => p.id === "tp-2")!;
    expect(tp2.notas.at(-1)).toMatchObject({ autor: "Paola", texto: "Falta la boleta" });
  });
});

describe("Historial de Paola", () => {
  it("lo entregado y descartado queda registrado hasta vaciarlo", async () => {
    await marcarEntregado("tp-1", "Carlos"); // estaba Listo
    await descartarEntrada("paola", "en-2", "Paola");
    const h = await obtenerHistorial("paola");
    expect(h.entregados.map((p) => p.id)).toEqual(expect.arrayContaining(["tp-1", "tp-4"]));
    expect(h.entregados[0]!.id).toBe("tp-1"); // el más reciente primero
    expect(h.entregados.every((p) => p.tipo === "tramite")).toBe(true);
    expect(h.descartadas.map((e) => e.id)).toEqual(["en-2"]);
    expect(h.ultimoVaciado).toBeUndefined();
  });

  it("vaciar lo quita de la lista pero no lo borra", async () => {
    await descartarEntrada("paola", "en-2", "Paola");
    const { quitados } = await vaciarHistorial("paola");
    expect(quitados).toBeGreaterThanOrEqual(2);
    const h = await obtenerHistorial("paola");
    expect(h.entregados).toHaveLength(0);
    expect(h.descartadas).toHaveLength(0);
    expect(h.ultimoVaciado).toBeDefined();
    expect(almacen().procesos.find((p) => p.id === "tp-4")?.estado).toBe("entregado");
  });

  it("el historial de Oscar no se mezcla y el empleado no tiene", async () => {
    await vaciarHistorial("paola");
    expect((await obtenerHistorial("oscar")).entregados.every((p) => p.tipo === "servicio")).toBe(
      true,
    );
    await expect(obtenerHistorial("empleado")).rejects.toThrow(SinPermisoError);
  });
});
