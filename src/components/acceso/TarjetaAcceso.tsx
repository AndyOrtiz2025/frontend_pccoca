import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

interface TarjetaAccesoProps {
  volver: { href: string; label: string };
  children: ReactNode;
}

/** Tarjeta blanca centrada de 380px (pantallas 2 y 3 del prototipo). */
export function TarjetaAcceso({ volver, children }: TarjetaAccesoProps) {
  return (
    <div className="w-full max-w-[380px] rounded-lg bg-white p-6 text-ink shadow-lg">
      <Link
        href={volver.href}
        className="inline-flex items-center gap-1.5 rounded-xs text-small text-ink-muted hover:text-navy-900"
      >
        <ArrowLeft className="size-3.5" />
        {volver.label}
      </Link>
      {children}
    </div>
  );
}
