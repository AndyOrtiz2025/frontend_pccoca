"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, History, LoaderCircle, Plus, Save, X } from "lucide-react";
import { Button, Field, Input, Modal, SegmentedControl, Select, useToast } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { formatFecha } from "@/lib/fechas";
import { formatPrecio } from "@/lib/format";
import { ErrorApi, pedirApi } from "@/lib/http";
import { normalizar } from "@/lib/reglas/busqueda";
import { precioDesdeFormulario } from "@/lib/reglas/tramites";
import type { TramiteAdmin } from "@/lib/api";
import { tramiteSchema } from "@/schemas/tramite.schema";
import type { ModuloTramite } from "@/types/tramite";

type TipoPrecio = "fijo" | "rango" | "pendiente";

const soloDinero = (v: string) => v.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
const num = (v: string) => (v.trim() === "" ? NaN : Number(v));

/**
 * Nuevo / Editar trámite: nombre, módulo, requisitos (con sugerencias de los que ya se usan)
 * y precio fijo, por rango o por confirmar, con una nota opcional.
 */
export function ModalTramite({
  tramite,
  modulos,
  moduloInicial,
  sugeridos,
  onClose,
}: {
  tramite: TramiteAdmin | null;
  modulos: ModuloTramite[];
  moduloInicial?: string;
  /** Requisitos que ya se usan en el catálogo, del más usado al menos usado. */
  sugeridos: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const t = tramite;
  const [nombre, setNombre] = useState(t?.nombre ?? "");
  const [moduloId, setModuloId] = useState(t?.moduloId ?? moduloInicial ?? modulos[0]?.id ?? "");
  const [requisitos, setRequisitos] = useState<string[]>(t?.requisitos ?? []);
  const [nuevoReq, setNuevoReq] = useState("");
  const [tipo, setTipo] = useState<TipoPrecio>(
    !t
      ? "fijo"
      : t.precio.monto === null
        ? "pendiente"
        : t.precio.montoMax !== undefined
          ? "rango"
          : "fijo",
  );
  const [monto, setMonto] = useState(t?.precio.monto != null ? String(t.precio.monto) : "");
  const [montoMax, setMontoMax] = useState(
    t?.precio.montoMax !== undefined ? String(t.precio.montoMax) : "",
  );
  const [nota, setNota] = useState(t?.precio.nota ?? "");
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});
  const [guardando, setGuardando] = useState(false);

  const usados = new Set(requisitos.map(normalizar));
  const filtro = normalizar(nuevoReq);
  const opciones = sugeridos
    .filter((r) => !usados.has(normalizar(r)) && (!filtro || normalizar(r).includes(filtro)))
    .slice(0, 8);

  const precio =
    tipo === "pendiente"
      ? { tipo }
      : tipo === "rango"
        ? { tipo, monto: num(monto), montoMax: num(montoMax) }
        : { tipo, monto: num(monto) };
  const vistaPrevia = tramiteSchema.shape.precio.safeParse(precio);

  function agregarRequisito(texto: string) {
    const r = texto.trim();
    if (!r) return;
    if (usados.has(normalizar(r))) {
      setErrores({ requisitos: "Ese requisito ya está en la lista" });
      return;
    }
    setRequisitos((rs) => [...rs, r]);
    setNuevoReq("");
    setErrores({});
  }

  function mover(i: number, d: -1 | 1) {
    setRequisitos((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const copia = [...rs];
      [copia[i], copia[j]] = [copia[j]!, copia[i]!];
      return copia;
    });
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const r = tramiteSchema.safeParse({ nombre, moduloId, requisitos, precio, nota });
    if (!r.success) {
      const nuevos: Record<string, string> = {};
      for (const i of r.error.issues) {
        const clave =
          i.path[0] === "precio" ? `precio.${String(i.path[1] ?? "monto")}` : String(i.path[0]);
        nuevos[clave] ??= i.message;
      }
      return setErrores(nuevos);
    }
    setGuardando(true);
    try {
      if (t) await pedirApi("PATCH", `/api/tramites/${encodeURIComponent(t.id)}`, r.data);
      else await pedirApi("POST", "/api/tramites", r.data);
      toast(t ? "Cambios guardados" : `${r.data.nombre} agregado al catálogo`, "success");
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
      title={t ? "Editar trámite" : "Nuevo trámite"}
      subtitle={t ? t.nombre : "Se agrega al catálogo que ven los empleados"}
      size="lg"
      variante="destacado"
      footer={
        <>
          {errores.general && (
            <p role="alert" className="mr-auto text-small text-stock-out">
              {errores.general}
            </p>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-tramite" disabled={guardando}>
            {guardando ? <LoaderCircle className="animate-spin" /> : <Save />}
            {t ? "Guardar cambios" : "Agregar trámite"}
          </Button>
        </>
      }
    >
      <form id="form-tramite" onSubmit={guardar} noValidate className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <Field label="Nombre del trámite" error={errores.nombre}>
            {(id, d) => (
              <Input
                id={id}
                aria-describedby={d}
                autoFocus={!t}
                maxLength={100}
                placeholder="Ej. Inscripción al IGSS"
                value={nombre}
                invalid={!!errores.nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setErrores({});
                }}
              />
            )}
          </Field>
          <Field label="Módulo" error={errores.moduloId}>
            {(id, d) => (
              <Select
                id={id}
                aria-describedby={d}
                value={moduloId}
                onChange={(e) => setModuloId(e.target.value)}
              >
                {modulos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-small font-semibold text-ink-strong">
            Requisitos <span className="font-normal text-ink-muted">({requisitos.length})</span>
          </h3>
          {requisitos.length === 0 ? (
            <p className="text-small text-ink-muted">Sin requisitos todavía.</p>
          ) : (
            <ol className="flex flex-col divide-y divide-gray-200 rounded-md border border-gray-200">
              {requisitos.map((r, i) => (
                <li key={r} className="flex items-center gap-2 px-3 py-1.5">
                  <span className="w-5 text-small text-ink-muted tabular">{i + 1}.</span>
                  <span className="flex-1 text-body text-ink">{r}</span>
                  <Button
                    variant="icon"
                    size="sm"
                    aria-label={`Subir ${r}`}
                    disabled={i === 0}
                    onClick={() => mover(i, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="icon"
                    size="sm"
                    aria-label={`Bajar ${r}`}
                    disabled={i === requisitos.length - 1}
                    onClick={() => mover(i, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    variant="icon"
                    size="sm"
                    aria-label={`Quitar ${r}`}
                    onClick={() => setRequisitos((rs) => rs.filter((_, k) => k !== i))}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ol>
          )}
          <div className="flex gap-2">
            <Input
              aria-label="Nuevo requisito"
              maxLength={120}
              placeholder="Escribe un requisito o elige uno de abajo"
              value={nuevoReq}
              invalid={!!errores.requisitos}
              onChange={(e) => {
                setNuevoReq(e.target.value);
                setErrores({});
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarRequisito(nuevoReq);
                }
              }}
            />
            <Button variant="outline" onClick={() => agregarRequisito(nuevoReq)}>
              <Plus /> Agregar
            </Button>
          </div>
          {errores.requisitos && (
            <p role="alert" className="text-small text-stock-out">
              {errores.requisitos}
            </p>
          )}
          {opciones.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Requisitos que ya se usan">
              {opciones.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => agregarRequisito(r)}
                  className="hover:bg-gray-50 inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2.5 py-1 text-small text-ink hover:border-navy-900"
                >
                  <Plus className="size-3" /> {r}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-small font-semibold text-ink-strong">Precio</h3>
            <SegmentedControl
              ariaLabel="Tipo de precio"
              value={tipo}
              onChange={(v) => {
                setTipo(v);
                setErrores({});
              }}
              options={[
                { value: "fijo", label: "Fijo" },
                { value: "rango", label: "Rango" },
                { value: "pendiente", label: "Por confirmar" },
              ]}
            />
          </div>
          {tipo !== "pendiente" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={tipo === "rango" ? "Desde (Q)" : "Precio (Q)"}
                error={errores["precio.monto"]}
              >
                {(id, d) => (
                  <Input
                    id={id}
                    aria-describedby={d}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={monto}
                    invalid={!!errores["precio.monto"]}
                    onChange={(e) => {
                      setMonto(soloDinero(e.target.value));
                      setErrores({});
                    }}
                  />
                )}
              </Field>
              {tipo === "rango" && (
                <Field label="Hasta (Q)" error={errores["precio.montoMax"]}>
                  {(id, d) => (
                    <Input
                      id={id}
                      aria-describedby={d}
                      inputMode="decimal"
                      placeholder="0.00"
                      value={montoMax}
                      invalid={!!errores["precio.montoMax"]}
                      onChange={(e) => {
                        setMontoMax(soloDinero(e.target.value));
                        setErrores({});
                      }}
                    />
                  )}
                </Field>
              )}
            </div>
          )}
          {tipo === "pendiente" && (
            <p className="text-small text-ink-muted">
              Al empleado le sale “Pendiente”: el precio se define al cobrar.
            </p>
          )}
          <Field label="Nota del precio (opcional)" error={errores.nota}>
            {(id, d) => (
              <Input
                id={id}
                aria-describedby={d}
                maxLength={160}
                placeholder="Ej. Q 35.00 si es solo ratificación · Según vehículo"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            )}
          </Field>
          {vistaPrevia.success && (
            <p className="rounded-md bg-gray-100 px-3 py-2 text-small text-ink">
              Así lo verá el empleado:{" "}
              <strong className="text-ink-strong">
                {formatPrecio(precioDesdeFormulario({ precio: vistaPrevia.data }))}
              </strong>
              {nota.trim() && <span className="text-ink-muted"> · {nota.trim()}</span>}
            </p>
          )}
        </section>

        {t && t.cambios.length > 0 && (
          <section className="flex flex-col gap-1.5">
            <h3 className="flex items-center gap-1.5 text-small font-semibold text-ink-strong">
              <History className="size-4" /> Cambios de precio
            </h3>
            <ul className="flex flex-col gap-1 text-small text-ink">
              {t.cambios.map((c, i) => (
                <li key={i}>
                  {formatFecha(c.fecha)} · {c.por}: {formatPrecio(c.antes)} →{" "}
                  <strong>{formatPrecio(c.ahora)}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}
      </form>
    </Modal>
  );
}
