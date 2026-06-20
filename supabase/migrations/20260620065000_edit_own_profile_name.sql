-- Users may edit only their own display name. Keeping this behind an RPC avoids
-- granting employees broad update access to role and portal columns.
create or replace function public.update_own_profile_name(new_name text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  cleaned_name text := trim(new_name);
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;
  if length(cleaned_name) < 2 or length(cleaned_name) > 80 then
    raise exception 'Name must be between 2 and 80 characters.';
  end if;

  update public.profiles
  set name = cleaned_name
  where id = auth.uid();
end;
$$;

revoke all on function public.update_own_profile_name(text) from public, anon;
grant execute on function public.update_own_profile_name(text) to authenticated;

alter publication supabase_realtime add table public.profiles;

