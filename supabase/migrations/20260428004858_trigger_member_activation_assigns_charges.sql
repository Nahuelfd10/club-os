-- Trigger: cuando un socio pasa de `pending` → `active`, se le asignan los
-- cargos de cuota mensual del año en curso desde el mes actual hasta diciembre.
--
-- Implementación:
--   - SECURITY DEFINER + search_path = public, igual que el resto.
--   - Llama a `generate_membership_charges_range(today, dec)` que internamente
--     itera mes a mes y para cada mes:
--        * Encuentra o crea el `charges` del periodo.
--        * Inserta `member_charges` para todos los socios `active` que aún no
--          tengan línea (idempotente para los existentes; crea la del recién
--          activado).
--   - Si el admin quiere eximir el mes de activación, puede borrar la línea
--     manualmente desde el panel.

create or replace function public.handle_member_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_year_end date := make_date(extract(year from v_today)::int, 12, 1);
begin
  -- Sólo nos interesa la transición pending → active.
  if new.status <> 'active' or old.status <> 'pending' then
    return new;
  end if;

  perform public.generate_membership_charges_range(v_today, v_year_end);
  return new;
end
$$;

drop trigger if exists trg_member_activation on public.members;
create trigger trg_member_activation
  after update of status on public.members
  for each row
  when (old.status is distinct from new.status)
  execute function public.handle_member_activation();
