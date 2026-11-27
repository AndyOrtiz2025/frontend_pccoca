"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, PackageMinus } from "lucide-react";
import { Button, Field, Input, Modal, SegmentedControl, Textarea, useToast } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { cn } from "@/lib/cn";
import { nombrePaquete, pluralPaquete } from "@/lib/presentacion";
import { ErrorApi, postApi } from "@/lib/http";
import { describirStock } from "@/lib/reglas/productos";
import type { Presentacion, Producto } from "@/types/producto";

const MOTIVOS = ["Dañado", "Vencido", "Humedad", "Roto", "Defectuoso de fábrica"];

/** Registrar merma desde inventario (sección 11.7): descuenta stock, motivo obligatorio. */
export function ModalMerma({ producto: p, onClose }: { producto: Producto; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [presentacion, setPresentacion] = useState<Presentacion>("unidad");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [errores, setErrores] = useState<{ cantidad?: string; motivo?: string; general?: string }>(
    {},
  );
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const n = Number(cantidad);
    const nuevos: typeof errores = {};
    if (!Number.isInteger(n) || n <= 0) nuevos.cantidad = "Escribe una cantidad entera";
    if (motivo.trim().length < 3) nuevos.motivo = "Escribe o elige el motivo";
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    setGuardando(true);
    try {
      await postApi(`/api/productos/${encodeURIComponent(p.id)}/merma`, {
        presentacion,
        cantidad: n,
        motivo,
      });
      toast(`Merma registrada: ${n} de ${p.nombre}`, "success");
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
      title="Registrar merma"
      subtitle={`${p.nombre} · Hay ${describirStock(p)}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-merma" variant="danger" disabled={guardando}>
            {guardando ? <LoaderCircle className="animate-spin" /> : <PackageMinus />}
            Descontar del stock
          </Button>
        </>
      }
    >
      <form id="form-merma" onSubmit={guardar} noValidate className="flex flex-col gap-4">
        {p.fraccionable && (
          <SegmentedControl
            ariaLabel="Qué se perdió"
            options={[
              { value: "unidad", label: "Unidades sueltas" },
              {
                value: "paquete",
                label: `${pluralPaquete(nombrePaquete(p))} (${p.fraccionable.unidadesPorPaquete} u.)`,
              },
            ]}
            value={presentacion}
            onChange={setPresentacion}
          />
        )}
        <Field label="Cantidad" error={errores.cantidad} className="w-40">
          {(id, desc) => (
            <Input
              id={id}
              aria-describedby={desc}
              inputMode="numeric"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ""))}
            />
          )}
        </Field>
        <div>
          <p className="mb-1.5 text-small font-medium text-ink">Motivo</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {MOTIVOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotivo(m)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-small transition-colors",
                  motivo === m
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-gray-300 text-ink hover:border-navy-900",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <Field label="Detalle del motivo" error={errores.motivo}>
            {(id, desc) => (
              <Textarea
                id={id}
                aria-describedby={desc}
                rows={2}
                maxLength={200}
                placeholder="Ej. se mojaron con la gotera de la bodega"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            )}
          </Field>
        </div>
        {errores.general && (
          <p role="alert" className="text-small text-stock-out">
            {errores.general}
          </p>
        )}
      </form>
    </Modal>
  );
}
