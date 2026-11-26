import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccesoShell } from "@/components/acceso/AccesoShell";
import { AvatarPerfil } from "@/components/acceso/AvatarPerfil";
import { TarjetaAcceso } from "@/components/acceso/TarjetaAcceso";
import { esRol, PERFILES, ROLES } from "@/lib/auth/roles";
import { LoginForm } from "./LoginForm";

export function generateStaticParams() {
  return ROLES.map((perfil) => ({ perfil }));
}

export const metadata: Metadata = { title: "Iniciar sesión" };

/** Pantalla 2: inicio de sesión después de elegir el perfil. */
export default async function Login({ params }: PageProps<"/login/[perfil]">) {
  const { perfil } = await params;
  if (!esRol(perfil)) notFound();
  const datos = PERFILES[perfil];

  return (
    <AccesoShell>
      <TarjetaAcceso volver={{ href: "/", label: "Cambiar de perfil" }}>
        <div className="mt-4 mb-6 flex flex-col items-center text-center">
          <AvatarPerfil
            rol={perfil}
            nombre={datos.nombre}
            size={72}
            className="ring-[3px] ring-gold-500 ring-offset-2"
          />
          <h1 className="mt-3 text-h2 font-semibold text-ink-strong">{datos.nombre}</h1>
          <p className="text-small text-ink-muted">{datos.cargo}</p>
        </div>
        <LoginForm perfil={perfil} recuperaPorCorreo={datos.recuperaPorCorreo} />
      </TarjetaAcceso>
    </AccesoShell>
  );
}
