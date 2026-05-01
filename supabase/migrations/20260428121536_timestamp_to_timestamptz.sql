-- Migrar las 3 columnas timestamp (sin TZ) a timestamptz (con TZ).
-- Asumimos que los datos guardados están en UTC (la app inserta now() en
-- contextos UTC desde Supabase). Hacemos `at time zone 'UTC'` para
-- normalizar la conversión y evitar saltos cuando el deploy esté en otra TZ.

alter table public.charge_definitions
  alter column created_at type timestamptz using created_at at time zone 'UTC';

alter table public.charges
  alter column generated_at type timestamptz using generated_at at time zone 'UTC';

alter table public.member_charges
  alter column updated_at type timestamptz using updated_at at time zone 'UTC';
