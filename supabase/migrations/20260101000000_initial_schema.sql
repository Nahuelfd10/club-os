-- =============================================================================
-- Club OS — Baseline (initial schema)
-- =============================================================================
-- Este archivo consolida todo el esquema actual de la base. Reemplaza las
-- migraciones historicas que estaban en `supabase/migrations/` y que se
-- aplicaron a mano contra la base remota (ver `supabase/migrations/_archived/`).
--
-- Convencion: las RLS policies y el cableado con Supabase Auth se definen en
-- migraciones posteriores. Aqui solo se HABILITA RLS en cada tabla (sin
-- policies), para forzar que cualquier acceso requiera definir reglas
-- explicitas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_method_type') then
    create type public.payment_method_type as enum ('transfer', 'cash', 'mercadopago');
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.first_day_of_month(p_date date)
returns date
language sql
immutable
set search_path = public
as $$
  select date_trunc('month', p_date)::date
$$;

create or replace function public.first_day_of_next_month(p_date date)
returns date
language sql
immutable
set search_path = public
as $$
  select (date_trunc('month', p_date) + interval '1 month')::date
$$;

create or replace function public.membership_due_date_for_period(p_period date, p_due_day integer)
returns date
language sql
immutable
set search_path = public
as $$
  with bounds as (
    select
      public.first_day_of_month(p_period) as month_start,
      extract(day from (date_trunc('month', p_period) + interval '1 month - 1 day'))::int as max_day
  )
  select
    make_date(
      extract(year from month_start)::int,
      extract(month from month_start)::int,
      least(greatest(coalesce(p_due_day, 1), 1), max_day)
    )
  from bounds
$$;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  dni text not null unique,
  address text not null,
  phone text,
  email text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.member_groups (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  created_at timestamptz default now(),
  unique (member_id, group_id)
);
create index if not exists idx_member_groups_member on public.member_groups(member_id);
create index if not exists idx_member_groups_group on public.member_groups(group_id);

create table if not exists public.club_settings (
  id uuid primary key default gen_random_uuid(),
  name text,
  monthly_fee numeric,
  primary_color text,
  accent_color text,
  send_payment_confirmation_email boolean default false,
  logo_url text,
  payment_alias text,
  payment_method public.payment_method_type default 'transfer',
  monthly_due_day integer,
  created_at timestamptz default now()
);

create table if not exists public.charge_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  amount numeric not null,
  type text not null check (type in ('one_time', 'recurring')),
  recurrence text check (recurrence is null or recurrence = 'monthly'),
  start_date date not null,
  end_date date,
  scope_type text not null check (scope_type in ('all_members', 'group', 'member')),
  scope_id uuid,
  is_active boolean default true,
  category text,
  created_at timestamp default now()
);

create table if not exists public.charges (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text,
  amount numeric,
  type text default 'per_member',
  group_id uuid references public.groups(id) on delete cascade,
  charge_definition_id uuid references public.charge_definitions(id),
  due_date date,
  billing_period date,
  generated_at timestamp default now(),
  created_at timestamptz default now()
);
create index if not exists idx_charges_billing_period on public.charges(billing_period);
create index if not exists idx_charges_group on public.charges(group_id);
create unique index if not exists charges_definition_period_uidx
  on public.charges (charge_definition_id, billing_period)
  where (charge_definition_id is not null and billing_period is not null);
create unique index if not exists uniq_membership_period
  on public.charges (charge_definition_id, billing_period)
  where (billing_period is not null);

create table if not exists public.member_charges (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  charge_id uuid not null references public.charges(id) on delete cascade,
  amount numeric not null,
  paid_amount numeric default 0,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamp default now(),
  unique (member_id, charge_id)
);
create index if not exists idx_member_charges_member on public.member_charges(member_id);
create index if not exists idx_member_charges_charge on public.member_charges(charge_id);

create table if not exists public.charge_payments (
  id uuid primary key default gen_random_uuid(),
  member_charge_id uuid not null references public.member_charges(id) on delete cascade,
  amount numeric not null,
  paid_at timestamptz default now(),
  payment_method text not null default 'cash'
    check (payment_method in ('cash', 'transfer', 'mercadopago')),
  created_at timestamptz default now()
);
create index if not exists idx_charge_payments_member_charge on public.charge_payments(member_charge_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null,
  description text not null,
  category text,
  date date not null default current_date,
  charge_id uuid references public.charges(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_expenses_charge on public.expenses(charge_id);
create index if not exists idx_expenses_date on public.expenses(date);

-- -----------------------------------------------------------------------------
-- Row Level Security (habilitada en todas las tablas; las policies se
-- definen en `20260426130000_rls_policies_with_auth.sql`).
-- -----------------------------------------------------------------------------
alter table public.members enable row level security;
alter table public.groups enable row level security;
alter table public.member_groups enable row level security;
alter table public.club_settings enable row level security;
alter table public.charge_definitions enable row level security;
alter table public.charges enable row level security;
alter table public.member_charges enable row level security;
alter table public.charge_payments enable row level security;
alter table public.expenses enable row level security;

-- -----------------------------------------------------------------------------
-- Functions de negocio
-- -----------------------------------------------------------------------------
create or replace function public.charge_has_payments(p_charge_id uuid)
returns boolean
language sql
set search_path = public
as $$
  select exists (
    select 1
    from public.charge_payments cp
    join public.member_charges mc on mc.id = cp.member_charge_id
    where mc.charge_id = p_charge_id
  );
$$;

create or replace function public.get_charge_financials(p_charge_id uuid)
returns table(total_expected numeric, total_collected numeric, total_expenses numeric)
language sql
set search_path = public
as $$
  select
    coalesce(sum(mc.amount), 0) as total_expected,
    coalesce(sum(mc.paid_amount), 0) as total_collected,
    coalesce((
      select sum(e.amount)
      from public.expenses e
      where e.charge_id = p_charge_id
    ), 0) as total_expenses
  from public.member_charges mc
  where mc.charge_id = p_charge_id;
$$;

create or replace function public.assign_charge_to_missing_members(p_charge_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  select group_id into v_group_id
  from public.charges
  where id = p_charge_id;

  -- Cargo a un grupo: insertar miembros del grupo que no tengan asignacion
  insert into public.member_charges (member_id, charge_id, amount)
  select mg.member_id, c.id, c.amount
  from public.member_groups mg
  join public.charges c on c.group_id = mg.group_id
  where c.id = p_charge_id
    and not exists (
      select 1 from public.member_charges mc
      where mc.member_id = mg.member_id and mc.charge_id = p_charge_id
    );
end;
$$;

create or replace function public.register_charge_payment(
  p_member_charge_id uuid,
  p_amount numeric,
  p_paid_at timestamptz,
  p_payment_method text
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_total_amount numeric;
  v_paid numeric;
  v_payment_method text;
begin
  select amount into v_total_amount
  from public.member_charges
  where id = p_member_charge_id;

  select coalesce(sum(amount), 0) into v_paid
  from public.charge_payments
  where member_charge_id = p_member_charge_id;

  if v_paid + p_amount > v_total_amount then
    raise exception 'El pago excede el monto pendiente';
  end if;

  v_payment_method := lower(btrim(coalesce(p_payment_method, 'cash')));
  if v_payment_method not in ('cash', 'transfer', 'mercadopago') then
    raise exception 'Metodo de pago invalido';
  end if;

  insert into public.charge_payments (member_charge_id, amount, paid_at, payment_method)
  values (p_member_charge_id, p_amount, p_paid_at, v_payment_method);

  select coalesce(sum(amount), 0) into v_paid
  from public.charge_payments
  where member_charge_id = p_member_charge_id;

  update public.member_charges
  set
    paid_amount = v_paid,
    status = case
      when v_paid = 0 then 'pending'
      when v_paid < v_total_amount then 'partial'
      else 'paid'
    end
  where id = p_member_charge_id;
end;
$$;

create or replace function public.ensure_membership_charge_definition(p_reference_date date default current_date)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_settings public.club_settings%rowtype;
  v_definition_id uuid;
  v_start_date date;
  v_name text;
begin
  select * into v_settings
  from public.club_settings
  order by id
  limit 1;

  if not found then
    return null;
  end if;

  v_start_date := public.first_day_of_next_month(coalesce(p_reference_date, current_date));
  v_name := concat(coalesce(nullif(trim(v_settings.name), ''), 'Club'), ' - Cuota mensual');

  select id into v_definition_id
  from public.charge_definitions
  where category = 'membership'
  order by coalesce(is_active, true) desc, created_at asc nulls last, id asc
  limit 1;

  if v_definition_id is null then
    insert into public.charge_definitions (
      name, description, amount, type, recurrence, start_date, end_date,
      scope_type, scope_id, is_active, category
    )
    values (
      v_name,
      'Cuota mensual generada automaticamente para los socios activos del club.',
      v_settings.monthly_fee,
      'recurring', 'monthly', v_start_date, null,
      'all_members', null, true, 'membership'
    )
    returning id into v_definition_id;
  else
    update public.charge_definitions
    set name = v_name,
        description = 'Cuota mensual generada automaticamente para los socios activos del club.',
        amount = v_settings.monthly_fee,
        type = 'recurring',
        recurrence = 'monthly',
        start_date = coalesce(start_date, v_start_date),
        end_date = null,
        scope_type = 'all_members',
        scope_id = null,
        is_active = true,
        category = 'membership'
    where id = v_definition_id;
  end if;

  update public.charge_definitions
  set is_active = false
  where category = 'membership' and id <> v_definition_id and coalesce(is_active, true);

  return v_definition_id;
end
$$;

create or replace function public.generate_monthly_membership_charges(p_run_date date default current_date)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_settings public.club_settings%rowtype;
  v_definition public.charge_definitions%rowtype;
  v_definition_id uuid;
  v_charge_id uuid;
  v_period date;
  v_active_members integer;
begin
  select * into v_settings from public.club_settings order by id limit 1;
  if not found then return null; end if;

  v_definition_id := public.ensure_membership_charge_definition(coalesce(p_run_date, current_date));
  if v_definition_id is null then return null; end if;

  select * into v_definition from public.charge_definitions where id = v_definition_id;
  if not found or not coalesce(v_definition.is_active, true) then return null; end if;

  v_period := public.first_day_of_month(coalesce(p_run_date, current_date));
  if v_period < public.first_day_of_month(v_definition.start_date) then return null; end if;

  select c.id into v_charge_id
  from public.charges c
  where c.charge_definition_id = v_definition_id
    and c.billing_period is not distinct from v_period
  limit 1;

  if v_charge_id is not null then
    update public.charges
    set name = coalesce(name, 'Cuota mensual'),
        description = coalesce(description, 'Cuota mensual del club generada automaticamente.'),
        amount = coalesce(amount, v_settings.monthly_fee),
        type = coalesce(type, 'per_member'),
        due_date = null,
        generated_at = coalesce(generated_at, now())
    where id = v_charge_id;
    return v_charge_id;
  end if;

  select count(*) into v_active_members from public.members where status = 'active';
  if v_active_members = 0 then return null; end if;

  insert into public.charges (
    name, description, amount, type, group_id, charge_definition_id,
    due_date, billing_period, generated_at
  )
  values (
    'Cuota mensual',
    'Cuota mensual del club generada automaticamente.',
    v_settings.monthly_fee,
    'per_member', null, v_definition_id, null, v_period, now()
  )
  returning id into v_charge_id;

  if v_charge_id is null then return null; end if;

  insert into public.member_charges (member_id, charge_id, amount, paid_amount, status)
  select m.id, v_charge_id, v_settings.monthly_fee, 0, 'pending'
  from public.members m
  where m.status = 'active'
    and not exists (
      select 1 from public.member_charges mc
      where mc.member_id = m.id and mc.charge_id = v_charge_id
    );

  return v_charge_id;
end
$$;

create or replace function public.generate_membership_charges_range(p_start_period date, p_end_period date)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_cursor date;
  v_created integer := 0;
begin
  if p_start_period is null or p_end_period is null then return 0; end if;
  v_cursor := public.first_day_of_month(p_start_period);
  while v_cursor <= public.first_day_of_month(p_end_period) loop
    perform public.generate_monthly_membership_charges(v_cursor);
    v_created := v_created + 1;
    v_cursor := (v_cursor + interval '1 month')::date;
  end loop;
  return v_created;
end
$$;

create or replace function public.generate_monthly_charges()
returns void
language plpgsql
set search_path = public
as $$
begin
  perform public.generate_membership_charges_range(
    public.first_day_of_next_month(current_date),
    make_date(extract(year from current_date)::int, 12, 1)
  );
end
$$;

create or replace function public.update_future_unpaid_membership_charges(
  p_from_period date default first_day_of_next_month(current_date)
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_settings public.club_settings%rowtype;
  v_updated integer := 0;
begin
  select * into v_settings from public.club_settings order by id limit 1;
  if not found then return 0; end if;

  with candidate_charges as (
    select c.id, c.billing_period
    from public.charges c
    join public.charge_definitions d on d.id = c.charge_definition_id
    where d.category = 'membership'
      and c.billing_period >= public.first_day_of_month(p_from_period)
      and not exists (
        select 1 from public.member_charges mc
        where mc.charge_id = c.id and coalesce(mc.paid_amount, 0) > 0
      )
  ),
  updated_charges as (
    update public.charges c
    set name = 'Cuota mensual',
        description = 'Cuota mensual del club generada automaticamente.',
        amount = v_settings.monthly_fee,
        type = 'per_member',
        due_date = null,
        generated_at = coalesce(c.generated_at, now())
    from candidate_charges cc
    where c.id = cc.id
    returning c.id
  )
  update public.member_charges mc
  set amount = v_settings.monthly_fee
  where mc.charge_id in (select id from updated_charges)
    and coalesce(mc.paid_amount, 0) = 0;

  get diagnostics v_updated = row_count;
  return v_updated;
end
$$;

create or replace function public.sync_membership_definition_from_club_settings()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform public.ensure_membership_charge_definition(current_date);
  perform public.update_future_unpaid_membership_charges(public.first_day_of_next_month(current_date));
  perform public.generate_membership_charges_range(
    public.first_day_of_next_month(current_date),
    make_date(extract(year from current_date)::int, 12, 1)
  );
  return new;
end
$$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
drop trigger if exists sync_membership_definition_after_club_settings on public.club_settings;
create trigger sync_membership_definition_after_club_settings
  after insert or update on public.club_settings
  for each row
  execute function public.sync_membership_definition_from_club_settings();

-- -----------------------------------------------------------------------------
-- pg_cron job: generar cargos de cuota anuales el 1 de enero
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'generate-yearly-membership-charges') then
    perform cron.schedule(
      'generate-yearly-membership-charges',
      '0 0 1 1 *',
      $cron$
        select public.generate_membership_charges_range(
          make_date(extract(year from current_date)::int, 1, 1),
          make_date(extract(year from current_date)::int, 12, 1)
        );
      $cron$
    );
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- Storage bucket (las policies de storage se definen en migracion posterior)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('club-assets', 'club-assets', true)
on conflict (id) do nothing;
