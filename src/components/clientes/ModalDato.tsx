"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";
import { Button, Combobox, Field, Input, Modal, useToast } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { ErrorApi, pedirApi } from "@/lib/http";
import {
  formatearMientrasEscribe,
  largoMaximo,
  LIMITES_CLIENTE,
  tipoDeDato,
} from "@/lib/reglas/clientes";
import { datoClienteSchema } from "@/schemas/cliente.schema";
import type { DatoCliente } from "@/types/cliente";

const AYUDA = {
  dpi: "13 números; los espacios se ponen solos",
  telefono: "8 números; el guion se pone solo",
  nit: "Ej. 4492019-2 o CF",
  correo: "Ej. nombre@gmail.com",
  texto: undefined,
} as const;

const EJEMPLO = {
  dpi: "1588 25684 1306",
  telefono: "5412-8890",
  nit: "4492019-2",
  correo: "nombre@gmail.com",
  texto: "Ej. Lic. Mario Pérez",
} as const;

/** "+ Agregar dato" o editar uno: Paola escribe qué dato es y su valor. */
export function ModalDato({
  clienteId,
  dato,
  sugerencias,
  onClose,
}: {
  clienteId: string;
  dato: DatoCliente | null;
  sugerencias: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [nombre, setNombre] = useState(dato?.nombre ?? "");
  const [valor, setValor] = useState(dato?.valor ?? "");
  const [errores, setErrores] = useState<{ nombre?: string; valor?: string; general?: string }>({});
  const [guardando, setGuardando] = useState(false);
  const tipo = tipoDeDato(nombre);
  const numerico = tipo === "dpi" || tipo === "telefono";

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const r = datoClienteSchema.safeParse({ nombre, valor });
    if (!r.success) {
      const nuevos: typeof errores = {};
      for (const i of r.error.issues) {
        const k = i.path[0] === "valor" ? "valor" : "nombre";
        nuevos[k] ??= i.message;
      }
      return setErrores(nuevos);
    }
    setGuardando(true);
    try {
      const base = `/api/clientes/${encodeURIComponent(clienteId)}/datos`;
      if (dato) await pedirApi("PATCH", `${base}/${encodeURIComponent(dato.id)}`, r.data);
      else await pedirApi("POST", base, r.data);
      toast(dato ? "Dato actualizado" : `${r.data.nombre} agregado`, "success");
      onClose();
      router.refresh();
    } catch (err) {
      if (err instanceof ErrorApi && (err.status === 400 || err.status === 409))
        setErrores({ general: err.message });
      else manejarError(err);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={dato ? "Editar dato" : "Agregar dato"}
      subtitle="Escribe qué dato es: DPI, NIT, Teléfono, Contador…"
      size="sm"
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
          <Button type="submit" form="form-dato" disabled={guardando}>
            {guardando ? <LoaderCircle className="animate-spin" /> : <Save />}
            Guardar
          </Button>
        </>
      }
    >
      <form id="form-dato" onSubmit={guardar} noValidate className="flex flex-col gap-4">
        <Field label="¿Qué dato es?" error={errores.nombre}>
          {(id, d) => (
            <Combobox
              id={id}
              aria-describedby={d}
              opciones={sugerencias}
              maxLength={LIMITES_CLIENTE.nombreDato}
              placeholder="Ej. DPI"
              value={nombre}
              onChange={(v) => {
                setNombre(v);
                // Si cambia a DPI o teléfono, se acomoda lo que ya estaba escrito.
                setValor((actual) => formatearMientrasEscribe(v, actual));
                setErrores({});
              }}
            />
          )}
        </Field>
        <Field label="Valor" error={errores.valor} hint={AYUDA[tipo]}>
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              inputMode={numerico ? "numeric" : undefined}
              maxLength={largoMaximo(nombre)}
              placeholder={EJEMPLO[tipo]}
              value={valor}
              onChange={(e) => {
                setValor(formatearMientrasEscribe(nombre, e.target.value));
                setErrores({});
              }}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
