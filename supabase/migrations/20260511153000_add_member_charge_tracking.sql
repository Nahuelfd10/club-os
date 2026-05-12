alter table public.member_charges
  add column if not exists tracking_status text not null default 'not_contacted',
  add column if not exists tracking_note text,
  add column if not exists tracking_next_action_at date,
  add column if not exists tracking_updated_at timestamp with time zone;

alter table public.member_charges
  drop constraint if exists member_charges_tracking_status_check;

alter table public.member_charges
  add constraint member_charges_tracking_status_check
  check (
    tracking_status = any (
      array[
        'not_contacted'::text,
        'message_sent'::text,
        'responded'::text,
        'promised'::text,
        'partial_payment'::text,
        'closed'::text
      ]
    )
  );

update public.member_charges
set
  tracking_status = case
    when status = 'paid' then 'closed'
    when status = 'partial' then 'partial_payment'
    else tracking_status
  end,
  tracking_updated_at = coalesce(tracking_updated_at, updated_at, now())
where tracking_updated_at is null
   or status in ('paid', 'partial');
