-- Limita el GRANT EXECUTE de las funciones SECURITY DEFINER para que sólo
-- el rol que realmente las debe usar las pueda invocar:
--
--   * handle_member_activation: es una trigger function. NADIE debería poder
--     llamarla desde la REST API. Revoco a public/anon/authenticated.
--
--   * assign_charge_to_missing_members + register_charge_payment: son RPCs
--     que sólo deben ejecutarse desde el panel admin (sesión authenticated).
--     Mantengo EXECUTE para authenticated y revoco a anon/public.

revoke execute on function public.handle_member_activation() from public;
revoke execute on function public.handle_member_activation() from anon;
revoke execute on function public.handle_member_activation() from authenticated;

revoke execute on function public.assign_charge_to_missing_members(uuid) from public;
revoke execute on function public.assign_charge_to_missing_members(uuid) from anon;
grant execute on function public.assign_charge_to_missing_members(uuid) to authenticated;

revoke execute on function public.register_charge_payment(uuid, numeric, timestamptz, text) from public;
revoke execute on function public.register_charge_payment(uuid, numeric, timestamptz, text) from anon;
grant execute on function public.register_charge_payment(uuid, numeric, timestamptz, text) to authenticated;
