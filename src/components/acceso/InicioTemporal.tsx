import { Suspense } from "react";
import { obtenerSesion } from "@/lib/auth/server";
import { PERFILES, type Rol } from "@/lib/auth/roles";
import { BotonSalir } from "./BotonSalir";

async function Saludo() {
  const sesion = await obtenerSesion();
  return <p className="text-h1 font-light text-ink-strong">Hola, {sesion?.nombre ?? "—"}</p>;
}

/**
 * Inicio provisional de cada rol, solo para probar el login.
 * En el PR de layout se reemplaza por la sidebar, la barra superior y el dashboard.
 */
export function InicioTemporal({ rol }: { rol: Rol }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <Suspense fallback={<p className="text-h1 font-light text-ink-muted">Cargando…</p>}>
        <Saludo />
      </Suspense>
      <p className="text-ink-muted">
        Entraste como <strong className="text-ink-strong">{PERFILES[rol].cargo}</strong>. El panel
        llega en el siguiente PR.
      </p>
      <BotonSalir className="mt-2 h-8 rounded-sm border border-gray-300 bg-white px-3.5 text-button font-semibold text-ink hover:bg-gray-100" />
    </main>
  );
}
