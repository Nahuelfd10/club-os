-- =============================================================================
-- Convertir member_charges en una tabla de "líneas de cargo".
--
-- Casos que ahora soportamos:
--   * Cuota mensual: 1 línea por socio activo (sin description, qty=1) — flujo
--     existente sigue funcionando idéntico.
--   * Pedidos heterogéneos (camperas, indumentaria, torneos):
--      - Mismo socio puede tener N líneas en el mismo cargo (drop unique).
--      - Líneas pueden no apuntar a un socio (compradores externos):
--        member_id NULL + external_name = "Hueso", "Diame x Lucho", etc.
--      - description guarda el talle u observación.
--      - quantity captura "2 camperas talle M" en una sola fila.
--
-- Reglas:
--   * member_id IS NOT NULL OR external_name IS NOT NULL (CHECK).
--   * quantity > 0 (CHECK).
--   * El unique anterior (member_id, charge_id) se elimina porque ahora puede
--     haber varias líneas del mismo socio en un cargo.
-- =============================================================================

-- 1) member_id ahora puede ser null
alter table public.member_charges
  alter column member_id drop not null;

-- 2) Drop unique constraint
alter table public.member_charges
  drop constraint if exists member_charges_member_id_charge_id_key;

-- 3) Nuevas columnas
alter table public.member_charges
  add column if not exists external_name text,
  add column if not exists description text,
  add column if not exists quantity int not null default 1;

-- 4) Constraints de integridad
alter table public.member_charges
  drop constraint if exists member_charges_buyer_required;
alter table public.member_charges
  add constraint member_charges_buyer_required
  check (member_id is not null or external_name is not null);

alter table public.member_charges
  drop constraint if exists member_charges_quantity_positive;
alter table public.member_charges
  add constraint member_charges_quantity_positive
  check (quantity > 0);

-- 5) Index para búsquedas por external_name (cuando reasignan a socio)
create index if not exists member_charges_external_name_idx
  on public.member_charges (external_name)
  where external_name is not null;
