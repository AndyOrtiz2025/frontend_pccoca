"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";
import { Button, Field, Input, Modal, useToast } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { ErrorApi, pedirApi } from "@/lib/http";
import { LIMITES_CLIENTE } from "@/lib/reglas/clientes";
import { clienteSchema } from "@/schemas/cliente.schema";

/** Nuevo cliente (solo el nombre) o cambiarle el nombre. */
export function ModalNombreCliente({
  cliente,
  base,
  onClose,
}: {
  cliente: { id: string; nombre: string } | null;
  base: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [nombre, setNombre] = useState(cliente?.nombre ?? "");
  const [error, setError] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const r = clienteSchema.safeParse({ nombre });
    if (!r.success) return setError(r.error.issues[0]?.message);
    setGuardando(true);
    try {
      if (cliente) {
        await pedirApi("PATCH", `/api/clientes/${encodeURIComponent(cliente.id)}`, r.data);
        toast("Nombre actualizado", "success");
        onClose();
        router.refresh();
      } else {
        const { id } = await pedirApi<{ id: string }>("POST", "/api/clientes", r.data);
        toast(`${r.data.nombre} agregado`, "success");
        router.push(`${base}/${id}`);
      }
    } catch (err) {
      if (err instanceof ErrorApi && (err.status === 400 || err.status === 409))
        setError(err.message);
      else manejarError(err);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={cliente ? "Cambiar nombre" : "Nuevo cliente"}
      subtitle={
        cliente ? cliente.nombre : "Los demás datos los agregas después, solo los que tenga"
      }
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-nombre-cliente" disabled={guardando}>
            {guardando ? <LoaderCircle className="animate-spin" /> : <Save />}
            {cliente ? "Guardar" : "Crear cliente"}
          </Button>
        </>
      }
    >
      <form id="form-nombre-cliente" onSubmit={guardar} noValidate>
        <Field label="Nombre del cliente" error={error}>
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              autoFocus
              maxLength={LIMITES_CLIENTE.nombre}
              placeholder="Ej. Ana Ramírez"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setError(undefined);
              }}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
