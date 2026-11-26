"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, ShoppingBag } from "lucide-react";
import { Counter, SearchInput } from "@/components/ui";
import { tituloDeRuta } from "@/lib/navegacion";
import { MenuUsuario } from "./MenuUsuario";
import { useShell } from "./ShellContext";

interface TopbarProps {
  onAbrirMenu: () => void;
}

/** Barra superior blanca de 56px: título a la izquierda; campanita, carrito y usuario a la derecha. */
export function Topbar({ onAbrirMenu }: TopbarProps) {
  const { rol, contadores } = useShell();
  const pathname = usePathname();
  const titulo = tituloDeRuta(rol, pathname);
  const esEmpleado = rol === "empleado";

  return (
    <header className="sticky top-0 z-30 flex h-topbar shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
      <button
        type="button"
        onClick={onAbrirMenu}
        aria-label="Abrir menú"
        className="-ml-1 flex size-9 items-center justify-center rounded-sm text-ink-muted hover:bg-gray-100 lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <h1 className="truncate text-h1 font-light text-ink-strong">{titulo}</h1>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        {esEmpleado && (
          // TODO(productos): el buscador y el lector de código de barras se conectan en el PR de catálogo.
          <SearchInput
            aria-label="Buscar producto o código"
            placeholder="Buscar producto o código"
            className="hidden w-64 md:block"
          />
        )}

        {esEmpleado && (
          <Link
            href="/empleado/carrito"
            aria-label={`Carrito, ${contadores.carrito ?? 0} productos`}
            className="relative flex size-9 items-center justify-center rounded-sm text-ink-muted hover:bg-gray-100 hover:text-navy-900"
          >
            <ShoppingBag className="size-[18px]" />
            <Counter value={contadores.carrito ?? 0} className="absolute top-0.5 right-0" />
          </Link>
        )}

        <button
          type="button"
          aria-label={`Notificaciones, ${contadores.notificaciones ?? 0} sin leer`}
          className="relative flex size-9 items-center justify-center rounded-sm text-ink-muted hover:bg-gray-100 hover:text-navy-900"
        >
          <Bell className="size-[18px]" />
          <Counter value={contadores.notificaciones ?? 0} className="absolute top-0.5 right-0" />
        </button>

        <span aria-hidden className="mx-1 hidden h-6 w-px bg-gray-200 sm:block" />
        <MenuUsuario />
      </div>
    </header>
  );
}
