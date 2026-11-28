import {
  BarChart3,
  BookOpen,
  Clock,
  Contact,
  Cpu,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  ShoppingBag,
  StickyNote,
  Users,
  Wrench,
  type LucideIcon,
  Undo2,
} from "lucide-react";
import type { Rol } from "@/lib/auth/roles";

/** Claves de los contadores que muestra el menú (los llena el backend; por ahora, datos de prueba). */
export type ClaveContador = "pendientes" | "carrito" | "entradas" | "comentarios";

export interface SubItem {
  label: string;
  href: string;
  /** Título de la barra superior, si es distinto del label. */
  titulo?: string;
  contador?: ClaveContador;
}

export interface ItemMenu {
  label: string;
  icon: LucideIcon;
  /** Ítem simple: lleva a una página. */
  href?: string;
  /** Ítem con submenú. */
  hijos?: SubItem[];
  contador?: ClaveContador;
  /** Abre el modal de comentarios en lugar de navegar (vista Empleado). */
  accion?: "comentario";
}

export interface GrupoMenu {
  titulo: "PRINCIPAL" | "OTROS";
  items: ItemMenu[];
}

/**
 * Menú de la sidebar oficial por rol ("Barra lateral oficial" de los prompts de Stitch).
 * Si se agrega una pantalla, se agrega aquí y aparece en el menú y en el título de la barra superior.
 */
export const MENU: Record<Rol, GrupoMenu[]> = {
  empleado: [
    {
      titulo: "PRINCIPAL",
      items: [
        { label: "Dashboard", icon: LayoutDashboard, href: "/empleado" },
        {
          label: "Productos",
          icon: Package,
          hijos: [
            { label: "Librería", href: "/empleado/productos/libreria" },
            { label: "Tecnología", href: "/empleado/productos/tecnologia" },
            { label: "Productos Varios", href: "/empleado/productos/varios" },
          ],
        },
        {
          label: "Trámites",
          icon: FileText,
          hijos: [
            { label: "Catálogo", href: "/empleado/tramites", titulo: "Trámites" },
            { label: "Seguimiento", href: "/empleado/seguimiento/tramites", titulo: "Seguimiento" },
          ],
        },
        {
          label: "Servicios Técnicos",
          icon: Wrench,
          hijos: [
            { label: "Catálogo", href: "/empleado/servicios", titulo: "Servicios Técnicos" },
            {
              label: "Seguimiento",
              href: "/empleado/seguimiento/servicios",
              titulo: "Seguimiento",
            },
          ],
        },
      ],
    },
    {
      titulo: "OTROS",
      items: [
        { label: "Pendientes", icon: Clock, href: "/empleado/pendientes", contador: "pendientes" },
        { label: "Carrito", icon: ShoppingBag, href: "/empleado/carrito", contador: "carrito" },
        { label: "Devoluciones", icon: Undo2, href: "/empleado/devoluciones" },
        { label: "Comentarios", icon: MessageSquare, accion: "comentario" },
      ],
    },
  ],
  paola: [
    {
      titulo: "PRINCIPAL",
      items: [
        { label: "Dashboard", icon: LayoutDashboard, href: "/paola" },
        {
          label: "Productos",
          icon: BookOpen,
          hijos: [
            { label: "Librería", href: "/paola/productos/libreria" },
            { label: "Productos Varios", href: "/paola/productos/varios" },
            { label: "Proveedores", href: "/paola/proveedores" },
            { label: "Pedidos", href: "/paola/pedidos" },
          ],
        },
        {
          label: "Trámites",
          icon: FileText,
          hijos: [
            { label: "Catálogo", href: "/paola/tramites", titulo: "Trámites" },
            {
              label: "En proceso",
              href: "/paola/tramites/en-proceso",
              titulo: "Trámites en proceso",
            },
            {
              label: "Entradas",
              href: "/paola/tramites/entradas",
              titulo: "Entradas de trámite",
              contador: "entradas",
            },
          ],
        },
      ],
    },
    {
      titulo: "OTROS",
      items: [
        { label: "Pendientes", icon: Clock, href: "/paola/pendientes" },
        { label: "Devoluciones", icon: Undo2, href: "/paola/devoluciones" },
        { label: "Clientes frecuentes", icon: Contact, href: "/paola/clientes" },
        { label: "Reportes mensuales", icon: BarChart3, href: "/paola/reportes" },
        {
          label: "Comentarios",
          icon: MessageSquare,
          href: "/paola/comentarios",
          contador: "comentarios",
        },
        { label: "Block de notas", icon: StickyNote, href: "/paola/notas" },
      ],
    },
  ],
  oscar: [
    {
      titulo: "PRINCIPAL",
      items: [
        { label: "Dashboard", icon: LayoutDashboard, href: "/oscar" },
        {
          label: "Tecnología",
          icon: Cpu,
          hijos: [
            { label: "Productos", href: "/oscar/tecnologia", titulo: "Tecnología" },
            { label: "Inventario", href: "/oscar/tecnologia/inventario", titulo: "Inventario" },
            { label: "Proveedores", href: "/oscar/tecnologia/proveedores", titulo: "Proveedores" },
          ],
        },
        {
          label: "Servicios Técnicos",
          icon: Wrench,
          hijos: [
            { label: "Catálogo", href: "/oscar/servicios", titulo: "Servicios Técnicos" },
            {
              label: "En proceso",
              href: "/oscar/servicios/en-proceso",
              titulo: "Servicios en proceso",
            },
            {
              label: "Entradas",
              href: "/oscar/servicios/entradas",
              titulo: "Entradas de servicio técnico",
              contador: "entradas",
            },
          ],
        },
      ],
    },
    {
      titulo: "OTROS",
      items: [
        {
          label: "Comentarios",
          icon: MessageSquare,
          href: "/oscar/comentarios",
          contador: "comentarios",
        },
        { label: "Usuarios", icon: Users, href: "/oscar/usuarios" },
      ],
    },
  ],
};

/** Todas las páginas de un rol, con su título, para la barra superior y las pruebas. */
export function paginasDeRol(rol: Rol): { href: string; titulo: string }[] {
  return MENU[rol].flatMap((g) =>
    g.items.flatMap((item) => {
      if (item.hijos) return item.hijos.map((h) => ({ href: h.href, titulo: h.titulo ?? h.label }));
      return item.href ? [{ href: item.href, titulo: item.label }] : [];
    }),
  );
}

/** Título de la barra superior para una ruta. Usa la coincidencia más larga. */
export function tituloDeRuta(rol: Rol, pathname: string): string {
  const paginas = paginasDeRol(rol)
    .filter((p) => pathname === p.href || pathname.startsWith(`${p.href}/`))
    .sort((a, b) => b.href.length - a.href.length);
  return paginas[0]?.titulo ?? "PC Coca";
}

/** El ítem o subítem activo es el de coincidencia más larga con la ruta actual. */
export function hrefActivo(rol: Rol, pathname: string): string | null {
  const candidatos = paginasDeRol(rol)
    .map((p) => p.href)
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length);
  return candidatos[0] ?? null;
}
