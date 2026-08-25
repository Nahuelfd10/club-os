# Checklist de onboarding para clubes piloto

Usar este checklist para cada club que entre al piloto gratuito. El objetivo es dejar el club operativo con el minimo de configuracion y sin mezclar datos demo con datos reales.

## 1. Preparar entorno

- Confirmar slug canonico del club. Ejemplo actual: `/ventarron`.
- Confirmar que el deploy usa Node >= 20.9.0.
- Confirmar variables de entorno:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
- Ejecutar `npm run lint` y `npm run build`.

## 2. Configurar identidad del club

- Nombre publico del club.
- Logo.
- Color primario y color de acento.
- Sponsors opcionales.
- Link publico a compartir: `https://dominio/{slug}`.
- Link de alta de socios: `https://dominio/{slug}/registro`.

## 3. Configurar cobranza

- Cuota mensual vigente.
- Dia de vencimiento mensual.
- Alias o dato de transferencia.
- Medio de pago default.
- Definir si el club arranca cobrando solo cuota o tambien listas puntuales.

## 4. Preparar usuarios

- Crear o confirmar usuario interno principal.
- Verificar rol:
  - `club_admin` para quien administra todo.
  - `treasurer` para quien aprueba pagos.
  - `secretary` para padron y altas.
  - `viewer` solo lectura.
- Cargar email real en cada socio que vaya a probar portal.
- Desde ficha de socio, usar **Enviar / reenviar acceso** para habilitar portal.

## 5. Cargar datos minimos

- Socios activos iniciales.
- Solicitudes pendientes de prueba si se quiere mostrar flujo de aprobacion.
- Grupos/deportes utiles para operar.
- Cuotas mensuales exigibles.
- Una lista puntual de prueba solo si el club la necesita en la primera semana.
- Egresos reales del mes si quieren ver caja desde el inicio.

## 6. QA antes de compartir

- Visitante:
  - `/` carga landing.
  - `/{slug}` carga sitio publico.
  - `/{slug}/registro` permite enviar solicitud.
  - `/{slug}/admin` redirige a `/{slug}/login`.
  - `/{slug}/socio` redirige a `/{slug}/login`.
- Admin:
  - Puede entrar a `/{slug}/admin`.
  - Ve socios, cuotas/listas, pagos enviados, caja y ajustes.
  - Puede aprobar/rechazar comprobantes.
- Socio:
  - Puede entrar con DNI/email y contrasena.
  - Ve deuda y pagos.
  - Puede subir comprobante JPG, PNG, WebP o PDF menor a 10 MB.
  - Ve estado pendiente/aprobado/rechazado del comprobante.

## 7. Limpieza de datos demo

- Revisar socios demo, DNI ficticios y pagos de prueba.
- Revisar listas/cobros que no pertenezcan al club.
- Revisar comprobantes cargados en `payment-proofs`.
- Confirmar que `club_settings` refleja al club piloto.
- Confirmar que no queden usuarios internos ajenos al piloto.

## 8. Mensaje de arranque sugerido

> Les dejamos el club cargado para probar durante estas semanas. La idea es que usen principalmente alta de socios, control de cuota, comprobantes y caja. WhatsApp sigue siendo manual: el sistema les deja claro a quien cobrarle y con que datos, pero no envia mensajes automaticos.
