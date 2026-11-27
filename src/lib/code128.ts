/**
 * Generador de códigos de barras Code 128 (juego B: letras, números y signos ASCII).
 * Lo lee cualquier lector USB. Se dibuja como SVG: nítido al imprimir en cualquier tamaño.
 *
 * Estructura: zona en blanco · inicio B · datos · dígito de control · fin · zona en blanco.
 */

/** Anchos de barra/espacio de cada símbolo (0 a 106). El 106 es el de fin (7 elementos). */
const PATRONES = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112",
];
const INICIO_B = 104;
const FIN = 106;
/** Zona en blanco a cada lado (mínimo 10 módulos según la norma). */
export const ZONA_SILENCIO = 10;

/** ¿Se puede codificar? Solo caracteres ASCII imprimibles (espacio a ~). */
export function esCodificable(texto: string): boolean {
  return texto.length > 0 && /^[\x20-\x7e]+$/.test(texto);
}

/** Valores de los símbolos, incluido el dígito de control: inicio, datos, control, fin. */
export function simbolosCode128(texto: string): number[] {
  if (!esCodificable(texto)) throw new Error("Solo letras, números y signos básicos");
  const datos = [...texto].map((c) => c.charCodeAt(0) - 32);
  const control = datos.reduce((suma, v, i) => suma + v * (i + 1), INICIO_B) % 103;
  return [INICIO_B, ...datos, control, FIN];
}

/** Módulos de izquierda a derecha (true = barra negra), con las zonas en blanco. */
export function modulosCode128(texto: string): boolean[] {
  const modulos: boolean[] = Array(ZONA_SILENCIO).fill(false);
  for (const s of simbolosCode128(texto)) {
    [...PATRONES[s]!].forEach((ancho, i) => {
      for (let k = 0; k < Number(ancho); k++) modulos.push(i % 2 === 0);
    });
  }
  return modulos.concat(Array(ZONA_SILENCIO).fill(false));
}

/** Barras como rectángulos {x, ancho} en módulos: lo que se dibuja en el SVG. */
export function barrasCode128(texto: string): { x: number; ancho: number }[] {
  const m = modulosCode128(texto);
  const barras: { x: number; ancho: number }[] = [];
  m.forEach((negro, x) => {
    if (!negro) return;
    const ultima = barras.at(-1);
    if (ultima && ultima.x + ultima.ancho === x) ultima.ancho++;
    else barras.push({ x, ancho: 1 });
  });
  return barras;
}
