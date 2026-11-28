import "server-only";
import {
  obtenerPendientesAnteriores,
  obtenerProductosAdmin,
  obtenerProveedores,
  obtenerSubcategorias,
  sugerirCodigo,
  type PendienteAnterior,
} from "@/lib/api";
import type { Categoria } from "@/types/producto";

/** Paola pide para Librería y Productos Varios. */
export const CATEGORIAS_PAOLA: Categoria[] = ["libreria", "varios"];

/** Productos, proveedores que surten Librería/Varios y lo que falta de pedidos anteriores. */
export async function datosFormularioPedido() {
  const [libreria, varios, todos] = await Promise.all([
    obtenerProductosAdmin("paola", "libreria"),
    obtenerProductosAdmin("paola", "varios"),
    obtenerProveedores(),
  ]);
  const proveedores = todos.filter((p) => p.surte.some((c) => CATEGORIAS_PAOLA.includes(c)));
  const pendientes: Record<string, PendienteAnterior[]> = {};
  for (const p of proveedores) {
    pendientes[p.id] = await obtenerPendientesAnteriores("paola", p.id);
  }
  return { productos: [...libreria, ...varios], proveedores, pendientes };
}

/** Lo que necesita "Crear producto" al revisar un paquete con algo que no teníamos. */
export async function datosCrearProducto() {
  const [proveedores, subLib, subVar, codLib, codVar] = await Promise.all([
    obtenerProveedores(),
    obtenerSubcategorias("paola", "libreria"),
    obtenerSubcategorias("paola", "varios"),
    sugerirCodigo("paola", "libreria"),
    sugerirCodigo("paola", "varios"),
  ]);
  return {
    categorias: CATEGORIAS_PAOLA,
    proveedores,
    subcategorias: {
      libreria: subLib.map((s) => s.nombre),
      varios: subVar.map((s) => s.nombre),
    },
    codigos: { libreria: codLib, varios: codVar },
  };
}
