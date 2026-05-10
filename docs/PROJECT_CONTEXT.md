# Club OS - contexto operativo del proyecto

Ultima revision: 2026-05-10.

Este documento resume el estado real observado en el repo, la base Supabase conectada y la carpeta externa de design system. La idea es que sirva como punto de partida rapido antes de tocar codigo.

## Lecturas obligatorias antes de trabajar

- `AGENTS.md`: este proyecto usa Next.js 16.2.1 y avisa que las APIs/convensiones pueden diferir de lo conocido. Antes de escribir codigo Next, leer la guia relevante en `node_modules/next/dist/docs/`.
- `docs/AI_GUIDELINES.md`: exige leer README/contexto, mantener documentacion alineada, no adivinar estructura DB y tener cuidado especial con cobros/deuda/RPC.
- `docs/PRODUCT_MODEL.md`: define el modelo de producto "Cobros primero".
- `docs/CONTEXTO_APLICACION.md`: util como base, pero esta parcialmente desactualizado. Este documento refleja lo observado al 2026-05-10.

## Stack

- Next.js 16.2.1 con App Router.
- React 19.2.4.
- TypeScript.
- Tailwind CSS 4.
- Supabase: `@supabase/ssr` 0.7.0 y `@supabase/supabase-js` 2.99.3.
- Resend para emails.
- `xlsx` para importacion de lineas de cargos.
- `lucide-react` para iconos.

Scripts:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Producto

Club OS es una app para operar un club deportivo/social:

- Registro publico de socios.
- Panel admin con autenticacion.
- Gestion de socios, grupos, cargos, cuotas, pagos, egresos, sponsors y ajustes del club.
- Superficie publica de club/demo en `/club`.
- Landing de producto en `/`.

## Modelo mental del producto

Desde mayo de 2026 el producto se ordena bajo el principio **Cobros primero**:

- La pregunta central del admin es: quien debe pagar, por que, cuanto pago, cuanto falta y que accion sigue.
- **Cuota mensual** es el flujo principal y recurrente.
- **Cobros y pedidos** cubre viajes, torneos, inscripciones, indumentaria y listas variables.
- **Caja** no crea deuda: lee ingresos desde pagos y permite registrar egresos reales.
- **Grupos** son un atajo operativo para asignar cobros, no el centro del sistema.
- **Personas puntuales** siempre deben poder agregarse a un cobro sin depender de un grupo.

La UI debe hablarle a un tesorero no tecnico. Evitar exponer conceptos internos como `charges`, `member_charges` o "cargo" cuando "cobro", "pedido", "linea" o "egreso" sea mas claro.

Reglas de negocio que conviene no romper:

- La deuda se calcula desde cargos/pagos; no debe persistirse como verdad manual.
- `member_charges.amount - paid_amount` es la base operativa del saldo.
- Un pago se registra por RPC para mantener atomicidad.
- La cuota mensual se modela como `charge_definitions.category = 'membership'` + `charges.billing_period`.
- Los cargos manuales pueden ser por socios, tasas o pedidos heterogeneos con lineas externas.

## Rutas principales

Publico:

- `/`: landing de Club OS.
- `/registro`: redirect permanente a `/club/registro` desde `next.config.ts`.
- `/club`: sitio publico/demo del club.
- `/club/registro`: formulario publico de alta de socio, inserta `members` con `status = 'pending'`.
- `/club/proyectos/[slug]`: paginas estaticas de proyectos desde `src/app/club/content.ts`.

Admin:

- `/admin/login`: login con Supabase Auth por email/password.
- `/admin`: dashboard.
- `/admin/socios`: listado, solicitudes, busqueda, deuda agregada.
- `/admin/members/[id]` y `/admin/socios/[id]`: ficha de socio.
- `/admin/groups` y `/admin/groups/[id]`: grupos y miembros.
- `/admin/charges` y `/admin/charges/[id]`: Cobros. Incluye cuota mensual, cobros simples y pedidos/indumentaria.
- `/admin/expenses`: Caja. Muestra ingresos por pagos y egresos reales.
- `/admin/settings`: configuracion del club, logo, sponsors, email.

API routes:

- `POST /api/payments/notify`: envia email de confirmacion de pago si hay sesion admin, flag activo y email del socio.
- `GET /api/test-email`: test de Resend.

## Autenticacion y Supabase en Next

Estado actual observado:

- `src/middleware.ts` refresca sesion Supabase y protege server-side `/admin/*`, excepto `/admin/login`.
- `src/app/(admin)/layout.tsx` hace segundo chequeo con `getServerSupabase()` y solo monta `AdminShell` si hay usuario.
- `src/app/(admin)/admin/login/page.tsx` usa `supabase.auth.signInWithPassword`.
- `src/lib/supabase/browser.ts` y `src/lib/supabase/server.ts` separan clientes browser/server con cookies.
- `src/lib/supabase.ts` conserva un cliente universal para la capa de datos existente.

Nota: `docs/CONTEXTO_APLICACION.md` todavia menciona login local con `localStorage`; eso ya no coincide con el codigo actual.

## Mapa de codigo

Configuracion:

- `src/config/club.ts`: fallback de club.
- `src/config/active-club.ts`: fusiona fallback con `club_settings`.
- `src/config/payment-method.ts`: metodos `transfer`, `cash`, `mercadopago`.

Datos:

- `src/lib/supabase.ts`: tipos manuales de DB, miembros y settings.
- `src/lib/charges.ts`: nucleo de cargos, pagos, cuotas, lineas, importacion y RPC.
- `src/lib/dashboard.ts`: metricas admin/publicas.
- `src/lib/groups.ts`: grupos y `member_groups`.
- `src/lib/expenses.ts`: egresos/movimientos.
- `src/lib/sponsors.ts`: sponsors y Storage.
- `src/lib/club-logo.ts`: logo principal en bucket `club-assets`.
- `src/lib/email.ts`: email de confirmacion de pago.
- `src/lib/whatsapp-reminder.ts`: mensajes/link de WhatsApp para deuda.

UI:

- `src/components/ui/*`: primitivas locales (`Button`, `Card`, `Badge`, `Alert`, `Input`, `Select`, `Table`, etc.).
- `src/components/admin/*`: shell, modales, secciones admin, carga de logo, importador de lineas.
- `src/components/club/*`: sitio publico del club.
- `src/components/marketing/*`: landing de producto.

## Supabase remoto

Proyecto conectado:

- Nombre: `club-os`.
- Project ref: `hbhirmhesnztxqgppaqp`.
- Region: `us-east-1`.
- Estado: `ACTIVE_HEALTHY`.
- Postgres: 17.6.
- Edge Functions: ninguna.

Migraciones remotas aplicadas: coinciden con las 12 migraciones locales en `supabase/migrations/`, incluida `20260507202326_member_charges_lines_with_external_buyers`.

Extensiones instaladas relevantes:

- `pgcrypto`.
- `uuid-ossp`.
- `pg_cron`.
- `pg_stat_statements`.
- `supabase_vault`.

Cron:

- Job activo `generate-yearly-membership-charges`.
- Schedule: `0 0 1 1 *`.
- Ejecuta generacion anual de cuotas via `generate_membership_charges_range`.

Storage:

- Bucket `club-assets`.
- Es publico.
- Politicas sobre `storage.objects`: insert/update/delete para rol `authenticated` sobre ese bucket.
- No se observo policy de SELECT en `storage.objects`; al ser bucket publico, los assets se consumen por URL publica.

## Esquema Supabase observado

Tablas publicas con RLS habilitado:

- `members` (0 rows): socios. `dni` es unico. Estados esperados: `pending`, `active`.
- `club_settings` (0 rows): configuracion del club, cuota, colores, logo, alias, metodo y dia de vencimiento.
- `groups` (0 rows): grupos/deportes/comisiones.
- `member_groups` (0 rows): relacion socio-grupo, unique `(member_id, group_id)`.
- `charges` (21 rows): cargos. Puede apuntar a `charge_definitions` y opcionalmente a `groups`.
- `member_charges` (208 rows): lineas/deudas. Ahora permite `member_id = null` si hay `external_name`.
- `charge_payments` (34 rows): pagos, con metodo.
- `expenses` (1 row): egresos, opcionalmente asociados a un cargo.
- `charge_definitions` (3 rows): definiciones de cargo/cuota.
- `club_sponsors` (3 rows): sponsors.

Constraints relevantes:

- `members.dni` unico.
- `member_groups(member_id, group_id)` unico.
- `member_charges_buyer_required`: requiere `member_id` o `external_name`.
- `member_charges_quantity_positive`: `quantity > 0`.
- `charge_payments.payment_method`: `cash`, `transfer`, `mercadopago`.
- `charge_payments.member_charge_id` ON DELETE CASCADE.
- `charges.group_id` ON DELETE CASCADE.
- `expenses.charge_id` ON DELETE SET NULL.

RLS/policies relevantes:

- `authenticated` tiene `ALL` en tablas admin (`members`, `groups`, `charges`, `member_charges`, `charge_payments`, `expenses`, `club_settings`, `club_sponsors`, `charge_definitions`).
- `anon` puede insertar en `members` solo con `status = 'pending'`.
- `anon` puede seleccionar `club_settings` y `groups`.
- No hay vistas publicas observadas.

Funciones publicas observadas:

- `register_charge_payment(p_member_charge_id, p_amount, p_paid_at, p_payment_method)` - `security definer`.
- `assign_charge_to_missing_members(p_charge_id)` - `security definer`.
- `handle_member_activation()` - trigger, `security definer`.
- `public_member_stats()` - `security definer`.
- `public_active_sponsors()` - `security definer`.
- `get_charge_financials(p_charge_id)`.
- `charge_has_payments(p_charge_id)`.
- Funciones de cuota mensual: `ensure_membership_charge_definition`, `generate_monthly_charges`, `generate_monthly_membership_charges`, `generate_membership_charges_range`, `update_future_unpaid_membership_charges`, `membership_due_date_for_period`, etc.

Triggers:

- `members.trg_member_activation`: al activar socio asigna cargos faltantes.
- `club_settings.sync_membership_definition_after_club_settings`: sincroniza definicion de cuota despues de insert/update.
- `club_sponsors.trg_touch_club_sponsors`: actualiza `updated_at`.

## Design system externo

Carpeta recibida:

- `C:/Users/Usuario/Downloads/Club OS Design System/standalone/index.html`
- `01-foundations.html`
- `02-components-admin.html`
- `03-components-public.html`

Resumen:

- Principio base: "two surfaces, one kit".
- Superficie admin: clara, `slate-50`, cards blancas, tablas densas, foco en operacion.
- Superficie publica: oscura, glassy, gradientes sobre `slate-950`, hero/crest/sponsor strip.
- Colores base del DS: primary `#3B82F6`, accent `#F97316`, slate scale, semanticos success/warning/danger/info.
- El repo actual usa hooks por club: `--club-primary`, `--club-accent`, con fallback Ventarron `#03033f` y `#f97316`.
- Tipografias del DS: Inter para UI y Space Grotesk para display. El repo actual usa Geist + `--font-club-display`; si se busca fidelidad plena al DS, revisar fuentes en `src/app/layout.tsx`.
- Primitivas documentadas: botones, inputs, form fields, badges, cards, page header, tables, metric cards, hero cards, glass cards.
- Copy: espanol rioplatense, directo y de producto real. Ejemplos de tono: "Hacete socio", "Sumate", "al dia".

Implicacion practica:

- Para admin, priorizar interfaces compactas, escaneables, con tablas, filtros, acciones claras e iconos.
- Para publico/club, mantener el lenguaje visual mas expresivo: oscuro, glass, marca del club y sponsors.
- Evitar crear un tercer lenguaje visual: adaptar las primitivas locales (`src/components/ui`) a los tokens del DS.

## Hallazgos y riesgos

- `docs/CONTEXTO_APLICACION.md` esta desactualizado en auth admin y email de pagos.
- La convencion `src/middleware.ts` compila, pero Next 16.2.1 avisa que `middleware` esta deprecado a favor de `proxy`.
- `src/config/active-club.ts` calcula `logoFromDb` pero devuelve `logo: logoFromDb`; si `logo_url` esta vacio, puede anular el fallback. Conviene cambiar a `logo: logoFromDb || fallbackClubConfig.logo`.
- Los tipos manuales en `src/lib/supabase.ts` tienen algunas firmas de RPC que no coinciden exactamente con la DB observada. Ejemplos: `generate_monthly_membership_charges` en DB usa `p_run_date`, no `p_period`; `generate_membership_charges_range` usa `p_start_period`/`p_end_period`, no `p_from`/`p_to`; `update_future_unpaid_membership_charges` usa `p_from_period`, no `p_amount`.
- Hay cambios locales sin commitear al momento del analisis en `package.json`, `package-lock.json`, cargos/admin modal, `src/lib/charges.ts`, `src/lib/supabase.ts`, importador de lineas y una migracion nueva. Tratar ese estado como trabajo existente y no revertir.
- `.env.local` contiene secretos reales. No exponerlos en documentacion, logs o commits; si ya fueron compartidos fuera del entorno local, rotarlos.
- La DB remota tiene tablas base con 0 rows para socios/grupos/settings, pero cargos y pagos con datos. Validar si es entorno demo, staging o produccion antes de hacer cambios destructivos.

## Flujo recomendado para nuevas tareas

1. Leer este documento, `AGENTS.md` y `docs/AI_GUIDELINES.md`.
2. Si se toca Next.js, consultar primero la guia relevante en `node_modules/next/dist/docs/`.
3. Si se toca Supabase, confirmar esquema real con MCP/SQL y actualizar migraciones.
4. Si se toca cobros/deuda, validar impacto en `member_charges`, `charge_payments`, RPCs y dashboard.
5. Si se toca UI, mirar el design system externo y reutilizar primitivas de `src/components/ui`.
6. Correr como minimo `npm run lint`; para cambios amplios, tambien `npm run build`.
7. Actualizar documentacion cuando cambien flujos, datos, arquitectura o integraciones.

## Comandos utiles

```bash
npm run lint
npm run build
npm run dev
```

Para inspeccion rapida:

```bash
rg "registerChargePayment|createCharge|member_charges|charge_payments" src
rg "from\\(\"|rpc\\(" src/lib src/app
```
