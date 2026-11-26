import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "dark" | "secondary" | "outline" | "icon" | "danger";
export type ButtonSize = "md" | "sm";

const variantes: Record<ButtonVariant, string> = {
  primary: "bg-grad-gold text-navy-900 hover:bg-grad-gold-hover",
  dark: "bg-navy-900 text-white hover:bg-navy-800",
  secondary: "bg-gray-200 text-navy-900 hover:bg-gray-300",
  outline: "border border-gray-300 bg-white text-ink hover:bg-gray-100",
  icon: "border border-gray-300 bg-white text-ink-muted hover:text-navy-900",
  danger: "border border-danger-border bg-white text-stock-out hover:bg-stock-out-bg",
};

const tamanos: Record<ButtonSize, string> = {
  md: "h-8 px-3.5",
  sm: "h-7 px-3",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Botones de la guía (sección 7.1). Alto 32px (28px en barras de herramientas). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props },
  ref,
) {
  const esIcono = variant === "icon";
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-sm text-button font-semibold whitespace-nowrap transition-colors",
        "disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
        variantes[variant],
        esIcono ? (size === "sm" ? "size-7" : "size-8") : tamanos[size],
        className,
      )}
      {...props}
    />
  );
});
