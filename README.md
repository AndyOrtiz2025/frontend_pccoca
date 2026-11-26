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

En producción (`npm run build && npm start`) la app exige `SESSION_SECRET` en el `.env.local`.

## Scripts

| Comando             | Qué hace                        |
| ------------------- | ------------------------------- |
| `npm run dev`       | Servidor de desarrollo          |
| `npm run build`     | Build de producción             |
| `npm run lint`      | ESLint                          |
| `npm run typecheck` | Revisión de tipos de TypeScript |
| `npm test`          | Pruebas con Vitest              |
| `npm run format`    | Da formato con Prettier         |

## Estructura

```
src/
  app/                 Rutas (App Router)
    (dev)/componentes  Galería de componentes (solo para revisar el diseño)
    api/auth/          Rutas BFF: login, logout, recuperar contraseña
    login/, recuperar/ Pantallas de acceso
  proxy.ts             Protege las rutas por rol antes de mostrar la página
  components/ui/       Componentes base de la guía (botones, tablas, modales...)
  lib/                 Utilidades (formato de moneda, semáforo de stock...)
    auth/              Sesión (cookie HttpOnly firmada), roles, validaciones y límite de intentos
  types/               Tipos del dominio
```

## Flujo de trabajo

1. Rama nueva desde `development`: `feature/<modulo>` o `fix/<tema>`.
2. Commits claros, agregando archivos uno por uno (no `git add .`).
3. Pull Request hacia `development`. Los checks de CI deben pasar en verde y otra persona aprueba.
4. Para pasar a producción: PR de `development` a `main`.

El `.env.local` nunca se sube. Si un secreto llega al repo, hay que cambiarlo.
