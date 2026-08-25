-- Permite que una cuenta Auth se vincule automaticamente al socio
-- registrado con el mismo email. Sirve para altas publicas con contraseña.

create or replace function public.claim_member_profile_by_email()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_member_id uuid;
  v_profile_id uuid;
begin
  v_email := lower(nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), ''));

  if auth.uid() is null or v_email is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select m.id into v_member_id
  from public.members m
  where lower(coalesce(m.email, '')) = v_email
  order by
    case when m.status = 'active' then 0 when m.status = 'pending' then 1 else 2 end,
    m.created_at desc
  limit 1;

  if v_member_id is null then
    raise exception 'No hay socio registrado con este email' using errcode = 'P0007';
  end if;

  insert into public.user_profiles (auth_user_id, role, member_id, status)
  values (auth.uid(), 'member', v_member_id, 'active')
  on conflict (auth_user_id) do update
  set member_id = excluded.member_id,
      role = case
        when public.user_profiles.role in ('club_admin', 'treasurer', 'secretary', 'viewer')
          then public.user_profiles.role
        else 'member'
      end,
      status = 'active',
      updated_at = now()
  returning id into v_profile_id;

  return v_profile_id;
end;
$$;

revoke all on function public.claim_member_profile_by_email() from public;
grant execute on function public.claim_member_profile_by_email() to authenticated;
