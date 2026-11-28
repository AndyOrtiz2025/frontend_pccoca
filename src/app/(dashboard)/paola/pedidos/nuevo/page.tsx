import type { Metadata } from "next";
import { FormPedido } from "@/components/pedidos/FormPedido";
import { CATEGORIAS_PAOLA, datosFormularioPedido } from "../datos";

export const metadata: Metadata = { title: "Nuevo pedido" };

/** Armar un pedido nuevo (?proveedor=prov-1 lo deja elegido). */
export default async function Page({ searchParams }: PageProps<"/paola/pedidos/nuevo">) {
  const { proveedor } = await searchParams;
  const datos = await datosFormularioPedido();
  return (
    <FormPedido
      {...datos}
      categorias={CATEGORIAS_PAOLA}
      base="/paola/pedidos"
      proveedorInicial={typeof proveedor === "string" ? proveedor : undefined}
    />
  );
}
