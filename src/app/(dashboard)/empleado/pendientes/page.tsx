import type { Metadata } from "next";
import { ListaCuentas } from "@/components/pendientes/ListaCuentas";
import { obtenerCuentas } from "@/lib/api";

export const metadata: Metadata = { title: "Pendientes" };

export default async function Page() {
  return <ListaCuentas cuentas={await obtenerCuentas("empleado")} base="/empleado/pendientes" />;
}
