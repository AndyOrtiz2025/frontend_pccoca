"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useToast } from "@/components/ui";
import { ErrorApi } from "@/lib/http";

/** Muestra el error de una llamada a /api; si la sesión venció (401), vuelve a la pantalla de perfiles. */
export function useErrorApi() {
  const toast = useToast();
  const router = useRouter();
  return useCallback(
    (e: unknown) => {
      toast(e instanceof Error ? e.message : "Ocurrió un error. Intenta de nuevo.", "danger");
      if (e instanceof ErrorApi && e.status === 401) router.replace("/");
    },
    [toast, router],
  );
}
