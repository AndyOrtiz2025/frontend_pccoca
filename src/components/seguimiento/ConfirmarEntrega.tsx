"use client";

import { useRouter } from "next/navigation";
import { Confirmar, useToast } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { formatQ } from "@/lib/format";
import { postApi } from "@/lib/http";
import { describirProceso, porCobrar } from "@/lib/reglas/procesos";
import type { EnProceso } from "@/types/proceso";

/**
 * "¿El cliente ya lo recogió?": recuerda cuánto cobrar y marca el trámite o servicio como
 * entregado. Se usa en Seguimiento y en el Dashboard.
 */
export function ConfirmarEntrega({
  proceso,
  onCerrar,
  onEntregado,
}: {
  proceso: EnProceso;
  onCerrar: () => void;
  onEntregado?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();

  async function entregar() {
    try {
      await postApi(`/api/procesos/${encodeURIComponent(proceso.id)}/entregar`);
      toast(`Entregado a ${proceso.cliente.nombre}`, "success");
      onEntregado?.();
      onCerrar();
      router.refresh(); // vuelve a pedir la lista y los contadores al servidor
    } catch (e) {
      manejarError(e);
    }
  }

  return (
    <Confirmar
      titulo="¿El cliente ya lo recogió?"
      textoConfirmar="Sí, marcar entregado"
      onCancelar={onCerrar}
      onConfirmar={entregar}
    >
      <p>
        <strong>{proceso.cliente.nombre}</strong> · {describirProceso(proceso)}
      </p>
      {proceso.cobro ? (
        <p className="mt-2 text-body">
          Cobra <strong className="tabular">{formatQ(porCobrar(proceso.cobro))}</strong> antes de
          entregar.
        </p>
      ) : (
        <p className="mt-2 text-body text-stock-low-text">
          {proceso.responsable === "paola" ? "Paola" : "Oscar"} aún no dice cuánto cobrar.
          Pregúntale antes de entregar.
        </p>
      )}
      <p className="mt-2 text-ink-muted">
        Al confirmar, desaparece de Seguimiento. Esto no se puede deshacer.
      </p>
    </Confirmar>
  );
}
