-- =============================================================================
-- Sponsors del club: tabla + RLS + RPC público.
--
-- Diseño MVP:
--   * Sin reordenamiento manual: se muestran por created_at asc (los primeros
--     cargados quedan arriba).
--   * Sin soft-delete: borrar la fila implica borrar también el archivo en el
--     bucket club-assets/sponsors/. La app lo orquesta desde el lado cliente.
--   * Sin tiers (todos los sponsors son iguales en el marquee).
--   * url es opcional (si está null, el logo no es clickable en la landing).
--
-- Consumo:
--   * Admin: usa la tabla directamente con sesión authenticated (ALL).
--   * Landing pública: NO accede a la tabla, llama al RPC public_active_sponsors()
--     (igual patrón que public_member_stats).
-- =============================================================================

create table if not exists public.club_sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- URL pública para renderizar (resuelta vía Storage public bucket).
  logo_url text not null,
  -- Path dentro del bucket (ej. "sponsors/<uuid>.png"). Se guarda explícito
  -- para poder hacer storage.from(...).remove([logo_path]) sin parsear URLs.
  logo_path text not null,
  -- Link al sitio del sponsor. Nullable: si no hay URL, en la landing el
  -- logo se renderiza sin <a> wrapper.
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists club_sponsors_created_at_idx
  on public.club_sponsors (created_at);

-- Trigger updated_at.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists trg_touch_club_sponsors on public.club_sponsors;
create trigger trg_touch_club_sponsors
  before update on public.club_sponsors
  for each row
  execute function public.touch_updated_at();

-- RLS
alter table public.club_sponsors enable row level security;

create policy "admin_all_club_sponsors"
  on public.club_sponsors
  for all
  to authenticated
  using (true)
  with check (true);

-- RPC público: la landing lo invoca via supabase.rpc() sin sesión.
-- Devuelve sólo los campos necesarios para renderizar (sin logo_path,
-- created_at, updated_at).
create or replace function public.public_active_sponsors()
returns table (
  id uuid,
  name text,
  logo_url text,
  url text
)
language sql
security definer
set search_path = public
as $$
  select s.id, s.name, s.logo_url, s.url
  from public.club_sponsors s
  order by s.created_at asc, s.id asc;
$$;

revoke all on function public.public_active_sponsors() from public;
grant execute on function public.public_active_sponsors() to anon, authenticated;
