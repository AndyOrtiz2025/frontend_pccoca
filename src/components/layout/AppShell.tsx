"use client";

import { useMemo, useState, type ReactNode } from "react";
import { MessageSquare } from "lucide-react";
import { RecuperarForm } from "@/components/acceso/RecuperarForm";
import { ModalComentario } from "@/components/comentarios/ModalComentario";
import { Modal } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Rol } from "@/lib/auth/roles";
import type { Contadores } from "@/lib/mocks/contadores";
import { ShellContext, type ShellValue, type UsuarioShell } from "./ShellContext";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppShellProps {
  rol: Rol;
  usuario: UsuarioShell;
  contadores: Contadores;
  children: ReactNode;
}

/** Estructura del panel: sidebar fija + barra superior + contenido sobre fondo #F4F4F5. */
export function AppShell({ rol, usuario, contadores, children }: AppShellProps) {
  const [menuMovil, setMenuMovil] = useState(false);
  const [comentario, setComentario] = useState(false);
  const [cambiarPassword, setCambiarPassword] = useState(false);

  const valor = useMemo<ShellValue>(
    () => ({
      rol,
      usuario,
      contadores,
      abrirComentario: () => setComentario(true),
      abrirCambiarPassword: () => setCambiarPassword(true),
      cerrarMenuMovil: () => setMenuMovil(false),
    }),
    [rol, usuario, contadores],
  );

  return (
    <ShellContext.Provider value={valor}>
      <div className="min-h-screen lg:pl-sidebar">
        {/* Sidebar: fija en escritorio, cajón deslizable en pantallas pequeñas */}
        {menuMovil && (
          <div
            aria-hidden
            onClick={() => setMenuMovil(false)}
            className="fixed inset-0 z-40 bg-navy-950/55 lg:hidden"
          />
        )}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-sidebar transition-transform lg:translate-x-0",
            menuMovil ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar />
        </aside>

        <div className="flex min-h-screen flex-col">
          <Topbar onAbrirMenu={() => setMenuMovil(true)} />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>

        {rol === "empleado" && (
          <button
            type="button"
            onClick={() => setComentario(true)}
            aria-label="Enviar comentario"
            className="fixed right-6 bottom-6 z-30 flex size-12 items-center justify-center rounded-full bg-grad-gold text-navy-900 shadow-md hover:bg-grad-gold-hover"
          >
            <MessageSquare className="size-5" />
          </button>
        )}
      </div>

      {rol === "empleado" && (
        <ModalComentario open={comentario} onClose={() => setComentario(false)} />
      )}
      {rol !== "empleado" && (
        <Modal
          open={cambiarPassword}
          onClose={() => setCambiarPassword(false)}
          title="Cambiar contraseña"
          subtitle="Te enviaremos un enlace a tu correo para crear una nueva contraseña."
          size="sm"
        >
          <RecuperarForm compacto />
        </Modal>
      )}
    </ShellContext.Provider>
  );
}
