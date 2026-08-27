# Deploy en Vercel - Club OS

Ultima revision: 2026-08-26.

## Estado esperado

- Repo remoto: `https://github.com/Nahuelfd10/club-os.git`.
- Branch de deploy: `main`.
- Framework: Next.js.
- Build command: `npm run build`.
- Install command: `npm install`.
- Output directory: dejar vacio, Vercel lo detecta automaticamente para Next.js.
- Node.js: `>=20.9.0`.

## Variables de entorno

Cargar en Vercel, al menos para Production y Preview:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_TEST_TO_EMAIL`

Usar `.env.example` como plantilla de nombres. No subir valores reales al repo.

## Primer deploy recomendado

1. Importar el repo en Vercel desde GitHub.
2. Seleccionar branch `main`.
3. Confirmar Node.js 20 o superior.
4. Cargar variables de entorno.
5. Ejecutar el primer deploy con dominio temporal de Vercel.
6. Revisar logs de build.
7. Ejecutar QA minimo sobre el dominio temporal.

## QA post deploy

- `/` carga landing de Club OS.
- `/ventarron` carga sitio publico.
- `/ventarron/registro` carga registro.
- `/ventarron/admin` redirige a login interno.
- `/ventarron/socio` redirige a login de socio.
- Login interno con email y contrasena funciona.
- Registro de socio deja la solicitud pendiente.
- Socio aprobado entra con DNI y contrasena.
- Socio puede cargar comprobante valido.
- Tesoreria puede aprobar o rechazar comprobante.
- Caja refleja ingresos aprobados y egresos.

## Despues del primer deploy

- Mantener el dominio temporal durante la primera revision.
- Conectar dominio propio solo despues de pasar QA.
- Revisar datos demo antes de compartir con testers reales.
