"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Combine, LoaderCircle, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { Button, Confirmar, Input, Modal, Select, useToast } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { ErrorApi, postApi } from "@/lib/http";
import type { Subcategoria } from "@/lib/api";
import { ETIQUETA_CATEGORIA, type Categoria } from "@/types/producto";

type Edicion =
  | { tipo: "renombrar"; de: string; valor: string }
  | { tipo: "unir"; de: string; destino: string }
  | null;

/**
 * Administrar subcategorías: ver cuántos productos tiene cada una, crear (aunque no tenga
 * productos todavía), renombrar, unir dos que se escribieron diferente y eliminar las vacías.
 */
export function ModalSubcategorias({
  categoria,
  subcategorias,
  onClose,
}: {
  categoria: Categoria;
  subcategorias: Subcategoria[];
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [nueva, setNueva] = useState("");
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [aUnir, setAUnir] = useState<{ de: Subcategoria; destino: string } | null>(null);
  const [error, setError] = useState<string>();
  const [ocupado, setOcupado] = useState(false);

  async function enviar(cuerpo: object, exito: string) {
    setOcupado(true);
    setError(undefined);
    try {
      await postApi("/api/subcategorias", { categoria, ...cuerpo });
      toast(exito, "success");
      router.refresh();
      return true;
    } catch (e) {
      if (e instanceof ErrorApi && (e.status === 400 || e.status === 409)) setError(e.message);
      else manejarError(e);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function crear(e: FormEvent) {
    e.preventDefault();
    if (nueva.trim().length < 2) return setError("Escribe el nombre de la subcategoría");
    if (await enviar({ accion: "crear", nombre: nueva }, `Subcategoría "${nueva.trim()}" creada`)) {
      setNueva("");
    }
  }

  async function guardarNombre() {
    if (edicion?.tipo !== "renombrar") return;
    const nombre = edicion.valor.trim();
    if (nombre === edicion.de) return setEdicion(null);
    const ok = await enviar(
      { accion: "renombrar", de: edicion.de, a: nombre },
      `"${edicion.de}" ahora se llama "${nombre}"`,
    );
    if (ok) setEdicion(null);
  }

  async function unir() {
    if (!aUnir) return;
    const ok = await enviar(
      { accion: "renombrar", de: aUnir.de.nombre, a: aUnir.destino },
      `Se unió "${aUnir.de.nombre}" con "${aUnir.destino}"`,
    );
    if (ok) {
      setAUnir(null);
      setEdicion(null);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Subcategorías"
      subtitle={`${ETIQUETA_CATEGORIA[categoria]} · ${subcategorias.length} subcategorías`}
      size="md"
      variante="destacado"
      footer={<Button onClick={onClose}>Listo</Button>}
    >
      <form onSubmit={crear} noValidate className="mb-4 flex gap-2">
        <Input
          aria-label="Nueva subcategoría"
          placeholder="Nueva subcategoría, ej. Arte y manualidades"
          maxLength={60}
          value={nueva}
          onChange={(e) => {
            setNueva(e.target.value);
            setError(undefined);
          }}
        />
        <Button type="submit" disabled={ocupado} className="shrink-0">
          <Plus /> Agregar
        </Button>
      </form>
      {error && (
        <p role="alert" className="-mt-2 mb-3 text-small text-stock-out">
          {error}
        </p>
      )}

      {subcategorias.length === 0 ? (
        <p className="py-6 text-center text-body text-ink-muted">Todavía no hay subcategorías.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
          {subcategorias.map((s) => {
            const editando = edicion?.de === s.nombre ? edicion : null;
            const otras = subcategorias.filter((o) => o.nombre !== s.nombre);
            return (
              <li key={s.nombre} className="flex min-h-12 items-center gap-2 px-3 py-2">
                <Tags className="size-4 shrink-0 text-ink-muted" />
                {editando?.tipo === "renombrar" ? (
                  <>
                    <Input
                      aria-label={`Nuevo nombre de ${s.nombre}`}
                      autoFocus
                      maxLength={60}
                      value={editando.valor}
                      onChange={(e) => setEdicion({ ...editando, valor: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void guardarNombre();
                        }
                      }}
                    />
                    <IconoBoton
                      etiqueta="Guardar nombre"
                      onClick={guardarNombre}
                      disabled={ocupado}
                    >
                      {ocupado ? <LoaderCircle className="animate-spin" /> : <Check />}
                    </IconoBoton>
                    <IconoBoton etiqueta="Cancelar" onClick={() => setEdicion(null)}>
                      <X />
                    </IconoBoton>
                  </>
                ) : editando?.tipo === "unir" ? (
                  <>
                    <span className="shrink-0 text-body text-ink-strong">{s.nombre} →</span>
                    <Select
                      aria-label={`Unir ${s.nombre} con`}
                      value={editando.destino}
                      onChange={(e) => setEdicion({ ...editando, destino: e.target.value })}
                    >
                      <option value="">Unir con…</option>
                      {otras.map((o) => (
                        <option key={o.nombre} value={o.nombre}>
                          {o.nombre}
                        </option>
                      ))}
                    </Select>
                    <IconoBoton
                      etiqueta="Confirmar unión"
                      disabled={!editando.destino}
                      onClick={() => setAUnir({ de: s, destino: editando.destino })}
                    >
                      <Check />
                    </IconoBoton>
                    <IconoBoton etiqueta="Cancelar" onClick={() => setEdicion(null)}>
                      <X />
                    </IconoBoton>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-body text-ink-strong">
                      {s.nombre}
                    </span>
                    <span className="shrink-0 text-small text-ink-muted tabular">
                      {s.productos} {s.productos === 1 ? "producto" : "productos"}
                    </span>
                    <IconoBoton
                      etiqueta={`Cambiar nombre de ${s.nombre}`}
                      onClick={() =>
                        setEdicion({ tipo: "renombrar", de: s.nombre, valor: s.nombre })
                      }
                    >
                      <Pencil />
                    </IconoBoton>
                    <IconoBoton
                      etiqueta={`Unir ${s.nombre} con otra`}
                      disabled={otras.length === 0}
                      onClick={() => setEdicion({ tipo: "unir", de: s.nombre, destino: "" })}
                    >
                      <Combine />
                    </IconoBoton>
                    <IconoBoton
                      etiqueta={
                        s.productos > 0
                          ? `${s.nombre} tiene productos: no se puede eliminar`
                          : `Eliminar ${s.nombre}`
                      }
                      disabled={s.productos > 0 || ocupado}
                      onClick={() =>
                        enviar({ accion: "eliminar", nombre: s.nombre }, `"${s.nombre}" eliminada`)
                      }
                      peligro
                    >
                      <Trash2 />
                    </IconoBoton>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-small text-ink-muted">
        Solo se eliminan las que no tienen productos. Para quitar una con productos, únela con otra:
        sus productos pasan a esa.
      </p>

      {aUnir && (
        <Confirmar
          titulo="¿Unir estas subcategorías?"
          textoConfirmar="Sí, unir"
          onCancelar={() => setAUnir(null)}
          onConfirmar={unir}
        >
          <p>
            Los <strong>{aUnir.de.productos}</strong> productos de{" "}
            <strong>{aUnir.de.nombre}</strong> pasan a <strong>{aUnir.destino}</strong>, y{" "}
            {aUnir.de.nombre} desaparece.
          </p>
        </Confirmar>
      )}
    </Modal>
  );
}

function IconoBoton({
  etiqueta,
  onClick,
  disabled,
  peligro,
  children,
}: {
  etiqueta: string;
  onClick: () => void;
  disabled?: boolean;
  peligro?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
      disabled={disabled}
      className={
        "flex size-8 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-gray-100 disabled:opacity-35 disabled:hover:bg-transparent [&_svg]:size-4 " +
        (peligro ? "hover:text-stock-out" : "hover:text-navy-900")
      }
    >
      {children}
    </button>
  );
}
