import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardEmpleado } from "@/components/dashboard/DashboardEmpleado";
import { obtenerResumenEmpleado } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth/server";
import { formatFechaLarga, saludo } from "@/lib/fechas";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Page() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/");
  // La hora se toma después de leer la sesión (dato por petición): saludo y "hoy" en hora de Guatemala.
  const ahora = new Date();
  const resumen = await obtenerResumenEmpleado(sesion.usuario, ahora);
  return (
    <DashboardEmpleado
      nombre={sesion.nombre}
      saludo={saludo(ahora)}
      fecha={formatFechaLarga(ahora)}
      resumen={resumen}
    />
  );
}
