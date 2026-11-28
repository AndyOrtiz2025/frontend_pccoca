"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CircleCheck,
  Clock,
  LoaderCircle,
  PackagePlus,
  Save,
  X,
} from "lucide-react";
import { Button, Checkbox, Field, Input, Modal, Select, useToast } from "@/components/ui";
import { ModalProducto } from "@/components/inventario/ModalProducto";
import { AvisosCosto } from "@/components/proveedores/AvisosCosto";
import { useErrorApi } from "@/hooks/useErrorApi";
import { cn } from "@/lib/cn";
import { diaDeGuatemala } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { ErrorApi, postApi } from "@/lib/http";
import { cantidadCon, nombrePaquete } from "@/lib/presentacion";
import { centavos } from "@/lib/reglas/dinero";
import type { AvisoCosto } from "@/lib/reglas/compras";
import type { DetallePedido, LineaPedidoDetallada, ResultadoRecepcion } from "@/lib/api";
import { recibirPedidoSchema } from "@/schemas/pedido.schema";
import {
  ETIQUETA_CATEGORIA,
  type Categoria,
  type Presentacion,
  type Producto,
} from "@/types/producto";
import type { Proveedor } from "@/types/proveedor";
import { cantidadPedida } from "./comun";

export interface DatosCrearProducto {
  categorias: Categoria[];
  proveedores: Proveedor[];
  subcategorias: Record<string, string[]>;
  codigos: Record<string, string>;
}

interface Revision {
  marca: "sin" | "vino" | "no_vino";
  buenas: string;
  danadas: string;
  costo: string;
  motivo: string;
  noEsperarResto: boolean;
  /** No vino y ya no se pide (si no, sigue pendiente). */
  cancelar: boolean;
  /** Producto nuevo: el que se creó al llegar. */
  productoId?: string;
  presentacion: Presentacion;
}

const soloEntero = (v: string) => v.replace(/\D/g, "").slice(0, 6);
const soloDinero = (v: string) => v.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
const n = (v: string) => (v.trim() === "" ? 0 : Number(v));

function costoDe(p: Producto | undefined, presentacion: Presentacion) {
  if (!p) return undefined;
  return presentacion === "paquete" ? p.fraccionable?.costoPaquete : p.costo;
}

/**
 * Revisar paquete: se va tachando lo que vino y lo que no. De lo que vino se anotan las buenas,
 * las dañadas y el costo; al guardar se registra como compra. Lo que no se marca sigue pendiente.
 */
export function ModalRevisarPedido({
  pedido,
  productos,
  crear,
  onClose,
}: {
  pedido: DetallePedido;
  productos: Producto[];
  crear: DatosCrearProducto;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const hoy = diaDeGuatemala(new Date());
  const pendientes = pedido.lineas.filter((l) => l.faltan > 0);
  const [fecha, setFecha] = useState(hoy);
  const [factura, setFactura] = useState("");
  const [revision, setRevision] = useState<Record<string, Revision>>(() =>
    Object.fromEntries(
      pendientes.map((l) => [
        l.id,
        {
          marca: "sin",
          buenas: String(l.faltan),
          danadas: "",
          costo: "",
          motivo: "",
          noEsperarResto: false,
          cancelar: false,
          presentacion: l.presentacion,
        },
      ]),
    ),
  );
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});
  const [guardando, setGuardando] = useState(false);
  const [creando, setCreando] = useState<{ linea: LineaPedidoDetallada; categoria: Categoria }>();
  const [resultado, setResultado] = useState<ResultadoRecepcion | null>(null);

  const porId = new Map(productos.map((p) => [p.id, p]));
  const productoDe = (l: LineaPedidoDetallada) => {
    const id = l.productoId ?? revision[l.id]?.productoId;
    return id ? porId.get(id) : undefined;
  };
  /** El costo que se ve: el escrito o, si no se ha tocado, el último que se pagó. */
  const costoVisible = (l: LineaPedidoDetallada, r: Revision) =>
    r.costo !== "" ? r.costo : String(costoDe(productoDe(l), r.presentacion) ?? l.costo ?? "");

  const vinieron = pendientes.filter((l) => revision[l.id]?.marca === "vino");
  const total = centavos(
    vinieron.reduce((t, l) => {
      const r = revision[l.id]!;
      return t + (n(r.buenas) + n(r.danadas)) * n(costoVisible(l, r));
    }, 0),
  );

  function cambiar(id: string, cambios: Partial<Revision>) {
    setRevision((rs) => ({ ...rs, [id]: { ...rs[id]!, ...cambios } }));
    setErrores({});
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const faltaCrear = vinieron.find((l) => !l.productoId && !revision[l.id]?.productoId);
    if (faltaCrear) {
      return setErrores({ [faltaCrear.id]: "Crea el producto antes de guardar" });
    }
    const datos = {
      fecha,
      factura: factura.trim() || undefined,
      lineas: vinieron.map((l) => {
        const r = revision[l.id]!;
        const costo = costoVisible(l, r);
        return {
          lineaId: l.id,
          productoId: l.productoId ? undefined : r.productoId,
          presentacion: r.presentacion,
          buenas: n(r.buenas),
          danadas: n(r.danadas),
          costoUnitario: costo.trim() === "" ? NaN : n(costo),
          motivoDano: n(r.danadas) > 0 ? r.motivo.trim() || undefined : undefined,
          noEsperarResto: r.noEsperarResto,
        };
      }),
      cancelar: pendientes
        .filter((l) => revision[l.id]?.marca === "no_vino" && revision[l.id]?.cancelar)
        .map((l) => l.id),
    };
    const v = recibirPedidoSchema.safeParse(datos);
    if (!v.success) {
      const nuevos: Record<string, string> = {};
      for (const i of v.error.issues) {
        const [raiz, indice] = i.path;
        const clave =
          raiz === "lineas" && typeof indice === "number"
            ? vinieron[indice]!.id
            : String(raiz ?? "general");
        nuevos[clave] ??= i.message;
      }
      if (nuevos.lineas) nuevos.general = "Marca lo que vino o lo que ya no se pide";
      return setErrores(nuevos);
    }
    setGuardando(true);
    try {
      const res = await postApi<ResultadoRecepcion>(
        `/api/pedidos/${encodeURIComponent(pedido.id)}/recibir`,
        v.data,
      );
      setResultado(res);
      toast(
        res.compra ? `Compra registrada: ${formatQ(res.compra.total)}` : "Pedido actualizado",
        "success",
      );
      router.refresh();
    } catch (err) {
      if (err instanceof ErrorApi && (err.status === 400 || err.status === 409)) {
        setErrores({ general: err.message });
      } else manejarError(err);
    } finally {
      setGuardando(false);
    }
  }

  if (resultado) {
    return (
      <Resultado
        pedido={pedido}
        resultado={resultado}
        paquetes={new Map(productos.map((p) => [p.id, p.fraccionable?.nombrePaquete]))}
        onClose={onClose}
      />
    );
  }

  if (creando) {
    return (
      <ModalProducto
        producto={null}
        categoria={creando.categoria}
        proveedores={crear.proveedores}
        subcategorias={crear.subcategorias[creando.categoria] ?? []}
        codigoSugerido={crear.codigos[creando.categoria] ?? ""}
        inicial={{ nombre: creando.linea.nombre, proveedorId: pedido.proveedorId }}
        onCreado={(id) => cambiar(creando.linea.id, { productoId: id, costo: "" })}
        onClose={() => setCreando(undefined)}
      />
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Revisar paquete · ${pedido.numero}`}
      subtitle={`${pedido.proveedor.nombre}: tacha lo que vino y lo que no`}
      size="lg"
      variante="destacado"
      footer={
        <>
          {errores.general && (
            <p role="alert" className="mr-auto text-small text-stock-out">
              {errores.general}
            </p>
          )}
          <span className="mr-auto text-body text-ink-muted">
            Total: <strong className="text-price text-navy-900 tabular">{formatQ(total)}</strong>
          </span>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-revisar" disabled={guardando}>
            {guardando ? <LoaderCircle className="animate-spin" /> : <Save />}
            Guardar revisión
          </Button>
        </>
      }
    >
      <form id="form-revisar" onSubmit={guardar} noValidate className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Fecha en que llegó" error={errores.fecha}>
            {(id, d) => (
              <Input
                id={id}
                aria-describedby={d}
                type="date"
                max={hoy}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            )}
          </Field>
          <Field label="No. de factura (opcional)" error={errores.factura}>
            {(id, d) => (
              <Input
                id={id}
                aria-describedby={d}
                maxLength={40}
                placeholder="Ej. FAC-8941"
                value={factura}
                onChange={(e) => setFactura(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
            )}
          </Field>
          <Button
            variant="outline"
            onClick={() =>
              setRevision((rs) =>
                Object.fromEntries(
                  Object.entries(rs).map(([id, r]) => [id, { ...r, marca: "vino" as const }]),
                ),
              )
            }
          >
            <Check /> Vino todo
          </Button>
        </div>

        <ul className="flex flex-col gap-2">
          {pendientes.map((l) => {
            const r = revision[l.id]!;
            const p = productoDe(l);
            const llegan = n(r.buenas) + n(r.danadas);
            const resto = l.faltan - llegan;
            const sinCrear = !l.productoId && !r.productoId;
            return (
              <li
                key={l.id}
                className={cn(
                  "rounded-md border px-3 py-2.5",
                  r.marca === "vino" && "border-stock-ok/50 bg-stock-ok-bg/40",
                  r.marca === "no_vino" && "bg-gray-50 border-gray-200",
                  r.marca === "sin" && "border-gray-200",
                )}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "font-medium text-ink-strong",
                        r.marca === "no_vino" && "text-ink-muted line-through",
                      )}
                    >
                      {p?.nombre ?? l.nombre}
                      {p && (
                        <span className="ml-1.5 font-mono text-small text-ink-muted">
                          {p.codigo}
                        </span>
                      )}
                    </p>
                    <p className="text-small text-ink-muted">
                      {l.recibidas > 0 ? "Faltan" : "Pediste"} {cantidadPedida(l, l.faltan)}
                    </p>
                  </div>
                  <div role="group" aria-label={`¿Vino ${l.nombre}?`} className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant={r.marca === "vino" ? "dark" : "outline"}
                      aria-pressed={r.marca === "vino"}
                      onClick={() => cambiar(l.id, { marca: r.marca === "vino" ? "sin" : "vino" })}
                    >
                      <Check /> Vino
                    </Button>
                    <Button
                      size="sm"
                      variant={r.marca === "no_vino" ? "dark" : "outline"}
                      aria-pressed={r.marca === "no_vino"}
                      onClick={() =>
                        cambiar(l.id, { marca: r.marca === "no_vino" ? "sin" : "no_vino" })
                      }
                    >
                      <X /> No vino
                    </Button>
                  </div>
                </div>

                {r.marca === "vino" && sinCrear && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-sm bg-gold-50 px-3 py-2">
                    <PackagePlus className="size-4 text-gold-text" />
                    <span className="flex-1 text-small text-gold-text">
                      Todavía no está en el inventario: créalo para que entre al stock.
                    </span>
                    {crear.categorias.map((c) => (
                      <Button
                        key={c}
                        size="sm"
                        onClick={() => setCreando({ linea: l, categoria: c })}
                      >
                        Crear en {ETIQUETA_CATEGORIA[c]}
                      </Button>
                    ))}
                  </div>
                )}

                {r.marca === "vino" && !sinCrear && (
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="flex flex-wrap items-end gap-2">
                      {!l.productoId && p?.fraccionable && (
                        <label className="flex flex-col gap-1 text-small text-ink">
                          Viene por
                          <Select
                            className="min-w-36"
                            value={r.presentacion}
                            onChange={(e) =>
                              cambiar(l.id, {
                                presentacion: e.target.value as Presentacion,
                                costo: "",
                              })
                            }
                          >
                            <option value="paquete">
                              {nombrePaquete(p)} ({p.fraccionable.unidadesPorPaquete} u.)
                            </option>
                            <option value="unidad">Unidad</option>
                          </Select>
                        </label>
                      )}
                      <label className="flex w-24 flex-col gap-1 text-small text-ink">
                        Buenas
                        <Input
                          inputMode="numeric"
                          aria-label={`Buenas de ${l.nombre}`}
                          value={r.buenas}
                          invalid={!!errores[l.id]}
                          onChange={(e) => cambiar(l.id, { buenas: soloEntero(e.target.value) })}
                        />
                      </label>
                      <label className="flex w-24 flex-col gap-1 text-small text-ink">
                        Dañadas
                        <Input
                          inputMode="numeric"
                          aria-label={`Dañadas de ${l.nombre}`}
                          placeholder="0"
                          value={r.danadas}
                          onChange={(e) => cambiar(l.id, { danadas: soloEntero(e.target.value) })}
                        />
                      </label>
                      <label className="flex w-28 flex-col gap-1 text-small text-ink">
                        Costo c/u (Q)
                        <Input
                          inputMode="decimal"
                          aria-label={`Costo de ${l.nombre}`}
                          placeholder="0.00"
                          value={costoVisible(l, r)}
                          onChange={(e) => cambiar(l.id, { costo: soloDinero(e.target.value) })}
                        />
                      </label>
                      <span className="ml-auto pb-1.5 text-body font-semibold text-ink-strong tabular">
                        {formatQ(centavos(llegan * n(costoVisible(l, r))))}
                      </span>
                    </div>
                    {resto > 0 && llegan > 0 && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small">
                        <span className="text-ink-muted">
                          <Clock className="mr-1 inline size-3.5" />
                          Vinieron menos: faltan {cantidadCon(p ?? {}, r.presentacion, resto)}.
                        </span>
                        <Checkbox
                          checked={r.noEsperarResto}
                          onChange={(v) => cambiar(l.id, { noEsperarResto: v })}
                          label="Ya no esperar lo que falta"
                        />
                      </div>
                    )}
                    {n(r.danadas) > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-small text-stock-low-text">
                          <AlertTriangle className="mr-1 inline size-3.5" />
                          Las dañadas no entran al stock: quedan como reclamo.
                        </span>
                        <Input
                          aria-label={`Qué tenían las dañadas de ${l.nombre}`}
                          maxLength={120}
                          placeholder="¿Qué tenían? Ej. mojadas"
                          value={r.motivo}
                          onChange={(e) => cambiar(l.id, { motivo: e.target.value })}
                          className="h-7 max-w-64 flex-1"
                        />
                      </div>
                    )}
                  </div>
                )}

                {r.marca === "no_vino" && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-small">
                    <span className="text-ink-muted">
                      {r.cancelar
                        ? "Se quita del pedido."
                        : "Sigue pendiente: puede venir en otra entrega."}
                    </span>
                    <Checkbox
                      checked={r.cancelar}
                      onChange={(v) => cambiar(l.id, { cancelar: v })}
                      label="Ya no se pide"
                    />
                  </div>
                )}

                {errores[l.id] && (
                  <p role="alert" className="mt-1 text-small text-stock-out">
                    {errores[l.id]}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-small text-ink-muted">Lo que no marques sigue pendiente en el pedido.</p>
      </form>
    </Modal>
  );
}

function Resultado({
  pedido,
  resultado,
  paquetes,
  onClose,
}: {
  pedido: DetallePedido;
  resultado: ResultadoRecepcion;
  paquetes: Map<string, string | undefined>;
  onClose: () => void;
}) {
  const quedan =
    resultado.estado === "parcial"
      ? "Lo que no vino sigue pendiente en este pedido."
      : resultado.estado === "recibido"
        ? "Ya no se espera nada más: el pedido quedó recibido."
        : "El pedido quedó cancelado.";
  return (
    <Modal
      open
      onClose={onClose}
      title="Paquete revisado"
      subtitle={`${pedido.numero} · ${pedido.proveedor.nombre}${resultado.compra ? ` · ${formatQ(resultado.compra.total)}` : ""}`}
      size="lg"
      variante="destacado"
      footer={<Button onClick={onClose}>Listo</Button>}
    >
      <div className="flex flex-col gap-3">
        {resultado.compra && (
          <p className="flex items-center gap-2 rounded-md bg-stock-ok-bg px-3 py-2 text-body text-stock-ok-text">
            <CircleCheck className="size-5 shrink-0" /> Lo que vino ya se sumó al inventario.
          </p>
        )}
        <p className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-body text-ink">
          <Clock className="size-5 shrink-0 text-ink-muted" /> {quedan}
        </p>
        {resultado.reclamos > 0 && (
          <p className="flex items-start gap-2 rounded-md bg-stock-low-bg px-3 py-2 text-body text-stock-low-text">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            {resultado.reclamos === 1
              ? "1 producto llegó dañado: quedó como reclamo pendiente con el proveedor."
              : `${resultado.reclamos} productos llegaron dañados: quedaron como reclamos pendientes.`}
          </p>
        )}
        <AvisosCosto avisos={resultado.avisos as AvisoCosto[]} paquetes={paquetes} />
      </div>
    </Modal>
  );
}
