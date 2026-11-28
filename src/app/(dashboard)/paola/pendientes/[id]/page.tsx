import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActualizarSola } from "@/components/pendientes/ActualizarSola";
import { DetalleCuenta } from "@/components/pendientes/DetalleCuenta";
import { obtenerCuenta } from "@/lib/api";

export const metadata: Metadata = { title: "Cuenta de pendientes" };

/** Cuenta de un cliente u organización, en solo lectura para Paola. */
export default async function Page({ params }: PageProps<"/paola/pendientes/[id]">) {
  const { id } = await params;
  const detalle = await obtenerCuenta("paola", id);
  if (!detalle) notFound();
  return (
    <>
      <ActualizarSola />
      <DetalleCuenta detalle={detalle} soloLectura base="/paola/pendientes" />
    </>
  );
}
