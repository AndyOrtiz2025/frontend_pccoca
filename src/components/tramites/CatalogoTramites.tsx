"use client";

import { useMemo, useState } from "react";
import { FileSearch, Plus } from "lucide-react";
import { Button, Card, SearchInput, Tabs } from "@/components/ui";
import { normalizar } from "@/lib/reglas/busqueda";
import type { ModuloTramite, Tramite } from "@/types/tramite";
import { ModalEntradaTramite } from "./ModalEntradaTramite";
import { TarjetaTramite } from "./TarjetaTramite";

interface CatalogoTramitesProps {
  modulos: ModuloTramite[];
  tramites: Tramite[];
}

/** Pantalla 8: catálogo de trámites (solo consulta) + "Enviar entrada de trámite". */
export function CatalogoTramites({ modulos, tramites }: CatalogoTramitesProps) {
  const [modulo, setModulo] = useState(modulos[0]?.id ?? "");
  const [consulta, setConsulta] = useState("");
  const [modal, setModal] = useState<{ tramiteId?: string } | null>(null);

  const nombreModulo = useMemo(() => new Map(modulos.map((m) => [m.id, m.nombre])), [modulos]);
  const buscando = consulta.trim().length > 0;

  const visibles = useMemo(() => {
    if (!buscando) return tramites.filter((t) => t.moduloId === modulo);
    // Al buscar, se busca en todos los módulos: el empleado no siempre sabe a cuál pertenece.
    const palabras = normalizar(consulta).split(/\s+/);
    return tramites.filter((t) => {
      const texto = normalizar(
        `${t.nombre} ${nombreModulo.get(t.moduloId)} ${t.requisitos.join(" ")}`,
      );
      return palabras.every((p) => texto.includes(p));
    });
  }, [tramites, modulo, consulta, buscando, nombreModulo]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Tabs
          ariaLabel="Módulos de trámites"
          value={modulo}
          onChange={(m) => {
            setModulo(m);
            setConsulta("");
          }}
          items={modulos.map((m) => ({
            value: m.id,
            label: m.nombre,
            count: tramites.filter((t) => t.moduloId === m.id).length,
          }))}
          className="border-b-0"
        />
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            aria-label="Buscar trámite"
            placeholder="Buscar trámite"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => setModal({})}>
            <Plus /> Enviar entrada de trámite
          </Button>
        </div>
      </div>

      {buscando && (
        <p className="text-small text-ink-muted">
          {visibles.length} resultado{visibles.length === 1 ? "" : "s"} en todos los módulos
        </p>
      )}

      {visibles.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <FileSearch className="size-8 text-gray-300" strokeWidth={1.5} />
          <p className="text-body text-ink-muted">No se encontraron trámites.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visibles.map((t) => (
            <TarjetaTramite
              key={t.id}
              tramite={t}
              modulo={nombreModulo.get(t.moduloId) ?? ""}
              onEnviarEntrada={() => setModal({ tramiteId: t.id })}
            />
          ))}
        </div>
      )}

      {modal && (
        <ModalEntradaTramite
          modulos={modulos}
          tramites={tramites}
          tramiteInicial={modal.tramiteId}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
