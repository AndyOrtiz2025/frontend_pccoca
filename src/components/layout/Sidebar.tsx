"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { BotonSalir } from "@/components/acceso/BotonSalir";
import { Counter, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { hrefActivo, MENU, type ItemMenu } from "@/lib/navegacion";
import { AvatarCuadrado } from "./AvatarCuadrado";
import { useShell } from "./ShellContext";

const itemBase =
  "relative flex h-10 w-full items-center gap-3 rounded-md px-3 text-[14px] transition-colors";

function BarraActiva() {
  return (
    <span aria-hidden className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-gold-500" />
  );
}

function ItemConHijos({ item, activo }: { item: ItemMenu; activo: string | null }) {
  const { contadores, cerrarMenuMovil } = useShell();
  const contieneActivo = item.hijos?.some((h) => h.href === activo) ?? false;
  const [abierto, setAbierto] = useState(contieneActivo);
  const Icono = item.icon;
  const expandido = abierto || contieneActivo;

  return (
    <li>
      <button
        type="button"
        aria-expanded={expandido}
        onClick={() => setAbierto((v) => !v)}
        className={cn(
          itemBase,
          contieneActivo ? "text-white" : "text-navy-300 hover:bg-white/5 hover:text-white",
        )}
      >
        <Icono className="size-[18px] shrink-0" strokeWidth={1.75} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn("size-4 transition-transform", expandido ? "rotate-0" : "-rotate-90")}
        />
      </button>
      {expandido && (
        <ul className="mt-0.5 mb-1 flex flex-col gap-0.5">
          {item.hijos?.map((h) => {
            const esActivo = h.href === activo;
            const n = h.contador ? (contadores[h.contador] ?? 0) : 0;
            return (
              <li key={h.href}>
                <Link
                  href={h.href}
                  onClick={cerrarMenuMovil}
                  aria-current={esActivo ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center gap-3 rounded-md pr-3 pl-[42px] text-[13px] transition-colors",
                    esActivo ? "text-gold-500" : "text-navy-300 hover:text-white",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 shrink-0 rounded-full border",
                      esActivo ? "border-gold-500 bg-gold-500" : "border-current",
                    )}
                  />
                  <span className="flex-1">{h.label}</span>
                  <Counter value={n} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function ItemSimple({ item, activo }: { item: ItemMenu; activo: string | null }) {
  const { contadores, abrirComentario, cerrarMenuMovil } = useShell();
  const Icono = item.icon;
  const n = item.contador ? (contadores[item.contador] ?? 0) : 0;
  const contenido = (
    <>
      <Icono className="size-[18px] shrink-0" strokeWidth={1.75} />
      <span className="flex-1 text-left">{item.label}</span>
      <Counter value={n} />
    </>
  );

  if (item.accion === "comentario") {
    return (
      <li>
        <button
          type="button"
          onClick={() => {
            cerrarMenuMovil();
            abrirComentario();
          }}
          className={cn(itemBase, "text-navy-300 hover:bg-white/5 hover:text-white")}
        >
          {contenido}
        </button>
      </li>
    );
  }

  const esActivo = item.href === activo;
  return (
    <li>
      <Link
        href={item.href ?? "#"}
        onClick={cerrarMenuMovil}
        aria-current={esActivo ? "page" : undefined}
        className={cn(
          itemBase,
          esActivo ? "bg-navy-800 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white",
        )}
      >
        {esActivo && <BarraActiva />}
        {contenido}
      </Link>
    </li>
  );
}

/**
 * Sidebar oficial (prompts de Stitch, "Barra lateral oficial"): igual en los tres roles,
 * solo cambia el menú. Ítem activo con fondo #1C2D50 y barra dorada, nunca fondo dorado.
 */
export function Sidebar() {
  const { rol, usuario } = useShell();
  const toast = useToast();
  const pathname = usePathname();
  const activo = hrefActivo(rol, pathname);
  const esAdmin = rol !== "empleado";

  return (
    <nav aria-label="Menú principal" className="flex h-full flex-col bg-grad-sidebar text-white">
      <div className="flex h-topbar shrink-0 items-center border-b border-white/10 px-5">
        <span className="text-[17px] font-semibold">
          PC Coca
          <span aria-hidden className="ml-1 inline-block size-2 rounded-full bg-gold-500" />
        </span>
      </div>

      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className="relative">
          <AvatarCuadrado nombre={usuario.nombre} silueta={!esAdmin} />
          {esAdmin && (
            <button
              type="button"
              aria-label="Cambiar foto de perfil"
              onClick={() => toast("Subir foto estará disponible con el backend")}
              className="absolute -right-1.5 -bottom-1.5 flex size-[18px] items-center justify-center rounded-full bg-gold-500 text-navy-900 ring-2 ring-navy-900"
            >
              <Plus className="size-3" strokeWidth={3} />
            </button>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold">{usuario.nombre}</p>
          <p className="truncate text-small text-navy-300">{usuario.cargo}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {MENU[rol].map((grupo) => (
          <div key={grupo.titulo} className="mb-4 last:mb-0">
            <p className="mb-1.5 px-3 text-overline font-semibold tracking-[0.08em] text-navy-300/70">
              {grupo.titulo}
            </p>
            <ul className="flex flex-col gap-0.5">
              {grupo.items.map((item) =>
                item.hijos ? (
                  <ItemConHijos key={item.label} item={item} activo={activo} />
                ) : (
                  <ItemSimple key={item.label} item={item} activo={activo} />
                ),
              )}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-3">
        <BotonSalir
          className={cn(
            itemBase,
            "text-navy-300 hover:bg-white/5 hover:text-white [&_svg]:size-[18px]",
          )}
        />
      </div>
    </nav>
  );
}
