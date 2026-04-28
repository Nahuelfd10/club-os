-- =============================================================================
-- Fase 3: RLS estricta + policies con auth.uid()
--
-- Modelo:
--   * authenticated → admin del club (cualquier usuario logueado en MVP)
--                     puede hacer todo en todas las tablas
--   * anon → sólo lo mínimo público:
--             - INSERT en members (registro público; status='pending' obligatorio)
--             - SELECT en club_settings (branding del /club page)
--             - SELECT en groups (mostrar grupos en página pública)
--             - EXECUTE en RPC public_member_stats() (stats agregados sin leak)
--   * Storage bucket club-assets:
--             - public SELECT (logo accesible para el front)
--             - authenticated INSERT/UPDATE/DELETE
-- =============================================================================

-- 1) Limpieza de policies wide-open
drop policy if exists "Allow all on charge_payments" on public.charge_payments;
drop policy if exists "Allow all on charges" on public.charges;
drop policy if exists "Allow all on expenses" on public.expenses;
drop policy if exists "Allow all on groups" on public.groups;
drop policy if exists "Allow all on member_charges" on public.member_charges;
drop policy if exists "Allow all on member_groups" on public.member_groups;
drop policy if exists "Allow insert club_settings" on public.club_settings;
drop policy if exists "Allow select club_settings" on public.club_settings;
drop policy if exists "Allow update club_settings" on public.club_settings;
drop policy if exists "Allow insert for everyone" on public.members;
drop policy if exists "Allow select for everyone" on public.members;
drop policy if exists "Allow update for everyone" on public.members;

-- Storage
drop policy if exists "Allow public read club-assets" on storage.objects;
drop policy if exists "Allow update club-assets" on storage.objects;
drop policy if exists "Allow uploads to club-assets" on storage.objects;

-- 2) RLS habilitada en charge_definitions (estaba sin RLS)
alter table public.charge_definitions enable row level security;

-- 3) Policies authenticated: acceso total al panel
create policy "admin_all_members" on public.members
  for all to authenticated using (true) with check (true);

create policy "admin_all_groups" on public.groups
  for all to authenticated using (true) with check (true);

create policy "admin_all_member_groups" on public.member_groups
  for all to authenticated using (true) with check (true);

create policy "admin_all_club_settings" on public.club_settings
  for all to authenticated using (true) with check (true);

create policy "admin_all_charge_definitions" on public.charge_definitions
  for all to authenticated using (true) with check (true);

create policy "admin_all_charges" on public.charges
  for all to authenticated using (true) with check (true);

create policy "admin_all_member_charges" on public.member_charges
  for all to authenticated using (true) with check (true);

create policy "admin_all_charge_payments" on public.charge_payments
  for all to authenticated using (true) with check (true);

create policy "admin_all_expenses" on public.expenses
  for all to authenticated using (true) with check (true);

-- 4) Policies anon (mínimas)
-- Registro público: sólo permite INSERT con status='pending'.
create policy "anon_insert_members_pending" on public.members
  for insert to anon
  with check (status = 'pending');

-- Branding público
create policy "anon_select_club_settings" on public.club_settings
  for select to anon
  using (true);

-- Listado de grupos en página pública
create policy "anon_select_groups" on public.groups
  for select to anon
  using (true);

-- 5) RPC público para stats agregados (sin leak fila a fila)
create or replace function public.public_member_stats()
returns table (active_members bigint)
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint as active_members
  from public.members
  where status = 'active';
$$;

revoke all on function public.public_member_stats() from public;
grant execute on function public.public_member_stats() to anon, authenticated;

-- 6) Storage policies del bucket club-assets
create policy "public_read_club_assets" on storage.objects
  for select to public
  using (bucket_id = 'club-assets');

create policy "auth_insert_club_assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'club-assets');

create policy "auth_update_club_assets" on storage.objects
  for update to authenticated
  using (bucket_id = 'club-assets')
  with check (bucket_id = 'club-assets');

create policy "auth_delete_club_assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'club-assets');
