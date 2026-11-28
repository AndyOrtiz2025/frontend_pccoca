"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  ChevronDown,
  CircleCheck,
  HandCoins,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Truck,
  XCircle,
} from "lucide-react";
import { Button, Card, Chip, Confirmar, Input, KpiCard, useToast } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { cn } from "@/lib/cn";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { ErrorApi, postApi } from "@/lib/http";
import { cantidadCon } from "@/lib/presentacion";
import type { DetalleProveedor, ReclamoDetallado } from "@/lib/api";
import { ETIQUETA_CATEGORIA, type Categoria, type Producto } from "@/types/producto";
import { ETIQUETA_RECLAMO } from "@/types/proveedor";
import { diasDeVisita, iniciales } from "./ListaProveedores";
import { ModalCompra } from "./ModalCompra";
import { ModalProveedor } from "./ModalProveedor";

const TONO_RECLAMO = {
  pendiente: "bg-stock-low-bg text-stock-low-text",
  repuesto: "bg-stock-ok-bg text-stock-ok-text",
  reembolsado: "bg-stock-ok-bg text-stock-ok-text",
  perdida: "bg-stock-out-bg text-stock-out-text",
} as const;

/** Pantalla 18: detalle del proveedor con su historial de compras y reclamos. */
export function DetalleProveedorVista({
  detalle,
  productos,
  base,
  categorias,
}: {
  detalle: DetalleProveedor;
  productos: Producto[];
  base: string;
  categorias: Categoria[];
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const { proveedor: p, compras, reclamos } = detalle;
  const [editando, setEditando] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [aInactivar, setAInactivar] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(compras[0]?.id ?? null);
  const tel = p.telefono?.replace(/\D/g, "");
  const pendientes = reclamos.filter((r) => r.estado === "pendiente");
  const resueltos = reclamos.filter((r) => r.estado !== "pendiente");

  async function cambiarActivo(activo: boolean) {
    try {
      await postApi(`/api/proveedores/${encodeURIComponent(p.id)}/activo`, { activo });
      toast(activo ? `${p.nombre} está activo de nuevo` : `${p.nombre} quedó inactivo`, "success");
      setAInactivar(false);
      router.refresh();
    } catch (e) {
      manejarError(e);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={base}
        className="inline-flex items-center gap-1.5 self-start text-small text-ink-muted hover:text-navy-900"
      >
        <ArrowLeft className="size-4" /> Todos los proveedores
      </Link>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 bg-grad-hero px-6 py-5 text-white">
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gold-500 text-h2 font-bold text-navy-900">
              {iniciales(p.nombre)}
            </span>
            <div>
              <h2 className="flex flex-wrap items-center gap-2 text-h1 font-semibold">
                {p.nombre}
                <Chip
                  tono={p.activo ? "bg-stock-ok-bg text-stock-ok-text" : "bg-white/15 text-white"}
                >
                  {p.activo ? "Activo" : "Inactivo"}
                </Chip>
              </h2>
              <p className="text-small text-navy-300">
                {[p.nit && `NIT ${p.nit}`, p.contacto].filter(Boolean).join(" · ") || "Sin NIT"}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {p.surte.map((c) => (
                  <Chip key={c} tono="bg-white/10 text-white">
                    {ETIQUETA_CATEGORIA[c]}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditando(true)}>
              <Pencil /> Editar
            </Button>
            {p.activo ? (
              <Button variant="secondary" onClick={() => setAInactivar(true)}>
                <Ban /> Inactivar
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => cambiarActivo(true)}>
                <RotateCcw /> Reactivar
              </Button>
            )}
            <Button onClick={() => setComprando(true)} disabled={!p.activo}>
              <ShoppingCart /> Registrar compra
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 px-6 py-3 text-body">
          {diasDeVisita(p.diasVisita) && (
            <span className="flex items-center gap-1.5 font-semibold text-navy-900">
              <Truck className="size-4" /> {diasDeVisita(p.diasVisita)}
            </span>
          )}
          {tel && (
            <>
              <a
                href={`tel:${tel}`}
                className="flex items-center gap-1.5 text-navy-900 hover:underline"
              >
                <Phone className="size-4" /> {p.telefono}
              </a>
              <a
                href={`https://wa.me/502${tel}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-stock-ok-text hover:underline"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </>
          )}
          {p.correo && (
            <a
              href={`mailto:${p.correo}`}
              className="flex items-center gap-1.5 text-navy-900 hover:underline"
            >
              <Mail className="size-4" /> {p.correo}
            </a>
          )}
          {p.direccion && (
            <span className="flex items-center gap-1.5 text-ink-muted">
              <MapPin className="size-4" /> {p.direccion}
            </span>
          )}
        </div>
        {p.notas && (
          <p className="border-t border-gray-200 px-6 py-3 text-body text-ink">{p.notas}</p>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          highlight
          label="Comprado este mes"
          value={formatQ(p.totalMes)}
          detail={`${p.comprasMes} ${p.comprasMes === 1 ? "compra" : "compras"}`}
          icon={<ShoppingCart />}
        />
        <KpiCard
          label="Compras en el año"
          value={String(detalle.comprasAnio)}
          detail={p.ultimaCompra ? `Última: ${formatFecha(p.ultimaCompra)}` : "Sin compras"}
          icon={<Receipt />}
        />
        <KpiCard
          label="Productos que surte"
          value={String(detalle.productosQueSurte)}
          detail="Con este proveedor o comprados aquí"
          icon={<Package />}
        />
        <KpiCard
          label="Reclamos pendientes"
          value={String(pendientes.length)}
          detail={pendientes.length ? "Mercadería dañada por resolver" : "Sin reclamos"}
          icon={<AlertTriangle />}
        />
      </div>

      {pendientes.length > 0 && (
        <Card className="border-stock-low/40">
          <div className="px-5 pt-4 pb-2">
            <h3 className="flex items-center gap-2 text-body font-semibold text-ink-strong">
              <AlertTriangle className="size-4 text-stock-low" /> Reclamos pendientes
            </h3>
            <p className="text-small text-ink-muted">
              Mercadería que llegó dañada. Cuando el proveedor responda, marca qué pasó.
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {pendientes.map((r) => (
              <FilaReclamo key={r.id} r={r} />
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-3">
          <h3 className="text-body font-semibold text-ink-strong">Historial de compras</h3>
          <span className="text-small text-ink-muted">{compras.length} registradas</span>
        </div>
        {compras.length === 0 ? (
          <p className="px-5 pb-6 text-body text-ink-muted">
            Todavía no hay compras a este proveedor.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 border-t border-gray-200">
            {compras.map((c) => {
              const unidades = c.lineas.reduce((t, l) => t + l.cantidad + l.danadas, 0);
              const abiertaEsta = abierta === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-expanded={abiertaEsta}
                    onClick={() => setAbierta(abiertaEsta ? null : c.id)}
                    className="hover:bg-gray-50 flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-left"
                  >
                    <span className="w-24 shrink-0 text-body text-ink tabular">
                      {formatFecha(c.fecha)}
                    </span>
                    <span className="w-28 shrink-0 font-mono text-small text-ink-muted">
                      {c.factura ?? "Sin factura"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body text-ink">
                      {c.lineas.map((l) => l.nombre).join(", ")}
                    </span>
                    <span className="text-small text-ink-muted tabular">{unidades} en total</span>
                    <span className="w-24 text-right font-semibold text-ink-strong tabular">
                      {formatQ(c.total)}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 text-ink-muted transition-transform",
                        abiertaEsta && "rotate-180",
                      )}
                    />
                  </button>
                  {abiertaEsta && (
                    <div className="bg-gray-50 px-5 pt-1 pb-4">
                      <table className="w-full text-small">
                        <thead>
                          <tr className="text-left text-ink-muted">
                            <th className="py-1.5 font-semibold">Producto</th>
                            <th className="py-1.5 text-right font-semibold">Buenas</th>
                            <th className="py-1.5 text-right font-semibold">Dañadas</th>
                            <th className="py-1.5 text-right font-semibold">Costo c/u</th>
                            <th className="py-1.5 text-right font-semibold">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.lineas.map((l) => {
                            const prod = { fraccionable: { nombrePaquete: l.nombrePaquete } };
                            return (
                              <tr
                                key={`${l.productoId}-${l.presentacion}`}
                                className="border-t border-gray-200"
                              >
                                <td className="py-1.5 text-ink-strong">
                                  {l.nombre}{" "}
                                  <span className="font-mono text-ink-muted">{l.codigo}</span>
                                </td>
                                <td className="py-1.5 text-right tabular">
                                  {cantidadCon(prod, l.presentacion, l.cantidad)}
                                </td>
                                <td
                                  className={cn(
                                    "py-1.5 text-right tabular",
                                    l.danadas > 0 && "font-semibold text-stock-low-text",
                                  )}
                                >
                                  {l.danadas || "—"}
                                </td>
                                <td className="py-1.5 text-right tabular">
                                  {formatQ(l.costoUnitario)}
                                </td>
                                <td className="py-1.5 text-right font-semibold tabular">
                                  {formatQ(l.subtotal)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p className="mt-2 text-small text-ink-muted">
                        Registró {c.registradoPor} · {formatFechaHora(c.fecha)}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {resueltos.length > 0 && (
        <Card>
          <h3 className="px-5 pt-4 pb-2 text-body font-semibold text-ink-strong">
            Reclamos resueltos
          </h3>
          <ul className="divide-y divide-gray-200">
            {resueltos.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-body">
                <span className="min-w-0 flex-1">
                  {cantidadCon(
                    { fraccionable: { nombrePaquete: r.nombrePaquete } },
                    r.presentacion,
                    r.cantidad,
                  )}{" "}
                  de <strong>{r.nombre}</strong>
                  {r.motivo && <span className="text-ink-muted"> · {r.motivo}</span>}
                </span>
                <Chip tono={TONO_RECLAMO[r.estado]}>
                  {ETIQUETA_RECLAMO[r.estado]}
                  {r.resolucion?.monto !== undefined && ` ${formatQ(r.resolucion.monto)}`}
                </Chip>
                <span className="text-small text-ink-muted">
                  {r.resolucion && `${r.resolucion.por} · ${formatFecha(r.resolucion.fecha)}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editando && (
        <ModalProveedor proveedor={p} categorias={categorias} onClose={() => setEditando(false)} />
      )}
      {comprando && (
        <ModalCompra
          proveedores={[p]}
          productos={productos}
          proveedorInicial={p.id}
          onClose={() => setComprando(false)}
        />
      )}
      {aInactivar && (
        <Confirmar
          titulo="¿Inactivar este proveedor?"
          textoConfirmar="Sí, inactivar"
          peligro
          onCancelar={() => setAInactivar(false)}
          onConfirmar={() => cambiarActivo(false)}
        >
          <p>
            <strong>{p.nombre}</strong> ya no aparecerá al registrar compras ni al elegir proveedor
            de un producto. Su historial se conserva y lo puedes reactivar cuando quieras.
          </p>
        </Confirmar>
      )}
    </div>
  );
}

/** Un reclamo pendiente: qué llegó dañado y las tres formas de resolverlo. */
function FilaReclamo({ r }: { r: ReclamoDetallado }) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [reembolsando, setReembolsando] = useState(false);
  const valor = r.cantidad * r.costoUnitario;
  const [monto, setMonto] = useState(valor.toFixed(2));
  const [error, setError] = useState<string>();
  const [ocupado, setOcupado] = useState(false);
  const que = cantidadCon(
    { fraccionable: { nombrePaquete: r.nombrePaquete } },
    r.presentacion,
    r.cantidad,
  );

  async function resolver(estado: "repuesto" | "reembolsado" | "perdida") {
    setOcupado(true);
    setError(undefined);
    try {
      await postApi(`/api/reclamos/${encodeURIComponent(r.id)}/resolver`, {
        estado,
        ...(estado === "reembolsado" && { monto: Number(monto) }),
      });
      toast(
        estado === "repuesto"
          ? `Se sumaron ${que} de ${r.nombre} al stock`
          : estado === "reembolsado"
            ? `Reembolso de ${formatQ(Number(monto))} registrado`
            : "Registrado como pérdida",
        "success",
      );
      router.refresh();
    } catch (e) {
      if (e instanceof ErrorApi && (e.status === 400 || e.status === 409)) setError(e.message);
      else manejarError(e);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body">
          <strong>{que}</strong> de <strong>{r.nombre}</strong>
          {r.motivo && <span className="text-ink-muted"> · {r.motivo}</span>}
          <span className="block text-small text-ink-muted">
            {formatFecha(r.fecha)}
            {r.factura && ` · ${r.factura}`} · vale {formatQ(valor)}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => resolver("repuesto")}
            disabled={ocupado}
          >
            <CircleCheck /> Nos repusieron
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setReembolsando((x) => !x)}
            disabled={ocupado}
          >
            <HandCoins /> Nos devolvieron dinero
          </Button>
          <Button size="sm" variant="danger" onClick={() => resolver("perdida")} disabled={ocupado}>
            <XCircle /> Pérdida
          </Button>
        </div>
      </div>
      {reembolsando && (
        <div className="flex flex-wrap items-center gap-2 self-end">
          <span className="text-small text-ink">¿Cuánto devolvió? Q</span>
          <Input
            aria-label="Monto del reembolso"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ""))}
            className="w-24"
          />
          <Button size="sm" onClick={() => resolver("reembolsado")} disabled={ocupado}>
            Registrar reembolso
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="self-end text-small text-stock-out">
          {error}
        </p>
      )}
    </li>
  );
}
