drop policy if exists "payment_submissions_member_insert_own" on public.payment_submissions;

create policy "payment_submissions_member_insert_own" on public.payment_submissions
  for insert to authenticated
  with check (
    member_id = public.current_user_member_id()
    and member_charge_id is not null
    and exists (
      select 1
      from public.member_charges mc
      where mc.id = member_charge_id
        and mc.member_id = public.current_user_member_id()
        and payment_submissions.amount <= greatest(mc.amount - mc.paid_amount, 0)
    )
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and rejection_reason is null
  );
