-- Authenticated users may delete their own account. Event ownership is moved
-- to another employer first, and the final employer cannot remove themselves.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_portal public.portal_mode;
  replacement_employer uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  select portal into current_portal
  from public.profiles
  where id = current_user_id;

  if current_portal is null then
    raise exception 'Account profile not found.';
  end if;

  select id into replacement_employer
  from public.profiles
  where portal = 'employer' and id <> current_user_id
  order by created_at
  limit 1;

  if current_portal = 'employer' and replacement_employer is null then
    raise exception 'Promote another employee to employer before deleting the final employer account.';
  end if;

  if replacement_employer is not null then
    update public.events
    set created_by = replacement_employer
    where created_by = current_user_id;
  end if;

  update public.events set packed_by = null where packed_by = current_user_id;
  update public.events set checkout_approved_by = null where checkout_approved_by = current_user_id;
  update public.events set checked_out_by = null where checked_out_by = current_user_id;
  update public.events set return_report_by = null where return_report_by = current_user_id;
  update public.events set closed_by = null where closed_by = current_user_id;
  update public.event_assets set packed_by = null where packed_by = current_user_id;

  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

