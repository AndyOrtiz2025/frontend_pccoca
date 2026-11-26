import { User } from "lucide-react";
import { cn } from "@/lib/cn";

interface AvatarCuadradoProps {
  nombre: string;
  silueta?: boolean;
  size?: number;
  className?: string;
}

/** Avatar cuadrado con esquinas redondeadas de la sidebar oficial (fondo #1C2D50). */
export function AvatarCuadrado({ nombre, silueta, size = 40, className }: AvatarCuadradoProps) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md bg-navy-800 font-semibold text-white",
        silueta && "text-navy-300",
        className,
      )}
    >
      {silueta ? (
        <User style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={1.75} />
      ) : (
        nombre.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
