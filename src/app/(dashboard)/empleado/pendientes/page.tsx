import type { Metadata } from "next";
import { connection } from "next/server";
import { ListaCuentas } from "@/components/pendientes/ListaCuentas";
import { obtenerCuentas } from "@/lib/api";

export const metadata: Metadata = { title: "Pendientes" };

export default async function Page() {
  // Usa la fecha actual (desde cuándo debe cada cuenta): se arma en cada visita.
  await connection();
  return <ListaCuentas cuentas={await obtenerCuentas("empleado")} base="/empleado/pendientes" />;
}
