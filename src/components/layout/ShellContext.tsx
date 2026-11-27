"use client";

import { createContext, useContext } from "react";
import type { Rol } from "@/lib/auth/roles";
import type { Contadores } from "@/types/contadores";

export interface UsuarioShell {
  nombre: string;
  cargo: string;
}

export interface ShellValue {
  rol: Rol;
  usuario: UsuarioShell;
  contadores: Contadores;
  abrirComentario: () => void;
  abrirCambiarPassword: () => void;
  cerrarMenuMovil: () => void;
}

export const ShellContext = createContext<ShellValue | null>(null);

/** Datos compartidos del panel: rol, usuario, contadores y acciones globales. */
export function useShell(): ShellValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell debe usarse dentro de <AppShell>");
  return ctx;
}
