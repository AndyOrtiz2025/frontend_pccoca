import type { Metadata } from "next";
import { PanelCarrito } from "@/components/venta/PanelCarrito";

export const metadata: Metadata = { title: "Carrito" };

/** Carrito a lo ancho: revisar y confirmar sin pasar por el catálogo. */
export default function Page() {
  return <PanelCarrito className="mx-auto max-w-2xl" />;
}
