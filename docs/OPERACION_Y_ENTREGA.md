# GUBIA — Operación y entrega para piloto

## Funciones añadidas

- Agenda diaria y semanal con fechas en horario del centro de México, filtro por sucursal y detalle por folio. Hasta 500 citas por consulta; se indica cuando se requiere filtrar más.
- Registro de llegada, confirmación, atención, cancelación, inasistencia y reprogramación validada nuevamente contra capacidad. Llegada solo el día de la cita. No se alteran estados terminales.
- Cuentas de personal desde Equipo y accesos: un administrador crea recepción, marketing y consulta; solo un superadministrador puede asignar administrador. Ninguno puede promover a superadministrador en esta interfaz ni modificar su propio rol.
- Recepción y consulta acceden a información clínica solo de la sucursal asignada. Marketing conserva indicadores sin pacientes. La desactivación del perfil bloquea nuevos accesos a los datos aunque exista un token anterior.
- MFA TOTP: configuración y verificación en Seguridad; obligatoria para gestionar cuentas. Una cuenta con un factor verificado necesita AAL2 para acceder a los datos de negocio.
- Cambio de contraseña y recuperación por correo (requiere configuración de SMTP y URL de retorno).
- Comparativo agregado por sucursal y CSV protegido; protección frente a fórmulas de hoja de cálculo. No se exportan pacientes en ese reporte.
- Cancelación pública mediante folio y clave secreta de consulta. No se permite cancelar citas ya iniciadas o con llegada registrada. Se registra el evento y se libera capacidad. Descarga de cita al calendario (.ics).
- Aplicación instalable con manifiesto e iconos. Registro del service worker desde Ayuda. Sin caché de páginas ni datos privados; pantalla informativa si falta conexión.
- Auditoría consultable y endpoint `/api/health` para supervisión externa de disponibilidad de la aplicación y conectividad básica a la base de datos.
- Preparar apertura muestra estudios con precio/duración, días y estado de agenda de cada sucursal. Configuración presente no equivale a autorización de apertura.

## Recorrido de recepción

1. Entrar con la cuenta de la sucursal y completar MFA si está configurado.
2. Abrir Agenda, seleccionar fecha y pulsar la cita.
3. Registrar llegada cuando el paciente esté presente.
4. Al concluir, marcar Atendida y registrar el ingreso real recibido. Dejar vacío conserva el valor previo.
5. Si no llega, usar No asistió. Para mover una cita activa, elegir fecha y uno de los horarios disponibles; al guardar se valida de nuevo.
6. No compartir claves de consulta, capturas clínicas ni contraseñas en grupos.

## Recorrido de administración

1. Cambiar la contraseña de la cuenta provisional desde Seguridad; no se cambió automáticamente para evitar perder el acceso del usuario.
2. Configurar MFA con el dispositivo del titular. Guardar acceso seguro al autenticador. La recuperación por pérdida de dispositivo requiere verificación de identidad por el responsable del proyecto.
3. En Equipo crear las cuentas reales, asignar sucursal a recepción/consulta y entregar credenciales por un canal privado. No se envían correos de alta automáticamente; la contraseña inicial no caduca automáticamente.
4. Revisar las cifras de Comparar sucursales y el recorrido de promociones. El ingreso registrado no representa toda la facturación ni estados financieros.
5. Consultar Historial de cambios. La auditoría almacena identificadores y operaciones, no contraseñas ni contenido clínico.

## Activación pendiente — requiere datos o servicios del propietario

- Elegir una sucursal piloto y confirmar precios, duración, horarios, capacidad y disponibilidad por sucursal. Las 28 sucursales y 685 estudios únicos del catálogo público oficial ya están cargados; las indicaciones se conservaron, pero los estudios permanecen inactivos porque la fuente no publica los datos comerciales y operativos faltantes.
- Definir dominio definitivo. Configurar Turnstile, hosts autorizados y habilitación del gateway público después de pruebas integrales.
- Configurar un proveedor SMTP y autorizar `/auth/callback` en las URL de Supabase. Probar entrega de recuperación al destinatario real. No se enviaron mensajes de prueba a terceros.
- Definir canal y proveedor de recordatorios (correo/WhatsApp), remitente, consentimiento, costos y política de entrega. Se implementó una cola privada para confirmaciones/cambios, cancelaciones y recordatorios a 24 horas, con hasta tres intentos e idempotencia del proveedor. El envío está desactivado. Requiere remitente verificado, credenciales y programación de ejecución; no se probó entrega real ni seguimiento de rebotes. WhatsApp no está integrado.
- Establecer respaldos, frecuencia, retención y almacenamiento; realizar restauración en un proyecto desechable. No se ha probado una restauración y no se promete recuperación automática en el plan gratuito.
- Configurar monitor externo para `/api/health` y destinatario autorizado de alertas. El endpoint no supervisa por sí solo el flujo de reservas ni entrega de mensajes.
- Completar revisión de privacidad, acceso del propietario y aceptación operativa con personas responsables.
- Supabase Advisor avisa que la protección contra contraseñas filtradas está desactivada: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Revisar disponibilidad del plan y habilitar antes de apertura. `private.rate_limits` y `private.notification_jobs` no tienen políticas públicas de forma deliberada.

## Pruebas de aceptación de la sucursal piloto

1. Crear reserva con datos de prueba autorizados: confirmar precio, preparación, folio y clave de consulta.
2. Intentar el mismo horario con cupo completo; debe impedir sobrecupo.
3. Consultar con clave equivocada; no debe revelar la cita.
4. Cancelar una cita futura; debe liberar el lugar y conservar trazabilidad.
5. Reprogramar desde recepción; debe mantener folio y validar el nuevo horario.
6. Registrar llegada, atender y comprobar indicadores de asistencia/ingreso.
7. Probar acceso cruzado entre sucursales, marketing y cuenta desactivada.
8. Probar en iPhone/Safari y Android reales, con texto ampliado y teclado.
9. Probar recuperación de cuenta, respaldo/restauración y alertas antes de operación real.

La publicación de estas funciones es una versión para validación. No constituye por sí sola una declaración de plataforma lista para producción clínica.


## Activar correo transaccional cuando esté autorizado

La Edge Function `gubia-notifications` necesita secretos `GUBIA_DISPATCH_TOKEN` (aleatorio de al menos 32 bytes), `RESEND_API_KEY`, `GUBIA_MAIL_FROM` (remitente verificado) y `GUBIA_MAIL_ENABLED=true`. No colocar estos valores en variables públicas ni en el repositorio. Un programador autorizado debe llamar por POST cada cinco minutos con `Authorization: Bearer <GUBIA_DISPATCH_TOKEN>`; programar usando un almacén de secretos, no una URL pública ni un valor literal dentro de SQL versionado. No hay tarea programada ni secretos de correo configurados en esta entrega.

Solo se encolan citas con correo y aceptación de privacidad. No se incluyen estudios, diagnósticos, resultados ni claves de consulta en mensajes. Reprogramar descarta trabajos pendientes del horario anterior; cancelar o registrar llegada descarta recordatorios pendientes. Existe una ventana inevitable si el proveedor ya está procesando un envío al mismo tiempo que se cambia la cita. Los trabajos vencen; los reintentos se limitan a menos de 23 horas para respetar la ventana de idempotencia. Los estados aceptados por el proveedor no confirman entrega: habilitar y validar webhooks firmados de entrega/rebote antes de una operación que dependa de esos avisos.

## Verificación de esta entrega

- Compilación Next.js y TypeScript: correcta.
- Nueve pruebas de fechas, CSV y validaciones de permisos: correctas.
- SQL transaccional con rollback: perfiles/RLS, reserva/cancelación/liberación de capacidad, operación, aislamiento de sucursales, MFA requerido para cambios de acceso y desactivación inmediata. No se conservaron los pacientes ni usuarios de las pruebas SQL.
- Navegador Chromium: 21 combinaciones de siete pantallas a 390, 768 y 1440 px; HTTP 200, sin errores JavaScript ni desbordamiento horizontal. Exportación CSV, manifiesto, iconos, endpoint de salud y pantalla sin conexión: correctos.
- Edge Functions: creación anónima 401, sesión sin MFA 403 y cancelación con credenciales inválidas 404.
- No se modificó la contraseña ni se vinculó un autenticador al usuario real. Creación de cuentas con MFA y recuperación por correo requieren una prueba de aceptación supervisada con el titular; no se declara esa prueba completada.

- Cola de correo: prueba SQL con rollback aprobó creación, deduplicación, asignación de trabajo, reintentos y descarte tras cancelación. No se enviaron mensajes.
