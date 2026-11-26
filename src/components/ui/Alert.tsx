import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type AlertTone = "info" | "success" | "warning" | "danger";

const tonos: Record<AlertTone, { caja: string; icono: ReactNode }> = {
  info: { caja: "bg-gold-100 border-gold-200 text-gold-text", icono: <Info /> },
  success: { caja: "bg-stock-ok-bg border-stock-ok/30 text-stock-ok-text", icono: <CircleCheck /> },
  warning: {
    caja: "bg-stock-low-bg border-stock-low/30 text-stock-low-text",
    icono: <TriangleAlert />,
  },
  danger: {
    caja: "bg-stock-out-bg border-danger-border text-stock-out-text",
    icono: <CircleAlert />,
  },
};

interface AlertProps {
  tone?: AlertTone;
  children: ReactNode;
  action?: ReactNode;
  onClose?: () => void;
  className?: string;
}

/** Aviso en línea (sección 7.7 y 2.6). */
export function Alert({ tone = "info", children, action, onClose, className }: AlertProps) {
  const t = tonos[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-button [&>svg]:size-4 [&>svg]:shrink-0",
        t.caja,
        className,
      )}
    >
      {t.icono}
      <div className="flex-1">{children}</div>
      {action}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar aviso"
          className="flex size-7 items-center justify-center rounded-xs opacity-70 hover:opacity-100"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
