alter table public.expenses
  add column if not exists spent_at timestamptz,
  add column if not exists payment_method text not null default 'cash'
    check (payment_method in ('cash', 'transfer', 'mercadopago'));

update public.expenses
set spent_at = coalesce(created_at, date::timestamptz, now())
where spent_at is null;

alter table public.expenses
  alter column spent_at set default now(),
  alter column spent_at set not null;

create index if not exists idx_expenses_spent_at on public.expenses(spent_at);
