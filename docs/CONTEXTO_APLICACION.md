# Contexto de la aplicacion - Club OS

Ultima revision: 2026-08-25.

Club OS es una aplicacion web para operar un club deportivo o social con foco en cobros, socios y caja. El producto esta en etapa MVP avanzado / pre-piloto: ya es usable con acompanamiento cercano para 1 a 3 clubes test, pero todavia no debe tratarse como autoservicio multi-club.

## Estado funcional

- Landing de producto en `/`.
- Sitio publico del club en la URL canonica `/{slug}`; hoy el slug default es `/ventarron`.
- Registro publico de socios en `/{slug}/registro`, con alta pendiente hasta revision administrativa.
- Login compartido por club en `/{slug}/login`; acepta DNI para socios o email para usuarios internos.
- Recuperacion de contrasena desde `/{slug}/login`; acepta DNI de socio o email de usuario interno.
- Panel admin en `/{slug}/admin` con dashboard, socios, cuotas/listas, pagos enviados, caja, grupos y ajustes.
- Portal de socio en `/{slug}/socio` con estado de deuda, cuotas/cobros, historial y carga de comprobantes.
- Bandeja de tesoreria en `/{slug}/admin/payments` para ver comprobantes, abrir archivo firmado, aprobar o rechazar.

Rutas legacy mantenidas:

- `/club` redirige a `/{slug}`.
- `/registro` redirige a `/{slug}/registro`.
- `/admin` redirige a `/admin/login`, que solo muestra acceso reservado de plataforma.

## Modelo de producto

El principio rector es **Cobros primero**:

- La cuota mensual es el flujo recurrente principal.
- Las listas de recaudacion cubren viajes, torneos, indumentaria, inscripciones u otros cobros puntuales.
- Caja no crea deuda; lee ingresos desde pagos registrados y permite cargar egresos reales.
- Grupos ayudan a asignar cobros, pero siempre debe existir operacion por personas puntuales.
- WhatsApp sigue siendo manual: mensajes listos para copiar/abrir, sin automatizacion de envio.

La UI debe hablarle a tesoreria con lenguaje simple: socio, cuota, lista, pago, comprobante, deuda, egreso, al dia, pendiente, en revision, rechazado.

## Stack

| Capa | Tecnologia |
| --- | --- |
| Framework | Next.js 16.2.1 App Router |
| Runtime | React 19.2.4 |
| Estilos | Tailwind CSS 4 |
| Lenguaje | TypeScript |
| Backend | Supabase Postgres, Auth, Storage y RPC |
| Email | Resend |
| Importacion | xlsx |

Antes de tocar codigo Next.js, leer `AGENTS.md` y la guia relevante en `node_modules/next/dist/docs/`.

## Autenticacion y autorizacion

- `src/proxy.ts` reemplaza al middleware legacy de Next y refresca la sesion Supabase.
- El proxy protege `/{slug}/admin` y `/{slug}/socio`, y reescribe rutas canonicas hacia las rutas internas `/admin`, `/club` y `/socio`.
- `src/app/(admin)/layout.tsx` hace un segundo chequeo server-side y solo monta `AdminShell` para perfiles internos activos.
- La autorizacion se apoya en `user_profiles`:
  - Internos: `club_admin`, `treasurer`, `secretary`, `viewer`.
  - Socio: `member` con `member_id`.
- La ficha de socio permite enviar o reenviar acceso al portal; requiere email del socio y `SUPABASE_SERVICE_ROLE_KEY` en el servidor.

## Supabase y datos

La base remota revisada el 2026-07-09:

- Proyecto: `club-os` (`hbhirmhesnztxqgppaqp`), region `us-east-1`, estado `ACTIVE_HEALTHY`.
- Postgres 17.6.
- Tablas piloto con RLS activo: `members`, `user_profiles`, `payment_submissions`, `charges`, `member_charges`, `charge_payments`, `expenses`, `club_settings`, `club_sponsors`.
- Storage:
  - `club-assets`: publico, usado para logo/sponsors.
  - `payment-proofs`: privado, limite 10 MB, tipos permitidos JPG, PNG, WebP y PDF.
- RPCs relevantes existentes: `register_charge_payment`, `approve_payment_submission`, `reject_payment_submission`, `current_user_profile`, `current_user_member_id`, `can_manage_payments`, `claim_member_profile_by_email`.

La app usa la anon key en cliente y server helpers normales. Las operaciones administrativas que crean usuarios o links de recuperacion usan service role solo en Route Handlers server-side.

Notas del cierre pre-piloto del 2026-08-25:

- Las tablas nuevas de portal (`user_profiles`, `payment_submissions`) tienen grants explicitos para `authenticated`, ademas de RLS.
- `payment_submissions` requiere un `member_charge_id` propio del socio y no permite enviar un monto mayor al saldo pendiente de esa linea.
- El bucket privado `payment-proofs` queda con limite 10 MB y MIME types permitidos: JPG, PNG, WebP y PDF.
- La app evita links operativos directos a `/admin/...` desde UI y genera rutas canonicas `/{slug}/admin/...` mediante helpers de rutas.

## Flujos clave para piloto

### Alta y acceso de socio

1. El socio entra a `/{slug}/registro`.
2. Completa datos, DNI, email y contrasena.
3. Queda como solicitud pendiente.
4. Admin revisa en Socios.
5. Admin aprueba y puede enviar/reenviar acceso desde la ficha.
6. El socio entra por `/{slug}/login` y ve `/{slug}/socio`.
7. Si pierde acceso, puede pedir recuperacion con DNI; un usuario interno puede pedirla con email.

### Pago con comprobante

1. El socio ve cuotas/cobros pendientes en su portal.
2. Carga monto, fecha, medio de pago y comprobante.
3. El comprobante queda `pending` y bloquea duplicados pendientes para la misma cuota/cobro.
4. Tesoreria revisa en `/{slug}/admin/payments`.
5. Si aprueba, la RPC registra el pago real y actualiza deuda.
6. Si rechaza, queda motivo visible para el socio.

### Tesoreria diaria

1. Dashboard muestra solicitudes, deuda y recordatorios.
2. Socios muestra padron, solicitudes y bajas.
3. Cuotas y listas concentra cobranza mensual y listas puntuales.
4. Pagos enviados concentra comprobantes a revisar.
5. Caja muestra ingresos desde pagos y egresos manuales.

## Material explicativo vivo

- `clubos_explicacion_operativa.html` es el HTML standalone para explicar el producto a clubes o colaboradores.
- Resume accesos, roles, registro de socios, cuotas/listas, comprobantes, caja/gastos, modulos actuales y alcance v1.
- Debe actualizarse junto con este documento cuando cambien flujos visibles, roles, rutas principales, modulos del panel o reglas operativas importantes.
- La intencion es que siga siendo una pieza clara para abrir en navegador, imprimir o exportar a PDF durante demos y conversaciones comerciales.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL publica de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Route Handlers admin para crear usuarios y links |
| `RESEND_API_KEY` | Envio de emails |
| `RESEND_FROM_EMAIL` | Remitente |
| `RESEND_TEST_TO_EMAIL` | Destino del test de email |

No documentar ni commitear valores reales.

## Pendientes antes de clubes test

- Reconciliar nombres/timestamps de migraciones locales contra historial remoto antes de tocar produccion.
- Hacer QA end-to-end con usuarios reales o seed controlado: registro, aprobacion, invitacion, login socio, comprobante, aprobacion/rechazo y deuda actualizada.
- Limpiar datos demo que puedan confundir antes de mostrar a un club real.
- Definir un usuario administrador real por club y verificar que no haya perfiles internos sobrantes.
- Mantener el alcance v1 sin multi-club real, sin automatizar WhatsApp y sin sumar modulos grandes como rifas.

## Verificacion local reciente

El 2026-08-25 se valido:

- `npm run lint` con Node 24.19.0 bundled.
- `npm run build` con Node 24.19.0 bundled.
- Produccion local en puerto 3001:
  - `/` responde 200.
  - `/club` redirige 307 a `/ventarron`.
  - `/registro` redirige 308 a `/ventarron/registro`.
  - `/ventarron` responde 200.
  - `/ventarron/registro` responde 200.
  - `/ventarron/admin` redirige 307 a `/ventarron/admin/login`.
  - `/ventarron/socio` redirige 307 a `/ventarron/socio/login`.

## Comandos de verificacion

```bash
npm run lint
npm run build
```

Next.js 16.2.1 requiere Node >= 20.9.0. En esta maquina se valido con Node 24.19.0 desde el runtime bundled de Codex.
