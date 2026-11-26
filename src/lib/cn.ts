import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Le enseñamos a tailwind-merge nuestros tamaños de texto propios (text-body, text-h1...)
// para que no los confunda con colores (text-ink, text-gold-500...).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: ["h1", "h2", "body", "button", "small", "badge", "overline", "kpi", "price"],
        },
      ],
    },
  },
});

/** Une clases de Tailwind resolviendo conflictos (la última gana). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
