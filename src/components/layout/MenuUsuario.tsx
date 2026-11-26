"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, KeyRound, LogOut } from "lucide-react";
import { useToast } from "@/components/ui";
import { AvatarCuadrado } from "./AvatarCuadrado";
import { useShell } from "./ShellContext";

const opcion =
  "flex h-9 w-full items-center gap-2.5 rounded-sm px-2.5 text-body text-ink hover:bg-gray-100 [&_svg]:size-4 [&_svg]:text-ink-muted";

/**
 * Menú del usuario en la barra superior.
 * Paola y Oscar: cambiar foto y cambiar contraseña (por correo). El Empleado solo puede salir:
 * su contraseña la administra Oscar desde "Usuarios".
 */
export function MenuUsuario() {
  const { rol, usuario, abrirCambiarPassword } = useShell();
  const router = useRouter();
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const esAdmin = rol !== "empleado";

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  async function salir() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/");
    router.refresh();
  }

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-sm pr-1.5 pl-1 text-button font-medium text-ink hover:bg-gray-100"
      >
        <AvatarCuadrado
          nombre={usuario.nombre}
          silueta={!esAdmin}
          size={28}
          className="rounded-sm"
        />
        <span className="hidden sm:inline">{usuario.nombre}</span>
        <ChevronDown className="size-4 text-ink-muted" />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute top-full right-0 z-40 mt-1.5 w-56 rounded-md border border-gray-200 bg-white p-1.5 shadow-md"
        >
          <div className="border-b border-gray-200 px-2.5 pt-1 pb-2.5">
            <p className="text-body font-semibold text-ink-strong">{usuario.nombre}</p>
            <p className="text-small text-ink-muted">{usuario.cargo}</p>
          </div>
          <div className="flex flex-col gap-0.5 pt-1.5">
            {esAdmin && (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className={opcion}
                  onClick={() => {
                    setAbierto(false);
                    toast("Subir foto estará disponible con el backend");
                  }}
                >
                  <Camera /> Cambiar foto
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={opcion}
                  onClick={() => {
                    setAbierto(false);
                    abrirCambiarPassword();
                  }}
                >
                  <KeyRound /> Cambiar contraseña
                </button>
              </>
            )}
            <button type="button" role="menuitem" className={opcion} onClick={salir}>
              <LogOut /> Salir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
