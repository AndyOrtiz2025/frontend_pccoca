"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  History,
  LoaderCircle,
  Plus,
  Save,
  ScanBarcode,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button, Card, Chip, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { ImagenProducto } from "@/components/venta/ImagenProducto";
import { useErrorApi } from "@/hooks/useErrorApi";
import { ErrorApi, pedirApi } from "@/lib/http";
import { cantidadCon, nombrePaquete } from "@/lib/presentacion";
import { buscarPorEscaneo, buscarProductos } from "@/lib/reglas/busqueda";
import { sugerirPedido } from "@/lib/reglas/pedidos";
import { describirStock } from "@/lib/reglas/productos";
import type { DetallePedido, PendienteAnterior } from "@/lib/api";
import { pedidoSchema } from "@/schemas/pedido.schema";
import type { Categoria, Presentacion, Producto } from "@/types/producto";
import type { Proveedor } from "@/types/proveedor";
import { cantidadPedida } from "./comun";

interface Linea {
  key: string;
  productoId?: string;
  nombre: string;
  presentacion: Presentacion;
  cantidad: string;
  traerDe?: { pedidoId: string; lineaId: string; numero: string };
}

const soloEntero = (v: string) => v.replace(/\D/g, "").slice(0, 6);
const clave = () => crypto.randomUUID();

/**
 * Nuevo / Editar pedido: Paola arma la lista de lo que va a pedir.
 * Le sugiere lo que se está acabando y lo que faltó de pedidos anteriores a ese proveedor,
 * y deja agregar productos que todavía no tenemos (solo con el nombre).
 */
export function FormPedido({
  proveedores,
  productos,
  pendientes,
  categorias,
  base,
  pedido,
  proveedorInicial,
}: {
  proveedores: Proveedor[];
  productos: Producto[];
  /** Lo que falta de pedidos anteriores, por proveedor. */
  pendientes: Record<string, PendienteAnterior[]>;
  categorias: Categoria[];
  base: string;
  pedido?: DetallePedido;
  proveedorInicial?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [proveedorId, setProveedorId] = useState(pedido?.proveedorId ?? proveedorInicial ?? "");
  const [lineas, setLineas] = useState<Linea[]>(
    () =>
      pedido?.lineas
        .filter((l) => l.estado === "pendiente")
        .map((l) => ({
          key: l.id,
          productoId: l.productoId,
          nombre: l.nombre,
          presentacion: l.presentacion,
          cantidad: String(l.cantidad),
        })) ?? [],
  );
  const [notas, setNotas] = useState(pedido?.notas ?? "");
  const [busqueda, setBusqueda] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});
  const [guardando, setGuardando] = useState(false);
  const buscador = useRef<HTMLInputElement>(null);

  const porId = new Map(productos.map((p) => [p.id, p]));
  const activos = productos.filter((p) => p.activo);
  const proveedor = proveedores.find((p) => p.id === proveedorId);
  const sugerencias = busqueda.trim() ? buscarProductos(activos, busqueda).slice(0, 6) : [];
  const enLista = new Set(lineas.map((l) => l.productoId).filter(Boolean));
  const seAcaban = proveedor
    ? sugerirPedido(productos, proveedor, categorias).filter((s) => !enLista.has(s.productoId))
    : [];
  const traidos = new Set(lineas.map((l) => l.traerDe?.lineaId).filter(Boolean));
  const anteriores = (pendientes[proveedorId] ?? []).filter(
    (x) => x.pedidoId !== pedido?.id && !traidos.has(x.linea.id),
  );

  function agregar(p: Producto, presentacion?: Presentacion, cantidad = 1) {
    const pres: Presentacion = presentacion ?? (p.fraccionable ? "paquete" : "unidad");
    setLineas((ls) => {
      const i = ls.findIndex((l) => l.productoId === p.id && l.presentacion === pres);
      if (i >= 0) {
        return ls.map((l, k) =>
          k === i ? { ...l, cantidad: String((Number(l.cantidad) || 0) + cantidad) } : l,
        );
      }
      return [
        ...ls,
        {
          key: clave(),
          productoId: p.id,
          nombre: p.nombre,
          presentacion: pres,
          cantidad: String(cantidad),
        },
      ];
    });
    setBusqueda("");
    setErrores({});
  }

  function agregarNuevo() {
    const nombre = nuevoNombre.trim();
    if (nombre.length < 2) return setErrores({ nuevo: "Escribe el nombre del producto" });
    setLineas((ls) => [...ls, { key: clave(), nombre, presentacion: "unidad", cantidad: "1" }]);
    setNuevoNombre("");
    setErrores({});
  }

  function traer(x: PendienteAnterior) {
    // Si ya estaba en la lista, se quita para no repetirlo: queda la línea que viene del pedido anterior.
    setLineas((ls) => [
      ...ls.filter(
        (l) =>
          !(
            x.linea.productoId &&
            l.productoId === x.linea.productoId &&
            l.presentacion === x.linea.presentacion
          ),
      ),
      {
        key: clave(),
        productoId: x.linea.productoId,
        nombre: x.linea.nombre,
        presentacion: x.linea.presentacion,
        cantidad: String(x.linea.faltan),
        traerDe: { pedidoId: x.pedidoId, lineaId: x.linea.id, numero: x.numero },
      },
    ]);
    setErrores({});
  }

  function cambiar(i: number, cambios: Partial<Linea>) {
    setLineas((ls) => ls.map((l, k) => (k === i ? { ...l, ...cambios } : l)));
    setErrores({});
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const datos = {
      proveedorId,
      notas,
      lineas: lineas.map((l) => ({
        productoId: l.productoId,
        nombre: l.productoId ? undefined : l.nombre,
        presentacion: l.presentacion,
        cantidad: l.cantidad.trim() === "" ? NaN : Number(l.cantidad),
        ...(l.traerDe && {
          traerDe: { pedidoId: l.traerDe.pedidoId, lineaId: l.traerDe.lineaId },
        }),
      })),
    };
    const r = pedidoSchema.safeParse(datos);
    if (!r.success) {
      const nuevos: Record<string, string> = {};
      for (const i of r.error.issues) nuevos[i.path.join(".")] ??= i.message;
      return setErrores(nuevos);
    }
    setGuardando(true);
    try {
      const res = pedido
        ? await pedirApi<{ id: string }>(
            "PATCH",
            `/api/pedidos/${encodeURIComponent(pedido.id)}`,
            r.data,
          )
        : await pedirApi<{ id: string; numero: string }>("POST", "/api/pedidos", r.data);
      toast(
        pedido ? "Cambios guardados" : `Pedido ${"numero" in res ? res.numero : ""} guardado`,
        "success",
      );
      router.push(`${base}/${res.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ErrorApi && (err.status === 400 || err.status === 409)) {
        setErrores({ general: err.message });
      } else manejarError(err);
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={pedido ? `${base}/${pedido.id}` : base}
        className="inline-flex items-center gap-1.5 self-start text-small text-ink-muted hover:text-navy-900"
      >
        <ArrowLeft className="size-4" />{" "}
        {pedido ? `Volver al ${pedido.numero}` : "Todos los pedidos"}
      </Link>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0">
          <form onSubmit={guardar} noValidate className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-h2 font-semibold text-ink-strong">
                  {pedido ? `Editar pedido ${pedido.numero}` : "Nuevo pedido"}
                </h2>
                <p className="text-small text-ink-muted">
                  Agrega lo que vas a pedir. Cuando llegue, lo revisas desde el pedido.
                </p>
              </div>
            </div>

            <Field label="Proveedor" error={errores.proveedorId}>
              {(id, d) => (
                <Select
                  id={id}
                  aria-describedby={d}
                  value={proveedorId}
                  disabled={!!pedido}
                  onChange={(e) => {
                    setProveedorId(e.target.value);
                    // Lo traído de pedidos anteriores es de ese proveedor: se quita.
                    setLineas((ls) => ls.filter((l) => !l.traerDe));
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

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="relative">
                <label
                  htmlFor="buscar-pedido"
                  className="mb-1.5 block text-small font-medium text-ink"
                >
                  Agregar producto
                </label>
                <div className="relative">
                  <ScanBarcode className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-muted" />
                  <Input
                    id="buscar-pedido"
                    ref={buscador}
                    autoComplete="off"
                    placeholder="Busca por nombre o código, o escanéalo"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      if (!busqueda.trim()) return;
                      const exacto = buscarPorEscaneo(activos, busqueda);
                      if (exacto) agregar(exacto.producto, exacto.presentacion);
                      else if (sugerencias[0]) agregar(sugerencias[0]);
                      else toast(`No hay ningún producto con "${busqueda}"`, "warning");
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
                        <span className="text-small text-ink-muted">{describirStock(p)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label
                  htmlFor="nuevo-pedido"
                  className="mb-1.5 block text-small font-medium text-ink"
                >
                  ¿Algo que no tenemos?
                </label>
                <div className="flex gap-2">
                  <Input
                    id="nuevo-pedido"
                    maxLength={80}
                    placeholder="Ej. Crayones de 24 colores"
                    value={nuevoNombre}
                    invalid={!!errores.nuevo}
                    onChange={(e) => {
                      setNuevoNombre(e.target.value);
                      setErrores({});
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarNuevo();
                      }
                    }}
                  />
                  <Button variant="outline" onClick={agregarNuevo}>
                    <Plus /> Agregar
                  </Button>
                </div>
                {errores.nuevo && (
                  <p role="alert" className="mt-1 text-small text-stock-out">
                    {errores.nuevo}
                  </p>
                )}
              </div>
            </div>

            {lineas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-gray-300 px-4 py-8 text-center">
                <ClipboardList className="size-7 text-gray-300" strokeWidth={1.5} />
                <p className="text-body text-ink-muted">
                  {proveedor
                    ? "Busca productos o toma los sugeridos de la derecha."
                    : "Elige el proveedor para ver qué se está acabando."}
                </p>
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
                      <th className="px-2 py-2 font-semibold">Pedir por</th>
                      <th className="w-24 px-2 py-2 font-semibold">Cantidad</th>
                      <th className="px-3 py-2 font-semibold">Hay ahora</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, i) => {
                      const p = l.productoId ? porId.get(l.productoId) : undefined;
                      const err = errores[`lineas.${i}.cantidad`] ?? errores[`lineas.${i}.nombre`];
                      return (
                        <tr key={l.key} className="border-t border-gray-200 align-top">
                          <td className="px-3 py-2">
                            <p className="flex flex-wrap items-center gap-1.5 font-medium text-ink-strong">
                              {l.nombre}
                              {!l.productoId && (
                                <Chip tono="bg-gold-100 text-gold-text">Nuevo</Chip>
                              )}
                            </p>
                            {p && <p className="font-mono text-small text-ink-muted">{p.codigo}</p>}
                            {l.traerDe && (
                              <p className="text-small text-ink-muted">
                                Faltaba del {l.traerDe.numero}
                              </p>
                            )}
                            {err && (
                              <p role="alert" className="text-small text-stock-out">
                                {err}
                              </p>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {p?.fraccionable ? (
                              <Select
                                aria-label={`Pedir ${l.nombre} por`}
                                className="min-w-36"
                                value={l.presentacion}
                                onChange={(e) =>
                                  cambiar(i, { presentacion: e.target.value as Presentacion })
                                }
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
                              aria-label={`Cantidad de ${l.nombre}`}
                              inputMode="numeric"
                              value={l.cantidad}
                              invalid={!!errores[`lineas.${i}.cantidad`]}
                              onChange={(e) => cambiar(i, { cantidad: soloEntero(e.target.value) })}
                            />
                          </td>
                          <td className="px-3 py-2 text-small whitespace-nowrap text-ink-muted">
                            {p ? describirStock(p) : "—"}
                          </td>
                          <td className="py-2 pr-2">
                            <button
                              type="button"
                              aria-label={`Quitar ${l.nombre}`}
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
              </div>
            )}

            <Field label="Notas para el pedido (opcional)" error={errores.notas}>
              {(id, d) => (
                <Textarea
                  id={id}
                  aria-describedby={d}
                  rows={2}
                  maxLength={300}
                  placeholder="Ej. Preguntar si ya tienen crayones de 24 colores"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                />
              )}
            </Field>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4">
              {errores.general && (
                <p role="alert" className="mr-auto text-small text-stock-out">
                  {errores.general}
                </p>
              )}
              <span className="mr-auto text-body text-ink-muted">
                {lineas.length} {lineas.length === 1 ? "producto" : "productos"}
              </span>
              <Button
                variant="secondary"
                onClick={() => router.push(pedido ? `${base}/${pedido.id}` : base)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? <LoaderCircle className="animate-spin" /> : <Save />}
                {pedido ? "Guardar cambios" : "Guardar pedido"}
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex flex-col gap-4">
          {anteriores.length > 0 && (
            <Card className="border-stock-low/40">
              <div className="px-4 pt-4 pb-2">
                <h3 className="flex items-center gap-2 text-body font-semibold text-ink-strong">
                  <History className="size-4 text-stock-low" /> Faltó en pedidos anteriores
                </h3>
                <p className="text-small text-ink-muted">
                  Pásalo a este pedido o déjalo esperando en el anterior.
                </p>
              </div>
              <ul className="divide-y divide-gray-200">
                {anteriores.map((x) => (
                  <li key={x.linea.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink-strong">{x.linea.nombre}</p>
                      <p className="text-small text-ink-muted">
                        {x.numero} · faltan {cantidadPedida(x.linea, x.linea.faltan)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => traer(x)}>
                      <Plus /> Pasar
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
              <div>
                <h3 className="flex items-center gap-2 text-body font-semibold text-ink-strong">
                  <Sparkles className="size-4 text-gold-600" /> Se están acabando
                </h3>
                <p className="text-small text-ink-muted">
                  {proveedor
                    ? `Lo que surte ${proveedor.nombre} y tiene poco stock.`
                    : "Elige el proveedor para ver sugerencias."}
                </p>
              </div>
              {seAcaban.length > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    seAcaban.forEach((s) =>
                      agregar(porId.get(s.productoId)!, s.presentacion, s.cantidad),
                    )
                  }
                >
                  Agregar todos
                </Button>
              )}
            </div>
            {proveedor && seAcaban.length === 0 ? (
              <p className="px-4 pb-4 text-small text-ink-muted">
                Nada se está acabando de este proveedor.
              </p>
            ) : (
              <ul className="max-h-[420px] divide-y divide-gray-200 overflow-y-auto">
                {seAcaban.map((s) => {
                  const p = porId.get(s.productoId)!;
                  return (
                    <li key={s.productoId} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 font-medium text-ink-strong">
                          <span className="truncate">{p.nombre}</span>
                          <Chip
                            tono={
                              s.agotado || s.nivel === "critico"
                                ? "bg-stock-out-bg text-stock-out-text"
                                : "bg-stock-low-bg text-stock-low-text"
                            }
                          >
                            {s.agotado ? "Agotado" : s.nivel === "critico" ? "Crítico" : "Bajo"}
                          </Chip>
                        </p>
                        <p className="text-small text-ink-muted">Hay {describirStock(p)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Agregar ${p.nombre}`}
                        onClick={() => agregar(p, s.presentacion, s.cantidad)}
                      >
                        <Plus /> {cantidadCon(p, s.presentacion, s.cantidad)}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
