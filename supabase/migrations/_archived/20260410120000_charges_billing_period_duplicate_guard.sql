-- Período facturado (cuota del club) y omisión silenciosa de duplicados por definición + período.
alter table public.charges
  add column if not exists billing_period date;

create or replace function public.charges_skip_duplicate_definition_billing_period()
returns trigger
language plpgsql
as $$
begin
  if new.charge_definition_id is null or new.billing_period is null then
    return new;
  end if;
  if exists (
    select 1
    from public.charges c
    where c.charge_definition_id = new.charge_definition_id
      and c.billing_period is not distinct from new.billing_period
  ) then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists charges_skip_dup_def_period on public.charges;
create trigger charges_skip_dup_def_period
  before insert on public.charges
  for each row
  execute procedure public.charges_skip_duplicate_definition_billing_period();
