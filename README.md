# PC Coca — Frontend

Sistema de gestión de **PC Coca** (cibercafé, librería, tecnología, trámites y servicios técnicos), San Pedro Necta.

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Zod · Lucide
- **Diseño:** Guía de Diseño UI v2 (Azul Medianoche y Oro). Los tokens viven en `src/app/globals.css`.
- **Backend:** repo `backend--pccoca` (Spring Boot). El navegador nunca habla directo con él: pasa por el servidor de Next.js (patrón BFF).

## Cómo correrlo

Requiere Node.js 22 o superior.

```bash
npm install
cp .env.example .env.local   # en Windows: copy .env.example .env.local
npm run dev                  # http://localhost:3000
```

La galería de componentes está en <http://localhost:3000/componentes>.

### Usuarios de prueba (solo mientras no hay backend)

| Perfil   | Usuario          | Contraseña   |
| -------- | ---------------- | ------------ |
| Empleado | `carlos` o `ana` | `pccoca2026` |
| Paola    | `paola`          | `pccoca2026` |
| Oscar    | `oscar`          | `pccoca2026` |

Están en `src/lib/auth/mock-users.ts` y se borran cuando el login se conecte al backend.

Mientras no hay backend, las ventas, mermas y "Abrir nuevo paquete" se guardan **en memoria**
(`src/lib/mocks/store.ts`): se reinician cada vez que se detiene `npm run dev`.

En producción (`npm run build && npm start`) la app exige `SESSION_SECRET` en el `.env.local`.

## Scripts

| Comando                 | Qué hace                                        |
| ----------------------- | ----------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo                          |
| `npm run build`         | Build de producción                             |
| `npm run lint`          | ESLint                                          |
| `npm run typecheck`     | Revisión de tipos de TypeScript                 |
| `npm test`              | Pruebas con Vitest                              |
| `npm run test:coverage` | Pruebas con cobertura (mínimo 80% en la lógica) |
| `npm run test:e2e`      | Pruebas end-to-end (Playwright)                 |
| `npm run format`        | Da formato con Prettier                         |

## CI (GitHub Actions)

Cada PR hacia `development` o `main` corre:

| Paso                           | Qué revisa                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------ |
| Lint, pruebas y build          | Formato, ESLint, tipos, pruebas unitarias con cobertura mínima y build         |
| Pruebas end-to-end             | Las pantallas con cada rol (Playwright)                                        |
| Escaneo de secretos            | Contraseñas o claves escritas por error (gitleaks, reglas en `.gitleaks.toml`) |
| Revisión de dependencias       | Librerías nuevas o actualizadas con vulnerabilidades altas o críticas          |
| Análisis de seguridad (CodeQL) | Problemas de seguridad en el código (también corre cada lunes)                 |

**Cobertura:** el mínimo de 80% se mide sobre la lógica (`src/lib` y `src/schemas`); las pantallas
las cubren las pruebas end-to-end. Se configura en `vitest.config.ts`.

**Dependabot** (`.github/dependabot.yml`) solo abre PRs cuando una librería tiene una
vulnerabilidad conocida; las actualizaciones normales de versión se hacen a mano.

## Pruebas end-to-end

Están en `e2e/` y usan [Playwright](https://playwright.dev): abren el navegador, entran como
empleado, Paola u Oscar y usan las pantallas como lo haría una persona (ventas, pendientes,
trámites, productos, códigos de barras, proveedores, pedidos, devoluciones y catálogo de trámites).

```bash
npx playwright install chromium   # solo la primera vez: descarga el navegador
npm run test:e2e                  # hace el build, levanta la app en el puerto 3100 y corre todo
npm run test:e2e:ui               # lo mismo, en una ventana donde se ve cada paso
```

- Antes de cada prueba los datos de prueba vuelven a su estado inicial (ruta `/api/e2e/reiniciar`,
  que solo existe cuando la app arranca con `E2E=1`; lo hace `playwright.config.ts`).
- Si ya tienes la app corriendo con `E2E=1` en el puerto 3100, las pruebas la reutilizan.
- En el CI corren en cada PR. Si fallan, el reporte con capturas queda como artefacto
  `reporte-e2e` en la corrida de GitHub Actions.

## Estructura

Se organiza **por módulos**: cada funcionalidad (productos, trámites, pendientes…) repite el mismo patrón de carpetas.

```
src/
  app/                        Las RUTAS (App Router). Los (grupos) ordenan pero no cambian la URL.
    (auth)/                   Pantallas sin sesión: perfiles (/), login, recuperar
    (dashboard)/              Pantallas protegidas, una carpeta por rol
      empleado/  paola/  oscar/
    (dev)/componentes/        Galería de componentes (solo para revisar el diseño)
    api/                      BFF: el navegador llama aquí y esto habla con el backend
  components/
    ui/                       Genéricos de la Guía UI v2 (Button, Input, Modal, Table…)
    <modulo>/                 Específicos de un módulo (ej. acceso/, productos/)
  lib/                        Utilidades y lógica compartida (formato, semáforo, sesión)
    api.ts                    Capa de datos: el ÚNICO lugar donde las pantallas piden información
    auth/                     Sesión (cookie HttpOnly firmada), roles y límite de intentos
    reglas/                   Reglas de negocio puras y probadas (precios, mayoreo, stock,
                              carrito, estados, búsqueda)
    mocks/                    Datos de prueba mientras no hay backend
  schemas/                    Validaciones con Zod (<modulo>.schema.ts)
  types/                      Tipos de TypeScript (<modulo>.ts)
  hooks/                      Hooks propios (useCarrito…), se crea cuando haga falta
  proxy.ts                    El "portero": protege las rutas por rol (en Next.js 16
                              reemplaza a middleware.ts)
```

**Para agregar un módulo nuevo** (ej. "pendientes"): su página en `app/(dashboard)/<rol>/pendientes/`,
sus componentes en `components/pendientes/`, su validación en `schemas/pendiente.schema.ts`
y su tipo en `types/pendiente.ts`. Nunca mezclar la lógica de dos módulos en la misma carpeta.

## Flujo de trabajo

1. Rama nueva desde `development`: `feature/<modulo>` o `fix/<tema>`.
2. Commits claros, agregando archivos uno por uno (no `git add .`).
3. Pull Request hacia `development`. Los checks de CI deben pasar en verde y otra persona aprueba.
4. Para pasar a producción: PR de `development` a `main`.

El `.env.local` nunca se sube. Si un secreto llega al repo, hay que cambiarlo.
