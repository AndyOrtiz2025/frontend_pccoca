import type { Producto, ProductoVenta } from "@/types/producto";

type Buscable = Pick<Producto | ProductoVenta, "codigo" | "codigoBarras" | "nombre">;

/** Minúsculas y sin tildes: "Librería" → "libreria". */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Distancia de edición entre dos palabras (cuántas letras hay que cambiar). */
export function distancia(a: string, b: string): number {
  if (a === b) return 0;
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0]!;
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = fila[j]!;
      fila[j] = Math.min(
        fila[j]! + 1,
        fila[j - 1]! + 1,
        anterior + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      anterior = tmp;
    }
  }
  return fila[b.length]!;
}

/** Errores de dedo permitidos según el largo de la palabra. */
function tolerancia(palabra: string): number {
  if (palabra.length <= 3) return 0;
  return palabra.length <= 6 ? 1 : 2;
}

/** ¿La palabra buscada coincide (empieza igual o con un error de dedo) con alguna palabra del nombre? */
function coincidePalabra(buscada: string, palabras: string[]): "exacta" | "aproximada" | null {
  if (palabras.some((p) => p.startsWith(buscada))) return "exacta";
  const tol = tolerancia(buscada);
  if (
    tol > 0 &&
    palabras.some(
      (p) =>
        distancia(buscada, p.slice(0, buscada.length + 1)) <= tol || distancia(buscada, p) <= tol,
    )
  ) {
    return "aproximada";
  }
  return null;
}

/**
 * Producto cuyo código interno o código de barras coincide EXACTO (lector de código de barras o código tecleado).
 * No distingue mayúsculas.
 */
export function buscarPorCodigo<T extends Buscable>(productos: T[], codigo: string): T | undefined {
  const c = normalizar(codigo);
  if (!c) return undefined;
  return productos.find((p) => normalizar(p.codigoBarras) === c || normalizar(p.codigo) === c);
}

/**
 * Buscador de productos (sección 8.2):
 * 1. Código exacto primero (inmediato).
 * 2. Nombre: sin mayúsculas ni tildes, todas las palabras deben coincidir.
 * 3. Tolera errores de dedo ("cuadreno" → "Cuaderno"); esas van después de las exactas.
 */
export function buscarProductos<T extends Buscable>(productos: T[], consulta: string): T[] {
  const q = normalizar(consulta);
  if (!q) return productos;

  const porCodigo = buscarPorCodigo(productos, q);
  if (porCodigo) return [porCodigo];

  const buscadas = q.split(/\s+/).filter(Boolean);
  const exactas: T[] = [];
  const aproximadas: T[] = [];

  for (const p of productos) {
    const palabras = normalizar(p.nombre)
      .split(/[\s/,.-]+/)
      .filter(Boolean);
    const codigo = normalizar(p.codigo);
    let todasExactas = true;
    let todas = true;
    for (const b of buscadas) {
      if (codigo.includes(b)) continue;
      const r = coincidePalabra(b, palabras);
      if (!r) {
        todas = false;
        break;
      }
      if (r === "aproximada") todasExactas = false;
    }
    if (!todas) continue;
    (todasExactas ? exactas : aproximadas).push(p);
  }
  return [...exactas, ...aproximadas];
}
