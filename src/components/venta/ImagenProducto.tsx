import { BookOpen, Cpu, Gift } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Categoria } from "@/types/producto";

const ICONO: Record<Categoria, typeof BookOpen> = {
  libreria: BookOpen,
  tecnologia: Cpu,
  varios: Gift,
};

/** Imagen del producto o, mientras no la suban, un ícono de su categoría. */
export function ImagenProducto({
  categoria,
  nombre,
  imagenUrl,
  className,
}: {
  categoria: Categoria;
  nombre: string;
  imagenUrl?: string;
  className?: string;
}) {
  if (imagenUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- las imágenes vendrán del backend
    return <img src={imagenUrl} alt={nombre} className={cn("object-cover", className)} />;
  }
  const Icono = ICONO[categoria];
  return (
    <div
      aria-hidden
      className={cn("flex items-center justify-center bg-gray-100 text-navy-300", className)}
    >
      <Icono className="size-1/3 max-h-10 max-w-10" strokeWidth={1.25} />
    </div>
  );
}
