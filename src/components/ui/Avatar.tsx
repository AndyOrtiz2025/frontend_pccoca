import { User } from "lucide-react";
import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
  /** Anillo dorado (sidebar y pantalla de perfiles). */
  ring?: boolean;
  /** Sobre fondo oscuro, la silueta va en #A9B2C3 sobre #1C2D50. */
  onDark?: boolean;
  /** Muestra la silueta en lugar de las iniciales (ej. perfil "Empleado"). */
  silhouette?: boolean;
  className?: string;
}

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Avatar circular: foto, iniciales o silueta. */
export function Avatar({ name, src, size = 28, ring, onDark, silhouette, className }: AvatarProps) {
  const estilo = { width: size, height: size };
  const clases = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
    ring && "ring-[2.5px] ring-gold-500",
    onDark ? "bg-navy-800 text-navy-300" : "bg-st-recibido-bg text-navy-900",
    className,
  );

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- las fotos de perfil vienen del backend
      <img src={src} alt={name} style={estilo} className={cn(clases, "object-cover")} />
    );
  }

  const texto = silhouette ? "" : iniciales(name);
  return (
    <span
      role="img"
      aria-label={name}
      style={{ ...estilo, fontSize: size * 0.38 }}
      className={clases}
    >
      {texto || <User style={{ width: size * 0.55, height: size * 0.55 }} />}
    </span>
  );
}
