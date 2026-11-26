import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Tarjeta base: blanca, borde #E5E5E5, radio 6px (sección 7.6). */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md border border-gray-200 bg-white shadow-sm", className)}
      {...props}
    />
  );
}

interface CardHeaderProps {
  title: string;
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, actions, className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-5 pt-5 pb-3", className)}>
      <h3 className="text-body font-semibold text-ink-strong">{title}</h3>
      {actions}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}
