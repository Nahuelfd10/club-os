alter table public.collection_accounts
  add column if not exists is_default boolean not null default false,
  add column if not exists retired_at timestamptz;

drop index if exists public.collection_accounts_one_club_uidx;

create unique index if not exists collection_accounts_one_default_kind_uidx
  on public.collection_accounts(kind)
  where is_default;

with chosen as (
  select id
  from public.collection_accounts
  where kind = 'club'
  order by is_active desc, created_at desc
  limit 1
)
update public.collection_accounts ca
set
  is_default = ca.id = chosen.id,
  is_active = case when ca.kind = 'club' then ca.id = chosen.id else ca.is_active end,
  retired_at = case
    when ca.kind = 'club' and ca.id <> chosen.id and ca.retired_at is null then now()
    else ca.retired_at
  end
from chosen
where ca.kind = 'club';

create or replace function public.default_club_collection_account_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select id
  from public.collection_accounts
  where kind = 'club'
  order by is_default desc, is_active desc, created_at desc
  limit 1;
$$;

revoke all on function public.default_club_collection_account_id() from public;
grant execute on function public.default_club_collection_account_id() to authenticated;

create or replace function public.list_open_club_alias_change_targets()
returns table (
  charge_id uuid,
  charge_name text,
  charge_type text,
  billing_period date,
  pending_amount numeric,
  pending_lines bigint,
  partial_lines bigint
)
language sql
security definer
set search_path = public
as $$
  select
    c.id as charge_id,
    c.name as charge_name,
    case
      when cd.category = 'membership' then 'Cuota mensual'
      else 'Lista de recaudacion'
    end as charge_type,
    c.billing_period,
    coalesce(sum(greatest(mc.amount - mc.paid_amount, 0)), 0) as pending_amount,
    count(*) filter (where mc.amount - mc.paid_amount > 0.001) as pending_lines,
    count(*) filter (where mc.paid_amount > 0.001 and mc.amount - mc.paid_amount > 0.001) as partial_lines
  from public.charges c
  join public.collection_accounts ca on ca.id = c.collection_account_id
  left join public.charge_definitions cd on cd.id = c.charge_definition_id
  join public.member_charges mc on mc.charge_id = c.id
  where public.can_manage_payments()
    and ca.kind = 'club'
  group by c.id, c.name, cd.category, c.billing_period
  having coalesce(sum(greatest(mc.amount - mc.paid_amount, 0)), 0) > 0.001
  order by c.billing_period desc nulls last, c.created_at desc;
$$;

revoke all on function public.list_open_club_alias_change_targets() from public;
grant execute on function public.list_open_club_alias_change_targets() to authenticated;

create or replace function public.change_club_payment_alias(
  p_new_alias text,
  p_apply_to_open_charges boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alias text;
  v_current_account public.collection_accounts%rowtype;
  v_new_account_id uuid;
begin
  if not public.can_manage_payments() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  v_alias := nullif(btrim(coalesce(p_new_alias, '')), '');

  select * into v_current_account
  from public.collection_accounts
  where kind = 'club'
  order by is_default desc, is_active desc, created_at desc
  limit 1;

  if found and coalesce(v_current_account.alias, '') = coalesce(v_alias, '') then
    update public.club_settings set payment_alias = v_alias;
    return v_current_account.id;
  end if;

  update public.collection_accounts
  set
    is_default = false,
    is_active = false,
    retired_at = coalesce(retired_at, now())
  where kind = 'club';

  insert into public.collection_accounts (name, alias, kind, responsible_profile_id, is_active, is_default)
  values ('Alias del club', v_alias, 'club', null, true, true)
  returning id into v_new_account_id;

  update public.club_settings set payment_alias = v_alias;

  if coalesce(p_apply_to_open_charges, false) then
    update public.charges c
    set collection_account_id = v_new_account_id
    where exists (
        select 1
        from public.collection_accounts ca
        where ca.id = c.collection_account_id
          and ca.kind = 'club'
      )
      and exists (
        select 1
        from public.member_charges mc
        where mc.charge_id = c.id
          and mc.amount - mc.paid_amount > 0.001
      );
  end if;

  return v_new_account_id;
end;
$$;

revoke all on function public.change_club_payment_alias(text, boolean) from public;
grant execute on function public.change_club_payment_alias(text, boolean) to authenticated;
