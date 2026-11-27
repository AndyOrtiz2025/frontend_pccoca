"use client";

import { useMemo, useState } from "react";
import { Plus, Send, Wrench } from "lucide-react";
import { Button, Card, Chip, SearchInput } from "@/components/ui";
import { formatPrecio, formatQ } from "@/lib/format";
import { normalizar } from "@/lib/reglas/busqueda";
import type { ServicioTecnico } from "@/types/servicio";
import { IconoServicio } from "./IconoServicio";
import { ModalEntradaServicio } from "./ModalEntradaServicio";

/** Pantalla 10: catálogo de servicios técnicos de Oscar (solo consulta) + "Enviar entrada". */
export function CatalogoServicios({ servicios }: { servicios: ServicioTecnico[] }) {
  const [consulta, setConsulta] = useState("");
  const [modal, setModal] = useState<{ servicioId?: string } | null>(null);

  const visibles = useMemo(() => {
    const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
    return servicios.filter((s) => {
      const texto = normalizar(`${s.nombre} ${s.descripcion ?? ""}`);
      return palabras.every((p) => texto.includes(p));
    });
  }, [servicios, consulta]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchInput
          aria-label="Buscar servicio"
          placeholder="Buscar servicio"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          className="w-72"
        />
        <Button onClick={() => setModal({})}>
          <Plus /> Enviar entrada de servicio técnico
        </Button>
      </div>

      {visibles.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <Wrench className="size-8 text-gray-300" strokeWidth={1.5} />
          <p className="text-body text-ink-muted">No se encontraron servicios.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visibles.map((s) => (
            <article
              key={s.id}
              className="flex flex-col rounded-md border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold-100 text-navy-900">
                  <IconoServicio nombre={s.icono} className="size-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-body leading-snug font-semibold text-ink-strong">
                    {s.nombre}
                  </h3>
                  <p className="mt-1 text-small text-ink-muted">
                    {s.descripcion ?? "Oscar revisa el equipo y dice cuánto cobrar."}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModal({ servicioId: s.id })}
                  aria-label={`Enviar entrada: ${s.nombre}`}
                >
                  <Send /> Enviar entrada
                </Button>
                <PrecioServicio servicio={s} />
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && (
        <ModalEntradaServicio
          servicios={servicios}
          servicioInicialId={modal.servicioId}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/** Opciones con su precio, precio fijo o "Según revisión" si Oscar lo define al ver el equipo. */
function PrecioServicio({ servicio }: { servicio: ServicioTecnico }) {
  if (servicio.opciones?.length) {
    return (
      <ul className="text-right">
        {servicio.opciones.map((o) => (
          <li key={o.id} className="text-small text-ink-muted">
            {o.nombre}{" "}
            <span className="text-body font-semibold text-ink-strong tabular">
              {formatQ(o.precio)}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  if (servicio.precio.monto === null) return <Chip>Según revisión</Chip>;
  return (
    <p className="text-price font-semibold text-ink-strong tabular">
      {formatPrecio(servicio.precio)}
    </p>
  );
}
