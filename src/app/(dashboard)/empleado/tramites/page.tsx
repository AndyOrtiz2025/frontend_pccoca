import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Trámites" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Catálogo de trámites (SAT, CGC, RENAP, Otros) con requisitos y precios, y el botón para enviar una entrada a Paola."
      referencia="Pantallas 8 y 9"
    />
  );
}
