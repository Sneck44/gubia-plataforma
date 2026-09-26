# Estado de ejecución GUBIA — 26 septiembre 2026

## Estado real
Desarrollo funcional parcial; NO aprobado para producción. Solo se modificó el proyecto Supabase GUBIA `vcuozbrduchtrvvtyszl`. No se modificó gubia.mx ni DNS. OWNER pendiente por elección del usuario.

## Implementado
- Next.js 16.3.6, React 19.3.0, dependencias fijadas y lockfile. npm audit de producción sin hallazgos en esta ejecución.
- Autorización de servidor por rol activo, RLS sin recursión, marketing sin lectura clínica, cabeceras y respuestas privadas sin caché.
- Catálogos con alta/edición y activación: sucursales, estudios, horarios, oferta por sucursal, campañas, promotores, promociones y QR. Paginación y validaciones de servidor.
- 28 sucursales importadas del JSON del mapa oficial, con dirección, teléfonos, horarios publicados y coordenadas. Fuente y snapshot en data/. Todas tienen booking_enabled=false: horarios publicados no equivalen a capacidad médica confirmada.
- QR dinámico con PNG/SVG, copia, duplicación, pausa/archivo y ruta propia /r/token. Destino permitido /agendar. Atribución de primera visita y eventos separados de escaneo/visitante. Tokens anónimos almacenados como hash y cookie HttpOnly.
- Embudo y sesiones convertidas/no convertidas con filtros de fecha, sucursal, campaña, QR, promotor, estudio y canal. Cohorte por primera visita, resultados acumulados hasta hoy; no confundir con actividad exclusiva del intervalo. Recargar la página no retrocede el último paso alcanzado.
- Reserva transaccional con disponibilidad real, zona horaria, alineación de slots, duración, bloqueos y capacidad; bloqueo de sucursal y promoción, límites, idempotencia y separación de pacientes aunque compartan teléfono.
- Función Edge gubia-public desplegada con API key, acciones permitidas, rate limiting y CAPTCHA obligatorio para reservar. Cerrada hasta configurar explícitamente los secretos y habilitar reservas.
- Confirmación y consulta con folio más clave privada. El folio solo no revela la cita. Consentimientos registrados.
- Listas de citas/pacientes y actualización autorizada de estados e ingreso real. RPC de reprogramación con disponibilidad validada; interfaz de reprogramación pendiente.
- Auditoría de cambios sin copiar contenido clínico; tabla de auditoría sin escritura directa.

## Evidencia
| Verificación | Resultado | Límite |
| --- | --- | --- |
| 7 pruebas unitarias de permisos y validación | PASS | No son E2E |
| TypeScript y next build | PASS | Sin despliegue web todavía |
| SQL profile_rls | PASS | Fixtures temporales y rollback |
| SQL booking_gateway | PASS | Slots, privacidad, descuentos, límites, solapamiento, idempotencia, secreto, atribución y progreso, auditoría; no prueba de carga concurrente real |
| SQL staff_operations | PASS | Marketing denegado, recepción autorizada, estados, ingresos y métricas |
| Edge HTTP | PASS | Clave incorrecta 401, reservas cerradas 503, evento de conversión falsificado 400, slots inexistentes [] |
| Deno check de función Edge | PASS | Sin CAPTCHA real configurado |
| Admin anónimo | PASS | Redirección 307 al login |
| Advisor Supabase tras gateway | Sin WARN | INFO de rate_limits sin policies intencional, solo servicio |
| Prueba visual y login OWNER | Pendiente | agent-browser no inició; OWNER no creado |

Las pruebas SQL terminan en rollback; no se conservaron pacientes ni citas de prueba. Las migraciones remotas y sus archivos están reconciliados hasta 20260926135903.

## Pendientes antes de producción
- Acceso funcional a Vercel: el conector devuelve cero proyectos y deploy_to_vercel no existe. No hay URL web publicada/verificada. Se necesita vía de administración funcional.
- Configuración de OWNER, recuperación de cuenta, MFA y gestión completa de usuarios.
- Cargar catálogo oficial de estudios, confirmar precios/duraciones, capacidad y horarios operativos; no se inventaron.
- Configurar CAPTCHA y dominios permitidos; validar aviso de privacidad vigente, retención y consentimiento con GUBIA antes de habilitar reservas. No se afirma cumplimiento legal.
- Agenda día/semana/mes, interfaz de reprogramación y bloqueos, cancelación pública segura e historial de paciente.
- Exportaciones CSV/XLSX/PDF, tendencias y comparaciones, acciones de seguimiento con consentimiento.
- QR promocional: atribución implementada; el código debe introducirse en reserva, aún no se aplica automáticamente. Primera visita conserva atribución incluso si después se escanea otro QR.
- Repetición de reserva dentro de la misma sesión ya convertida requiere definir nueva sesión/flujo; hoy se rechaza para evitar duplicados.
- E2E autenticado y público con CAPTCHA, visual móvil/escritorio, accesibilidad, pruebas concurrentes reales, carga, respaldos/recuperación y monitoreo.
- CSP actual parcial; falta política completa de scripts/nonce. Calibrar rate limits para IP compartidas/proxy.
- Revisión completa de contenidos oficiales y referencia visual del usuario: imagen mencionada no adjunta; logo obtenido de gubia.mx.

## Despliegue seguro
Mantener las reservas cerradas y sucursales deshabilitadas hasta finalizar las comprobaciones. Las migraciones ya aplicadas no deben ejecutarse manualmente otra vez. Consultar README para variables y secretos. No publicar esta rama como producto terminado.
