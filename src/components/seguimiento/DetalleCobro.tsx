import { CircleAlert } from "lucide-react";
import { formatQ } from "@/lib/format";
import { porCobrar } from "@/lib/reglas/procesos";
import type { EnProceso } from "@/types/proceso";

/** Cuánto cobrar al entregar: lo define Oscar (servicios) o Paola (trámites). */
export function DetalleCobro({ proceso }: { proceso: EnProceso }) {
  const quien = proceso.responsable === "paola" ? "Paola" : "Oscar";
  const { cobro } = proceso;
  if (!cobro) {
    return (
      <div className="border-t border-gray-200 px-5 py-4">
        <p className="flex items-start gap-2 rounded-md bg-stock-low-bg px-3 py-2 text-small text-stock-low-text">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {quien} aún no dice cuánto cobrar. Pregúntale antes de entregar.
        </p>
      </div>
    );
  }
  return (
    <dl className="flex flex-col gap-2 border-t border-gray-200 px-5 py-4 text-body">
      <div className="flex justify-between gap-3">
        <dt className="text-ink-muted">Total</dt>
        <dd className="text-right tabular">{formatQ(cobro.total)}</dd>
      </div>
      {cobro.detalle && <p className="-mt-1 text-small text-ink-muted">{cobro.detalle}</p>}
      {!!cobro.anticipo && (
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Ya dejó</dt>
          <dd className="text-right text-stock-ok-text tabular">−{formatQ(cobro.anticipo)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-3">
        <dt className="font-semibold text-ink-strong">Cobrar al entregar</dt>
        <dd className="text-price font-bold text-navy-900 tabular">{formatQ(porCobrar(cobro))}</dd>
      </div>
    </dl>
  );
}
