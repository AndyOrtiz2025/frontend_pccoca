import "server-only";
import type { Rol } from "./roles";
import type { Sesion } from "./session";

/**
 * Usuarios de prueba mientras no existe el backend (USE_MOCKS=true).
 * Cuando el backend esté listo, /api/auth/login llamará a BACKEND_URL y este archivo se borra.
 */
interface UsuarioMock extends Sesion {
  password: string;
  correo?: string;
}

const PASSWORD_DEMO = "pccoca2026";

const USUARIOS: UsuarioMock[] = [
  { usuario: "carlos", nombre: "Carlos", rol: "empleado", password: PASSWORD_DEMO },
  { usuario: "ana", nombre: "Ana", rol: "empleado", password: PASSWORD_DEMO },
  {
    usuario: "paola",
    nombre: "Paola",
    rol: "paola",
    password: PASSWORD_DEMO,
    correo: "paola@pccoca.com",
  },
  {
    usuario: "oscar",
    nombre: "Oscar",
    rol: "oscar",
    password: PASSWORD_DEMO,
    correo: "oscar@pccoca.com",
  },
];

/** Valida usuario y contraseña para el perfil elegido. Devuelve null si algo no coincide. */
export function autenticarMock(perfil: Rol, usuario: string, password: string): Sesion | null {
  const u = USUARIOS.find((x) => x.usuario === usuario.toLowerCase() && x.rol === perfil);
  if (!u || u.password !== password) return null;
  return { usuario: u.usuario, nombre: u.nombre, rol: u.rol };
}
