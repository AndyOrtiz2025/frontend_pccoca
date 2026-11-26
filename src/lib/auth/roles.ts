/** Roles del sistema (documentación, sección 7). */
export const ROLES = ["empleado", "paola", "oscar"] as const;
export type Rol = (typeof ROLES)[number];

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === "string" && (ROLES as readonly string[]).includes(valor);
}

export interface PerfilAcceso {
  rol: Rol;
  nombre: string;
  cargo: string;
  /** Paola y Oscar recuperan y cambian su contraseña por correo. El Empleado no. */
  recuperaPorCorreo: boolean;
}

/** Los tres perfiles de la pantalla "¿Quién está usando PC Coca?". */
export const PERFILES: Record<Rol, PerfilAcceso> = {
  empleado: { rol: "empleado", nombre: "Empleado", cargo: "Empleado", recuperaPorCorreo: false },
  paola: { rol: "paola", nombre: "Paola", cargo: "Administradora", recuperaPorCorreo: true },
  oscar: { rol: "oscar", nombre: "Oscar", cargo: "Administrador", recuperaPorCorreo: true },
};

/** Página de inicio de cada rol. */
export const INICIO_ROL: Record<Rol, string> = {
  empleado: "/empleado",
  paola: "/paola",
  oscar: "/oscar",
};

/** A qué rol pertenece una ruta, según su primer segmento. */
export function rolDeRuta(pathname: string): Rol | null {
  const segmento = pathname.split("/")[1];
  return esRol(segmento) ? segmento : null;
}
