"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Lock } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { recuperarSchema } from "@/lib/auth/schemas";
import { ocultarCorreo } from "@/lib/format";

interface RecuperarFormProps {
  /** Dentro de la app (Cambiar contraseña) no se muestra el encabezado con candado. */
  compacto?: boolean;
}

export function RecuperarForm({ compacto }: RecuperarFormProps) {
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviadoA, setEnviadoA] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const datos = recuperarSchema.safeParse({ correo });
    if (!datos.success) {
      setError(datos.error.issues[0]?.message ?? "Escribe un correo válido");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos.data),
      });
      if (!res.ok) {
        setError("No se pudo enviar el enlace. Intenta de nuevo.");
        return;
      }
      setEnviadoA(ocultarCorreo(datos.data.correo));
    } catch {
      setError("Sin conexión con el servidor. Revisa tu internet.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {!compacto && (
        <div className="mt-4 flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-gold-100 text-navy-900">
            <Lock className="size-5" />
          </span>
          <h1 className="mt-3 text-h2 font-semibold text-ink-strong">Recuperar contraseña</h1>
          <p className="mt-1 text-body text-ink-muted">
            Te enviaremos un enlace a tu correo para crear una nueva contraseña.
          </p>
        </div>
      )}

      <Field label="Correo electrónico" error={error ?? undefined}>
        {(id, desc) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            invalid={!!error}
            aria-describedby={desc}
            className="h-9"
          />
        )}
      </Field>

      <Button type="submit" disabled={enviando} className="h-9 w-full">
        {enviando && <LoaderCircle className="animate-spin" />}
        Enviar enlace
      </Button>

      {enviadoA && (
        <Alert tone="success">
          Si el correo está registrado, te llegará el enlace. Revisa tu correo: {enviadoA}
        </Alert>
      )}
    </form>
  );
}
