create table if not exists public.charge_extra_contributions (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references public.charges(id) on delete cascade,
  member_charge_id uuid references public.member_charges(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  contributor_name text,
  amount numeric not null check (amount > 0),
  contributed_at timestamptz not null default now(),
  payment_method text not null default 'transfer'
    check (payment_method in ('cash', 'transfer', 'mercadopago')),
  note text,
  created_at timestamptz not null default now(),
  constraint charge_extra_contributions_contributor_required
    check (member_charge_id is not null or member_id is not null or nullif(btrim(coalesce(contributor_name, '')), '') is not null)
);

create index if not exists idx_charge_extra_contributions_charge
  on public.charge_extra_contributions(charge_id);

create index if not exists idx_charge_extra_contributions_member_charge
  on public.charge_extra_contributions(member_charge_id)
  where member_charge_id is not null;

alter table public.charge_extra_contributions enable row level security;

drop policy if exists "admin_all_charge_extra_contributions" on public.charge_extra_contributions;
create policy "admin_all_charge_extra_contributions" on public.charge_extra_contributions
  for all to authenticated using (true) with check (true);

create or replace function public.get_charge_financials(p_charge_id uuid)
returns table(total_expected numeric, total_collected numeric, total_expenses numeric)
language sql
set search_path = public
as $$
  select
    coalesce(sum(mc.amount), 0) as total_expected,
    coalesce(sum(mc.paid_amount), 0) + coalesce((
      select sum(cec.amount)
      from public.charge_extra_contributions cec
      where cec.charge_id = p_charge_id
    ), 0) as total_collected,
    coalesce((
      select sum(e.amount)
      from public.expenses e
      where e.charge_id = p_charge_id
    ), 0) as total_expenses
  from public.member_charges mc
  where mc.charge_id = p_charge_id;
$$;

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
  ) or exists (
    select 1
    from public.charge_extra_contributions cec
    where cec.charge_id = p_charge_id
  );
$$;
