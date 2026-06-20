-- Let the public registration screen know whether initial employer setup is complete
-- without exposing profile records.
create or replace function public.has_employer()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where portal = 'employer');
$$;

grant execute on function public.has_employer() to anon, authenticated;

