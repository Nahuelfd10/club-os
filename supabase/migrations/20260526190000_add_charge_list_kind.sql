alter table public.charges
  add column if not exists list_kind text not null default 'general',
  add column if not exists supplier_name text;

alter table public.charges
  drop constraint if exists charges_list_kind_check;

alter table public.charges
  add constraint charges_list_kind_check
  check (list_kind in ('general', 'order'));

update public.charges
set list_kind = 'general'
where list_kind is null;
