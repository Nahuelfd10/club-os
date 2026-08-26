# Checklist beta cerrada - Club OS

Ultima revision: 2026-08-26.

## Alcance

Esta beta es cerrada y acompanada. El objetivo es probar Club OS con el club piloto `ventarron`, sin venderlo como autoservicio multi-club y sin sumar modulos grandes antes de validar el flujo principal.

El circuito incluido es:

1. Sitio publico del club.
2. Registro de socio.
3. Revision y aprobacion interna.
4. Login de socio con DNI y contrasena.
5. Portal del socio con deuda, cuotas/listas e historial.
6. Carga de comprobante privado.
7. Revision de tesoreria.
8. Aprobacion o rechazo.
9. Caja actualizada con ingresos aprobados y egresos cargados.

## Fuera del release

LIFA queda explicitamente fuera de Club OS. No debe incluirse ni commitearse como parte de esta beta:

- `src/app/lifa`
- `src/app/api/lifa`
- `src/components/lifa`
- `public/lifa`
- `outputs`

Los archivos separados de LIFA se preservan fuera de este repo en `D:\Proyectos\lifa` para moverlos o versionarlos luego como proyecto independiente.

## Supabase

Proyecto remoto esperado: `club-os` (`hbhirmhesnztxqgppaqp`).

Antes de compartir la beta, confirmar:

- Tablas clave: `members`, `user_profiles`, `payment_submissions`, `charges`, `member_charges`, `charge_payments`, `expenses`, `club_settings`, `club_sponsors`.
- RPCs clave: `register_charge_payment`, `approve_payment_submission`, `reject_payment_submission`, `current_user_profile`, `current_user_member_id`, `can_manage_payments`.
- Bucket `payment-proofs` privado.
- Limite de comprobantes: 10 MB.
- Tipos permitidos: JPG, PNG, WebP y PDF.
- Policy de envio de comprobantes: el socio solo puede enviar comprobantes sobre una linea propia y por monto menor o igual al saldo pendiente.
- Al menos un usuario interno activo con rol `club_admin` o `treasurer`.
- Datos demo revisados para que no confundan durante la demo.

## Deploy

Destino recomendado: Vercel, primero con dominio temporal.

Variables requeridas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_TEST_TO_EMAIL`

Confirmar Node >= 20.9.0 en el entorno de deploy.

## Verificacion tecnica

Ejecutar sobre el estado final:

```bash
npm run lint
npm run build
```

Confirmar en la salida del build que no aparecen rutas `/lifa` ni `/api/lifa/results`.

## QA minimo

Rutas:

- `/` carga landing de Club OS.
- `/ventarron` carga sitio publico.
- `/ventarron/registro` permite registro.
- `/ventarron/admin` protege panel interno.
- `/ventarron/socio` protege portal socio.

Flujo admin:

- Interno entra con email y contrasena.
- Ve dashboard, socios, cuotas/listas, pagos enviados, caja, grupos y ajustes.
- Puede aprobar socio pendiente.
- Puede crear lista puntual.
- Puede cargar egreso.

Flujo socio:

- Socio se registra.
- Queda pendiente.
- Una vez aprobado, entra con DNI y contrasena.
- Ve deuda, historial y cobros pendientes.
- Sube comprobante valido.
- No puede subir monto mayor al saldo.
- No puede duplicar comprobante pendiente para la misma cuota/lista.

Flujo tesoreria:

- Ve comprobante en Pagos enviados.
- Puede abrir archivo firmado.
- Puede aprobar y se actualiza deuda/caja.
- Puede rechazar y el socio ve el motivo.
- Caja refleja ingresos aprobados y egresos cargados.

## Material de apoyo

Mantener actualizado `clubos_explicacion_operativa.html` junto con cualquier cambio visible de flujo, modulo o regla operativa.
