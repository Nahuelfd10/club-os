alter table public.charge_payments
  add column if not exists payment_method text;

update public.charge_payments
set payment_method = 'cash'
where payment_method is null
   or btrim(payment_method) = '';

alter table public.charge_payments
  alter column payment_method set default 'cash';

alter table public.charge_payments
  alter column payment_method set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'charge_payments_payment_method_check'
      and conrelid = 'public.charge_payments'::regclass
  ) then
    alter table public.charge_payments
      add constraint charge_payments_payment_method_check
      check (payment_method in ('cash', 'transfer', 'mercadopago'));
  end if;
end $$;

drop function if exists public.register_charge_payment(uuid, numeric, timestamptz);

create function public.register_charge_payment(
  p_member_charge_id uuid,
  p_amount numeric,
  p_paid_at timestamptz,
  p_payment_method text
)
returns void
language plpgsql
as $function$
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
$function$;
