import type { Metadata } from "next";
import { connection } from "next/server";
import { PendientesPaola } from "@/components/pendientes/PendientesPaola";
import { obtenerCuentas, obtenerResumenPendientes } from "@/lib/api";

export const metadata: Metadata = { title: "Pendientes" };

/** Pantalla 11 (Paola): los fiados de los empleados, en solo lectura. */
export default async function Page() {
  // Usa la fecha actual (lo del mes, desde cuándo debe): se arma en cada visita.
  await connection();
  const [cuentas, resumen] = await Promise.all([
    obtenerCuentas("paola"),
    obtenerResumenPendientes("paola"),
  ]);
  return <PendientesPaola cuentas={cuentas} resumen={resumen} />;
}
