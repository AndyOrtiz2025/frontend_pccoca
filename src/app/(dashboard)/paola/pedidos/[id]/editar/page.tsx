import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FormPedido } from "@/components/pedidos/FormPedido";
import { obtenerPedido } from "@/lib/api";
import { CATEGORIAS_PAOLA, datosFormularioPedido } from "../../datos";

export const metadata: Metadata = { title: "Editar pedido" };

/** Editar un pedido que todavía no ha llegado. */
export default async function Page({ params }: PageProps<"/paola/pedidos/[id]/editar">) {
  const { id } = await params;
  const [pedido, datos] = await Promise.all([obtenerPedido("paola", id), datosFormularioPedido()]);
  if (!pedido) notFound();
  if (pedido.estado !== "pendiente" || pedido.recepciones.length > 0) {
    redirect(`/paola/pedidos/${id}`);
  }
  return (
    <FormPedido {...datos} categorias={CATEGORIAS_PAOLA} base="/paola/pedidos" pedido={pedido} />
  );
}
