-- Normaliza charge_definitions al esquema real y automatiza la cuota mensual del club.

alter table public.charge_definitions
  add column if not exists description text,
  add column if not exists amount numeric,
  add column if not exists type text,
  add column if not exists recurrence text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists scope_type text,
  add column if not exists scope_id uuid,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamp without time zone default now();

alter table public.charges
  add column if not exists generated_at timestamp without time zone default now();

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.charge_definitions'::regclass
      and conname = 'charge_definitions_type_check'
  ) then
    alter table public.charge_definitions
      drop constraint charge_definitions_type_check;
  end if;

  alter table public.charge_definitions
    add constraint charge_definitions_type_check
    check ((type = any (array['one_time'::text, 'recurring'::text])));

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.charge_definitions'::regclass
      and conname = 'charge_definitions_scope_type_check'
  ) then
    alter table public.charge_definitions
      drop constraint charge_definitions_scope_type_check;
  end if;

  alter table public.charge_definitions
    add constraint charge_definitions_scope_type_check
    check ((scope_type = any (array['all_members'::text, 'group'::text, 'member'::text])));

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.charge_definitions'::regclass
      and conname = 'charge_definitions_recurrence_check'
  ) then
    alter table public.charge_definitions
      drop constraint charge_definitions_recurrence_check;
  end if;

  alter table public.charge_definitions
    add constraint charge_definitions_recurrence_check
    check ((recurrence is null) or (recurrence = 'monthly'::text));
end
$$;

create extension if not exists pg_cron with schema extensions;

create or replace function public.first_day_of_month(p_date date)
returns date
language sql
immutable
as $$
  select date_trunc('month', p_date)::date
$$;

create or replace function public.first_day_of_next_month(p_date date)
returns date
language sql
immutable
as $$
  select (date_trunc('month', p_date) + interval '1 month')::date
$$;

create or replace function public.ensure_membership_charge_definition(
  p_reference_date date default current_date
)
returns uuid
language plpgsql
as $$
declare
  v_settings public.club_settings%rowtype;
  v_definition_id uuid;
  v_start_date date;
  v_name text;
begin
  select *
  into v_settings
  from public.club_settings
  order by id
  limit 1;

  if not found then
    return null;
  end if;

  v_start_date := public.first_day_of_next_month(coalesce(p_reference_date, current_date));
  v_name := concat(coalesce(nullif(trim(v_settings.name), ''), 'Club'), ' - Cuota mensual');

  select id
  into v_definition_id
  from public.charge_definitions
  where category = 'membership'
  order by coalesce(is_active, true) desc, created_at asc nulls last, id asc
  limit 1;

  if v_definition_id is null then
    insert into public.charge_definitions (
      name,
      description,
      amount,
      type,
      recurrence,
      start_date,
      end_date,
      scope_type,
      scope_id,
      is_active,
      category
    )
    values (
      v_name,
      'Cuota mensual generada automaticamente para los socios activos del club.',
      v_settings.monthly_fee,
      'recurring',
      'monthly',
      v_start_date,
      null,
      'all_members',
      null,
      true,
      'membership'
    )
    returning id into v_definition_id;
  else
    update public.charge_definitions
    set
      name = v_name,
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
  where category = 'membership'
    and id <> v_definition_id
    and coalesce(is_active, true);

  return v_definition_id;
end
$$;

create or replace function public.sync_membership_definition_from_club_settings()
returns trigger
language plpgsql
as $$
begin
  perform public.ensure_membership_charge_definition(current_date);
  return new;
end
$$;

drop trigger if exists sync_membership_definition_after_club_settings on public.club_settings;
create trigger sync_membership_definition_after_club_settings
  after insert or update of name, monthly_fee, monthly_due_day
  on public.club_settings
  for each row
  execute procedure public.sync_membership_definition_from_club_settings();

create or replace function public.generate_monthly_membership_charges(
  p_run_date date default current_date
)
returns uuid
language plpgsql
as $$
declare
  v_settings public.club_settings%rowtype;
  v_definition public.charge_definitions%rowtype;
  v_definition_id uuid;
  v_charge_id uuid;
  v_period date;
  v_active_members integer;
begin
  select *
  into v_settings
  from public.club_settings
  order by id
  limit 1;

  if not found then
    return null;
  end if;

  v_definition_id := public.ensure_membership_charge_definition(coalesce(p_run_date, current_date));
  if v_definition_id is null then
    return null;
  end if;

  select *
  into v_definition
  from public.charge_definitions
  where id = v_definition_id;

  if not found or not coalesce(v_definition.is_active, true) then
    return null;
  end if;

  v_period := public.first_day_of_month(coalesce(p_run_date, current_date));
  if v_period < public.first_day_of_month(v_definition.start_date) then
    return null;
  end if;

  select c.id
  into v_charge_id
  from public.charges c
  where c.charge_definition_id = v_definition_id
    and c.billing_period is not distinct from v_period
  limit 1;

  if v_charge_id is not null then
    update public.charges
    set
      name = coalesce(name, 'Cuota mensual'),
      description = coalesce(description, 'Cuota mensual del club generada automaticamente.'),
      amount = coalesce(amount, v_settings.monthly_fee),
      type = coalesce(type, 'per_member'),
      due_date = null,
      generated_at = coalesce(generated_at, now())
    where id = v_charge_id;
    return v_charge_id;
  end if;

  select count(*)
  into v_active_members
  from public.members
  where status = 'active';

  if v_active_members = 0 then
    return null;
  end if;

  insert into public.charges (
    name,
    description,
    amount,
    type,
    group_id,
    charge_definition_id,
    due_date,
    billing_period,
    generated_at
  )
  values (
    'Cuota mensual',
    'Cuota mensual del club generada automaticamente.',
    v_settings.monthly_fee,
    'per_member',
    null,
    v_definition_id,
    null,
    v_period,
    now()
  )
  returning id into v_charge_id;

  if v_charge_id is null then
    return null;
  end if;

  insert into public.member_charges (
    member_id,
    charge_id,
    amount,
    paid_amount,
    status
  )
  select
    m.id,
    v_charge_id,
    v_settings.monthly_fee,
    0,
    'pending'
  from public.members m
  where m.status = 'active'
    and not exists (
      select 1
      from public.member_charges mc
      where mc.member_id = m.id
        and mc.charge_id = v_charge_id
    );

  return v_charge_id;
end
$$;

create or replace function public.generate_membership_charges_range(
  p_start_period date,
  p_end_period date
)
returns integer
language plpgsql
as $$
declare
  v_cursor date;
  v_created integer := 0;
begin
  if p_start_period is null or p_end_period is null then
    return 0;
  end if;

  v_cursor := public.first_day_of_month(p_start_period);
  while v_cursor <= public.first_day_of_month(p_end_period) loop
    perform public.generate_monthly_membership_charges(v_cursor);
    v_created := v_created + 1;
    v_cursor := (v_cursor + interval '1 month')::date;
  end loop;

  return v_created;
end
$$;

create or replace function public.update_future_unpaid_membership_charges(
  p_from_period date default public.first_day_of_next_month(current_date)
)
returns integer
language plpgsql
as $$
declare
  v_settings public.club_settings%rowtype;
  v_updated integer := 0;
begin
  select *
  into v_settings
  from public.club_settings
  order by id
  limit 1;

  if not found then
    return 0;
  end if;

  with candidate_charges as (
    select c.id, c.billing_period
    from public.charges c
    join public.charge_definitions d
      on d.id = c.charge_definition_id
    where d.category = 'membership'
      and c.billing_period >= public.first_day_of_month(p_from_period)
      and not exists (
        select 1
        from public.member_charges mc
        where mc.charge_id = c.id
          and coalesce(mc.paid_amount, 0) > 0
      )
  ),
  updated_charges as (
    update public.charges c
    set
      name = 'Cuota mensual',
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

with membership_settings as (
  select monthly_fee, monthly_due_day
  from public.club_settings
  order by id
  limit 1
)
update public.charges c
set
  name = coalesce(c.name, 'Cuota mensual'),
  description = coalesce(c.description, 'Cuota mensual del club generada automaticamente.'),
  amount = coalesce(c.amount, ms.monthly_fee),
  type = coalesce(c.type, 'per_member'),
  due_date = null,
  generated_at = coalesce(c.generated_at, now())
from membership_settings ms
where c.charge_definition_id in (
  select id
  from public.charge_definitions
  where category = 'membership'
)
  and (
    c.name is null
    or c.description is null
    or c.due_date is not null
    or c.generated_at is null
  );

create or replace function public.generate_monthly_charges()
returns void
language plpgsql
as $$
begin
  perform public.generate_membership_charges_range(
    public.first_day_of_next_month(current_date),
    make_date(extract(year from current_date)::int, 12, 1)
  );
end
$$;

create or replace function public.assign_charges_to_members()
returns void
language plpgsql
as $$
begin
  return;
end
$$;

do $$
declare
  v_job_id bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid
    into v_job_id
    from cron.job
    where jobname = 'generate-monthly-membership-charges'
    limit 1;

    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;

    select jobid
    into v_job_id
    from cron.job
    where jobname = 'generate-yearly-membership-charges'
    limit 1;

    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;

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
end
$$;

create or replace function public.sync_membership_definition_from_club_settings()
returns trigger
language plpgsql
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

select public.ensure_membership_charge_definition(current_date);
select public.update_future_unpaid_membership_charges(public.first_day_of_next_month(current_date));
select public.generate_membership_charges_range(
  public.first_day_of_next_month(current_date),
  make_date(extract(year from current_date)::int, 12, 1)
);
