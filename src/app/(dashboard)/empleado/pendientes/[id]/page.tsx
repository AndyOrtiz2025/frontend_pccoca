import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetalleCuenta } from "@/components/pendientes/DetalleCuenta";
import { obtenerCuenta } from "@/lib/api";

export const metadata: Metadata = { title: "Cuenta de pendientes" };

export default async function Page({ params }: PageProps<"/empleado/pendientes/[id]">) {
  const { id } = await params;
  const detalle = await obtenerCuenta("empleado", id);
  if (!detalle) notFound();
  return <DetalleCuenta detalle={detalle} />;
}
