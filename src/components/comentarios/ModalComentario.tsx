"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Modal, Textarea, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { comentarioSchema, type ComentarioInput } from "@/schemas/comentario.schema";

const DESTINOS: { value: ComentarioInput["para"]; nombre: string; detalle: string }[] = [
  { value: "paola", nombre: "Paola", detalle: "Librería, Varios, Trámites" },
  { value: "oscar", nombre: "Oscar", detalle: "Tecnología, Servicios" },
];

interface ModalComentarioProps {
  open: boolean;
  onClose: () => void;
}

/** Pantalla 13: el Empleado envía un comentario o sugerencia a Paola u Oscar. */
export function ModalComentario({ open, onClose }: ModalComentarioProps) {
  const toast = useToast();
  const [para, setPara] = useState<ComentarioInput["para"] | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [errores, setErrores] = useState<Partial<Record<"para" | "mensaje", string>>>({});

  function cerrar() {
    setPara(null);
    setMensaje("");
    setErrores({});
    onClose();
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const datos = comentarioSchema.safeParse({ para, mensaje });
    if (!datos.success) {
      const campos = datos.error.flatten().fieldErrors;
      setErrores({ para: campos.para?.[0], mensaje: campos.mensaje?.[0] });
      return;
    }
    // TODO(backend): POST /api/comentarios
    const nombre = DESTINOS.find((d) => d.value === datos.data.para)?.nombre;
    toast(`Comentario enviado a ${nombre}`, "success");
    cerrar();
  }

  return (
    <Modal
      open={open}
      onClose={cerrar}
      title="Enviar comentario"
      subtitle="Avisa si falta un producto o sugiere una compra"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-comentario">
            Enviar
          </Button>
        </>
      }
    >
      <form id="form-comentario" onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-1.5 text-small font-medium text-ink">¿Para quién?</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {DESTINOS.map((d) => {
              const elegido = para === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  role="radio"
                  aria-checked={elegido}
                  onClick={() => setPara(d.value)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border p-2.5 text-left transition-colors",
                    elegido
                      ? "border-gold-500 bg-gold-50 shadow-[0_0_0_1px_var(--color-gold-500)]"
                      : "border-gray-300 hover:border-navy-300",
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-small font-semibold text-white">
                    {d.nombre[0]}
                  </span>
                  <span>
                    <span className="block text-body font-semibold text-ink-strong">
                      {d.nombre}
                    </span>
                    <span className="block text-badge text-ink-muted">{d.detalle}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {errores.para && <p className="mt-1.5 text-small text-stock-out">{errores.para}</p>}
        </fieldset>

        <Field label="Comentario" error={errores.mensaje}>
          {(id, desc) => (
            <Textarea
              id={id}
              rows={4}
              maxLength={500}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              invalid={!!errores.mensaje}
              aria-describedby={desc}
              placeholder="Ej. Se acabaron los folders tamaño oficio, ¿pedimos más?"
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
