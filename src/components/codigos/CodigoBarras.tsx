import { barrasCode128, esCodificable, modulosCode128 } from "@/lib/code128";

/**
 * Código de barras Code 128 en SVG. Se estira al ancho del contenedor y se imprime nítido.
 * `crispEdges` evita bordes borrosos que confunden al lector.
 */
export function CodigoBarras({
  valor,
  className,
  classBarras = "h-12",
  conTexto = true,
  tamanoTexto,
}: {
  valor: string;
  className?: string;
  /** Alto de las barras (clase de Tailwind o vacío si se controla con `style`). */
  classBarras?: string;
  /** Muestra el código en letras debajo de las barras (por si el lector falla). */
  conTexto?: boolean;
  /** Tamaño del texto (ej. "6.5pt" en etiquetas). */
  tamanoTexto?: string;
}) {
  if (!esCodificable(valor)) {
    return <p className="text-small text-stock-out">Código no válido para barras: {valor}</p>;
  }
  const ancho = modulosCode128(valor).length;
  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${ancho} 40`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Código de barras ${valor}`}
        shapeRendering="crispEdges"
        className={`block w-full ${classBarras}`}
      >
        <rect width={ancho} height={40} fill="#fff" />
        {barrasCode128(valor).map((b) => (
          <rect key={b.x} x={b.x} width={b.ancho} height={40} fill="#000" />
        ))}
      </svg>
      {conTexto && (
        <p
          className="text-center font-mono leading-tight tracking-wide text-black"
          style={tamanoTexto ? { fontSize: tamanoTexto } : undefined}
        >
          {valor}
        </p>
      )}
    </div>
  );
}

/** PNG del código (para descargar o mandar por WhatsApp). Se dibuja en el navegador. */
export async function pngCodigoBarras(valor: string, titulo?: string): Promise<Blob> {
  const modulos = modulosCode128(valor);
  const escala = 4;
  const alto = 160;
  const arriba = titulo ? 44 : 12;
  const canvas = document.createElement("canvas");
  canvas.width = modulos.length * escala;
  canvas.height = arriba + alto + 44;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  if (titulo) {
    ctx.font = "bold 22px Inter, Arial, sans-serif";
    ctx.fillText(titulo, canvas.width / 2, 30, canvas.width - 20);
  }
  modulos.forEach((negro, i) => {
    if (negro) ctx.fillRect(i * escala, arriba, escala, alto);
  });
  ctx.font = "24px ui-monospace, monospace";
  ctx.fillText(valor, canvas.width / 2, arriba + alto + 32);
  return await new Promise((ok, falla) =>
    canvas.toBlob((b) => (b ? ok(b) : falla(new Error("No se pudo crear la imagen"))), "image/png"),
  );
}
