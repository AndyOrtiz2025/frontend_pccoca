"use client";

import { useState } from "react";
import { Boxes, LoaderCircle, Minus, Plus } from "lucide-react";
import { Alert, Button, Field, Input, Modal, SegmentedControl, StockChip } from "@/components/ui";
import { formatQ } from "@/lib/format";
import { presentacionesPermitidas, tiposPermitidos, validarLinea } from "@/lib/reglas/carrito";
import { centavos } from "@/lib/reglas/dinero";
import { admiteMayoreo, calcularPrecio } from "@/lib/reglas/precios";
import { ETIQUETA_MOVIMIENTO, type TipoMovimiento } from "@/types/movimiento";
import type { Presentacion, ProductoVenta } from "@/types/producto";
import { ImagenProducto } from "./ImagenProducto";
import { useVenta } from "./VentaContext";

/** Pantalla 6: elegir tipo de movimiento, presentación y cantidad antes de agregar al carrito. */
export function ModalAgregar({
  producto,
  onClose,
}: {
  producto: ProductoVenta;
  onClose: () => void;
}) {
  const { agregar, abrirPaquete } = useVenta();
  const tipos = tiposPermitidos(producto);
  const presentaciones = presentacionesPermitidas(producto);
  const d = producto.disponibilidad;

  const [tipo, setTipo] = useState<TipoMovimiento>("venta");
  const [presentacion, setPresentacion] = useState<Presentacion>(
    producto.fraccionable && d.sinSueltas && !d.sinPaquetes ? "paquete" : "unidad",
  );
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState(false);

  const precio = calcularPrecio(producto, presentacion, cantidad);
  const total = centavos(precio.unitario * cantidad);
  const m = producto.mayoreo;
  const muestraMayoreo = presentacion === "unidad" && m && admiteMayoreo(producto);

  const sinStockPresentacion = producto.fraccionable
    ? presentacion === "unidad"
      ? d.sinSueltas
      : d.sinPaquetes
    : d.agotado;

  function confirmar() {
    const linea = {
      productoId: producto.id,
      tipo,
      presentacion,
      cantidad,
      motivo: motivo.trim() || undefined,
    };
    const msg = validarLinea(linea, producto);
    if (msg) return setError(msg);
    agregar(linea);
    onClose();
  }

  async function abrir() {
    setAbriendo(true);
    await abrirPaquete(producto.id);
    setAbriendo(false);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Agregar al carrito"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={sinStockPresentacion}>
            Agregar al carrito
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <ImagenProducto
            categoria={producto.categoria}
            nombre={producto.nombre}
            imagenUrl={producto.imagenUrl}
            className="size-14 shrink-0 rounded-md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold text-ink-strong">{producto.nombre}</p>
            <p className="text-small text-ink-muted tabular">{producto.codigo}</p>
          </div>
          <StockChip nivel={d.nivel} disponible={d.agotado ? 0 : 1} />
        </div>

        {tipos.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-ink">Tipo de movimiento</span>
            <SegmentedControl
              ariaLabel="Tipo de movimiento"
              value={tipo}
              onChange={(v) => {
                setTipo(v);
                setError(null);
              }}
              options={tipos.map((t) => ({ value: t, label: ETIQUETA_MOVIMIENTO[t] }))}
              className="w-full"
            />
            {tipo !== "venta" && (
              <p className="text-small text-ink-muted">
                {tipo === "consumo_interno"
                  ? "El negocio usa este insumo: descuenta del stock pero no es una venta."
                  : "Producto dañado o vencido: descuenta del stock, no es venta ni gasto."}
              </p>
            )}
          </div>
        )}

        {presentaciones.length > 1 && producto.fraccionable && (
          <div className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-ink">Presentación</span>
            <SegmentedControl
              ariaLabel="Presentación"
              value={presentacion}
              onChange={setPresentacion}
              options={[
                { value: "unidad", label: "Por unidad" },
                {
                  value: "paquete",
                  label: `Por paquete (${producto.fraccionable.unidadesPorPaquete} u.)`,
                },
              ]}
              className="w-full"
            />
            <p className="text-small text-ink-muted tabular">
              {formatQ(producto.precio)} por unidad · {formatQ(producto.fraccionable.precioPaquete)}{" "}
              por paquete
            </p>
          </div>
        )}

        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span id="cantidad-label" className="text-small font-medium text-ink">
              Cantidad
            </span>
            <div
              className="flex items-center gap-1.5"
              role="group"
              aria-labelledby="cantidad-label"
            >
              <Button
                variant="icon"
                aria-label="Menos"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              >
                <Minus />
              </Button>
              <Input
                aria-labelledby="cantidad-label"
                inputMode="numeric"
                value={cantidad}
                onChange={(e) => {
                  const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                  setCantidad(Number.isNaN(n) ? 1 : Math.min(n, 10_000));
                }}
                className="w-16 text-center tabular"
              />
              <Button
                variant="icon"
                aria-label="Más"
                onClick={() => setCantidad((c) => Math.min(c + 1, 10_000))}
              >
                <Plus />
              </Button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-small text-ink-muted">
              {tipo === "venta" ? "Total" : "No suma a la venta"}
            </p>
            <p className="text-kpi font-semibold text-ink-strong tabular">
              {tipo === "venta" ? formatQ(total) : formatQ(0)}
            </p>
          </div>
        </div>

        {muestraMayoreo && tipo === "venta" && (
          <Alert tone="info">
            {precio.mayoreo
              ? `Mayoreo: el precio cambió de ${formatQ(precio.normal)} a ${formatQ(precio.unitario)} por unidad.`
              : `Desde ${m.desde} unidades, el precio baja de ${formatQ(producto.precio)} a ${formatQ(m.precio)}.`}
          </Alert>
        )}

        {producto.fraccionable && presentacion === "unidad" && d.sinSueltas && (
          <Alert
            tone="warning"
            action={
              !d.sinPaquetes && (
                <Button size="sm" variant="secondary" onClick={abrir} disabled={abriendo}>
                  {abriendo ? <LoaderCircle className="animate-spin" /> : <Boxes />}
                  Abrir nuevo paquete
                </Button>
              )
            }
          >
            {d.sinPaquetes
              ? "Se agotaron las unidades y los paquetes."
              : "No quedan unidades sueltas."}
          </Alert>
        )}
        {producto.fraccionable && presentacion === "unidad" && !d.sinSueltas && !d.sinPaquetes && (
          <p className="flex items-center justify-between gap-3 text-small text-ink-muted">
            ¿No alcanzan las unidades sueltas?
            <Button size="sm" variant="outline" onClick={abrir} disabled={abriendo}>
              {abriendo ? <LoaderCircle className="animate-spin" /> : <Boxes />}
              Abrir nuevo paquete
            </Button>
          </p>
        )}
        {producto.fraccionable && presentacion === "paquete" && d.sinPaquetes && (
          <Alert tone="warning">No quedan paquetes cerrados.</Alert>
        )}
        {!producto.fraccionable && d.agotado && (
          <Alert tone="warning">Este producto está agotado.</Alert>
        )}

        {tipo !== "venta" && (
          <Field
            label={tipo === "merma" ? "Motivo de la merma" : "Motivo (opcional)"}
            error={error && tipo === "merma" ? error : undefined}
          >
            {(id, desc) => (
              <Input
                id={id}
                value={motivo}
                maxLength={200}
                placeholder={
                  tipo === "merma"
                    ? "Ej. dañado, vencido, roto, humedad"
                    : "Ej. para imprimir en el cíber"
                }
                onChange={(e) => setMotivo(e.target.value)}
                invalid={!!error && tipo === "merma"}
                aria-describedby={desc}
              />
            )}
          </Field>
        )}
        {error && tipo === "venta" && <Alert tone="danger">{error}</Alert>}
      </div>
    </Modal>
  );
}
