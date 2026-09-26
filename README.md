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
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Clave pública de Cloudflare Turnstile |

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

Las migraciones están reconciliadas con el proyecto GUBIA hasta `20260926135903`. Las tres primeras se recuperaron del historial original; las posteriores corrigen seguridad e implementan el gateway y operaciones. No reaplicar manualmente en GUBIA.

En una base desechable, aplicar las migraciones en orden y ejecutar los archivos de `supabase/tests/` como postgres. Crean fixtures dentro de transacciones con ROLLBACK. Las suites cubren permisos, reserva y operaciones; no sustituyen pruebas E2E ni carga concurrente.

## Gateway público

`supabase/functions/gubia-public/index.ts` usa `verify_jwt=false` porque verifica explícitamente la clave publicable y admite solo acciones conocidas. Las RPC del gateway están restringidas a service_role. El secreto de servicio proviene del entorno administrado de Supabase; nunca del frontend.

Reservas cerradas por defecto. Configurar secretos de la Edge Function por canal seguro:
- `GUBIA_BOOKING_ENABLED=true` solamente después de validar el flujo completo y operación.
- `TURNSTILE_SECRET_KEY`: secreto de Cloudflare Turnstile.
- `GUBIA_ALLOWED_HOSTNAMES`: hostnames autorizados según el parser de la función (separados por coma).

Además se requieren sucursales habilitadas, estudios con duración/precio verificados, oferta por sucursal, horarios y capacidad. La clave pública Turnstile se configura en Vercel. No usar claves CAPTCHA de prueba en producción.

## Despliegue

Importar **el repositorio completo** en Vercel (Next.js, directorio raíz del repositorio), configurar variables en el entorno correspondiente y verificar build, runtime y flujo E2E. No publicar como plataforma terminada mientras existan los bloqueos documentados. No modificar `gubia.mx` ni DNS.

El conector Vercel no devolvió proyectos y la herramienta de despliegue respondió `Tool deploy_to_vercel not found`. Falta resolver la vinculación de Vercel y, por decisión del usuario, configurar la cuenta OWNER más adelante.
