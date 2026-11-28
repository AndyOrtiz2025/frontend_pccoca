"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, LoaderCircle, TrendingDown, TrendingUp } from "lucide-react";
import { Button, Input, useToast } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { cn } from "@/lib/cn";
import { formatQ } from "@/lib/format";
import { ErrorApi, postApi } from "@/lib/http";
import { nombrePaquete } from "@/lib/presentacion";
import type { AvisoCosto } from "@/lib/reglas/compras";
import { calcularMargen } from "@/lib/reglas/precios";

const soloDinero = (v: string) => v.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");

/**
 * "Cambió el costo": por cada producto, cuánto se gana con el precio actual y un campo para
 * poner el precio nuevo ahí mismo (sin ir a Editar producto). Si no se toca, el precio se queda.
 */
export function AvisosCosto({
  avisos,
  paquetes,
}: {
  avisos: AvisoCosto[];
  /** Nombre del paquete de cada producto ("Caja", "Bolsa"…), por id. */
  paquetes: Map<string, string | undefined>;
}) {
  if (avisos.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-small font-semibold text-ink-muted">Cambió el costo</p>
      <ul className="flex flex-col gap-2">
        {avisos.map((a) => (
          <FilaAviso
            key={`${a.productoId}-${a.presentacion}`}
            a={a}
            paquete={paquetes.get(a.productoId)}
          />
        ))}
      </ul>
    </div>
  );
}

function FilaAviso({ a, paquete }: { a: AvisoCosto; paquete?: string }) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [precio, setPrecio] = useState(String(a.precio));
  const [guardado, setGuardado] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();

  const en =
    a.presentacion === "paquete"
      ? `por ${nombrePaquete({ fraccionable: { nombrePaquete: paquete } }).toLowerCase()}`
      : "por unidad";
  const subio = a.ahora > a.antes;
  const valor = Number(precio);
  const valido = precio.trim() !== "" && Number.isFinite(valor) && valor > 0;
  const actual = guardado ?? a.precio;
  const m = valido ? calcularMargen(valor, a.ahora) : null;

  async function actualizar() {
    if (!valido || valor === actual) return;
    setGuardando(true);
    setError(undefined);
    try {
      await postApi(`/api/productos/${encodeURIComponent(a.productoId)}/precio`, {
        presentacion: a.presentacion,
        precio: valor,
      });
      setGuardado(valor);
      toast(`${a.nombre}: ahora se vende a ${formatQ(valor)} ${en}`, "success");
      router.refresh();
    } catch (e) {
      if (e instanceof ErrorApi && (e.status === 400 || e.status === 409)) setError(e.message);
      else manejarError(e);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <li
      className={cn(
        "rounded-md border px-3 py-2",
        m && m.ganancia < 0 ? "border-stock-out/40 bg-stock-out-bg" : "border-gray-200",
      )}
    >
      <p className="flex items-center gap-1.5 font-semibold text-ink-strong">
        {subio ? (
          <TrendingUp className="size-4 text-stock-out" />
        ) : (
          <TrendingDown className="size-4 text-stock-ok" />
        )}
        {a.nombre}
      </p>
      <p className="text-small text-ink">
        El costo {en} {subio ? "subió" : "bajó"} de {formatQ(a.antes)} a {formatQ(a.ahora)}. Hoy se
        vende a <strong className="tabular">{formatQ(actual)}</strong>.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label htmlFor={`precio-${a.productoId}-${a.presentacion}`} className="text-small text-ink">
          Nuevo precio {en}
        </label>
        <div className="relative w-28">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-small text-ink-muted">
            Q
          </span>
          <Input
            id={`precio-${a.productoId}-${a.presentacion}`}
            inputMode="decimal"
            value={precio}
            invalid={!!error}
            onChange={(e) => {
              setPrecio(soloDinero(e.target.value));
              setError(undefined);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                actualizar();
              }
            }}
            className="h-8 pl-6 tabular"
          />
        </div>
        <Button
          size="sm"
          variant={valido && valor !== actual ? "primary" : "secondary"}
          disabled={!valido || valor === actual || guardando}
          onClick={actualizar}
        >
          {guardando && <LoaderCircle className="animate-spin" />}
          Actualizar precio
        </Button>
        {m && (
          <span
            className={cn(
              "text-small font-semibold tabular",
              m.ganancia < 0 ? "text-stock-out-text" : "text-stock-ok-text",
            )}
          >
            {m.ganancia < 0
              ? `Pierdes ${formatQ(-m.ganancia)} por cada una`
              : `Ganas ${formatQ(m.ganancia)} (${m.porcentaje}%)`}
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-small text-stock-out">
          {error}
        </p>
      )}
      {guardado !== null && (
        <p className="mt-1 flex items-center gap-1 text-small text-stock-ok-text">
          <CircleCheck className="size-3.5" /> Precio actualizado a {formatQ(guardado)}
        </p>
      )}
    </li>
  );
}
