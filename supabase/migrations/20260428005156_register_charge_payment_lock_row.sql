-- Endurece register_charge_payment contra carreras concurrentes:
--   * Hace SELECT ... FOR UPDATE de la fila member_charge → lock por transacción.
--     Mientras un admin está registrando un pago, otro admin queda bloqueado
--     hasta que la transacción anterior commitee, evitando over-pay.
--   * Marca el error de "excede el pendiente" con un SQLSTATE custom (P0001
--     con MESSAGE específico) para que el front pueda discriminar.

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
begin
  -- Lock pesimista por transacción.
  select amount into v_total_amount
  from public.member_charges
  where id = p_member_charge_id
  for update;

  if v_total_amount is null then
    raise exception 'El cargo no existe' using errcode = 'P0002';
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
$$;
