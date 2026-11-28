import type { Metadata } from "next";
import { FormDevolucion } from "@/components/devoluciones/FormDevolucion";

export const metadata: Metadata = { title: "Devoluciones" };

/** Devolución de un cliente: con o sin comprobante, a cambio de otros productos. */
export default function Page() {
  return <FormDevolucion />;
}
