"use client";

import { DocumentoImprimible } from "@/components/ui";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { totalCargo } from "@/lib/reglas/cuentas";
import type { DetalleCuenta, PagoCuenta } from "@/types/pendiente";

const filaTotal = "flex items-baseline justify-between";

/** Estado de cuenta: todos los cargos, pagos y el saldo. Para dárselo al cliente o archivarlo. */
export function EstadoCuenta({
  detalle,
  onClose,
}: {
  detalle: DetalleCuenta;
  onClose: () => void;
}) {
  const { cuenta, cargos, pagos } = detalle;
  const esOrg = cuenta.grupo === "organizacion";
  return (
    <DocumentoImprimible
      titulo="Estado de cuenta"
      subtitulo={`Emitido: ${formatFechaHora(new Date().toISOString())}`}
      onClose={onClose}
    >
      <p className="text-h2 font-semibold text-ink-strong">{cuenta.nombre}</p>
      <p className="text-small text-ink-muted">
        {esOrg ? "Organización" : "Cliente individual"}
        {cuenta.telefono && ` · Tel. ${cuenta.telefono}`}
      </p>

      <h3 className="mt-5 mb-2 text-small font-semibold text-ink-strong">Cargos</h3>
      <table className="w-full text-small">
        <thead>
          <tr className="border-b border-gray-200 text-left text-ink-muted">
            <th className="pb-1.5 font-semibold">Fecha</th>
            <th className="pb-1.5 font-semibold">Descripción</th>
            <th className="pb-1.5 text-right font-semibold">Cant.</th>
            <th className="pb-1.5 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {[...cargos].reverse().map((c) => (
            <tr key={c.id} className="border-b border-gray-200 align-top last:border-0">
              <td className="py-1.5 pr-2 whitespace-nowrap tabular">{formatFecha(c.fecha)}</td>
              <td className="py-1.5 pr-2">
                {c.descripcion}
                {c.llevadoPor && (
                  <span className="block text-ink-muted">Llevó: {c.llevadoPor}</span>
                )}
                {c.nota && <span className="block text-ink-muted">{c.nota}</span>}
                {c.pagoId && <span className="block text-stock-ok-text">Pagado</span>}
              </td>
              <td className="py-1.5 text-right whitespace-nowrap tabular">
                {c.cantidad} × {formatQ(c.precioUnitario)}
              </td>
              <td className="py-1.5 text-right font-semibold tabular">{formatQ(totalCargo(c))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagos.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-small font-semibold text-ink-strong">Pagos</h3>
          <ul className="flex flex-col gap-1 text-small">
            {[...pagos].reverse().map((p) => (
              <li key={p.id} className={filaTotal}>
                <span>
                  <span className="tabular">{formatFecha(p.fecha)}</span> ·{" "}
                  {p.tipo === "abono" ? "Abono" : "Pago de cargos"}
                </span>
                <span className="tabular">−{formatQ(p.monto)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-5 flex flex-col gap-1 border-t border-gray-200 pt-4 text-body">
        <div className={filaTotal}>
          <span className="text-ink-muted">Total de cargos</span>
          <span className="tabular">{formatQ(detalle.totalCargos)}</span>
        </div>
        <div className={filaTotal}>
          <span className="text-ink-muted">Total pagado</span>
          <span className="tabular">−{formatQ(detalle.totalPagado)}</span>
        </div>
        <div className={`${filaTotal} mt-1`}>
          <span className="font-semibold text-ink-strong">Saldo pendiente</span>
          <span className="text-kpi font-semibold text-ink-strong tabular">
            {formatQ(detalle.saldo)}
          </span>
        </div>
      </div>
      <p className="mt-3 text-badge text-ink-muted">Documento interno, no es factura.</p>
    </DocumentoImprimible>
  );
}

/** Comprobante de un pago o abono: lo que pagó y cuánto le queda. */
export function ComprobantePago({
  detalle,
  pago,
  onClose,
}: {
  detalle: DetalleCuenta;
  pago: PagoCuenta;
  onClose: () => void;
}) {
  const pagados = detalle.cargos.filter((c) => pago.cargoIds.includes(c.id));
  return (
    <DocumentoImprimible
      titulo="Comprobante de pago"
      subtitulo={
        <>
          {formatFechaHora(pago.fecha)}
          <br />
          Atendió: {pago.registradoPor}
        </>
      }
      onClose={onClose}
    >
      <p className="text-h2 font-semibold text-ink-strong">{detalle.cuenta.nombre}</p>
      <p className="text-small text-ink-muted">
        {pago.tipo === "abono" ? "Abono a la cuenta" : "Pago de cargos"}
      </p>

      {pagados.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1 text-small">
          {pagados.map((c) => (
            <li key={c.id} className={filaTotal}>
              <span>
                {c.descripcion} × {c.cantidad}
              </span>
              <span className="tabular">{formatQ(totalCargo(c))}</span>
            </li>
          ))}
        </ul>
      )}
      {pago.nota && <p className="mt-3 text-small text-ink-muted">Nota: {pago.nota}</p>}

      <div className="mt-5 flex flex-col gap-1 border-t border-gray-200 pt-4">
        <div className={filaTotal}>
          <span className="font-semibold text-ink-strong">Pagó</span>
          <span className="text-kpi font-semibold text-ink-strong tabular">
            {formatQ(pago.monto)}
          </span>
        </div>
        <div className={filaTotal}>
          <span className="text-ink-muted">Saldo después de este pago</span>
          <span className="text-price font-semibold tabular">{formatQ(pago.saldoDespues)}</span>
        </div>
      </div>
      <p className="mt-3 text-badge text-ink-muted">Documento interno, no es factura.</p>
    </DocumentoImprimible>
  );
}
