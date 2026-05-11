-- Security-definer RPC for atomic organization creation.
-- Works around Server Action + Supabase SSR auth-context edge cases by
-- doing the auth check inside Postgres rather than relying on PostgREST
-- to attach the user's JWT to two separate write calls.

create or replace function public.create_organization_for_caller(
  org_name text,
  org_coc_number text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1 from public.profiles
    where id = caller_id and organization_id is not null
  ) then
    raise exception 'User already belongs to an organization';
  end if;

  insert into public.organizations (name, coc_number)
  values (org_name, org_coc_number)
  returning id into new_org_id;

  update public.profiles
  set organization_id = new_org_id, role = 'admin'
  where id = caller_id;

  return new_org_id;
end;
$$;

grant execute on function public.create_organization_for_caller(text, text) to authenticated;
