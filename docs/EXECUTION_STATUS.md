# Estado de ejecución GUBIA — 25 septiembre 2026 (México)

## Estado real
NO APTO PARA PRODUCCIÓN. Repositorio auditado en 042fc395e44d596d822d14473bf0fc85ff7daf98.
Supabase: exclusivamente gubia-plataforma (vcuozbrduchtrvvtyszl).
No se modificaron otros proyectos ni gubia.mx/DNS.

## Cambios aplicados y probados
- Reproducido error 54001 (stack depth limit exceeded) al leer profiles como authenticated.
- Migración 20260926010105 aplicada: lookup del rol actual aislado en esquema private, search_path vacío, auth.uid obligatorio, permisos solo authenticated; wrapper público SECURITY INVOKER.
- SECURITY DEFINER se usa exclusivamente para la consulta interna del rol propio, necesaria para romper el ciclo profiles → policy → profiles. No acepta ID ni rol proporcionado por el cliente.
- Marketing excluido de SELECT de appointments y appointment_services.
- Suite supabase/tests/profile_rls.sql ejecutada sobre datos temporales, ROLLBACK al terminar.
- Superadmin, recepción y consulta pueden leer cita/paciente de prueba; marketing e inactivos no.
- Perfiles: superadmin puede leer todos; restantes solo el propio. Sin identidad no puede leer ninguno.
- Anónimo sin acceso a citas/pacientes ni permiso de ejecución del helper privado.
- Recuento posterior: 0 usuarios, perfiles, citas y pacientes. No quedaron fixtures.
- Se recuperaron las 3 migraciones originales del historial de Supabase. Se conservan sin alterar como evidencia histórica, NO como aprobación de su seguridad.
- Advisors posterior: siguen dos avisos sobre book_appointment accesible como SECURITY DEFINER a anon/authenticated; esta corrección NO los resuelve.

## P0 pendientes
- package.json fija Next.js 16.0.0 y React 19.1.0. npm emitió alerta explícita de vulnerabilidad de Next. Actualizar a versiones parcheadas, regenerar lockfile y probar. npm consultado devolvió next 16.3.6 y react 19.3.0; todavía NO se actualizaron.
- book_appointment: validar fecha futura, alineación de slots, fin antes del cierre, zona horaria de sucursal, sucursal activa, límite de usos con bloqueo concurrente, autorización/antiabuso. Su gen_random_bytes sin esquema tampoco coincide con el search_path configurado.
- No asociar pacientes automáticamente solo por teléfono sin verificación de identidad.
- Server Actions de marketing comprueban login pero no autorización explícita de rol. RLS permanece como barrera, falta defensa en servidor/UI.
- Sin rate limiting/antiabuso verificado, MFA ni política de sesión probados.
- No hay cuenta OWNER. Usuario eligió configurar después. No se crearon credenciales.
- No hay build, pruebas web/E2E ni despliegue verificados.

## P1 pendientes
- admin/[section] contiene pantallas provisionales, sin implementación operativa.
- QR genera /c/CODIGO pero no existe handler de esa ruta en el repositorio.
- No hay flujo de tracking ni atribución conectados.
- Dashboard divide todas las citas por sesiones de escaneo, sin exigir atribución; no es una tasa de conversión válida.
- Sin CRUD de sucursales/estudios, agenda real, slots seleccionables, reprogramación/cancelación seguras, exportaciones ni gestión completa de usuarios.
- Interfaz permite introducir hora libre. La confirmación solo muestra el folio de la URL.
- La existencia de tablas con RLS no prueba todos los permisos: pendiente suite completa INSERT/UPDATE/DELETE, audit log y capacidad concurrente.

## Infraestructura y bloqueos observados
- GitHub accesible con permisos de escritura.
- Supabase ACTIVE_HEALTHY.
- Vercel: el único equipo devuelto por la conexión, ivanperez01-5546, devuelve projects: []. No se confirmó proyecto, variables ni deployment. Confirmar cuenta/equipo correcto o importar el repositorio en ese equipo.
- npm install terminó, pero el entorno de ejecución de Work perdió la conexión antes de editar/compilar: exec-server transport disconnected; recuperación posterior agotó el tiempo. Los conectores permitieron continuar la corrección de base de datos y guardar este avance.
- No afirmar que la actualización de dependencias, lockfile, TypeScript ni build estén completados.
- No se recibió la imagen mencionada en el prompt; solo el archivo de texto.

## Investigación pública inicial (no exhaustiva)
- https://www.gubia.mx/ revisada.
- https://www.gubia.mx/sucursales.aspx revisada: el directorio de sucursales no apareció completo en el contenido recuperado, probablemente requiere carga dinámica. No se inventaron ni importaron sucursales.
- Aviso visible fechado 16 junio 2014: REQUIERE VALIDACIÓN LEGAL DE GUBIA antes de definir consentimientos/retención. No se afirma cumplimiento legal ni se han contrastado todavía fuentes mexicanas actuales.
- Pendiente revisión exhaustiva de estudios, promociones, cotizaciones y directorio.

## Siguiente ejecución
1. Recuperar el entorno y abrir este repositorio/rama.
2. Reconciliar migraciones con historial remoto, sin reaplicarlas al proyecto que ya las tiene.
3. Actualizar dependencias vulnerables, crear lockfile, typecheck/build.
4. Completar seguridad de reserva/roles y desarrollar módulos reales con pruebas.
5. Confirmar Vercel, conectar repositorio y variables por canal seguro.
6. Configurar OWNER cuando el usuario indique correo.
7. Ejecutar E2E integral, revisión de logs, RLS completa y responsive antes de declarar producción.

## Actualización posterior: seguridad de aplicación y build

Este apartado sustituye las observaciones anteriores relativas al entorno desconectado, dependencias, build y autorización de marketing; los demás pendientes siguen vigentes.

- El entorno se recuperó. Dependencias actualizadas y fijadas: Next.js 16.3.6, React/React DOM 19.3.0, Supabase SSR 0.12.7 y supabase-js 2.117.2. Se añadió lockfile y marcador server-only.
- Se corrigió la incompatibilidad TypeScript del callback de cookies con la antigua versión SSR; los redirects conservan cookies y usan Cache-Control privado/no-store.
- Servidor y navegación comprueban usuario, perfil activo y permisos. Crear campañas/promociones exige marketing:write, incluso cuando se invoca la Server Action directamente.
- Entradas de promociones validadas: código sin normalización destructiva, nombres/longitudes, fechas reales y ordenadas, descuento válido, UUID de campaña y límites enteros. Errores de base de datos no se muestran literalmente al usuario.
- Dashboard reemplaza la tasa de conversión incorrecta por recuentos exactos con permisos. Falla explícitamente ante errores de datos. NO es aún el dashboard empresarial completo solicitado.
- Cabeceras anti-framing, no-sniff, privacidad de referrer, permisos de dispositivos, CSP básica y HSTS añadidas. La CSP es parcial: no se afirma cobertura completa de script-src/nonce.
- Instalación limpia con npm ci --ignore-scripts completada. Después pasaron 7 pruebas unitarias, TypeScript y build de producción.
- npm audit --omit=dev: 0 vulnerabilidades reportadas. No equivale a auditoría completa de seguridad de la aplicación.
- Runtime local: /admin y /admin/codigos respondieron 307 hacia /login sin sesión; Cache-Control private,no-store y cabeceras verificadas.
- Verificación visual NO completada: agent-browser falló dos veces al iniciar su daemon. No se afirma responsive ni navegación autenticada verificados.
- Vercel deploy_to_vercel devolvió Tool deploy_to_vercel not found. Se requiere una vía de administración de Vercel funcional; el navegador necesita autorización de fallback antes de usarse para este servicio.
- Cuenta OWNER sigue pendiente por elección del usuario. No se enviaron correos ni invitaciones.

| Funcionalidad | Estado | Prueba | Resultado | Observaciones |
| --- | --- | --- | --- | --- |
| Recursión de perfiles | Corregida | SQL bajo rol authenticated | PASS | Migración aplicada solo a GUBIA |
| Lectura clínica por roles | Parcial verificada | Fixtures para 5 perfiles + anónimo | PASS | Falta suite completa de escrituras |
| Validación de promociones | Implementada | 7 tests unitarios de permisos/entradas | PASS | Falta creación autenticada E2E |
| Protección anónima de admin | Verificada localmente | HTTP /admin y /admin/codigos | 307 /login | Falta prueba del login OWNER |
| Compilación | Verificada | TypeScript + next build | PASS | No equivale a producción |
| QR y atribución | Incompleta | Inspección del código | No aprobada | Falta ruta de tracking |
| Disponibilidad y reservas | Incompleta | Inspección de RPC/UI | No aprobada | P0 de validación y abuso pendientes |
| Vercel/producción | Bloqueada | Conector | Sin proyecto/deploy | No hay URL de producción verificada |
