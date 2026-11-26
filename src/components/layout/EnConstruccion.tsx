import { Hammer } from "lucide-react";
import { Card } from "@/components/ui";

interface EnConstruccionProps {
  /** Qué va a tener esta pantalla. */
  descripcion: string;
  /** Pantalla del prototipo de Stitch en la que se basa (ej. "Pantalla 11"). */
  referencia?: string;
}

/** Marcador de las pantallas que todavía no se construyen. */
export function EnConstruccion({ descripcion, referencia }: EnConstruccionProps) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-gold-100 text-navy-900">
        <Hammer className="size-5" />
      </span>
      <p className="text-h2 font-semibold text-ink-strong">En construcción</p>
      <p className="max-w-md text-ink-muted">{descripcion}</p>
      {referencia && <p className="text-small text-ink-muted/80">Referencia: {referencia}</p>}
    </Card>
  );
}
