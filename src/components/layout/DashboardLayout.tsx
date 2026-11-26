import { Suspense, type ReactNode } from "react";
import { obtenerSesion } from "@/lib/auth/server";
import { PERFILES, type Rol } from "@/lib/auth/roles";
import { CONTADORES_DEMO } from "@/lib/mocks/contadores";
import { AppShell } from "./AppShell";

async function ShellConSesion({ rol, children }: { rol: Rol; children: ReactNode }) {
  const sesion = await obtenerSesion();
  // El proxy ya garantiza que hay sesión y que es de este rol; esto es solo por seguridad de tipos.
  const nombre = sesion?.rol === rol ? sesion.nombre : PERFILES[rol].nombre;
  return (
    <AppShell
      rol={rol}
      usuario={{ nombre, cargo: PERFILES[rol].cargo }}
      contadores={CONTADORES_DEMO[rol]}
    >
      {children}
    </AppShell>
  );
}

/**
 * Layout común de las pantallas protegidas (menú lateral + barra superior).
 * Lo usa el layout.tsx de cada rol en app/(dashboard)/.
 */
export function DashboardLayout({ rol, children }: { rol: Rol; children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 lg:pl-sidebar" />}>
      <ShellConSesion rol={rol}>{children}</ShellConSesion>
    </Suspense>
  );
}
