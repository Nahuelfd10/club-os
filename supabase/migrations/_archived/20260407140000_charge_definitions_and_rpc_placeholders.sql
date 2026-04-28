-- Opcional: definiciones de cargo reutilizables (cuotas mensuales, eventos, etc.)
-- Ejecutá en el SQL editor de Supabase si querés usar el join charge_definitions en la app.

create table if not exists public.charge_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.charges
  add column if not exists charge_definition_id uuid references public.charge_definitions (id) on delete set null;

-- Cargos del club completo (cuota mensual, etc.) sin grupo deportivo
alter table public.charges alter column group_id drop not null;

create index if not exists charges_charge_definition_id_idx on public.charges (charge_definition_id);

-- membership | activity | fee (texto libre según convención del club)
alter table public.charge_definitions
  add column if not exists category text;

-- Las RPCs siguientes deben existir en tu proyecto (lógica de negocio en BD):
-- create or replace function public.generate_monthly_charges() ...
-- create or replace function public.assign_charges_to_members() ...
