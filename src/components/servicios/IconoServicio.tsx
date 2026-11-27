import {
  AppWindow,
  Cctv,
  HardDrive,
  KeyRound,
  MonitorCog,
  Printer,
  Router,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Íconos permitidos para las tarjetas de servicios (el nombre se guarda en ServicioTecnico.icono). */
const ICONOS: Record<string, LucideIcon> = {
  cctv: Cctv,
  "monitor-cog": MonitorCog,
  "app-window": AppWindow,
  "hard-drive": HardDrive,
  "key-round": KeyRound,
  printer: Printer,
  router: Router,
};

export function IconoServicio({ nombre, className }: { nombre?: string; className?: string }) {
  const Icono = (nombre && ICONOS[nombre]) || Wrench;
  return <Icono aria-hidden className={className} strokeWidth={1.5} />;
}
