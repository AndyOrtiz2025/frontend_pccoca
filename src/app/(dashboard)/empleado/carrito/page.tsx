import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Carrito" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Revisión del carrito, confirmación de la venta y comprobante interno."
      referencia="Pantalla 7"
    />
  );
}
