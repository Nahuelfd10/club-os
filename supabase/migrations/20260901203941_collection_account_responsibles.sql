drop policy if exists "collection_accounts_internal_insert" on public.collection_accounts;

create policy "collection_accounts_internal_insert" on public.collection_accounts
  for insert to authenticated
  with check (
    public.can_manage_payments()
    and kind = 'external'
    and exists (
      select 1
      from public.user_profiles p
      where p.id = responsible_profile_id
        and p.status = 'active'
        and p.role in ('club_admin', 'treasurer', 'secretary', 'viewer')
    )
  );

create or replace function public.list_collection_account_responsibles()
returns table (
  profile_id uuid,
  email text,
  role public.club_user_role
)
language sql
security definer
set search_path = public, auth
as $$
  select
    p.id as profile_id,
    u.email::text as email,
    p.role
  from public.user_profiles p
  join auth.users u on u.id = p.auth_user_id
  where public.is_internal_club_user()
    and p.status = 'active'
    and p.role in ('club_admin', 'treasurer', 'secretary', 'viewer')
  order by
    case p.role
      when 'club_admin' then 1
      when 'treasurer' then 2
      when 'secretary' then 3
      else 4
    end,
    u.email;
$$;

revoke all on function public.list_collection_account_responsibles() from public;
grant execute on function public.list_collection_account_responsibles() to authenticated;
