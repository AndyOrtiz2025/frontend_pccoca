import Link from "next/link";

// Temporal: en la Fase 2 esta ruta será la pantalla "¿Quién está usando PC Coca?".
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-grad-login text-center">
      <p className="text-h2 font-semibold text-white">
        PC Coca<span className="text-gold-500">.</span>
      </p>
      <p className="text-body text-navy-300">
        Frontend en construcción · Fase 1: sistema de diseño
      </p>
      <Link
        href="/componentes"
        className="inline-flex h-8 items-center rounded-sm bg-grad-gold px-3.5 text-button font-semibold text-navy-900 hover:bg-grad-gold-hover"
      >
        Ver componentes
      </Link>
    </main>
  );
}
