"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, Layers, Pencil, Plus, Power, RotateCcw } from "lucide-react";
import { Button, Card, Checkbox, Chip, SearchInput, Tabs, useToast } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { cn } from "@/lib/cn";
import { formatFecha } from "@/lib/fechas";
import { formatPrecio } from "@/lib/format";
import { postApi } from "@/lib/http";
import { normalizar } from "@/lib/reglas/busqueda";
import { requisitosFrecuentes } from "@/lib/reglas/tramites";
import type { TramiteAdmin } from "@/lib/api";
import { tramiteActivo, type ModuloTramite } from "@/types/tramite";
import { ModalModulos } from "./ModalModulos";
import { ModalTramite } from "./ModalTramite";

/** Pantalla 20: catálogo de trámites con edición (solo Paola). */
export function CatalogoTramitesAdmin({
  modulos,
  tramites,
}: {
  modulos: ModuloTramite[];
  tramites: TramiteAdmin[];
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [modulo, setModulo] = useState(modulos[0]?.id ?? "");
  const [consulta, setConsulta] = useState("");
  const [sinPrecio, setSinPrecio] = useState(false);
  const [verDesactivados, setVerDesactivados] = useState(false);
  const [editando, setEditando] = useState<TramiteAdmin | null | "nuevo">(null);
  const [viendoModulos, setViendoModulos] = useState(false);

  // Si se eliminó el módulo que estaba abierto, se abre el primero.
  const moduloActual = modulos.some((m) => m.id === modulo) ? modulo : (modulos[0]?.id ?? "");
  const nombreModulo = new Map(modulos.map((m) => [m.id, m.nombre]));
  const cuantos = new Map(
    modulos.map((m) => [m.id, tramites.filter((t) => t.moduloId === m.id).length]),
  );
  const pendientes = tramites.filter((t) => tramiteActivo(t) && t.precio.monto === null);
  const desactivados = tramites.filter((t) => !tramiteActivo(t)).length;
  const buscando = consulta.trim().length > 0;
  const palabras = normalizar(consulta).split(/\s+/);
  // Buscando o con "Sin precio" se ve todo el catálogo; si no, el módulo de la pestaña.
  const visibles = tramites
    .filter((t) => verDesactivados || tramiteActivo(t))
    .filter((t) => (sinPrecio ? t.precio.monto === null : true))
    .filter((t) => (buscando || sinPrecio ? true : t.moduloId === moduloActual))
    .filter((t) => {
      if (!buscando) return true;
      const texto = normalizar(
        `${t.nombre} ${nombreModulo.get(t.moduloId)} ${t.requisitos.join(" ")}`,
      );
      return palabras.every((p) => texto.includes(p));
    });

  async function cambiarActivo(t: TramiteAdmin, activo: boolean) {
    try {
      await postApi(`/api/tramites/${encodeURIComponent(t.id)}/activo`, { activo });
      toast(
        activo ? `${t.nombre} está activo de nuevo` : `${t.nombre} ya no les sale a los empleados`,
        "success",
      );
      router.refresh();
    } catch (e) {
      manejarError(e);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-ink-muted">
          Lo que cambies aquí lo ven los empleados al momento en su catálogo.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setViendoModulos(true)}>
            <Layers /> Módulos
          </Button>
          <Button onClick={() => setEditando("nuevo")}>
            <Plus /> Nuevo trámite
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <Tabs
          ariaLabel="Módulos de trámites"
          value={moduloActual}
          onChange={(m) => {
            setModulo(m);
            setConsulta("");
            setSinPrecio(false);
          }}
          items={modulos.map((m) => ({
            value: m.id,
            label: m.nombre,
            count: tramites.filter((t) => t.moduloId === m.id && tramiteActivo(t)).length,
          }))}
          className="border-b-0"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-pressed={sinPrecio}
            onClick={() => setSinPrecio((v) => !v)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-small font-medium transition-colors",
              sinPrecio
                ? "border-gold-500 bg-gold-100 text-gold-text"
                : "hover:bg-gray-50 border-gray-300 bg-white text-ink",
            )}
          >
            Sin precio
            <span className="rounded-full bg-white/70 px-1.5 tabular">{pendientes.length}</span>
          </button>
          {desactivados > 0 && (
            <Checkbox
              checked={verDesactivados}
              onChange={setVerDesactivados}
              label={`Ver desactivados (${desactivados})`}
            />
          )}
          <SearchInput
            aria-label="Buscar trámite"
            placeholder="Buscar trámite"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            className="w-56"
          />
        </div>
      </div>

      {(buscando || sinPrecio) && (
        <p className="text-small text-ink-muted">
          {visibles.length} {visibles.length === 1 ? "trámite" : "trámites"} en todos los módulos
          {sinPrecio && " sin precio definido"}
        </p>
      )}

      {visibles.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <FileSearch className="size-8 text-gray-300" strokeWidth={1.5} />
          <p className="text-body text-ink-muted">
            {sinPrecio ? "Todos los trámites tienen precio." : "No hay trámites aquí todavía."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visibles.map((t) => {
            const activo = tramiteActivo(t);
            const ultimo = t.cambios[0];
            return (
              <article
                key={t.id}
                className={cn(
                  "flex flex-col rounded-md border border-t-[3px] border-gray-200 bg-white p-4 shadow-sm",
                  activo ? "border-t-navy-900" : "bg-gray-50 border-t-gray-300",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={cn(
                      "text-body leading-snug font-semibold",
                      activo ? "text-ink-strong" : "text-ink-muted",
                    )}
                  >
                    {t.nombre}
                  </h3>
                  <div className="flex shrink-0 gap-1">
                    {!activo && <Chip>Desactivado</Chip>}
                    <Chip tono="bg-st-recibido-bg text-navy-900">
                      {nombreModulo.get(t.moduloId)}
                    </Chip>
                  </div>
                </div>
                {t.requisitos.length > 0 ? (
                  <ul className="mt-3 flex list-disc flex-col gap-1 pl-4 text-small text-ink marker:text-navy-300">
                    {t.requisitos.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-small text-ink-muted">Sin requisitos registrados.</p>
                )}
                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Editar ${t.nombre}`}
                      onClick={() => setEditando(t)}
                    >
                      <Pencil /> Editar
                    </Button>
                    {activo ? (
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Desactivar ${t.nombre}`}
                        onClick={() => cambiarActivo(t, false)}
                      >
                        <Power /> Desactivar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Reactivar ${t.nombre}`}
                        onClick={() => cambiarActivo(t, true)}
                      >
                        <RotateCcw /> Reactivar
                      </Button>
                    )}
                  </div>
                  <div className="text-right">
                    {t.precio.monto === null ? (
                      <Chip tono="bg-gold-100 text-gold-text">Por confirmar</Chip>
                    ) : (
                      <p className="text-price font-semibold text-ink-strong tabular">
                        {formatPrecio(t.precio)}
                      </p>
                    )}
                    {t.precio.nota && (
                      <p className="mt-0.5 max-w-52 text-badge text-ink-muted">{t.precio.nota}</p>
                    )}
                    {ultimo && (
                      <p className="mt-0.5 text-badge text-ink-muted">
                        Antes {formatPrecio(ultimo.antes)} · {formatFecha(ultimo.fecha)}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editando && (
        <ModalTramite
          tramite={editando === "nuevo" ? null : editando}
          modulos={modulos}
          moduloInicial={moduloActual}
          sugeridos={requisitosFrecuentes(tramites)}
          onClose={() => setEditando(null)}
        />
      )}
      {viendoModulos && (
        <ModalModulos modulos={modulos} cuantos={cuantos} onClose={() => setViendoModulos(false)} />
      )}
    </div>
  );
}
