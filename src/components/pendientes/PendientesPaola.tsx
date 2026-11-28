import Link from "next/link";
import { CalendarClock, HandCoins, Receipt, RefreshCw, Wallet, Users } from "lucide-react";
import { Card, KpiCard } from "@/components/ui";
import { formatFechaHora } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import type { ResumenCuenta, ResumenPendientes } from "@/types/pendiente";
import { ActualizarSola } from "./ActualizarSola";
import { ListaCuentas } from "./ListaCuentas";

const BASE = "/paola/pendientes";

/**
 * Pantalla 11 para Paola: los fiados que registran los empleados, en solo lectura.
 * Se actualiza sola cada 30 segundos.
 */
export function PendientesPaola({
  cuentas,
  resumen,
}: {
  cuentas: ResumenCuenta[];
  resumen: ResumenPendientes;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ActualizarSola />
      <p className="flex flex-wrap items-center gap-x-2 text-body text-ink-muted">
        Los fiados que registran los empleados. Aquí solo se consultan.
        <span className="inline-flex items-center gap-1 text-small">
          <RefreshCw className="size-3.5" /> Se actualiza sola cada 30 segundos
        </span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          highlight
          label="Por cobrar"
          value={formatQ(resumen.porCobrar)}
          detail="Suma de todos los saldos"
          icon={<Wallet />}
        />
        <KpiCard
          label="Cuentas con saldo"
          value={String(resumen.cuentasConSaldo)}
          detail={`De ${cuentas.length} cuentas`}
          icon={<Users />}
        />
        <KpiCard
          label="Fiado este mes"
          value={formatQ(resumen.fiadoMes)}
          detail="Lo que se llevaron a cuenta"
          icon={<Receipt />}
        />
        <KpiCard
          label="Cobrado este mes"
          value={formatQ(resumen.cobradoMes)}
          detail="Abonos y pagos"
          icon={<HandCoins />}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <ListaCuentas cuentas={cuentas} base={BASE} soloLectura />

        <Card>
          <h3 className="flex items-center gap-2 px-4 pt-4 pb-2 text-body font-semibold text-ink-strong">
            <CalendarClock className="size-4 text-gold-600" /> Actividad reciente
          </h3>
          {resumen.actividad.length === 0 ? (
            <p className="px-4 pb-4 text-small text-ink-muted">Todavía no hay movimientos.</p>
          ) : (
            <ul
              aria-label="Actividad reciente"
              className="divide-y divide-gray-200 border-t border-gray-200"
            >
              {resumen.actividad.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`${BASE}/${a.cuentaId}`}
                    className="hover:bg-gray-50 block px-4 py-2.5"
                  >
                    <p className="text-small text-ink">
                      <strong className="text-ink-strong">{a.por}</strong>{" "}
                      {a.tipo === "cargo"
                        ? "fió a"
                        : a.tipo === "abono"
                          ? "registró un abono de"
                          : "registró un pago de"}{" "}
                      <strong className="text-ink-strong">{a.cuenta}</strong>
                    </p>
                    <p className="flex justify-between gap-2 text-small text-ink-muted">
                      <span className="truncate">
                        {a.detalle ?? (a.tipo === "pago" ? "Pagó lo que se había llevado" : "")}
                      </span>
                      <span
                        className={
                          a.tipo === "cargo"
                            ? "font-semibold whitespace-nowrap text-ink-strong tabular"
                            : "font-semibold whitespace-nowrap text-stock-ok-text tabular"
                        }
                      >
                        {a.tipo === "cargo" ? "+" : "−"}
                        {formatQ(a.monto)}
                      </span>
                    </p>
                    <p className="text-badge text-ink-muted tabular">{formatFechaHora(a.fecha)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
