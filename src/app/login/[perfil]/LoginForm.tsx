"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui";
import type { Rol } from "@/lib/auth/roles";
import { loginSchema, MAX_PASSWORD } from "@/lib/auth/schemas";

interface LoginFormProps {
  perfil: Rol;
  recuperaPorCorreo: boolean;
}

type Errores = Partial<Record<"usuario" | "password", string>>;

export function LoginForm({ perfil, recuperaPorCorreo }: LoginFormProps) {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);

    const datos = loginSchema.safeParse({ perfil, usuario, password });
    if (!datos.success) {
      const campos = datos.error.flatten().fieldErrors;
      setErrores({ usuario: campos.usuario?.[0], password: campos.password?.[0] });
      return;
    }
    setErrores({});
    setEnviando(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos.data),
      });
      const cuerpo = (await res.json().catch(() => ({}))) as {
        redirectTo?: string;
        error?: string;
      };
      if (!res.ok || !cuerpo.redirectTo) {
        setErrorGeneral(cuerpo.error ?? "No se pudo iniciar sesión. Intenta de nuevo.");
        setPassword("");
        return;
      }
      router.replace(cuerpo.redirectTo);
      router.refresh();
    } catch {
      setErrorGeneral("Sin conexión con el servidor. Revisa tu internet.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {errorGeneral && <Alert tone="danger">{errorGeneral}</Alert>}

      <Field label="Usuario" error={errores.usuario}>
        {(id, desc) => (
          <Input
            id={id}
            name="usuario"
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            invalid={!!errores.usuario}
            aria-describedby={desc}
            className="h-9"
          />
        )}
      </Field>

      <Field label="Contraseña" error={errores.password}>
        {(id, desc) => (
          <div className="relative">
            <Input
              id={id}
              name="password"
              type={verPassword ? "text" : "password"}
              autoComplete="current-password"
              maxLength={MAX_PASSWORD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              invalid={!!errores.password}
              aria-describedby={desc}
              className="h-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-xs text-ink-muted hover:text-navy-900"
            >
              {verPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        )}
      </Field>

      <Button type="submit" disabled={enviando} className="mt-1 h-9 w-full">
        {enviando && <LoaderCircle className="animate-spin" />}
        Iniciar sesión
      </Button>

      {recuperaPorCorreo ? (
        <Link
          href="/recuperar"
          className="self-center rounded-xs text-small text-navy-900 underline underline-offset-2 hover:text-navy-700"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      ) : (
        <p className="text-center text-small text-ink-muted">
          ¿Olvidaste tu contraseña? Pídele a Oscar que te asigne una nueva.
        </p>
      )}
    </form>
  );
}
