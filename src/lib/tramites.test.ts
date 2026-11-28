import { beforeEach, describe, expect, it } from "vitest";
import {
  cambiarActivoTramite,
  crearEntradaTramite,
  crearModuloTramite,
  crearTramite,
  editarTramite,
  eliminarModuloTramite,
  moverModuloTramite,
  obtenerModulosTramite,
  obtenerTramites,
  obtenerTramitesAdmin,
  renombrarModuloTramite,
  SinPermisoError,
} from "./api";
import { almacen, reiniciarAlmacen } from "./mocks/store";
import { idModulo, precioDesdeFormulario, requisitosFrecuentes } from "./reglas/tramites";
import { tramiteSchema, type TramiteInput } from "@/schemas/tramite.schema";

beforeEach(() => reiniciarAlmacen());

const hoy = new Date("2026-11-27T16:00:00Z");
const tr = (id: string) => almacen().tramites.find((t) => t.id === id)!;
const datos = (extra: Partial<TramiteInput> = {}): TramiteInput =>
  tramiteSchema.parse({
    moduloId: "sat",
    nombre: "NIT por primera vez",
    requisitos: ["DPI escaneado (ambos lados)", "Recibo de luz (NIS)"],
    precio: { tipo: "fijo", monto: 80 },
    ...extra,
  });

describe("Reglas del catálogo", () => {
  it("convierte el precio del formulario", () => {
    expect(precioDesdeFormulario({ precio: { tipo: "fijo", monto: 80 } })).toEqual({ monto: 80 });
    expect(
      precioDesdeFormulario({
        precio: { tipo: "rango", monto: 1300, montoMax: 1400 },
        nota: "Según vehículo",
      }),
    ).toEqual({ monto: 1300, montoMax: 1400, nota: "Según vehículo" });
    expect(precioDesdeFormulario({ precio: { tipo: "pendiente" } })).toEqual({ monto: null });
  });

  it("valida el formulario", () => {
    const mal = (x: object) =>
      tramiteSchema.safeParse({ ...datos(), ...x }).error?.issues[0]?.message;
    expect(mal({ precio: { tipo: "rango", monto: 50, montoMax: 40 } })).toBe(
      "El máximo debe ser mayor al mínimo",
    );
    expect(mal({ precio: { tipo: "fijo", monto: 0 } })).toBe("El precio debe ser mayor a 0");
    expect(mal({ requisitos: ["DPI", "dpi"] })).toBe("Hay un requisito repetido");
    expect(mal({ nombre: "  " })).toBe("Escribe el nombre del trámite");
  });

  it("sugiere los requisitos más usados", () => {
    const r = requisitosFrecuentes(almacen().tramites);
    expect(r.slice(0, 5)).toContain("DPI escaneado (ambos lados)");
    expect(r).toContain("Recibo de luz (NIS)");
    expect(idModulo("MINTRAB", ["sat"])).toBe("mintrab");
    expect(idModulo("Otros", ["otros"])).toBe("otros-2");
  });
});

describe("Trámites", () => {
  it("crea un trámite y le aparece al empleado", async () => {
    const t = await crearTramite(
      "paola",
      datos({ nombre: "Inscripción al IGSS", moduloId: "otros", precio: { tipo: "pendiente" } }),
    );
    expect((await obtenerTramites()).some((x) => x.id === t.id)).toBe(true);
    expect(t.precio).toEqual({ monto: null });
    await expect(crearTramite("paola", datos({ nombre: "nit POR primera vez" }))).rejects.toThrow(
      "Ya existe",
    );
    await expect(crearTramite("oscar", datos({ nombre: "X otro" }))).rejects.toThrow(
      SinPermisoError,
    );
  });

  it("guarda quién cambió el precio y de cuánto a cuánto", async () => {
    await editarTramite(
      "paola",
      "sat-nit",
      datos({ precio: { tipo: "fijo", monto: 90 } }),
      "Paola",
      hoy,
    );
    expect(tr("sat-nit").precio).toEqual({ monto: 90 });
    // Cambiar solo los requisitos no es un cambio de precio.
    await editarTramite(
      "paola",
      "sat-nit",
      datos({ precio: { tipo: "fijo", monto: 90 }, requisitos: ["DPI"] }),
      "Paola",
      hoy,
    );
    const admin = (await obtenerTramitesAdmin("paola")).find((t) => t.id === "sat-nit")!;
    expect(admin.cambios).toEqual([
      {
        tramiteId: "sat-nit",
        fecha: hoy.toISOString(),
        por: "Paola",
        antes: { monto: 80 },
        ahora: { monto: 90 },
      },
    ]);
    expect(admin.requisitos).toEqual(["DPI"]);
  });

  it("desactivado: no le sale al empleado ni se pueden crear entradas", async () => {
    await cambiarActivoTramite("paola", "renap-nac", false);
    expect((await obtenerTramites()).some((t) => t.id === "renap-nac")).toBe(false);
    expect((await obtenerTramitesAdmin("paola")).find((t) => t.id === "renap-nac")?.activo).toBe(
      false,
    );
    await expect(
      crearEntradaTramite(
        {
          tramiteId: "renap-nac",
          cliente: { nombre: "Ana" },
          pago: { estado: "pendiente" },
        } as never,
        "Carlos",
      ),
    ).rejects.toThrow("ya no está en el catálogo");
    await cambiarActivoTramite("paola", "renap-nac", true);
    expect((await obtenerTramites()).some((t) => t.id === "renap-nac")).toBe(true);
  });
});

describe("Módulos", () => {
  it("crea, renombra y ordena las pestañas", async () => {
    const m = await crearModuloTramite("paola", "MINTRAB");
    expect((await obtenerModulosTramite()).map((x) => x.nombre)).toEqual([
      "SAT",
      "CGC",
      "RENAP",
      "Otros",
      "MINTRAB",
    ]);
    await moverModuloTramite("paola", m.id, "izquierda");
    await moverModuloTramite("paola", "sat", "izquierda"); // ya es el primero: no cambia
    expect((await obtenerModulosTramite()).map((x) => x.id)).toEqual([
      "sat",
      "cgc",
      "renap",
      "mintrab",
      "otros",
    ]);
    await renombrarModuloTramite("paola", m.id, "Ministerio de Trabajo");
    await expect(renombrarModuloTramite("paola", m.id, "sat")).rejects.toThrow("Ya existe");
    await expect(crearModuloTramite("paola", "Renap")).rejects.toThrow("Ya existe");
  });

  it("solo se elimina si no tiene trámites", async () => {
    await expect(eliminarModuloTramite("paola", "renap")).rejects.toThrow("Tiene 3 trámites");
    const m = await crearModuloTramite("paola", "MINTRAB");
    await eliminarModuloTramite("paola", m.id);
    expect((await obtenerModulosTramite()).some((x) => x.id === m.id)).toBe(false);
    await expect(eliminarModuloTramite("empleado", "sat")).rejects.toThrow(SinPermisoError);
  });
});
