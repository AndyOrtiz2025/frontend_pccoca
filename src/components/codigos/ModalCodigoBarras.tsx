"use client";

import { Download, Info, Printer } from "lucide-react";
import { Button, Modal, useToast } from "@/components/ui";
import { descargarArchivo } from "@/lib/compartir";
import { tieneCodigoFabricante } from "@/lib/etiquetas";
import { formatQ } from "@/lib/format";
import { nombrePaquete } from "@/lib/presentacion";
import type { Producto } from "@/types/producto";
import { CodigoBarras, pngCodigoBarras } from "./CodigoBarras";

/** Ver el código de barras de un producto (unidad y caja), descargarlo o imprimir etiquetas. */
export function ModalCodigoBarras({
  producto: p,
  onImprimir,
  onClose,
}: {
  producto: Producto;
  onImprimir: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const caja = p.fraccionable?.codigoBarrasPaquete;

  async function descargar(codigo: string, titulo: string) {
    try {
      descargarArchivo(await pngCodigoBarras(codigo, titulo), `codigo-${codigo}.png`);
    } catch {
      toast("No se pudo crear la imagen", "danger");
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Código de barras"
      subtitle={`${p.nombre} · ${p.codigo}`}
      size="md"
      variante="destacado"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={onImprimir}>
            <Printer /> Imprimir etiquetas
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Codigo
          titulo={p.fraccionable ? "Por unidad (1 al escanear)" : "Código del producto"}
          codigo={p.codigoBarras}
          precio={p.precio}
          onDescargar={() => descargar(p.codigoBarras, p.nombre)}
        />
        {tieneCodigoFabricante(p) && (
          <p className="-mt-2 flex items-start gap-1.5 text-small text-ink-muted">
            <Info className="mt-0.5 size-4 shrink-0" />
            Es el código del fabricante (ya viene impreso en el producto): no necesita etiqueta.
          </p>
        )}
        {p.fraccionable &&
          (caja ? (
            <Codigo
              titulo={`Por ${nombrePaquete(p).toLowerCase()} de ${p.fraccionable.unidadesPorPaquete} (1 ${nombrePaquete(p).toLowerCase()} al escanear)`}
              codigo={caja}
              precio={p.fraccionable.precioPaquete}
              onDescargar={() => descargar(caja, `${p.nombre} · ${nombrePaquete(p)}`)}
            />
          ) : (
            <p className="bg-gray-50 flex items-start gap-1.5 rounded-md px-3 py-2 text-small text-ink-muted">
              <Info className="mt-0.5 size-4 shrink-0" />
              Todavía no tiene código por {nombrePaquete(p).toLowerCase()}. Agrégalo desde Editar
              producto para venderlo por {nombrePaquete(p).toLowerCase()} escaneando.
            </p>
          ))}
      </div>
    </Modal>
  );
}

function Codigo({
  titulo,
  codigo,
  precio,
  onDescargar,
}: {
  titulo: string;
  codigo: string;
  precio: number;
  onDescargar: () => void;
}) {
  return (
    <section className="rounded-md border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-small font-semibold text-ink-muted">{titulo}</h3>
        <span className="text-body font-semibold text-ink-strong tabular">{formatQ(precio)}</span>
      </div>
      <CodigoBarras valor={codigo} className="mx-auto max-w-80" classBarras="h-20" />
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="outline" onClick={onDescargar}>
          <Download /> Descargar imagen
        </Button>
      </div>
    </section>
  );
}
