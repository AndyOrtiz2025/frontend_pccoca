import type { Metadata } from "next";
import { CatalogoVenta } from "@/components/venta/CatalogoVenta";

export const metadata: Metadata = { title: "Productos Varios" };

export default function Page() {
  return <CatalogoVenta categoria="varios" />;
}
