-- Separa definitivamente el acceso de comision (email real) del portal de socios (DNI/email sintetico).

alter table public.user_profiles
  drop constraint if exists user_profiles_member_role_requires_member;

alter table public.user_profiles
  add constraint user_profiles_role_access_boundary
  check (
    (role = 'member' and member_id is not null)
    or (role in ('club_admin', 'treasurer', 'secretary', 'viewer') and member_id is null)
  );

drop function if exists public.claim_member_profile_by_email();
