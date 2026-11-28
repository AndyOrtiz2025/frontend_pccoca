import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetallePedidoVista } from "@/components/pedidos/DetallePedidoVista";
import { obtenerPedido, obtenerProductosAdmin } from "@/lib/api";
import { datosCrearProducto } from "../datos";

export const metadata: Metadata = { title: "Pedido" };

/** Un pedido: lo que se pidió, lo que llegó y lo que falta. */
export default async function Page({ params }: PageProps<"/paola/pedidos/[id]">) {
  const { id } = await params;
  const [pedido, libreria, varios, crear] = await Promise.all([
    obtenerPedido("paola", id),
    obtenerProductosAdmin("paola", "libreria"),
    obtenerProductosAdmin("paola", "varios"),
    datosCrearProducto(),
  ]);
  if (!pedido) notFound();
  return (
    <DetallePedidoVista
      pedido={pedido}
      productos={[...libreria, ...varios]}
      crear={crear}
      base="/paola/pedidos"
      baseProveedores="/paola/proveedores"
    />
  );
}
