-- Quitar la policy de SELECT pública sobre storage.objects para `club-assets`.
-- El bucket está marcado como público (id=club-assets, public=true) y eso ya
-- hace que las URLs `/storage/v1/object/public/club-assets/...` sirvan los
-- archivos sin pasar por RLS. La policy de SELECT abierta sólo habilitaba
-- LISTADO (`/object/list/club-assets`), que es lo que el advisor flagea.
--
-- Después de este cambio:
--   - Logos accesibles vía URL pública: ✅ siguen funcionando
--   - Listado de objetos del bucket por anon: ❌ ya no es posible
--   - Subida/edición/borrado: sigue requiriendo authenticated (auth_*_club_assets)

drop policy if exists "public_read_club_assets" on storage.objects;
