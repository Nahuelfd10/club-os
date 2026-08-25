create unique index if not exists payment_submissions_one_pending_per_charge_uidx
  on public.payment_submissions (member_charge_id)
  where status = 'pending' and member_charge_id is not null;
