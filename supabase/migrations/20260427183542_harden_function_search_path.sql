-- Hardening: pin `search_path = public` en todas las funciones del schema public.
-- Evita que un atacante con write access a otro schema redirija lookups internos.
-- ALTER FUNCTION SET es idempotente y no toca la lógica del cuerpo.

alter function public.assign_charge_to_missing_members(p_charge_id uuid) set search_path = public;
alter function public.charge_has_payments(p_charge_id uuid) set search_path = public;
alter function public.ensure_membership_charge_definition(p_reference_date date) set search_path = public;
alter function public.first_day_of_month(p_date date) set search_path = public;
alter function public.first_day_of_next_month(p_date date) set search_path = public;
alter function public.generate_membership_charges_range(p_start_period date, p_end_period date) set search_path = public;
alter function public.generate_monthly_charges() set search_path = public;
alter function public.generate_monthly_membership_charges(p_run_date date) set search_path = public;
alter function public.get_charge_financials(p_charge_id uuid) set search_path = public;
alter function public.membership_due_date_for_period(p_period date, p_due_day integer) set search_path = public;
alter function public.register_charge_payment(p_member_charge_id uuid, p_amount numeric, p_paid_at timestamp with time zone, p_payment_method text) set search_path = public;
alter function public.sync_membership_definition_from_club_settings() set search_path = public;
alter function public.update_future_unpaid_membership_charges(p_from_period date) set search_path = public;
