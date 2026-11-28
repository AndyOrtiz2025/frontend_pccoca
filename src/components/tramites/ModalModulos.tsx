"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button, Input, Modal, useToast } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { ErrorApi, pedirApi } from "@/lib/http";
import type { ModuloTramite } from "@/types/tramite";

/**
 * Módulos del catálogo (las pestañas): agregar, cambiar el nombre, cambiar el orden y eliminar
 * (solo si ya no tienen trámites).
 */
export function ModalModulos({
  modulos,
  cuantos,
  onClose,
}: {
  modulos: ModuloTramite[];
  /** Trámites (activos y desactivados) por módulo. */
  cuantos: Map<string, number>;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [nuevo, setNuevo] = useState("");
  const [editando, setEditando] = useState<{ id: string; nombre: string } | null>(null);
  const [error, setError] = useState<string>();
  const [trabajando, setTrabajando] = useState(false);

  async function llamar(accion: () => Promise<unknown>, exito?: string) {
    setTrabajando(true);
    setError(undefined);
    try {
      await accion();
      if (exito) toast(exito, "success");
      router.refresh();
      return true;
    } catch (e) {
      if (e instanceof ErrorApi && (e.status === 400 || e.status === 409)) setError(e.message);
      else manejarError(e);
      return false;
    } finally {
      setTrabajando(false);
    }
  }

  async function agregar() {
    const nombre = nuevo.trim();
    if (nombre.length < 2) return setError("Escribe el nombre del módulo");
    if (
      await llamar(
        () => pedirApi("POST", "/api/tramites/modulos", { nombre }),
        `Módulo ${nombre} agregado`,
      )
    ) {
      setNuevo("");
    }
  }

  async function renombrar() {
    if (!editando) return;
    const nombre = editando.nombre.trim();
    if (nombre.length < 2) return setError("Escribe el nombre del módulo");
    const ok = await llamar(
      () =>
        pedirApi("PATCH", `/api/tramites/modulos/${encodeURIComponent(editando.id)}`, { nombre }),
      "Nombre cambiado",
    );
    if (ok) setEditando(null);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Módulos"
      subtitle="Las pestañas del catálogo de trámites"
      footer={<Button onClick={onClose}>Listo</Button>}
    >
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col divide-y divide-gray-200 rounded-md border border-gray-200">
          {modulos.map((m, i) => {
            const n = cuantos.get(m.id) ?? 0;
            const esEste = editando?.id === m.id;
            return (
              <li key={m.id} className="flex items-center gap-2 px-3 py-2">
                {esEste ? (
                  <Input
                    aria-label={`Nuevo nombre de ${m.nombre}`}
                    autoFocus
                    maxLength={30}
                    value={editando.nombre}
                    onChange={(e) => setEditando({ id: m.id, nombre: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        renombrar();
                      }
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        setEditando(null);
                      }
                    }}
                    className="h-8 flex-1"
                  />
                ) : (
                  <span className="flex-1">
                    <span className="font-medium text-ink-strong">{m.nombre}</span>
                    <span className="ml-2 text-small text-ink-muted">
                      {n} {n === 1 ? "trámite" : "trámites"}
                    </span>
                  </span>
                )}
                {esEste ? (
                  <>
                    <Button
                      variant="icon"
                      size="sm"
                      aria-label="Guardar nombre"
                      onClick={renombrar}
                    >
                      <Check />
                    </Button>
                    <Button
                      variant="icon"
                      size="sm"
                      aria-label="Cancelar"
                      onClick={() => setEditando(null)}
                    >
                      <X />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="icon"
                      size="sm"
                      aria-label={`Subir ${m.nombre}`}
                      disabled={i === 0 || trabajando}
                      onClick={() =>
                        llamar(() =>
                          pedirApi("PATCH", `/api/tramites/modulos/${encodeURIComponent(m.id)}`, {
                            mover: "izquierda",
                          }),
                        )
                      }
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="icon"
                      size="sm"
                      aria-label={`Bajar ${m.nombre}`}
                      disabled={i === modulos.length - 1 || trabajando}
                      onClick={() =>
                        llamar(() =>
                          pedirApi("PATCH", `/api/tramites/modulos/${encodeURIComponent(m.id)}`, {
                            mover: "derecha",
                          }),
                        )
                      }
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="icon"
                      size="sm"
                      aria-label={`Cambiar nombre de ${m.nombre}`}
                      onClick={() => setEditando({ id: m.id, nombre: m.nombre })}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="icon"
                      size="sm"
                      aria-label={`Eliminar ${m.nombre}`}
                      title={
                        n > 0 ? "Pasa sus trámites a otro módulo para poder eliminarlo" : undefined
                      }
                      disabled={n > 0 || trabajando}
                      onClick={() =>
                        llamar(
                          () =>
                            pedirApi("DELETE", `/api/tramites/modulos/${encodeURIComponent(m.id)}`),
                          `Módulo ${m.nombre} eliminado`,
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-small text-ink-muted">
          Un módulo con trámites no se puede eliminar: primero pasa sus trámites a otro módulo.
        </p>
        <div className="flex gap-2">
          <Input
            aria-label="Nombre del nuevo módulo"
            maxLength={30}
            placeholder="Nuevo módulo. Ej. MINTRAB"
            value={nuevo}
            onChange={(e) => {
              setNuevo(e.target.value);
              setError(undefined);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregar();
              }
            }}
          />
          <Button variant="outline" onClick={agregar} disabled={trabajando}>
            <Plus /> Agregar
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-small text-stock-out">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
