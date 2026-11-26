import type { Metadata } from "next";
import Link from "next/link";
import { AccesoShell } from "@/components/acceso/AccesoShell";
import { AvatarPerfil } from "@/components/acceso/AvatarPerfil";
import { PERFILES, ROLES } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "¿Quién está usando PC Coca?" };

/** Pantalla 1: selección de perfil, estilo "¿Quién está viendo?" de Netflix. */
export default function SeleccionPerfil() {
  return (
    <AccesoShell>
      <h1 className="text-center text-[26px] leading-9 font-light">¿Quién está usando PC Coca?</h1>
      <ul className="mt-12 flex flex-wrap justify-center gap-12">
        {ROLES.map((rol) => {
          const perfil = PERFILES[rol];
          return (
            <li key={rol}>
              <Link
                href={`/login/${rol}`}
                className="group flex flex-col items-center gap-4 rounded-lg p-2 focus-visible:shadow-none"
              >
                <AvatarPerfil
                  rol={rol}
                  nombre={perfil.nombre}
                  size={112}
                  className="outline-[3px] outline-offset-4 outline-transparent transition-all duration-200 group-hover:scale-105 group-hover:outline-gold-500 group-focus-visible:scale-105 group-focus-visible:outline-gold-500"
                />
                <span className="text-body text-navy-300 transition-colors group-hover:text-white group-focus-visible:text-white">
                  {perfil.nombre}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </AccesoShell>
  );
}
