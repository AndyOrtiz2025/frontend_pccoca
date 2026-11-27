"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { Button, Field, Input, Modal } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { formatQ } from "@/lib/format";
import { postApi } from "@/lib/http";
import { centavos } from "@/lib/reglas/dinero";
import type { DetalleCuenta, PagoCuenta } from "@/types/pendiente";

interface ModalAbonoProps {
  detalle: DetalleCuenta;
  onClose: () => void;
  /** Al registrar, se muestra el comprobante. */
  onPagado: (pago: PagoCuenta, detalle: DetalleCuenta) => void;
}

/** "Dejo un abono": monto libre que baja el saldo. */
export function ModalAbono({ detalle, onClose, onPagado }: ModalAbonoProps) {
  const manejarError = useErrorApi();
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const valor = Number(monto) || 0;
  const queda = centavos(detalle.saldo - valor);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (valor <= 0) return setError("Escribe el monto del abono");
    if (valor > detalle.saldo)
      return setError(`No puede ser mayor a lo que debe (${formatQ(detalle.saldo)})`);
    setEnviando(true);
    try {
      const r = await postApi<{ pago: PagoCuenta; detalle: DetalleCuenta }>(
        `/api/cuentas/${encodeURIComponent(detalle.cuenta.id)}/abonos`,
        { monto: valor, nota: nota.trim() || undefined },
      );
      onPagado(r.pago, r.detalle);
    } catch (err) {
      manejarError(err);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar abono"
      subtitle={`${detalle.cuenta.nombre} · debe ${formatQ(detalle.saldo)}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-abono" disabled={enviando}>
            {enviando && <LoaderCircle className="animate-spin" />}
            Registrar abono
          </Button>
        </>
      }
    >
      <form id="form-abono" onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <Field label="¿Cuánto deja?" error={error ?? undefined}>
          {(id, desc) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body text-ink-muted">
                Q
              </span>
              <Input
                id={id}
                autoFocus
                inputMode="decimal"
                placeholder="0.00"
                value={monto}
                onChange={(e) => {
                  const v = e.target.value.replace(",", ".");
                  if (/^\d{0,6}(\.\d{0,2})?$/.test(v)) setMonto(v);
                  setError(null);
                }}
                invalid={!!error}
                aria-describedby={desc}
                className="h-10 pl-7 text-h2 tabular"
              />
            </div>
          )}
        </Field>
        <div className="flex items-baseline justify-between rounded-md bg-gray-100 px-3 py-2.5">
          <span className="text-body text-ink-muted">Le quedará</span>
          <span className="text-price font-semibold text-ink-strong tabular">
            {formatQ(Math.max(0, queda))}
          </span>
        </div>
        <Field label="Nota (opcional)">
          {(id) => (
            <Input
              id={id}
              maxLength={200}
              placeholder="Ej. Pagó la tesorera"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
