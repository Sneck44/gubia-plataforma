# GUBIA · Plataforma

Aplicación Next.js conectada exclusivamente al proyecto Supabase `gubia-plataforma`.
**Estado: desarrollo. No está validada para producción.** El alcance pendiente y las pruebas verificadas están en [docs/EXECUTION_STATUS.md](docs/EXECUTION_STATUS.md).

## Requisitos

- Node.js 24 y npm.
- Supabase con las migraciones de este repositorio.
- Cuenta de personal creada en Auth y perfil activo autorizado. No hay autoasignación de administrador ni credenciales predeterminadas.

## Desarrollo y comprobaciones

```bash
cp .env.example .env.local
# Completar la clave publicable de Supabase; nunca una clave service_role.
npm ci --ignore-scripts
npm test
npm run typecheck
npm run build
npm run dev
```

`npm test` ejecuta pruebas de permisos y validación de entradas. `npm run typecheck` genera primero los tipos de Next.js. El lockfile fija las dependencias.

## Variables

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto GUBIA |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable, nunca service_role |
| `NEXT_PUBLIC_APP_URL` | Origen absoluto del despliegue |

No incluir `.env.local`, contraseñas, sesiones o tokens privados en commits ni logs.

## Arquitectura y permisos

- App Router y Server Actions.
- Proxy refresca/verifica sesión y devuelve respuestas privadas sin caché.
- `src/lib/auth.ts` valida usuario, perfil activo y permisos en el servidor.
- `src/lib/access.ts` contiene la matriz UI/servidor; no usa metadatos editables del usuario.
- RLS es la barrera independiente de base de datos. Marketing no puede leer citas, pacientes ni estudios asociados a pacientes.
- La función de consulta del rol está en `private`, sin parámetros de identidad arbitrarios, con `search_path` vacío. Su wrapper público es `SECURITY INVOKER`.
- Las métricas actuales son recuentos reales por permisos. No se presenta como conversión la división de todas las citas entre escaneos.

## Migraciones y pruebas de base de datos

Las tres primeras migraciones se recuperaron exactamente del historial remoto. La migración `20260926010105` corrige la recursión de perfiles y restringe las lecturas clínicas. Ya se aplicó al proyecto GUBIA; no volver a ejecutarla manualmente allí.

Para una base de pruebas desechable: aplicar las migraciones en orden y ejecutar `supabase/tests/profile_rls.sql` como postgres. La prueba crea fixtures en una transacción y hace ROLLBACK. No es una prueba integral de reservas ni de todos los permisos de escritura.

## Despliegue

Importar **el repositorio completo** en Vercel (Next.js, directorio raíz del repositorio), configurar variables en el entorno correspondiente y verificar build, runtime y flujo E2E. No publicar como plataforma terminada mientras existan los bloqueos documentados. No modificar `gubia.mx` ni DNS.

El conector Vercel no devolvió proyectos y la herramienta de despliegue respondió `Tool deploy_to_vercel not found`. Falta resolver la vinculación de Vercel y, por decisión del usuario, configurar la cuenta OWNER más adelante.
