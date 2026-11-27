/** Error de una llamada a nuestras rutas /api, con su código HTTP (401 = sesión vencida). */
export class ErrorApi extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ErrorApi";
  }
}

/**
 * POST a una ruta /api propia (BFF). Lanza ErrorApi con el mensaje del servidor si falla.
 * Si el cuerpo es FormData (archivos), el navegador pone solo el Content-Type multipart.
 */
export function postApi<T>(url: string, cuerpo?: unknown): Promise<T> {
  return pedirApi<T>("POST", url, cuerpo);
}

/** Igual que postApi, para PATCH y DELETE. */
export async function pedirApi<T>(
  metodo: "POST" | "PATCH" | "DELETE",
  url: string,
  cuerpo?: unknown,
): Promise<T> {
  let res: Response;
  const esForm = cuerpo instanceof FormData;
  try {
    res = await fetch(url, {
      method: metodo,
      headers: esForm ? undefined : { "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : esForm ? cuerpo : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi("Sin conexión con el servidor. Revisa tu internet.", 0);
  }
  const datos = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ErrorApi(datos.error ?? "Ocurrió un error. Intenta de nuevo.", res.status);
  return datos;
}
