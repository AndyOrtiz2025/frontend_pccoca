"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/cn";

/** Cierra la sesión (borra la cookie en el servidor) y vuelve a la pantalla de perfiles. */
export function BotonSalir({ className }: { className?: string }) {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={salir}
      disabled={saliendo}
      className={cn("inline-flex items-center gap-2 disabled:opacity-45", className)}
    >
      <LogOut className="size-4" />
      Salir
    </button>
  );
}
