"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, PackageOpen, Pencil, Printer, Receipt } from "lucide-react";
import { Button, buttonClasses, Card, Chip, Confirmar, useToast } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { postApi } from "@/lib/http";
import type { DetallePedido } from "@/lib/api";
import type { Producto } from "@/types/producto";
import { ChipPedido, cantidadPedida, estadoLinea } from "./comun";
import { HojaPedido } from "./HojaPedido";
import { ModalRevisarPedido, type DatosCrearProducto } from "./ModalRevisarPedido";

/** Un pedido: qué se pidió, qué ha llegado y qué falta. Desde aquí se imprime y se revisa. */
export function DetallePedidoVista({
  pedido,
  productos,
  crear,
  base,
  baseProveedores,
}: {
  pedido: DetallePedido;
  productos: Producto[];
  crear: DatosCrearProducto;
  base: string;
  baseProveedores: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [imprimiendo, setImprimiendo] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const abierto = pedido.estado === "pendiente" || pedido.estado === "parcial";
  const editable = pedido.estado === "pendiente" && pedido.recepciones.length === 0;
  const visibles = pedido.lineas;
  const pedidos = visibles.filter((l) => l.estado !== "movida").length;
  const llegaron = visibles.filter((l) => l.recibidas > 0).length;
  const faltan = visibles.filter((l) => l.faltan > 0).length;

  async function cerrar() {
    try {
      await postApi(`/api/pedidos/${encodeURIComponent(pedido.id)}/cerrar`);
      toast(
        pedido.estado === "parcial"
          ? `${pedido.numero} quedó recibido`
          : `${pedido.numero} cancelado`,
        "success",
      );
      setCerrando(false);
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
        <ArrowLeft className="size-4" /> Todos los pedidos
      </Link>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 bg-grad-hero px-6 py-5 text-white">
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-h1 font-semibold">
              Pedido <span className="font-mono">{pedido.numero}</span>
              <ChipPedido estado={pedido.estado} />
            </h2>
            <p className="text-body">
              <Link
                href={`${baseProveedores}/${pedido.proveedor.id}`}
                className="font-semibold hover:underline"
              >
                {pedido.proveedor.nombre}
              </Link>
            </p>
            <p className="text-small text-navy-300">
              Hecho el {formatFecha(pedido.fecha)} por {pedido.creadoPor}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setImprimiendo(true)}>
              <Printer /> Imprimir lista
            </Button>
            {editable && (
              <Link href={`${base}/${pedido.id}/editar`} className={buttonClasses("secondary")}>
                <Pencil /> Editar
              </Link>
            )}
            {abierto && (
              <Button variant="secondary" onClick={() => setCerrando(true)}>
                <Ban /> {pedido.estado === "parcial" ? "Ya no esperar más" : "Cancelar pedido"}
              </Button>
            )}
            {abierto && (
              <Button onClick={() => setRevisando(true)}>
                <PackageOpen /> Revisar paquete
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 px-6 py-3 text-body text-ink">
          <span>
            <strong className="text-ink-strong">{pedidos}</strong>{" "}
            {pedidos === 1 ? "producto pedido" : "productos pedidos"}
          </span>
          <span>
            <strong className="text-ink-strong">{llegaron}</strong> llegaron
          </span>
          <span className={faltan ? "font-semibold text-stock-low-text" : "text-ink-muted"}>
            {faltan ? `Faltan ${faltan}` : "No falta nada"}
          </span>
        </div>
        {pedido.notas && (
          <p className="border-t border-gray-200 px-6 py-3 text-body whitespace-pre-line text-ink">
            {pedido.notas}
          </p>
        )}
      </Card>

      <Card>
        <h3 className="px-5 pt-4 pb-3 text-body font-semibold text-ink-strong">Lo que se pidió</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200 text-left text-small text-ink-muted">
                <th className="px-5 py-2 font-semibold">Producto</th>
                <th className="px-3 py-2 text-right font-semibold">Pedido</th>
                <th className="px-3 py-2 text-right font-semibold">Vinieron</th>
                <th className="px-3 py-2 text-right font-semibold">Faltan</th>
                <th className="px-5 py-2 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((l) => {
                const e = estadoLinea(l);
                return (
                  <tr key={l.id} className="border-b border-gray-200 last:border-0">
                    <td className="px-5 py-2.5">
                      <p className="flex flex-wrap items-center gap-1.5 font-medium text-ink-strong">
                        {l.nombre}
                        {!l.productoId && <Chip tono="bg-gold-100 text-gold-text">Nuevo</Chip>}
                      </p>
                      <p className="text-small text-ink-muted">
                        {[l.codigo, l.stock && `Hay ${l.stock}`].filter(Boolean).join(" · ") ||
                          "Todavía no está en el inventario"}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap tabular">
                      {cantidadPedida(l, l.cantidad)}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap tabular">
                      {l.recibidas || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap tabular">
                      {l.faltan ? (
                        <span className="text-stock-low-text">{l.faltan}</span>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <Chip tono={e.tono}>{e.texto}</Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 className="px-5 pt-4 pb-2 text-body font-semibold text-ink-strong">
          Paquetes revisados
        </h3>
        {pedido.recepciones.length === 0 ? (
          <p className="px-5 pb-5 text-body text-ink-muted">
            Todavía no ha llegado nada. Cuando llegue, usa “Revisar paquete”.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 border-t border-gray-200">
            {pedido.recepciones.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                <Receipt className="size-4 text-ink-muted" />
                <span className="text-body text-ink tabular">{formatFechaHora(r.fecha)}</span>
                <span className="font-mono text-small text-ink-muted">
                  {r.factura ?? "Sin factura"}
                </span>
                <span className="text-small text-ink-muted">Revisó {r.por}</span>
                {r.total !== undefined && (
                  <span className="ml-auto font-semibold text-ink-strong tabular">
                    {formatQ(r.total)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {imprimiendo && <HojaPedido pedido={pedido} onClose={() => setImprimiendo(false)} />}
      {revisando && (
        <ModalRevisarPedido
          pedido={pedido}
          productos={productos}
          crear={crear}
          onClose={() => setRevisando(false)}
        />
      )}
      {cerrando && (
        <Confirmar
          titulo={pedido.estado === "parcial" ? "¿Ya no esperar más?" : "¿Cancelar el pedido?"}
          textoConfirmar={pedido.estado === "parcial" ? "Ya no esperar" : "Cancelar pedido"}
          peligro
          onConfirmar={cerrar}
          onCancelar={() => setCerrando(false)}
        >
          {pedido.estado === "parcial"
            ? `Lo que falta (${faltan} ${faltan === 1 ? "producto" : "productos"}) se marca como “ya no se pide” y el pedido queda recibido.`
            : "Nada de este pedido ha llegado. Se marca como cancelado y ya no aparecerá por llegar."}
        </Confirmar>
      )}
    </div>
  );
}
