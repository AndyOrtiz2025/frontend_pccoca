import type { ReactNode } from "react";

/** Fondo y marco común de las pantallas de acceso (perfiles, login, recuperar). */
export function AccesoShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-black bg-grad-login text-white">
      <header className="pt-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-small font-semibold tracking-[0.12em] uppercase">
          PC Coca
          <span aria-hidden className="size-2 rounded-full bg-gold-500 shadow-[0_0_8px_#fca311]" />
        </span>
      </header>
      <main className="flex w-full flex-1 flex-col items-center justify-center px-6 py-10">
        {children}
      </main>
      <footer className="flex flex-col items-center gap-1 pb-8 text-center">
        <span aria-hidden className="mb-3 h-px w-28 bg-white/15" />
        <p className="text-small text-navy-300">
          Sistema de gestión · <span className="text-white">PC Coca</span>, San Pedro Necta
        </p>
        <p className="text-badge text-navy-300/70">Cibercafé · Librería · Tecnología · Trámites</p>
      </footer>
    </div>
  );
}
