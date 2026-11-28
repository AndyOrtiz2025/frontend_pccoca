"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { Button, Field, Input, Modal, Textarea, useToast } from "@/components/ui";
import { useVenta } from "@/components/venta/VentaContext";
import { useErrorApi } from "@/hooks/useErrorApi";
import { formatQ } from "@/lib/format";
import { ErrorApi, pedirApi } from "@/lib/http";
import { centavos } from "@/lib/reglas/dinero";
import { calcularPrecio } from "@/lib/reglas/precios";
import { editarCargoSchema } from "@/schemas/pendiente.schema";
import type { Cargo, CuentaPendiente } from "@/types/pendiente";

type Campo = "descripcion" | "precioUnitario" | "cantidad" | "llevadoPor" | "nota" | "general";

const soloEntero = (v: string) => v.replace(/\D/g, "").slice(0, 5);
const soloDinero = (v: string) => v.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");

/**
 * Corregir un cargo que todavía no se pagó (ej. algo mal escrito). Si es de un producto, se puede
 * cambiar la cantidad (el stock se ajusta solo); el producto no cambia.
 */
export function ModalEditarCargo({
  cuenta,
  cargo,
  onClose,
}: {
  cuenta: CuentaPendiente;
  cargo: Cargo;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const { productos } = useVenta();
  const esOrg = cuenta.grupo === "organizacion";
  const esProducto = Boolean(cargo.productoId);
  const producto = esProducto ? productos.find((p) => p.id === cargo.productoId) : undefined;

  const [descripcion, setDescripcion] = useState(cargo.descripcion);
  const [precio, setPrecio] = useState(String(cargo.precioUnitario));
  const [cantidad, setCantidad] = useState(String(cargo.cantidad));
  const [llevadoPor, setLlevadoPor] = useState(cargo.llevadoPor ?? "");
  const [nota, setNota] = useState(cargo.nota ?? "");
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [guardando, setGuardando] = useState(false);

  const n = parseInt(cantidad, 10) || 0;
  const unitario = esProducto
    ? n === cargo.cantidad || !producto
      ? cargo.precioUnitario
      : calcularPrecio(producto, "unidad", n).unitario
    : Number(precio) || 0;
  const total = centavos(unitario * n);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const datos = esProducto
      ? { tipo: "producto", cantidad: n, llevadoPor, nota }
      : {
          tipo: "libre",
          descripcion,
          precioUnitario: precio.trim() === "" ? NaN : Number(precio),
          cantidad: n,
          llevadoPor,
          nota,
        };
    const r = editarCargoSchema.safeParse(datos);
    if (!r.success) {
      const nuevos: Partial<Record<Campo, string>> = {};
      for (const i of r.error.issues) nuevos[(i.path[0] as Campo) ?? "general"] ??= i.message;
      return setErrores(nuevos);
    }
    setGuardando(true);
    try {
      await pedirApi(
        "PATCH",
        `/api/cuentas/${encodeURIComponent(cuenta.id)}/cargos/${encodeURIComponent(cargo.id)}`,
        r.data,
      );
      toast("Cargo corregido", "success");
      onClose();
      router.refresh();
    } catch (err) {
      if (err instanceof ErrorApi && (err.status === 400 || err.status === 409)) {
        setErrores({ general: err.message });
      } else manejarError(err);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar cargo"
      subtitle={`${cuenta.nombre} · registró ${cargo.registradoPor}`}
      footer={
        <>
          {errores.general && (
            <p role="alert" className="mr-auto text-small text-stock-out">
              {errores.general}
            </p>
          )}
          <span className="mr-auto text-body text-ink-muted">
            Total: <strong className="text-ink-strong tabular">{formatQ(total)}</strong>
          </span>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-editar-cargo" disabled={guardando}>
            {guardando ? <LoaderCircle className="animate-spin" /> : <Save />}
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id="form-editar-cargo" onSubmit={guardar} noValidate className="flex flex-col gap-4">
        {esProducto ? (
          <div className="rounded-md bg-gray-100 px-3 py-2">
            <p className="font-medium text-ink-strong">{cargo.descripcion}</p>
            <p className="text-small text-ink-muted">
              Producto del inventario: si cambias la cantidad, el stock se ajusta solo.
            </p>
          </div>
        ) : (
          <>
            <Field label="Descripción" error={errores.descripcion}>
              {(id, d) => (
                <Textarea
                  id={id}
                  aria-describedby={d}
                  rows={2}
                  maxLength={150}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              )}
            </Field>
            <Field label="Precio unitario (Q)" error={errores.precioUnitario}>
              {(id, d) => (
                <Input
                  id={id}
                  aria-describedby={d}
                  inputMode="decimal"
                  value={precio}
                  onChange={(e) => setPrecio(soloDinero(e.target.value))}
                  className="w-40"
                />
              )}
            </Field>
          </>
        )}
        <Field label="Cantidad" error={errores.cantidad} className="w-32">
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              inputMode="numeric"
              value={cantidad}
              onChange={(e) => setCantidad(soloEntero(e.target.value))}
            />
          )}
        </Field>
        {esOrg && (
          <Field label="¿Quién se lo llevó?" error={errores.llevadoPor}>
            {(id, d) => (
              <Input
                id={id}
                aria-describedby={d}
                maxLength={100}
                value={llevadoPor}
                onChange={(e) => setLlevadoPor(e.target.value)}
              />
            )}
          </Field>
        )}
        <Field label="Nota (opcional)" error={errores.nota}>
          {(id, d) => (
            <Textarea
              id={id}
              aria-describedby={d}
              rows={2}
              maxLength={500}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
