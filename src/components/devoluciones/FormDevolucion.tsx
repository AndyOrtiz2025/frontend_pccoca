"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CircleCheck,
  LoaderCircle,
  Minus,
  PackageCheck,
  PackageX,
  Plus,
  Receipt,
  ScanBarcode,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button, Card, Field, Input, SegmentedControl, Select, useToast } from "@/components/ui";
import { ImagenProducto } from "@/components/venta/ImagenProducto";
import { useVenta } from "@/components/venta/VentaContext";
import { useErrorApi } from "@/hooks/useErrorApi";
import { cn } from "@/lib/cn";
import { diaDeGuatemala, formatFecha } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { ErrorApi, postApi } from "@/lib/http";
import { nombrePaquete } from "@/lib/presentacion";
import { buscarPorEscaneo, buscarProductos } from "@/lib/reglas/busqueda";
import { calcularCarrito } from "@/lib/reglas/carrito";
import { centavos } from "@/lib/reglas/dinero";
import { cuadreCambio, diasEntre, fueraDePlazo } from "@/lib/reglas/devoluciones";
import type { ResultadoDevolucion, VentaParaDevolucion } from "@/lib/api";
import { PLAZO_DEVOLUCION_DIAS, type Devolucion, type EstadoDevuelto } from "@/types/devolucion";
import type { LineaCarrito } from "@/types/movimiento";
import type { Presentacion, ProductoVenta } from "@/types/producto";
import { ModalComprobanteDevolucion } from "./ModalComprobanteDevolucion";

interface ItemDevuelto {
  productoId: string;
  presentacion: Presentacion;
  nombre: string;
  codigo: string;
  nombrePaquete?: string;
  precio: number;
  /** Con comprobante: lo que todavía se puede devolver de esa venta. */
  max?: number;
  cantidad: number;
  estado: EstadoDevuelto | null;
  nota: string;
}

interface ItemLlevo {
  productoId: string;
  presentacion: Presentacion;
  cantidad: number;
}

const clave = (x: { productoId: string; presentacion: Presentacion }) =>
  `${x.productoId}|${x.presentacion}`;

function precioActual(p: ProductoVenta, presentacion: Presentacion) {
  return presentacion === "paquete" ? (p.fraccionable?.precioPaquete ?? p.precio) : p.precio;
}

/**
 * Devolución de un cliente (solo ventas pagadas). Nunca se devuelve dinero:
 * lo devuelto queda como saldo a favor que se usa completo en lo que se lleva.
 */
export function FormDevolucion() {
  const { productos, actualizarProductos, usarLector } = useVenta();
  const toast = useToast();
  const manejarError = useErrorApi();
  const hoy = diaDeGuatemala(new Date());

  const [modo, setModo] = useState<"con" | "sin">("con");
  const [numero, setNumero] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [venta, setVenta] = useState<VentaParaDevolucion | null>(null);
  const [fechaCompra, setFechaCompra] = useState("");
  const [items, setItems] = useState<ItemDevuelto[]>([]);
  const [autorizoPor, setAutorizoPor] = useState<"" | "Paola" | "Oscar">("");
  const [autorizoMotivo, setAutorizoMotivo] = useState("");
  const [llevo, setLlevo] = useState<ItemLlevo[]>([]);
  const [buscaDevuelto, setBuscaDevuelto] = useState("");
  const [buscaLlevo, setBuscaLlevo] = useState("");
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [hecha, setHecha] = useState<Devolucion | null>(null);

  const porId = new Map(productos.map((p) => [p.id, p]));
  const devueltos = items.filter((i) => i.cantidad > 0);
  const saldo = centavos(devueltos.reduce((t, i) => t + i.precio * i.cantidad, 0));
  const dias = modo === "con" ? venta?.dias : fechaCompra ? diasEntre(fechaCompra, hoy) : undefined;
  const fuera = dias !== undefined && fueraDePlazo(dias);
  const calculado = calcularCarrito(
    llevo.map((l): LineaCarrito => ({ ...l, tipo: "venta" })),
    porId,
  );
  const { falta, diferencia } = cuadreCambio(saldo, calculado.total);
  const sinEstado = devueltos.some((i) => !i.estado);
  const faltaAutorizacion = fuera && (!autorizoPor || autorizoMotivo.trim().length < 3);
  const listo =
    devueltos.length > 0 &&
    !sinEstado &&
    dias !== undefined &&
    dias >= 0 &&
    !faltaAutorizacion &&
    llevo.length > 0 &&
    falta === 0;

  const sugDevuelto = buscaDevuelto.trim()
    ? buscarProductos(productos, buscaDevuelto).slice(0, 6)
    : [];
  const activos = productos.filter((p) => p.activo);
  const sugLlevo = buscaLlevo.trim() ? buscarProductos(activos, buscaLlevo).slice(0, 6) : [];

  function reiniciar() {
    setVenta(null);
    setNumero("");
    setFechaCompra("");
    setItems([]);
    setAutorizoPor("");
    setAutorizoMotivo("");
    setLlevo([]);
    setError(undefined);
  }

  async function buscarVenta() {
    if (!numero.trim()) return;
    setBuscando(true);
    setError(undefined);
    try {
      const res = await fetch(
        `/api/devoluciones/venta?numero=${encodeURIComponent(numero.trim())}`,
      );
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVenta(null);
        setItems([]);
        setError(datos.error ?? "No se encontró la venta");
        return;
      }
      const v = datos as VentaParaDevolucion;
      setVenta(v);
      setItems(
        v.lineas.map((l) => ({
          productoId: l.productoId,
          presentacion: l.presentacion,
          nombre: l.nombre,
          codigo: l.codigo,
          nombrePaquete: l.nombrePaquete,
          precio: l.precioUnitario,
          max: l.disponibles,
          cantidad: 0,
          estado: null,
          nota: "",
        })),
      );
    } catch {
      setError("Sin conexión con el servidor. Revisa tu internet.");
    } finally {
      setBuscando(false);
    }
  }

  function agregarDevuelto(p: ProductoVenta, presentacion: Presentacion = "unidad") {
    setItems((is) => {
      const i = is.findIndex((x) => clave(x) === clave({ productoId: p.id, presentacion }));
      if (i >= 0) return is.map((x, k) => (k === i ? { ...x, cantidad: x.cantidad + 1 } : x));
      return [
        ...is,
        {
          productoId: p.id,
          presentacion,
          nombre: p.nombre,
          codigo: p.codigo,
          nombrePaquete: presentacion === "paquete" ? nombrePaquete(p) : undefined,
          precio: precioActual(p, presentacion),
          cantidad: 1,
          estado: null,
          nota: "",
        },
      ];
    });
    setBuscaDevuelto("");
    setError(undefined);
  }

  function agregarLlevo(p: ProductoVenta, presentacion: Presentacion = "unidad") {
    if (p.disponibilidad.agotado) {
      toast(`${p.nombre} está agotado`, "warning");
      return;
    }
    setLlevo((ls) => {
      const i = ls.findIndex((x) => clave(x) === clave({ productoId: p.id, presentacion }));
      if (i >= 0) return ls.map((x, k) => (k === i ? { ...x, cantidad: x.cantidad + 1 } : x));
      return [...ls, { productoId: p.id, presentacion, cantidad: 1 }];
    });
    setBuscaLlevo("");
    setError(undefined);
  }

  // El escáner, en esta pantalla, agrega aquí (no al carrito de ventas).
  const alLeer = useRef<(codigo: string) => void>(() => {});
  useEffect(() => {
    alLeer.current = (codigo: string) => {
      const r = buscarPorEscaneo(productos, codigo);
      if (!r) return toast(`No hay ningún producto con el código ${codigo}`, "warning");
      if (modo === "sin" && devueltos.length === 0) {
        return agregarDevuelto(r.producto, r.presentacion);
      }
      if (saldo > 0) return agregarLlevo(r.producto, r.presentacion);
      toast("Primero busca la venta y elige lo que devuelve", "info");
    };
  });
  useEffect(() => {
    usarLector((c) => alLeer.current(c));
    return () => usarLector(null);
  }, [usarLector]);

  function cambiarItem(i: number, cambios: Partial<ItemDevuelto>) {
    setItems((is) => is.map((x, k) => (k === i ? { ...x, ...cambios } : x)));
    setError(undefined);
  }

  async function confirmar() {
    if (!listo || enviando) return;
    setEnviando(true);
    setError(undefined);
    try {
      const r = await postApi<ResultadoDevolucion>("/api/devoluciones", {
        ...(modo === "con" && venta ? { comprobanteId: venta.id } : { fechaCompra }),
        devuelto: devueltos.map((i) => ({
          productoId: i.productoId,
          presentacion: i.presentacion,
          cantidad: i.cantidad,
          estado: i.estado,
          nota: i.nota.trim() || undefined,
        })),
        llevo,
        ...(fuera && { autorizo: { por: autorizoPor, motivo: autorizoMotivo.trim() } }),
      });
      actualizarProductos(r.productos);
      setHecha(r.devolucion);
    } catch (e) {
      if (e instanceof ErrorApi && (e.status === 400 || e.status === 409)) setError(e.message);
      else manejarError(e);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 text-body text-ink-muted">
        <Undo2 className="mt-0.5 size-4 shrink-0" />
        Solo ventas pagadas, hasta {PLAZO_DEVOLUCION_DIAS} días después de la compra. No se devuelve
        dinero: lo devuelto queda como saldo a favor para llevarse otros productos.
      </p>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        {/* ─── 1. Lo que devuelve ─── */}
        <Card className="min-w-0">
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-h2 font-semibold text-ink-strong">1. ¿Qué devuelve?</h2>
              <SegmentedControl
                ariaLabel="¿Trae comprobante?"
                value={modo}
                onChange={(m) => {
                  reiniciar();
                  setModo(m);
                }}
                options={[
                  { value: "con", label: "Con comprobante" },
                  { value: "sin", label: "Sin comprobante" },
                ]}
              />
            </div>

            {modo === "con" ? (
              <div className="flex flex-col gap-3">
                <form
                  className="flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    buscarVenta();
                  }}
                >
                  <Field label="No. del comprobante" className="flex-1">
                    {(id) => (
                      <Input
                        id={id}
                        autoComplete="off"
                        placeholder="Ej. 3F2A9C1B"
                        maxLength={12}
                        value={numero}
                        onChange={(e) => setNumero(e.target.value.toUpperCase())}
                        className="font-mono uppercase"
                      />
                    )}
                  </Field>
                  <Button type="submit" variant="dark" disabled={buscando || !numero.trim()}>
                    {buscando ? <LoaderCircle className="animate-spin" /> : <Search />}
                    Buscar venta
                  </Button>
                </form>
                {venta && (
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-gray-100 px-3 py-2 text-small text-ink">
                    <Receipt className="size-4 text-ink-muted" />
                    <span className="font-mono font-semibold text-ink-strong">{venta.numero}</span>
                    <span>{formatFecha(venta.fecha)}</span>
                    <span>Atendió {venta.atendio}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <Field label="¿Cuándo lo compró?">
                  {(id) => (
                    <Input
                      id={id}
                      type="date"
                      max={hoy}
                      value={fechaCompra}
                      onChange={(e) => setFechaCompra(e.target.value)}
                    />
                  )}
                </Field>
                <Buscador
                  id="buscar-devuelto"
                  label="Producto que devuelve"
                  valor={buscaDevuelto}
                  onValor={setBuscaDevuelto}
                  sugerencias={sugDevuelto}
                  productos={productos}
                  onElegir={agregarDevuelto}
                />
              </div>
            )}

            {dias !== undefined && devueltos.length + items.length > 0 && (
              <PlazoAviso
                dias={dias}
                por={autorizoPor}
                motivo={autorizoMotivo}
                onPor={setAutorizoPor}
                onMotivo={setAutorizoMotivo}
              />
            )}

            {items.length > 0 && (
              <ul className="flex flex-col gap-2">
                {items.map((it, i) => {
                  const p = porId.get(it.productoId);
                  const sinDisponibles = it.max === 0;
                  return (
                    <li
                      key={clave(it)}
                      className={cn(
                        "rounded-md border px-3 py-2.5",
                        it.cantidad > 0 ? "border-navy-900/30 bg-white" : "border-gray-200",
                        sinDisponibles && "opacity-60",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        {p && (
                          <ImagenProducto
                            categoria={p.categoria}
                            nombre={p.nombre}
                            imagenUrl={p.imagenUrl}
                            className="size-9 shrink-0 rounded-xs"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-ink-strong">
                            {it.presentacion === "paquete"
                              ? `${it.nombre} (${(it.nombrePaquete ?? "paquete").toLowerCase()})`
                              : it.nombre}
                          </p>
                          <p className="text-small text-ink-muted">
                            {modo === "con"
                              ? sinDisponibles
                                ? "Ya se devolvió completo"
                                : `Pagó ${formatQ(it.precio)} c/u · puede devolver ${it.max}`
                              : `Precio actual ${formatQ(it.precio)} c/u`}
                          </p>
                        </div>
                        <Contador
                          nombre={it.nombre}
                          valor={it.cantidad}
                          max={it.max}
                          min={modo === "sin" ? 1 : 0}
                          disabled={sinDisponibles}
                          onChange={(n) => cambiarItem(i, { cantidad: n })}
                        />
                        {modo === "sin" && (
                          <button
                            type="button"
                            aria-label={`Quitar ${it.nombre}`}
                            onClick={() => setItems((is) => is.filter((_, k) => k !== i))}
                            className="flex size-8 items-center justify-center rounded-sm text-ink-muted hover:bg-gray-100 hover:text-stock-out"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                      {modo === "sin" && p?.fraccionable && (
                        <div className="mt-2">
                          <Select
                            aria-label={`Cómo lo compró: ${it.nombre}`}
                            className="w-52"
                            value={it.presentacion}
                            onChange={(e) => {
                              const pres = e.target.value as Presentacion;
                              cambiarItem(i, {
                                presentacion: pres,
                                precio: precioActual(p, pres),
                                nombrePaquete: pres === "paquete" ? nombrePaquete(p) : undefined,
                              });
                            }}
                          >
                            <option value="unidad">Por unidad</option>
                            <option value="paquete">Por {nombrePaquete(p).toLowerCase()}</option>
                          </Select>
                        </div>
                      )}
                      {it.cantidad > 0 && (
                        <div className="mt-2 flex flex-col gap-2 border-t border-gray-200 pt-2">
                          <div
                            role="radiogroup"
                            aria-label={`¿Cómo viene ${it.nombre}?`}
                            className="grid gap-2 sm:grid-cols-2"
                          >
                            <OpcionEstado
                              activo={it.estado === "buen_estado"}
                              onClick={() => cambiarItem(i, { estado: "buen_estado" })}
                              icono={<PackageCheck className="size-5" />}
                              titulo="Buen estado"
                              detalle="Vuelve al stock"
                            />
                            <OpcionEstado
                              activo={it.estado === "defectuoso"}
                              onClick={() => cambiarItem(i, { estado: "defectuoso" })}
                              icono={<PackageX className="size-5" />}
                              titulo="Defectuoso"
                              detalle="No vuelve al stock: reclamo al proveedor"
                              peligro
                            />
                          </div>
                          <Input
                            aria-label={`Nota de ${it.nombre}`}
                            maxLength={120}
                            placeholder={
                              it.estado === "defectuoso"
                                ? "¿Qué tiene? Ej. no enciende"
                                : "Nota (opcional). Ej. se equivocó de color"
                            }
                            value={it.nota}
                            onChange={(e) => cambiarItem(i, { nota: e.target.value })}
                            className="h-8"
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {modo === "con" && !venta && (
              <p className="rounded-md border border-dashed border-gray-300 px-4 py-6 text-center text-body text-ink-muted">
                Escribe el número que sale en el comprobante (No.) y busca la venta.
              </p>
            )}
            {modo === "sin" && items.length === 0 && (
              <p className="rounded-md border border-dashed border-gray-300 px-4 py-6 text-center text-body text-ink-muted">
                Pon la fecha en que lo compró y busca o escanea el producto. Se toma el precio de
                hoy.
              </p>
            )}

            <div className="flex items-baseline justify-between border-t border-gray-200 pt-3">
              <span className="text-body text-ink-muted">Saldo a favor</span>
              <span className="text-price font-bold text-navy-900 tabular">{formatQ(saldo)}</span>
            </div>
          </div>
        </Card>

        {/* ─── 2. Lo que se lleva ─── */}
        <Card className={cn("min-w-0", saldo === 0 && "opacity-60")}>
          <div className="flex flex-col gap-4 p-5">
            <h2 className="text-h2 font-semibold text-ink-strong">2. ¿Qué se lleva a cambio?</h2>
            <Buscador
              id="buscar-llevo"
              label="El mismo producto u otro"
              valor={buscaLlevo}
              onValor={setBuscaLlevo}
              sugerencias={sugLlevo}
              productos={activos}
              onElegir={agregarLlevo}
              disabled={saldo === 0}
            />
            {llevo.length === 0 ? (
              <p className="rounded-md border border-dashed border-gray-300 px-4 py-6 text-center text-body text-ink-muted">
                {saldo === 0
                  ? "Primero elige lo que devuelve."
                  : `Agrega productos hasta cubrir ${formatQ(saldo)}.`}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-gray-200 rounded-md border border-gray-200">
                {calculado.lineas.map((l, i) => (
                  <li key={clave(l)} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <ImagenProducto
                      categoria={l.producto.categoria}
                      nombre={l.producto.nombre}
                      imagenUrl={porId.get(l.productoId)?.imagenUrl}
                      className="size-9 shrink-0 rounded-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink-strong">
                        {l.producto.nombre}
                        {l.presentacion === "paquete" &&
                          ` (${nombrePaquete(l.producto).toLowerCase()})`}
                      </p>
                      <p className="text-small text-ink-muted">
                        {formatQ(l.precioUnitario)} c/u{l.mayoreo && " · mayoreo"}
                      </p>
                    </div>
                    {l.producto.fraccionable && (
                      <Select
                        aria-label={`Cómo se lleva ${l.producto.nombre}`}
                        className="w-32"
                        value={l.presentacion}
                        onChange={(e) =>
                          setLlevo((ls) =>
                            ls.map((x, k) =>
                              k === i ? { ...x, presentacion: e.target.value as Presentacion } : x,
                            ),
                          )
                        }
                      >
                        <option value="unidad">Unidad</option>
                        <option value="paquete">{nombrePaquete(l.producto)}</option>
                      </Select>
                    )}
                    <Contador
                      nombre={l.producto.nombre}
                      valor={l.cantidad}
                      min={0}
                      onChange={(n) =>
                        setLlevo((ls) =>
                          n === 0
                            ? ls.filter((_, k) => k !== i)
                            : ls.map((x, k) => (k === i ? { ...x, cantidad: n } : x)),
                        )
                      }
                    />
                    <span className="w-20 text-right font-semibold text-ink-strong tabular">
                      {formatQ(l.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <dl className="flex flex-col gap-1.5 border-t border-gray-200 pt-3 text-body">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Saldo a favor</dt>
                <dd className="tabular">{formatQ(saldo)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Se lleva</dt>
                <dd className="tabular">{formatQ(calculado.total)}</dd>
              </div>
              {saldo > 0 &&
                (falta > 0 ? (
                  <div className="flex justify-between rounded-sm bg-stock-out-bg px-3 py-2 font-semibold text-stock-out-text">
                    <dt>Falta escoger</dt>
                    <dd className="tabular">{formatQ(falta)}</dd>
                  </div>
                ) : diferencia > 0 ? (
                  <div className="flex justify-between rounded-sm bg-gold-100 px-3 py-2 font-semibold text-gold-text">
                    <dt>El cliente paga la diferencia</dt>
                    <dd className="text-price tabular">{formatQ(diferencia)}</dd>
                  </div>
                ) : (
                  llevo.length > 0 && (
                    <div className="flex items-center justify-between rounded-sm bg-stock-ok-bg px-3 py-2 font-semibold text-stock-ok-text">
                      <dt className="flex items-center gap-1.5">
                        <CircleCheck className="size-4" /> Cambio exacto
                      </dt>
                      <dd className="tabular">{formatQ(0)}</dd>
                    </div>
                  )
                ))}
            </dl>

            {error && (
              <p role="alert" className="text-small text-stock-out">
                {error}
              </p>
            )}
            {sinEstado && (
              <p className="text-small text-stock-low-text">
                Marca si cada producto viene en buen estado o defectuoso.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={reiniciar}>
                Empezar de nuevo
              </Button>
              <Button onClick={confirmar} disabled={!listo || enviando}>
                {enviando ? <LoaderCircle className="animate-spin" /> : <CircleCheck />}
                Confirmar cambio
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {hecha && (
        <ModalComprobanteDevolucion
          devolucion={hecha}
          recienHecha
          textoCerrar="Nueva devolución"
          onClose={() => {
            setHecha(null);
            reiniciar();
            toast("Devolución registrada", "success");
          }}
        />
      )}
    </div>
  );
}

function PlazoAviso({
  dias,
  por,
  motivo,
  onPor,
  onMotivo,
}: {
  dias: number;
  por: "" | "Paola" | "Oscar";
  motivo: string;
  onPor: (v: "" | "Paola" | "Oscar") => void;
  onMotivo: (v: string) => void;
}) {
  if (dias < 0) {
    return (
      <p role="alert" className="text-small text-stock-out">
        La fecha de compra no puede ser futura.
      </p>
    );
  }
  if (!fueraDePlazo(dias)) {
    return (
      <p className="flex items-center gap-2 rounded-md bg-stock-ok-bg px-3 py-2 text-small font-medium text-stock-ok-text">
        <ShieldCheck className="size-4" />
        Dentro del plazo:{" "}
        {dias === 0 ? "compró hoy" : `hace ${dias} ${dias === 1 ? "día" : "días"}`}.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-md border border-stock-out/40 bg-stock-out-bg px-3 py-2.5">
      <p className="flex items-start gap-2 text-small font-semibold text-stock-out-text">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        Pasaron {dias} días (el plazo es de {PLAZO_DEVOLUCION_DIAS}). Solo con autorización de Paola
        u Oscar.
      </p>
      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
        <Select
          aria-label="¿Quién autorizó?"
          value={por}
          onChange={(e) => onPor(e.target.value as "" | "Paola" | "Oscar")}
        >
          <option value="">¿Quién autorizó?</option>
          <option value="Paola">Paola</option>
          <option value="Oscar">Oscar</option>
        </Select>
        <Input
          aria-label="Motivo de la autorización"
          maxLength={150}
          placeholder="Motivo. Ej. cliente frecuente"
          value={motivo}
          onChange={(e) => onMotivo(e.target.value)}
        />
      </div>
    </div>
  );
}

function OpcionEstado({
  activo,
  onClick,
  icono,
  titulo,
  detalle,
  peligro,
}: {
  activo: boolean;
  onClick: () => void;
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
  peligro?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activo}
      onClick={onClick}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors",
        activo
          ? peligro
            ? "border-stock-out bg-stock-out-bg text-stock-out-text"
            : "border-stock-ok bg-stock-ok-bg text-stock-ok-text"
          : "hover:bg-gray-50 border-gray-200 text-ink",
      )}
    >
      {icono}
      <span>
        <span className="block text-body font-semibold">{titulo}</span>
        <span className="block text-small opacity-80">{detalle}</span>
      </span>
    </button>
  );
}

function Contador({
  nombre,
  valor,
  min = 0,
  max,
  disabled,
  onChange,
}: {
  nombre: string;
  valor: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Cantidad de ${nombre}`}>
      <Button
        variant="icon"
        size="sm"
        aria-label={`Menos ${nombre}`}
        disabled={disabled || valor <= min}
        onClick={() => onChange(valor - 1)}
      >
        <Minus />
      </Button>
      <span className="w-8 text-center font-semibold text-ink-strong tabular">{valor}</span>
      <Button
        variant="icon"
        size="sm"
        aria-label={`Más ${nombre}`}
        disabled={disabled || (max !== undefined && valor >= max)}
        onClick={() => onChange(valor + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}

function Buscador({
  id,
  label,
  valor,
  onValor,
  sugerencias,
  productos,
  onElegir,
  disabled,
}: {
  id: string;
  label: string;
  valor: string;
  onValor: (v: string) => void;
  sugerencias: ProductoVenta[];
  productos: ProductoVenta[];
  onElegir: (p: ProductoVenta, presentacion?: Presentacion) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-small font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <ScanBarcode className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-muted" />
        <Input
          id={id}
          autoComplete="off"
          disabled={disabled}
          placeholder="Busca por nombre o código, o escanéalo"
          value={valor}
          onChange={(e) => onValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (!valor.trim()) return;
            const exacto = buscarPorEscaneo(productos, valor);
            if (exacto) onElegir(exacto.producto, exacto.presentacion);
            else if (sugerencias[0]) onElegir(sugerencias[0]);
          }}
          className="pl-8"
        />
      </div>
      {sugerencias.length > 0 && (
        <ul
          role="listbox"
          aria-label="Productos encontrados"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-sm border border-gray-200 bg-white py-1 shadow-md"
        >
          {sugerencias.map((p) => (
            <li
              key={p.id}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                onElegir(p);
              }}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-gray-100"
            >
              <ImagenProducto
                categoria={p.categoria}
                nombre={p.nombre}
                imagenUrl={p.imagenUrl}
                className="size-8 shrink-0 rounded-xs"
              />
              <span className="min-w-0 flex-1 truncate text-body text-ink-strong">{p.nombre}</span>
              <span className="text-small text-ink-muted tabular">{formatQ(p.precio)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
