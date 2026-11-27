"use client";

import { ArrowLeft, CircleCheck, LoaderCircle, ShoppingBag } from "lucide-react";
import { Alert, Button, Chip, Modal } from "@/components/ui";
import { formatQ } from "@/lib/format";
import type { CarritoCalculado } from "@/lib/reglas/carrito";
import { ETIQUETA_MOVIMIENTO } from "@/types/movimiento";

/**
 * Paso previo a la venta definitiva: muestra todo lo que se va a registrar para revisarlo con
 * el cliente. Solo al presionar "Confirmar venta" aquí se descuenta el stock y sale el comprobante.
 */
export function ModalRevisarVenta({
  calculado,
  confirmando,
  onConfirmar,
  onClose,
}: {
  calculado: CarritoCalculado;
  confirmando: boolean;
  onConfirmar: () => void;
  onClose: () => void;
}) {
  const ventas = calculado.lineas.filter((l) => l.tipo === "venta");
  const internos = calculado.lineas.filter((l) => l.tipo !== "venta");
  const articulos = ventas.reduce((t, l) => t + l.cantidad, 0);
  const soloInternos = ventas.length === 0;

  return (
    <Modal
      open
      onClose={() => !confirmando && onClose()}
      title={soloInternos ? "Revisa los movimientos" : "Revisa la venta"}
      subtitle="Confirma con el cliente que todo esté correcto antes de registrar."
      size="lg"
      variante="destacado"
      extraEncabezado={
        <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-small font-medium whitespace-nowrap text-white">
          <ShoppingBag className="size-3.5 text-gold-500" />
          {calculado.lineas.length} {calculado.lineas.length === 1 ? "producto" : "productos"}
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={confirmando}>
            <ArrowLeft /> Regresar al carrito
          </Button>
          <Button onClick={onConfirmar} disabled={confirmando}>
            {confirmando ? <LoaderCircle className="animate-spin" /> : <CircleCheck />}
            {soloInternos
              ? "Registrar movimientos"
              : `Confirmar venta · ${formatQ(calculado.total)}`}
          </Button>
        </>
      }
    >
      {ventas.length > 0 && (
        <div className="overflow-hidden rounded-md border border-gray-200">
          <table className="w-full text-body">
            <thead>
              <tr className="bg-gray-50 text-small text-ink-muted">
                <th className="px-3 py-2.5 text-left font-semibold">Producto</th>
                <th className="px-3 py-2.5 text-right font-semibold">Cant.</th>
                <th className="px-3 py-2.5 text-right font-semibold">Precio</th>
                <th className="px-3 py-2.5 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((l) => (
                <tr
                  key={`${l.productoId}-${l.presentacion}`}
                  className="border-t border-gray-200 transition-colors hover:bg-gold-100/40"
                >
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-ink-strong">{l.producto.nombre}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {l.producto.fraccionable && (
                        <Chip>{l.presentacion === "unidad" ? "Por unidad" : "Por paquete"}</Chip>
                      )}
                      {l.mayoreo && <Chip tono="bg-gold-100 text-gold-text">Mayoreo</Chip>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="inline-flex min-w-7 justify-center rounded-full bg-navy-900 px-2 py-0.5 text-small font-semibold text-white tabular">
                      {l.cantidad}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-ink-muted tabular">
                    {formatQ(l.precioUnitario)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap text-ink-strong tabular">
                    {formatQ(l.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {internos.length > 0 && (
        <div className={ventas.length > 0 ? "mt-4" : undefined}>
          <p className="mb-2 text-small font-semibold text-ink-muted">
            No se cobran (solo descuentan stock)
          </p>
          <ul className="flex flex-col gap-1.5">
            {internos.map((l) => (
              <li
                key={`${l.productoId}-${l.tipo}-${l.presentacion}`}
                className="bg-gray-50 flex items-center justify-between gap-3 rounded-sm px-3 py-2 text-body"
              >
                <span className="min-w-0">
                  <span className="text-ink-strong">{l.producto.nombre}</span>
                  {l.motivo && <span className="text-small text-ink-muted"> · {l.motivo}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Chip>{ETIQUETA_MOVIMIENTO[l.tipo]}</Chip>
                  <span className="tabular">× {l.cantidad}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {calculado.avisosMayoreo.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {calculado.avisosMayoreo.map((a) => (
            <Alert key={a.nombre} tone="info">
              {a.nombre}: {formatQ(a.de)} → {formatQ(a.a)} por compra al por mayor.
            </Alert>
          ))}
        </div>
      )}

      {!soloInternos && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-gold-500/40 bg-grad-gold-soft px-4 py-3">
          <div>
            <p className="text-overline font-semibold tracking-wider text-gold-text uppercase">
              Total a cobrar
            </p>
            <p className="text-small text-ink-muted">
              {articulos} {articulos === 1 ? "artículo" : "artículos"}
            </p>
          </div>
          <span className="text-kpi font-bold text-navy-900 tabular">
            {formatQ(calculado.total)}
          </span>
        </div>
      )}
    </Modal>
  );
}
