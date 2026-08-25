-- =============================================================================
-- Portal de socio + roles de club + comprobantes de pago
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'club_user_role') then
    create type public.club_user_role as enum (
      'club_admin',
      'treasurer',
      'secretary',
      'viewer',
      'member'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'user_profile_status') then
    create type public.user_profile_status as enum ('invited', 'active', 'disabled');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_submission_status') then
    create type public.payment_submission_status as enum ('pending', 'approved', 'rejected');
  end if;
end$$;

alter table public.members
  add column if not exists city text;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.club_user_role not null default 'member',
  member_id uuid references public.members(id) on delete set null,
  status public.user_profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_member_role_requires_member
    check (role <> 'member' or member_id is not null)
);

create index if not exists idx_user_profiles_member on public.user_profiles(member_id);
create index if not exists idx_user_profiles_role on public.user_profiles(role);

create table if not exists public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  member_charge_id uuid references public.member_charges(id) on delete set null,
  amount numeric not null check (amount > 0),
  payment_method public.payment_method_type not null default 'transfer',
  paid_at timestamptz not null default now(),
  proof_url text not null,
  notes text,
  status public.payment_submission_status not null default 'pending',
  reviewed_by uuid references public.user_profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  constraint payment_submissions_review_consistency check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null and rejection_reason is null)
    or (status = 'approved' and reviewed_at is not null and rejection_reason is null)
    or (status = 'rejected' and reviewed_at is not null and rejection_reason is not null)
  )
);

create index if not exists idx_payment_submissions_member on public.payment_submissions(member_id);
create index if not exists idx_payment_submissions_member_charge on public.payment_submissions(member_charge_id);
create index if not exists idx_payment_submissions_status_created on public.payment_submissions(status, created_at desc);

alter table public.user_profiles enable row level security;
alter table public.payment_submissions enable row level security;

grant select, insert, update, delete on public.user_profiles to authenticated;
grant select, insert, update, delete on public.payment_submissions to authenticated;

-- Usuarios Auth existentes quedan como administradores del club para evitar lockout.
insert into public.user_profiles (auth_user_id, role, status)
select u.id, 'club_admin', 'active'
from auth.users u
where not exists (
  select 1 from public.user_profiles p where p.auth_user_id = u.id
);

create or replace function public.current_user_profile()
returns public.user_profiles
language sql
stable
security definer
set search_path = public
as $$
  select p
  from public.user_profiles p
  where p.auth_user_id = auth.uid()
    and p.status = 'active'
  limit 1;
$$;

create or replace function public.current_user_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.user_profiles p
  where p.auth_user_id = auth.uid()
    and p.status = 'active'
  limit 1;
$$;

create or replace function public.current_user_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.member_id
  from public.user_profiles p
  where p.auth_user_id = auth.uid()
    and p.status = 'active'
  limit 1;
$$;

create or replace function public.is_internal_club_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles p
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and p.role in ('club_admin', 'treasurer', 'secretary', 'viewer')
  );
$$;

create or replace function public.can_manage_payments()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles p
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and p.role in ('club_admin', 'treasurer')
  );
$$;

revoke all on function public.current_user_profile() from public;
revoke all on function public.current_user_profile_id() from public;
revoke all on function public.current_user_member_id() from public;
revoke all on function public.is_internal_club_user() from public;
revoke all on function public.can_manage_payments() from public;
grant execute on function public.current_user_profile() to authenticated;
grant execute on function public.current_user_profile_id() to authenticated;
grant execute on function public.current_user_member_id() to authenticated;
grant execute on function public.is_internal_club_user() to authenticated;
grant execute on function public.can_manage_payments() to authenticated;

-- Reemplaza el modelo anterior "authenticated = admin".
drop policy if exists "admin_all_members" on public.members;
drop policy if exists "admin_all_groups" on public.groups;
drop policy if exists "admin_all_member_groups" on public.member_groups;
drop policy if exists "admin_all_club_settings" on public.club_settings;
drop policy if exists "admin_all_charge_definitions" on public.charge_definitions;
drop policy if exists "admin_all_charges" on public.charges;
drop policy if exists "admin_all_member_charges" on public.member_charges;
drop policy if exists "admin_all_charge_payments" on public.charge_payments;
drop policy if exists "admin_all_expenses" on public.expenses;
drop policy if exists "admin_all_club_sponsors" on public.club_sponsors;
drop policy if exists "admin_all_charge_extra_contributions" on public.charge_extra_contributions;

create policy "profiles_select_own_or_internal" on public.user_profiles
  for select to authenticated
  using (auth_user_id = auth.uid() or public.is_internal_club_user());

create policy "profiles_internal_insert" on public.user_profiles
  for insert to authenticated
  with check (public.is_internal_club_user());

create policy "profiles_internal_update" on public.user_profiles
  for update to authenticated
  using (public.is_internal_club_user())
  with check (public.is_internal_club_user());

create policy "members_internal_all" on public.members
  for all to authenticated
  using (public.is_internal_club_user())
  with check (public.is_internal_club_user());

create policy "members_member_select_own" on public.members
  for select to authenticated
  using (id = public.current_user_member_id());

create policy "groups_internal_all" on public.groups
  for all to authenticated using (public.is_internal_club_user()) with check (public.is_internal_club_user());

create policy "groups_member_select" on public.groups
  for select to authenticated using (true);

create policy "member_groups_internal_all" on public.member_groups
  for all to authenticated using (public.is_internal_club_user()) with check (public.is_internal_club_user());

create policy "member_groups_member_select_own" on public.member_groups
  for select to authenticated using (member_id = public.current_user_member_id());

create policy "club_settings_internal_all" on public.club_settings
  for all to authenticated using (public.is_internal_club_user()) with check (public.is_internal_club_user());

create policy "club_settings_member_select" on public.club_settings
  for select to authenticated using (true);

create policy "charge_definitions_internal_all" on public.charge_definitions
  for all to authenticated using (public.is_internal_club_user()) with check (public.is_internal_club_user());

create policy "charge_definitions_member_select" on public.charge_definitions
  for select to authenticated using (true);

create policy "charges_internal_all" on public.charges
  for all to authenticated using (public.is_internal_club_user()) with check (public.is_internal_club_user());

create policy "charges_member_select_own" on public.charges
  for select to authenticated
  using (
    exists (
      select 1 from public.member_charges mc
      where mc.charge_id = charges.id
        and mc.member_id = public.current_user_member_id()
    )
  );

create policy "member_charges_internal_all" on public.member_charges
  for all to authenticated using (public.is_internal_club_user()) with check (public.is_internal_club_user());

create policy "member_charges_member_select_own" on public.member_charges
  for select to authenticated using (member_id = public.current_user_member_id());

create policy "charge_payments_internal_all" on public.charge_payments
  for all to authenticated using (public.is_internal_club_user()) with check (public.is_internal_club_user());

create policy "charge_payments_member_select_own" on public.charge_payments
  for select to authenticated
  using (
    exists (
      select 1 from public.member_charges mc
      where mc.id = charge_payments.member_charge_id
        and mc.member_id = public.current_user_member_id()
    )
  );

create policy "expenses_internal_all" on public.expenses
  for all to authenticated using (public.is_internal_club_user()) with check (public.is_internal_club_user());

create policy "club_sponsors_internal_all" on public.club_sponsors
  for all to authenticated using (public.is_internal_club_user()) with check (public.is_internal_club_user());

create policy "club_sponsors_member_select" on public.club_sponsors
  for select to authenticated using (true);

create policy "charge_extra_contributions_internal_all" on public.charge_extra_contributions
  for all to authenticated using (public.is_internal_club_user()) with check (public.is_internal_club_user());

create policy "charge_extra_contributions_member_select_own" on public.charge_extra_contributions
  for select to authenticated using (member_id = public.current_user_member_id());

create policy "payment_submissions_internal_all" on public.payment_submissions
  for all to authenticated
  using (public.is_internal_club_user())
  with check (public.is_internal_club_user());

create policy "payment_submissions_member_select_own" on public.payment_submissions
  for select to authenticated
  using (member_id = public.current_user_member_id());

create policy "payment_submissions_member_insert_own" on public.payment_submissions
  for insert to authenticated
  with check (
    member_id = public.current_user_member_id()
    and (
      member_charge_id is not null
      and exists (
        select 1 from public.member_charges mc
        where mc.id = member_charge_id
          and mc.member_id = public.current_user_member_id()
          and payment_submissions.amount <= greatest(mc.amount - mc.paid_amount, 0)
      )
    )
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and rejection_reason is null
  );

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
  if not public.can_manage_payments() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  v_reviewer := public.current_user_profile_id();

  select * into v_submission
  from public.payment_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Comprobante no encontrado' using errcode = 'P0002';
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
      rejection_reason = null
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
  v_reviewer uuid;
begin
  if not public.can_manage_payments() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_rejection_reason, '')), '') is null then
    raise exception 'Indica el motivo del rechazo' using errcode = 'P0006';
  end if;

  v_reviewer := public.current_user_profile_id();

  update public.payment_submissions
  set status = 'rejected',
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      rejection_reason = btrim(p_rejection_reason)
  where id = p_submission_id
    and status = 'pending';

  if not found then
    raise exception 'El comprobante no esta pendiente o no existe' using errcode = 'P0004';
  end if;
end;
$$;

revoke all on function public.approve_payment_submission(uuid) from public;
revoke all on function public.reject_payment_submission(uuid, text) from public;
grant execute on function public.approve_payment_submission(uuid) to authenticated;
grant execute on function public.reject_payment_submission(uuid, text) to authenticated;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

create policy "payment_proofs_internal_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and public.is_internal_club_user());

create policy "payment_proofs_member_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and split_part(name, '/', 1) = public.current_user_member_id()::text
  );

create policy "payment_proofs_member_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and split_part(name, '/', 1) = public.current_user_member_id()::text
  );
