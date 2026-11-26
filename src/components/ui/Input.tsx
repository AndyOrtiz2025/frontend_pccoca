import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";

const base =
  "w-full rounded-sm border bg-white text-body text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] " +
  "focus:border-gold-500 focus:shadow-focus focus:outline-none disabled:opacity-45";

function borde(invalid?: boolean) {
  return invalid ? "border-stock-out" : "border-gray-300";
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

/** Input de 32px, borde #D4D4D8, foco dorado (sección 7.5). */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(base, borde(invalid), "h-8 px-3", className)}
      {...props}
    />
  );
});

/** Buscador con lupa a la izquierda. */
export const SearchInput = forwardRef<HTMLInputElement, InputProps>(function SearchInput(
  { className, ...props },
  ref,
) {
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-muted"
      />
      <Input ref={ref} type="search" className="pl-8" {...props} />
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 3, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(base, borde(invalid), "resize-y px-3 py-1.5", className)}
      {...props}
    />
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <div className={cn("relative", className)}>
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(base, borde(invalid), "h-8 appearance-none pr-8 pl-3")}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-muted"
      />
    </div>
  );
});
