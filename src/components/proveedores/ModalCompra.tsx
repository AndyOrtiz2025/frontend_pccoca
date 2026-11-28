"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CircleCheck,
  LoaderCircle,
  PackagePlus,
  Save,
  ScanBarcode,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button, Field, Input, Modal, Select, useToast } from "@/components/ui";
import { ImagenProducto } from "@/components/venta/ImagenProducto";
import { useErrorApi } from "@/hooks/useErrorApi";
import { cn } from "@/lib/cn";
import { diaDeGuatemala } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { ErrorApi, postApi } from "@/lib/http";
import { cantidadCon, nombrePaquete } from "@/lib/presentacion";
import { buscarPorEscaneo, buscarProductos } from "@/lib/reglas/busqueda";
import { centavos } from "@/lib/reglas/dinero";
import type { AvisoCosto } from "@/lib/reglas/compras";
import { compraSchema } from "@/schemas/proveedor.schema";
import type { Presentacion, Producto } from "@/types/producto";
import type { Proveedor } from "@/types/proveedor";

interface Linea {
  productoId: string;
  presentacion: Presentacion;
  cantidad: string;
  danadas: string;
  costo: string;
  motivoDano: string;
}

interface Resultado {
  total: number;
  avisos: AvisoCosto[];
  reclamos: number;
}

const soloEntero = (v: string) => v.replace(/\D/g, "").slice(0, 6);
const soloDinero = (v: string) => v.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
const n = (v: string) => (v.trim() === "" ? 0 : Number(v));

/** Costo con el que se precarga la línea: el último que se pagó. */
function costoSugerido(p: Producto, presentacion: Presentacion) {
  const c = presentacion === "paquete" ? p.fraccionable?.costoPaquete : p.costo;
  return c === undefined ? "" : String(c);
}

/**
 * Registrar compra (pantalla 19): la llegada de mercadería. Se agregan productos buscando o
 * escaneando; lo que llegó dañado no entra al stock y queda como reclamo al proveedor.
 */
export function ModalCompra({
  proveedores,
  productos,
  proveedorInicial,
  onClose,
}: {
  proveedores: Proveedor[];
  productos: Producto[];
  proveedorInicial?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const hoy = diaDeGuatemala(new Date());
  const [proveedorId, setProveedorId] = useState(proveedorInicial ?? "");
  const [fecha, setFecha] = useState(hoy);
  const [factura, setFactura] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const buscador = useRef<HTMLInputElement>(null);

  const activos = useMemo(() => productos.filter((p) => p.activo), [productos]);
  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const sugerencias = busqueda.trim() ? buscarProductos(activos, busqueda).slice(0, 6) : [];

  const subtotal = (l: Linea) => centavos((n(l.cantidad) + n(l.danadas)) * n(l.costo));
  const total = centavos(lineas.reduce((t, l) => t + subtotal(l), 0));

  function agregar(p: Producto, presentacion?: Presentacion) {
    const pres: Presentacion = presentacion ?? (p.fraccionable ? "paquete" : "unidad");
    setLineas((ls) => {
      const i = ls.findIndex((l) => l.productoId === p.id && l.presentacion === pres);
      if (i >= 0) {
        // Ya estaba: escanear otra vez suma 1.
        return ls.map((l, k) => (k === i ? { ...l, cantidad: String(n(l.cantidad) + 1) } : l));
      }
      return [
        ...ls,
        {
          productoId: p.id,
          presentacion: pres,
          cantidad: "1",
          danadas: "",
          costo: costoSugerido(p, pres),
          motivoDano: "",
        },
      ];
    });
    setBusqueda("");
    setErrores((e) => ({ ...e, lineas: undefined }));
    buscador.current?.focus();
  }

  function alEnter() {
    // El lector termina con Enter: si es un código exacto (unidad o caja) se agrega directo.
    const exacto = buscarPorEscaneo(activos, busqueda);
    if (exacto) return agregar(exacto.producto, exacto.presentacion);
    if (sugerencias[0]) return agregar(sugerencias[0]);
    toast(`No hay ningún producto con "${busqueda}"`, "warning");
  }

  function cambiar(i: number, cambios: Partial<Linea>) {
    setLineas((ls) => ls.map((l, k) => (k === i ? { ...l, ...cambios } : l)));
    setErrores({});
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const datos = {
      proveedorId,
      fecha,
      factura: factura.trim() || undefined,
      lineas: lineas.map((l) => ({
        productoId: l.productoId,
        presentacion: l.presentacion,
        cantidad: n(l.cantidad),
        danadas: n(l.danadas),
        costoUnitario: l.costo.trim() === "" ? NaN : n(l.costo),
        motivoDano: n(l.danadas) > 0 ? l.motivoDano.trim() || undefined : undefined,
      })),
    };
    const r = compraSchema.safeParse(datos);
    if (!r.success) {
      const nuevos: Record<string, string> = {};
      for (const i of r.error.issues) nuevos[i.path.join(".")] ??= i.message;
      return setErrores(nuevos);
    }
    setGuardando(true);
    try {
      const res = await postApi<Resultado>("/api/compras", r.data);
      setResultado(res);
      toast(`Compra registrada: ${formatQ(res.total)}`, "success");
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
      <Modal
        open
        onClose={onClose}
        title="Compra registrada"
        subtitle={`${proveedores.find((p) => p.id === proveedorId)?.nombre ?? ""} · ${formatQ(resultado.total)}`}
        size="md"
        variante="destacado"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setResultado(null);
                setLineas([]);
                setFactura("");
              }}
            >
              Registrar otra
            </Button>
            <Button onClick={onClose}>Listo</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 rounded-md bg-stock-ok-bg px-3 py-2 text-body text-stock-ok-text">
            <CircleCheck className="size-5 shrink-0" /> El stock ya se sumó al inventario.
          </p>
          {resultado.reclamos > 0 && (
            <p className="flex items-start gap-2 rounded-md bg-stock-low-bg px-3 py-2 text-body text-stock-low-text">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
              {resultado.reclamos === 1
                ? "1 producto llegó dañado: quedó como reclamo pendiente con el proveedor."
                : `${resultado.reclamos} productos llegaron dañados: quedaron como reclamos pendientes.`}
            </p>
          )}
          {resultado.avisos.length > 0 && (
            <div>
              <p className="mb-2 text-small font-semibold text-ink-muted">Cambió el costo</p>
              <ul className="flex flex-col gap-2">
                {resultado.avisos.map((a) => {
                  const p = porId.get(a.productoId);
                  const en =
                    a.presentacion === "paquete" && p
                      ? `por ${nombrePaquete(p).toLowerCase()}`
                      : "por unidad";
                  const subio = a.ahora > a.antes;
                  return (
                    <li
                      key={`${a.productoId}-${a.presentacion}`}
                      className={cn(
                        "rounded-md border px-3 py-2",
                        a.ganancia < 0 ? "border-stock-out/40 bg-stock-out-bg" : "border-gray-200",
                      )}
                    >
                      <p className="flex items-center gap-1.5 font-semibold text-ink-strong">
                        {subio ? (
                          <TrendingUp className="size-4 text-stock-out" />
                        ) : (
                          <TrendingDown className="size-4 text-stock-ok" />
                        )}
                        {a.nombre}
                      </p>
                      <p className="text-small text-ink">
                        El costo {en} {subio ? "subió" : "bajó"} de {formatQ(a.antes)} a{" "}
                        {formatQ(a.ahora)}.{" "}
                        {a.ganancia < 0 ? (
                          <strong className="text-stock-out-text">
                            ¡Con el precio actual vendes bajo el costo! Revisa el precio.
                          </strong>
                        ) : (
                          <>
                            Con el precio actual ganas{" "}
                            <strong className="tabular">{formatQ(a.ganancia)}</strong> (
                            {a.porcentaje}%).{subio && " ¿Revisar el precio?"}
                          </>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar compra"
      subtitle="Llegada de mercadería: suma al stock y actualiza el costo"
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
          <Button type="submit" form="form-compra" disabled={guardando}>
            {guardando ? <LoaderCircle className="animate-spin" /> : <Save />}
            Guardar compra
          </Button>
        </>
      }
    >
      <form id="form-compra" onSubmit={guardar} noValidate className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <Field label="Proveedor" error={errores.proveedorId}>
            {(id, d) => (
              <Select
                id={id}
                aria-describedby={d}
                value={proveedorId}
                onChange={(e) => {
                  setProveedorId(e.target.value);
                  setErrores({});
                }}
              >
                <option value="">Elige el proveedor…</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Fecha de recepción" error={errores.fecha}>
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
        </div>

        <div className="relative">
          <label htmlFor="buscar-compra" className="mb-1.5 block text-small font-medium text-ink">
            Agregar producto
          </label>
          <div className="relative">
            <ScanBarcode className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-muted" />
            <Input
              id="buscar-compra"
              ref={buscador}
              autoComplete="off"
              placeholder="Busca por nombre o código, o escanéalo"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (busqueda.trim()) alEnter();
                }
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
                    agregar(p);
                  }}
                  className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-gray-100"
                >
                  <ImagenProducto
                    categoria={p.categoria}
                    nombre={p.nombre}
                    imagenUrl={p.imagenUrl}
                    className="size-8 shrink-0 rounded-xs"
                  />
                  <span className="min-w-0 flex-1 truncate text-body text-ink-strong">
                    {p.nombre}
                  </span>
                  <span className="font-mono text-small text-ink-muted">{p.codigo}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lineas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-gray-300 px-4 py-8 text-center">
            <PackagePlus className="size-7 text-gray-300" strokeWidth={1.5} />
            <p className="text-body text-ink-muted">Busca o escanea los productos que llegaron.</p>
            {errores.lineas && (
              <p role="alert" className="text-small text-stock-out">
                {errores.lineas}
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="w-full text-body">
              <thead>
                <tr className="bg-gray-50 text-left text-small text-ink-muted">
                  <th className="px-3 py-2 font-semibold">Producto</th>
                  <th className="px-2 py-2 font-semibold">Viene por</th>
                  <th className="w-20 px-2 py-2 font-semibold">Buenas</th>
                  <th className="w-20 px-2 py-2 font-semibold">Dañadas</th>
                  <th className="w-24 px-2 py-2 font-semibold">Costo c/u (Q)</th>
                  <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, i) => {
                  const p = porId.get(l.productoId)!;
                  const err = (k: string) => errores[`lineas.${i}.${k}`];
                  return (
                    <tr
                      key={`${l.productoId}-${l.presentacion}`}
                      className="border-t border-gray-200 align-top"
                    >
                      <td className="px-3 py-2">
                        <p className="font-medium text-ink-strong">{p.nombre}</p>
                        <p className="font-mono text-small text-ink-muted">{p.codigo}</p>
                      </td>
                      <td className="px-2 py-2">
                        {p.fraccionable ? (
                          <Select
                            aria-label={`Cómo viene ${p.nombre}`}
                            className="min-w-36"
                            value={l.presentacion}
                            onChange={(e) => {
                              const pres = e.target.value as Presentacion;
                              cambiar(i, { presentacion: pres, costo: costoSugerido(p, pres) });
                            }}
                          >
                            <option value="paquete">
                              {nombrePaquete(p)} ({p.fraccionable.unidadesPorPaquete} u.)
                            </option>
                            <option value="unidad">Unidad</option>
                          </Select>
                        ) : (
                          <span className="text-ink-muted">Unidad</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          aria-label={`Buenas de ${p.nombre}`}
                          inputMode="numeric"
                          value={l.cantidad}
                          invalid={!!err("cantidad")}
                          onChange={(e) => cambiar(i, { cantidad: soloEntero(e.target.value) })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          aria-label={`Dañadas de ${p.nombre}`}
                          inputMode="numeric"
                          placeholder="0"
                          value={l.danadas}
                          onChange={(e) => cambiar(i, { danadas: soloEntero(e.target.value) })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          aria-label={`Costo de ${p.nombre}`}
                          inputMode="decimal"
                          placeholder="0.00"
                          value={l.costo}
                          invalid={!!err("costoUnitario")}
                          onChange={(e) => cambiar(i, { costo: soloDinero(e.target.value) })}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold whitespace-nowrap text-ink-strong tabular">
                        {formatQ(subtotal(l))}
                      </td>
                      <td className="py-2 pr-2">
                        <button
                          type="button"
                          aria-label={`Quitar ${p.nombre}`}
                          onClick={() => setLineas((ls) => ls.filter((_, k) => k !== i))}
                          className="flex size-8 items-center justify-center rounded-sm text-ink-muted hover:bg-gray-100 hover:text-stock-out"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {lineas.map((l, i) => {
              const p = porId.get(l.productoId)!;
              const err = errores[`lineas.${i}.cantidad`] ?? errores[`lineas.${i}.costoUnitario`];
              return (
                <div key={`extra-${i}`}>
                  {err && (
                    <p
                      role="alert"
                      className="border-t border-gray-200 px-3 py-1.5 text-small text-stock-out"
                    >
                      {p.nombre}: {err}
                    </p>
                  )}
                  {n(l.danadas) > 0 && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 bg-stock-low-bg/60 px-3 py-2">
                      <span className="text-small text-stock-low-text">
                        <AlertTriangle className="mr-1 inline size-3.5" />
                        {cantidadCon(p, l.presentacion, n(l.danadas))} de {p.nombre} no entran al
                        stock: quedan como reclamo.
                      </span>
                      <Input
                        aria-label={`Qué tenían las dañadas de ${p.nombre}`}
                        maxLength={120}
                        placeholder="¿Qué tenían? Ej. mojadas"
                        value={l.motivoDano}
                        onChange={(e) => cambiar(i, { motivoDano: e.target.value })}
                        className="h-7 max-w-64 flex-1"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </form>
    </Modal>
  );
}
