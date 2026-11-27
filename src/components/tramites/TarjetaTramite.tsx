import { Send } from "lucide-react";
import { Button, Chip } from "@/components/ui";
import { formatPrecio } from "@/lib/format";
import type { Tramite } from "@/types/tramite";

interface TarjetaTramiteProps {
  tramite: Tramite;
  modulo: string;
  onEnviarEntrada: () => void;
}

/** Tarjeta del catálogo de trámites (pantalla 8): requisitos y precio, solo consulta. */
export function TarjetaTramite({ tramite, modulo, onEnviarEntrada }: TarjetaTramiteProps) {
  const pendiente = tramite.precio.monto === null;
  return (
    <article className="flex flex-col rounded-md border border-t-[3px] border-gray-200 border-t-navy-900 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-body leading-snug font-semibold text-ink-strong">{tramite.nombre}</h3>
        <Chip tono="bg-st-recibido-bg text-navy-900">{modulo}</Chip>
      </div>

      {tramite.requisitos.length > 0 ? (
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-4 text-small text-ink marker:text-navy-300">
          {tramite.requisitos.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-small text-ink-muted">Sin requisitos registrados.</p>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <Button
          size="sm"
          variant="outline"
          onClick={onEnviarEntrada}
          aria-label={`Enviar entrada: ${tramite.nombre}`}
        >
          <Send /> Enviar entrada
        </Button>
        <div className="text-right">
          {pendiente ? (
            <Chip>Pendiente</Chip>
          ) : (
            <p className="text-price font-semibold text-ink-strong tabular">
              {formatPrecio(tramite.precio)}
            </p>
          )}
          {tramite.precio.nota && (
            <p className="mt-0.5 max-w-52 text-badge text-ink-muted">{tramite.precio.nota}</p>
          )}
        </div>
      </div>
    </article>
  );
}
