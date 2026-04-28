-- =============================================================================
-- Cleanup: drop legacy objects that were left over after refactors.
--
-- Context:
--   - `public.payments`: tabla del esquema viejo (un pago = un mes individual).
--     Reemplazada por el modelo `charges` + `member_charges` + `charge_payments`.
--     Los 16 registros que pueda haber ahí son de testing y se descartan.
--   - `public.member_payment_summary`: vista que dependía de `payments` y mezclaba
--     datos del modelo viejo. Ya no la consume nadie en frontend.
--   - `public.assign_charges_to_members()`: stub vacío, sin uso. La función real
--     en uso es `assign_charge_to_missing_members(uuid)`.
--
-- Estos objetos quedaron fuera del baseline `20260101000000_initial_schema.sql`
-- a propósito: esta migración se encarga de retirarlos del entorno actual.
-- =============================================================================

-- 1) Eliminar la vista primero (depende de `payments`)
drop view if exists public.member_payment_summary;

-- 2) Eliminar la tabla legacy
drop table if exists public.payments cascade;

-- 3) Eliminar la función stub sin uso
drop function if exists public.assign_charges_to_members();
