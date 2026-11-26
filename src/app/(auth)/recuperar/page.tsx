import type { Metadata } from "next";
import { AccesoShell } from "@/components/acceso/AccesoShell";
import { RecuperarForm } from "@/components/acceso/RecuperarForm";
import { TarjetaAcceso } from "@/components/acceso/TarjetaAcceso";

export const metadata: Metadata = { title: "Recuperar contraseña" };

/** Pantalla 3: recuperar contraseña (solo Paola y Oscar). */
export default function Recuperar() {
  return (
    <AccesoShell>
      <TarjetaAcceso volver={{ href: "/", label: "Volver a iniciar sesión" }}>
        <RecuperarForm />
      </TarjetaAcceso>
    </AccesoShell>
  );
}
