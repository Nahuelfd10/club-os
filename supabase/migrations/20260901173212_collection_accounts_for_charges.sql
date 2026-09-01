do $$
begin
  if not exists (select 1 from pg_type where typname = 'collection_account_kind') then
    create type public.collection_account_kind as enum ('club', 'external');
  end if;
end$$;

create table if not exists public.collection_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  alias text,
  kind public.collection_account_kind not null default 'external',
  responsible_profile_id uuid references public.user_profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collection_accounts_alias_required
    check (kind = 'club' or nullif(btrim(coalesce(alias, '')), '') is not null),
  constraint collection_accounts_responsible_required
    check (kind = 'club' or responsible_profile_id is not null)
);

create unique index if not exists collection_accounts_one_club_uidx
  on public.collection_accounts ((kind))
  where kind = 'club';

create index if not exists idx_collection_accounts_responsible
  on public.collection_accounts(responsible_profile_id)
  where responsible_profile_id is not null;

alter table public.collection_accounts enable row level security;
grant select, insert, update, delete on public.collection_accounts to authenticated;

insert into public.collection_accounts (name, alias, kind, responsible_profile_id, is_active)
select
  'Alias del club',
  nullif(btrim(cs.payment_alias), ''),
  'club',
  null,
  true
from public.club_settings cs
order by cs.id
limit 1
on conflict do nothing;

insert into public.collection_accounts (name, alias, kind, responsible_profile_id, is_active)
select 'Alias del club', null, 'club', null, true
where not exists (
  select 1 from public.collection_accounts where kind = 'club'
);

alter table public.charges
  add column if not exists collection_account_id uuid references public.collection_accounts(id) on delete set null;

alter table public.charge_payments
  add column if not exists collection_account_id uuid references public.collection_accounts(id) on delete set null,
  add column if not exists counts_as_club_income boolean not null default true;

alter table public.payment_submissions
  add column if not exists collection_account_id uuid references public.collection_accounts(id) on delete set null,
  add column if not exists counts_as_club_income boolean not null default true;

create index if not exists idx_charges_collection_account
  on public.charges(collection_account_id)
  where collection_account_id is not null;

create index if not exists idx_charge_payments_collection_account
  on public.charge_payments(collection_account_id)
  where collection_account_id is not null;

create index if not exists idx_charge_payments_club_income_paid_at
  on public.charge_payments(counts_as_club_income, paid_at);

create index if not exists idx_payment_submissions_collection_account
  on public.payment_submissions(collection_account_id)
  where collection_account_id is not null;

create or replace function public.default_club_collection_account_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select id
  from public.collection_accounts
  where kind = 'club'
  order by created_at
  limit 1;
$$;

revoke all on function public.default_club_collection_account_id() from public;
grant execute on function public.default_club_collection_account_id() to authenticated;

create or replace function public.set_charge_default_collection_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.collection_account_id is null then
    new.collection_account_id := public.default_club_collection_account_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_charge_default_collection_account on public.charges;
create trigger trg_set_charge_default_collection_account
before insert on public.charges
for each row execute function public.set_charge_default_collection_account();

create or replace function public.set_payment_submission_collection_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_collection_account_id uuid;
  v_counts_as_club_income boolean;
begin
  select
    c.collection_account_id,
    coalesce(ca.kind = 'club', true)
  into v_collection_account_id, v_counts_as_club_income
  from public.member_charges mc
  join public.charges c on c.id = mc.charge_id
  left join public.collection_accounts ca on ca.id = c.collection_account_id
  where mc.id = new.member_charge_id;

  if new.collection_account_id is null then
    new.collection_account_id := v_collection_account_id;
  end if;

  new.counts_as_club_income := coalesce(v_counts_as_club_income, true);
  return new;
end;
$$;

drop trigger if exists trg_set_payment_submission_collection_account on public.payment_submissions;
create trigger trg_set_payment_submission_collection_account
before insert or update of member_charge_id, collection_account_id on public.payment_submissions
for each row execute function public.set_payment_submission_collection_account();

update public.charges c
set collection_account_id = ca.id
from public.collection_accounts ca
where ca.kind = 'club'
  and c.collection_account_id is null;

update public.charge_payments cp
set
  collection_account_id = c.collection_account_id,
  counts_as_club_income = coalesce(ca.kind = 'club', true)
from public.member_charges mc
join public.charges c on c.id = mc.charge_id
left join public.collection_accounts ca on ca.id = c.collection_account_id
where cp.member_charge_id = mc.id
  and cp.collection_account_id is null;

update public.payment_submissions ps
set
  collection_account_id = c.collection_account_id,
  counts_as_club_income = coalesce(ca.kind = 'club', true)
from public.member_charges mc
join public.charges c on c.id = mc.charge_id
left join public.collection_accounts ca on ca.id = c.collection_account_id
where ps.member_charge_id = mc.id
  and ps.collection_account_id is null;

create or replace function public.current_user_can_manage_collection_account(p_account_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles p
    left join public.collection_accounts ca on ca.id = p_account_id
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and (
        p.role = 'club_admin'
        or (ca.kind = 'club' and p.role = 'treasurer')
        or (ca.kind = 'external' and ca.responsible_profile_id = p.id)
      )
  );
$$;

revoke all on function public.current_user_can_manage_collection_account(uuid) from public;
grant execute on function public.current_user_can_manage_collection_account(uuid) to authenticated;

create or replace function public.current_user_can_manage_charge_account(p_charge_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_can_manage_collection_account(c.collection_account_id)
  from public.charges c
  where c.id = p_charge_id;
$$;

revoke all on function public.current_user_can_manage_charge_account(uuid) from public;
grant execute on function public.current_user_can_manage_charge_account(uuid) to authenticated;

drop policy if exists "collection_accounts_internal_select" on public.collection_accounts;
drop policy if exists "collection_accounts_member_select_related" on public.collection_accounts;
drop policy if exists "collection_accounts_internal_insert" on public.collection_accounts;
drop policy if exists "collection_accounts_internal_update" on public.collection_accounts;
drop policy if exists "collection_accounts_admin_delete" on public.collection_accounts;

create policy "collection_accounts_internal_select" on public.collection_accounts
  for select to authenticated
  using (public.is_internal_club_user());

create policy "collection_accounts_member_select_related" on public.collection_accounts
  for select to authenticated
  using (
    kind = 'club'
    or exists (
      select 1
      from public.user_profiles p
      join public.member_charges mc on mc.member_id = p.member_id
      join public.charges c on c.id = mc.charge_id
      where p.auth_user_id = auth.uid()
        and p.status = 'active'
        and c.collection_account_id = collection_accounts.id
    )
    or exists (
      select 1
      from public.user_profiles p
      join public.payment_submissions ps on ps.member_id = p.member_id
      where p.auth_user_id = auth.uid()
        and p.status = 'active'
        and ps.collection_account_id = collection_accounts.id
    )
  );

create policy "collection_accounts_internal_insert" on public.collection_accounts
  for insert to authenticated
  with check (
    public.can_manage_payments()
    and kind = 'external'
    and exists (
      select 1
      from public.user_profiles p
      where p.id = responsible_profile_id
        and p.status = 'active'
        and p.role in ('club_admin', 'treasurer', 'secretary', 'viewer')
    )
  );

create policy "collection_accounts_internal_update" on public.collection_accounts
  for update to authenticated
  using (
    public.current_user_can_manage_collection_account(id)
    and kind = 'external'
  )
  with check (
    public.current_user_can_manage_collection_account(id)
    and kind = 'external'
  );

create policy "collection_accounts_admin_delete" on public.collection_accounts
  for delete to authenticated
  using (
    kind = 'external'
    and exists (
      select 1 from public.user_profiles p
      where p.auth_user_id = auth.uid()
        and p.status = 'active'
        and p.role = 'club_admin'
    )
  );

drop policy if exists "charge_payments_internal_all" on public.charge_payments;
drop policy if exists "charge_payments_internal_manage_scoped" on public.charge_payments;

create policy "charge_payments_internal_manage_scoped" on public.charge_payments
  for all to authenticated
  using (
    public.current_user_can_manage_collection_account(collection_account_id)
    or exists (
      select 1
      from public.member_charges mc
      join public.charges c on c.id = mc.charge_id
      where mc.id = charge_payments.member_charge_id
        and public.current_user_can_manage_collection_account(c.collection_account_id)
    )
  )
  with check (
    public.current_user_can_manage_collection_account(collection_account_id)
    or exists (
      select 1
      from public.member_charges mc
      join public.charges c on c.id = mc.charge_id
      where mc.id = charge_payments.member_charge_id
        and public.current_user_can_manage_collection_account(c.collection_account_id)
    )
  );

drop policy if exists "payment_submissions_internal_all" on public.payment_submissions;
drop policy if exists "payment_submissions_internal_select_scoped" on public.payment_submissions;
drop policy if exists "payment_submissions_internal_update_scoped" on public.payment_submissions;

create policy "payment_submissions_internal_select_scoped" on public.payment_submissions
  for select to authenticated
  using (
    public.current_user_can_manage_collection_account(collection_account_id)
    or exists (
      select 1
      from public.member_charges mc
      join public.charges c on c.id = mc.charge_id
      where mc.id = payment_submissions.member_charge_id
        and public.current_user_can_manage_collection_account(c.collection_account_id)
    )
  );

create policy "payment_submissions_internal_update_scoped" on public.payment_submissions
  for update to authenticated
  using (public.current_user_can_manage_collection_account(collection_account_id))
  with check (public.current_user_can_manage_collection_account(collection_account_id));

drop policy if exists "charges_internal_all" on public.charges;
drop policy if exists "charges_internal_manage" on public.charges;

create policy "charges_internal_manage" on public.charges
  for all to authenticated
  using (public.is_internal_club_user())
  with check (public.is_internal_club_user());

create or replace function public.list_collection_account_responsibles()
returns table (
  profile_id uuid,
  email text,
  role public.club_user_role
)
language sql
security definer
set search_path = public, auth
as $$
  select
    p.id as profile_id,
    u.email::text as email,
    p.role
  from public.user_profiles p
  join auth.users u on u.id = p.auth_user_id
  where public.is_internal_club_user()
    and p.status = 'active'
    and p.role in ('club_admin', 'treasurer', 'secretary', 'viewer')
  order by
    case p.role
      when 'club_admin' then 1
      when 'treasurer' then 2
      when 'secretary' then 3
      else 4
    end,
    u.email;
$$;

revoke all on function public.list_collection_account_responsibles() from public;
grant execute on function public.list_collection_account_responsibles() to authenticated;

create or replace function public.register_charge_payment(
  p_member_charge_id uuid,
  p_amount numeric,
  p_paid_at timestamp with time zone,
  p_payment_method text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_amount numeric;
  v_paid numeric;
  v_payment_method text;
  v_collection_account_id uuid;
  v_counts_as_club_income boolean;
begin
  select
    mc.amount,
    c.collection_account_id,
    coalesce(ca.kind = 'club', true)
  into v_total_amount, v_collection_account_id, v_counts_as_club_income
  from public.member_charges mc
  join public.charges c on c.id = mc.charge_id
  left join public.collection_accounts ca on ca.id = c.collection_account_id
  where mc.id = p_member_charge_id
  for update of mc;

  if v_total_amount is null then
    raise exception 'El cargo no existe' using errcode = 'P0002';
  end if;

  if not public.current_user_can_manage_collection_account(v_collection_account_id) then
    raise exception 'No autorizado para registrar pagos en esta cuenta' using errcode = '42501';
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.charge_payments
  where member_charge_id = p_member_charge_id;

  if v_paid + p_amount > v_total_amount + 0.001 then
    raise exception 'El pago excede el monto pendiente' using errcode = 'P0001';
  end if;

  v_payment_method := lower(btrim(coalesce(p_payment_method, 'cash')));
  if v_payment_method not in ('cash', 'transfer', 'mercadopago') then
    raise exception 'Metodo de pago invalido' using errcode = 'P0003';
  end if;

  insert into public.charge_payments (
    member_charge_id,
    amount,
    paid_at,
    payment_method,
    collection_account_id,
    counts_as_club_income
  )
  values (
    p_member_charge_id,
    p_amount,
    p_paid_at,
    v_payment_method,
    v_collection_account_id,
    v_counts_as_club_income
  );

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

create or replace function public.approve_payment_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.payment_submissions%rowtype;
  v_reviewer uuid;
begin
  v_reviewer := public.current_user_profile_id();

  select * into v_submission
  from public.payment_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Comprobante no encontrado' using errcode = 'P0002';
  end if;

  if not public.current_user_can_manage_collection_account(v_submission.collection_account_id) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if v_submission.status <> 'pending' then
    raise exception 'El comprobante ya fue revisado' using errcode = 'P0004';
  end if;

  if v_submission.member_charge_id is null then
    raise exception 'El comprobante no tiene un cobro asociado' using errcode = 'P0005';
  end if;

  perform public.register_charge_payment(
    v_submission.member_charge_id,
    v_submission.amount,
    v_submission.paid_at,
    v_submission.payment_method::text
  );

  update public.payment_submissions
  set status = 'approved',
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      rejection_reason = null,
      collection_account_id = v_submission.collection_account_id,
      counts_as_club_income = v_submission.counts_as_club_income
  where id = p_submission_id;
end;
$$;

create or replace function public.reject_payment_submission(p_submission_id uuid, p_rejection_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.payment_submissions%rowtype;
  v_reviewer uuid;
begin
  if nullif(btrim(coalesce(p_rejection_reason, '')), '') is null then
    raise exception 'Indica el motivo del rechazo' using errcode = 'P0006';
  end if;

  v_reviewer := public.current_user_profile_id();

  select * into v_submission
  from public.payment_submissions
  where id = p_submission_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'El comprobante no esta pendiente o no existe' using errcode = 'P0004';
  end if;

  if not public.current_user_can_manage_collection_account(v_submission.collection_account_id) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update public.payment_submissions
  set status = 'rejected',
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      rejection_reason = btrim(p_rejection_reason)
  where id = p_submission_id;
end;
$$;

revoke all on function public.approve_payment_submission(uuid) from public;
revoke all on function public.reject_payment_submission(uuid, text) from public;
grant execute on function public.approve_payment_submission(uuid) to authenticated;
grant execute on function public.reject_payment_submission(uuid, text) to authenticated;
