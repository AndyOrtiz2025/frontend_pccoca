import { User } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Rol } from "@/lib/auth/roles";

interface AvatarPerfilProps {
  rol: Rol;
  nombre: string;
  /** Tamaño en px: 112 en la pantalla de perfiles, 72 en el login. */
  size: number;
  className?: string;
}

/**
 * Avatar circular de las pantallas de acceso. Mientras Paola y Oscar no suban su foto
 * se muestran sus iniciales; el Empleado siempre lleva la silueta.
 */
export function AvatarPerfil({ rol, nombre, size, className }: AvatarPerfilProps) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-light",
        rol === "empleado" ? "bg-navy-800 text-navy-300" : "bg-navy-800 text-white",
        className,
      )}
    >
      {rol === "empleado" ? (
        <User style={{ width: size * 0.42, height: size * 0.42 }} strokeWidth={1.5} />
      ) : (
        nombre.slice(0, 1)
      )}
    </span>
  );
}
