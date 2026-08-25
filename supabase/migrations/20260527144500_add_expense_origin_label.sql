alter table public.expenses
  add column if not exists origin_label text;

update public.expenses
set origin_label = 'Club / caja'
where origin_label is null
   or btrim(origin_label) = '';
