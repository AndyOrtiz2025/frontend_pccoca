import type { Metadata } from "next";
import { HistorialProcesos } from "@/components/procesos/HistorialProcesos";
import { ProcesosAdmin } from "@/components/procesos/ProcesosAdmin";
import { obtenerHistorial, obtenerProcesos } from "@/lib/api";

export const metadata: Metadata = { title: "Trámites en proceso" };

/** Pantalla 21: expedientes activos de Paola y, abajo, el historial de entregados y descartados. */
export default async function Page() {
  const [procesos, historial] = await Promise.all([
    obtenerProcesos("paola"),
    obtenerHistorial("paola"),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <ProcesosAdmin procesos={procesos} />
      <HistorialProcesos historial={historial} />
    </div>
  );
}
