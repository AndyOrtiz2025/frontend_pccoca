"use client";

import { useState } from "react";
import { Info, Printer, Tags, X } from "lucide-react";
import { Button, CapaImpresion, Input, Switch } from "@/components/ui";
import { formatQ } from "@/lib/format";
import {
  armarEtiquetas,
  ETIQUETAS_POR_HOJA,
  repartirEnHojas,
  tieneCodigoFabricante,
  type Etiqueta,
  type PedidoEtiquetas,
} from "@/lib/etiquetas";
import { nombrePaquete, pluralPaquete } from "@/lib/presentacion";
import type { Producto } from "@/types/producto";
import { CodigoBarras } from "./CodigoBarras";

const soloEntero = (v: string) => Math.min(Number(v.replace(/\D/g, "") || 0), 300);

/**
 * Imprimir etiquetas en hoja carta de 30 (3 × 10, tipo Avery 5160) con impresora normal.
 * Por cada producto se elige cuántas de unidad y cuántas de caja; se puede quitar el precio
 * y empezar en otra posición para aprovechar una hoja ya usada.
 */
export function ModalEtiquetas({
  productos,
  onClose,
}: {
  productos: Producto[];
  onClose: () => void;
}) {
  // Por defecto: 1 hoja del primer producto si es uno solo; si son varios, 3 de cada uno.
  // Los que traen código del fabricante empiezan en 0 (ya tienen su código impreso).
  const [pedidos, setPedidos] = useState<PedidoEtiquetas[]>(() =>
    productos.map((p) => ({
      producto: p,
      unidades: tieneCodigoFabricante(p) ? 0 : productos.length === 1 ? ETIQUETAS_POR_HOJA : 3,
      cajas: p.fraccionable?.codigoBarrasPaquete ? (productos.length === 1 ? 0 : 1) : 0,
    })),
  );
  const [conPrecio, setConPrecio] = useState(true);
  const [inicio, setInicio] = useState(1);

  const etiquetas = armarEtiquetas(pedidos);
  const hojas = repartirEnHojas(etiquetas, inicio);

  function cambiar(i: number, campo: "unidades" | "cajas", valor: string) {
    setPedidos((ps) => ps.map((p, k) => (k === i ? { ...p, [campo]: soloEntero(valor) } : p)));
  }

  return (
    <CapaImpresion>
      <div aria-hidden className="no-imprimir absolute inset-0 bg-navy-950/55" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Imprimir etiquetas"
        className="relative flex h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-lg"
      >
        {/* ─── Configuración ─── */}
        <div className="no-imprimir flex w-[380px] shrink-0 flex-col border-r border-gray-200">
          <div className="flex items-start justify-between gap-3 bg-grad-hero px-5 py-4 text-white">
            <div>
              <h2 className="flex items-center gap-2 text-h2 font-semibold">
                <Tags className="size-5 text-gold-500" /> Imprimir etiquetas
              </h2>
              <p className="text-small text-navy-300">Hoja carta de 30 etiquetas (3 × 10)</p>
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-xs text-navy-300 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-gray-200">
              {pedidos.map((ped, i) => {
                const p = ped.producto;
                const caja = p.fraccionable?.codigoBarrasPaquete;
                return (
                  <li key={p.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-body font-semibold text-ink-strong">
                          {p.nombre}
                        </p>
                        <p className="font-mono text-small text-ink-muted">{p.codigoBarras}</p>
                      </div>
                      {pedidos.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Quitar ${p.nombre}`}
                          onClick={() => setPedidos((ps) => ps.filter((_, k) => k !== i))}
                          className="flex size-7 shrink-0 items-center justify-center rounded-xs text-ink-muted hover:bg-gray-100"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                    {tieneCodigoFabricante(p) && (
                      <p className="mt-1 flex items-start gap-1 text-badge text-ink-muted">
                        <Info className="mt-px size-3 shrink-0" /> Trae código del fabricante: no
                        necesita etiqueta.
                      </p>
                    )}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="text-small text-ink">
                        Por unidad
                        <Input
                          aria-label={`Etiquetas por unidad de ${p.nombre}`}
                          inputMode="numeric"
                          value={String(ped.unidades)}
                          onChange={(e) => cambiar(i, "unidades", e.target.value)}
                          className="mt-1"
                        />
                      </label>
                      {caja ? (
                        <label className="text-small text-ink">
                          Por {nombrePaquete(p).toLowerCase()}
                          <Input
                            aria-label={`Etiquetas de ${nombrePaquete(p).toLowerCase()} de ${p.nombre}`}
                            inputMode="numeric"
                            value={String(ped.cajas)}
                            onChange={(e) => cambiar(i, "cajas", e.target.value)}
                            className="mt-1"
                          />
                        </label>
                      ) : (
                        p.fraccionable && (
                          <p className="self-end pb-1 text-badge text-ink-muted">
                            Sin código para {pluralPaquete(nombrePaquete(p)).toLowerCase()}: se
                            agrega en Editar.
                          </p>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="bg-gray-50 flex flex-col gap-3 border-t border-gray-200 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-body text-ink">Mostrar el precio</span>
              <Switch checked={conPrecio} onChange={setConPrecio} label={conPrecio ? "Sí" : "No"} />
            </div>
            <label className="flex items-center justify-between gap-3 text-body text-ink">
              <span>
                Empezar en la etiqueta
                <span className="block text-badge text-ink-muted">
                  Para usar una hoja que ya tiene etiquetas usadas
                </span>
              </span>
              <Input
                aria-label="Empezar en la etiqueta número"
                inputMode="numeric"
                value={String(inicio)}
                onChange={(e) =>
                  setInicio(Math.min(Math.max(soloEntero(e.target.value), 1), ETIQUETAS_POR_HOJA))
                }
                className="w-16 text-center"
              />
            </label>
            <p className="text-small text-ink-muted">
              <strong className="text-ink-strong">{etiquetas.length}</strong> etiquetas ·{" "}
              {hojas.length} {hojas.length === 1 ? "hoja" : "hojas"}. Al imprimir, elige papel Carta
              y escala 100%.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Cerrar
              </Button>
              <Button
                onClick={() => window.print()}
                disabled={etiquetas.length === 0}
                className="flex-1"
              >
                <Printer /> Imprimir
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Vista previa (es lo que se imprime) ─── */}
        <div className="flex-1 overflow-auto bg-gray-100 p-6">
          {etiquetas.length === 0 ? (
            <p className="no-imprimir mt-20 text-center text-body text-ink-muted">
              Escribe cuántas etiquetas quieres de cada producto.
            </p>
          ) : (
            <div className="zona-impresion hojas-etiquetas flex flex-col items-center gap-6">
              {hojas.map((hoja, h) => (
                <div
                  key={h}
                  className="hoja-etiquetas grid [zoom:0.62] bg-white shadow-md"
                  style={{
                    width: "215.9mm",
                    height: "279.4mm",
                    padding: "12.7mm 4.76mm",
                    gridTemplateColumns: "repeat(3, 66.675mm)",
                    gridAutoRows: "25.4mm",
                    columnGap: "3.175mm",
                  }}
                >
                  {hoja.map((e, k) =>
                    e ? (
                      <CeldaEtiqueta key={k} e={e} conPrecio={conPrecio} />
                    ) : (
                      <div
                        key={k}
                        className="rounded-[2mm] border border-dashed border-gray-200 print:border-0"
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CapaImpresion>
  );
}

function CeldaEtiqueta({ e, conPrecio }: { e: Etiqueta; conPrecio: boolean }) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-[2mm] border border-gray-200 text-black print:border-0"
      style={{ padding: "1.4mm 3mm 1mm" }}
    >
      <div className="flex items-baseline justify-between gap-[2mm]" style={{ fontSize: "7.5pt" }}>
        <span className="min-w-0 truncate font-semibold">{e.nombre}</span>
        {conPrecio && (
          <span className="shrink-0 font-bold tabular" style={{ fontSize: "9pt" }}>
            {formatQ(e.precio)}
          </span>
        )}
      </div>
      {e.detalle && (
        <span className="leading-none" style={{ fontSize: "6.5pt" }}>
          {e.detalle}
        </span>
      )}
      <CodigoBarras
        valor={e.codigo}
        className="mt-auto w-full"
        classBarras={e.detalle ? "h-[10.5mm]" : "h-[12.5mm]"}
        tamanoTexto="6.5pt"
      />
    </div>
  );
}
