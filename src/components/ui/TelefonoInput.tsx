"use client";

import { forwardRef } from "react";
import { Input, type InputProps } from "./Input";

/** "54128890" → "5412-8890". Ignora todo lo que no sea número y corta en 8 dígitos. */
export function formatearTelefono(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 8);
  return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
}

interface TelefonoInputProps extends Omit<InputProps, "value" | "onChange" | "type"> {
  value: string;
  onChange: (valor: string) => void;
}

/** Teléfono de Guatemala: solo 8 dígitos; el guion se pone solo. No deja escribir más. */
export const TelefonoInput = forwardRef<HTMLInputElement, TelefonoInputProps>(
  function TelefonoInput({ value, onChange, ...props }, ref) {
    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="5412-8890"
        maxLength={9}
        value={value}
        onChange={(e) => onChange(formatearTelefono(e.target.value))}
        {...props}
      />
    );
  },
);
