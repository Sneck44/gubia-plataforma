# Revisión de diseño y adaptación de GUBIA

## Alcance

- Portada diferenciada para personal y pacientes, identidad verde GUBIA, fondos suaves, tarjetas y botones con jerarquía consistente.
- Acceso con etiquetas visibles, mostrar/ocultar contraseña y estado de envío pendiente.
- Panel con navegación por rol, búsqueda de secciones, ubicación activa y accesos directos a módulos existentes.
- Menú plegable y navegación inferior en móvil; barra lateral desplazable en escritorio.
- Tablero con métricas reales, atajos y guía a los catálogos de configuración. Sin cifras, tendencias ni estados de configuración inventados.
- Formularios flexibles, controles de al menos 44 px, fuentes de 16 px en campos móviles y tablas con desplazamiento horizontal propio.
- Hover solo como mejora visual para dispositivos con puntero; foco visible, uso táctil y preferencia de movimiento reducido.
- Estado de carga del panel sin cifras simuladas.

## Límites

Estos cambios no habilitan reservas, no cambian permisos ni sustituyen la configuración pendiente de producción. La cuenta provisional de prueba se utiliza exclusivamente para verificar el acceso existente.

## Verificación (27 de septiembre de 2026, UTC)

- Build de producción y TypeScript: aprobados.
- Navegador Chromium, 40 combinaciones: 8 rutas a 320, 390, 768, 1024 y 1440 px. Todas respondieron HTTP 200, con contenido y sin desbordamiento horizontal de la página. No se detectaron errores JavaScript de página.
- Rutas: portada, login, agendar, consultar, panel, sucursales, citas e indicadores. El formulario de sucursales se abrió para comprobar sus campos.
- Acceso con cuenta de prueba: aprobado. Búsqueda de sucursales en menú móvil y cierre del menú tras navegar: aprobados.
- Inspección visual de capturas de portada, login y panel en móvil y escritorio.
- Limitación: la emulación de tamaños en Chromium no sustituye pruebas en dispositivos físicos Safari/iOS y Android. Reservas no habilitadas; no se crearon pacientes ni citas durante esta revisión.

## Corrección de entrega de estilos

Una captura del preview en iPhone mostró la nueva estructura HTML con estilos incompletos. La compilación correcta por sí sola no comprobaba la apariencia del despliegue protegido. Se separó el diseño de la compilación de utilidades Tailwind en `public/gubia-design-v2.css`, enlazado explícitamente desde el layout con una URL versionada. Al cambiar este archivo en futuras entregas, incrementar la versión de su nombre y actualizar el enlace del layout. No se confirmó la causa exacta de la discrepancia remota porque la conexión Vercel disponible no tiene acceso al despliegue protegido.
