"use client";

import { useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmarProps {
  titulo: string;
  children: ReactNode;
  textoConfirmar: string;
  /** Se espera a que termine; mientras, el botón muestra que está trabajando. */
  onConfirmar: () => Promise<void> | void;
  onCancelar: () => void;
  peligro?: boolean;
}

/** Confirmación para acciones que no se pueden deshacer (entregar, marcar pagado, eliminar). */
export function Confirmar({
  titulo,
  children,
  textoConfirmar,
  onConfirmar,
  onCancelar,
  peligro,
}: ConfirmarProps) {
  const [trabajando, setTrabajando] = useState(false);
  return (
    <Modal
      open
      onClose={() => !trabajando && onCancelar()}
      title={titulo}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancelar} disabled={trabajando}>
            Cancelar
          </Button>
          <Button
            variant={peligro ? "danger" : "primary"}
            disabled={trabajando}
            onClick={async () => {
              setTrabajando(true);
              try {
                await onConfirmar();
              } finally {
                setTrabajando(false);
              }
            }}
          >
            {trabajando && <LoaderCircle className="animate-spin" />}
            {textoConfirmar}
          </Button>
        </>
      }
    >
      <div className="text-body text-ink">{children}</div>
    </Modal>
  );
}
