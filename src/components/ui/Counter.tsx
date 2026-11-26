import { cn } from "@/lib/cn";
import { formatContador } from "@/lib/format";

interface CounterProps {
  value: number;
  /** Rojo solo si hay algo urgente (ej. stock agotado). */
  urgent?: boolean;
  className?: string;
}

/** Contador circular de 18px, "9+" desde 10 (sección 7.7). No se muestra si es 0. */
export function Counter({ value, urgent, className }: CounterProps) {
  if (value <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-badge font-semibold tabular",
        urgent ? "bg-stock-out text-white" : "bg-gold-500 text-navy-900",
        className,
      )}
    >
      {formatContador(value)}
    </span>
  );
}
