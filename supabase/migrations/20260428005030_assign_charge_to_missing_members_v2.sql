-- Rehacer assign_charge_to_missing_members para cubrir las 4 combinaciones:
--   type='per_member' + group_id NOT NULL  → asignar a miembros del grupo (igual que antes)
--   type='per_member' + group_id NULL      → asignar a TODOS los socios activos
--   type='total'      + group_id NOT NULL  → idem grupo, pero respetando la división original
--   type='total'      + group_id NULL      → idem todos los activos, respetando división original
--
-- Para "respetar la división original" elegimos el per_member_amount así:
--   1) Si ya existe al menos un member_charge para este charge, usamos esa amount
--      (es la que se calculó en el alta, probablemente charge.amount / N).
--   2) Si no, fallback: charge.amount para type='per_member',
--      o charge.amount / target_count para type='total' (mismo cálculo que el alta).
--
-- Esto evita charged inconsistentes al sumar miembros tarde.

create or replace function public.assign_charge_to_missing_members(p_charge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charge        public.charges%rowtype;
  v_per_member    numeric;
  v_target_count  integer;
  v_existing_amt  numeric;
begin
  select * into v_charge
  from public.charges
  where id = p_charge_id;

  if not found then
    return;
  end if;

  -- Conjunto objetivo: si group_id está fijado, los miembros del grupo;
  -- si no, todos los socios activos.
  if v_charge.group_id is not null then
    select count(*) into v_target_count
    from public.member_groups mg
    where mg.group_id = v_charge.group_id;
  else
    select count(*) into v_target_count
    from public.members m
    where m.status = 'active';
  end if;

  if v_target_count = 0 then
    return;
  end if;

  -- Reusar el monto histórico si ya hay miembros cobrados.
  select mc.amount into v_existing_amt
  from public.member_charges mc
  where mc.charge_id = p_charge_id
  limit 1;

  if v_existing_amt is not null then
    v_per_member := v_existing_amt;
  elsif v_charge.type = 'total' then
    v_per_member := round((v_charge.amount / v_target_count)::numeric, 2);
  else
    v_per_member := v_charge.amount;
  end if;

  -- Insert idempotente
  if v_charge.group_id is not null then
    insert into public.member_charges (member_id, charge_id, amount, paid_amount, status)
    select mg.member_id, p_charge_id, v_per_member, 0, 'pending'
    from public.member_groups mg
    where mg.group_id = v_charge.group_id
      and not exists (
        select 1 from public.member_charges mc
        where mc.member_id = mg.member_id and mc.charge_id = p_charge_id
      );
  else
    insert into public.member_charges (member_id, charge_id, amount, paid_amount, status)
    select m.id, p_charge_id, v_per_member, 0, 'pending'
    from public.members m
    where m.status = 'active'
      and not exists (
        select 1 from public.member_charges mc
        where mc.member_id = m.id and mc.charge_id = p_charge_id
      );
  end if;
end
$$;
