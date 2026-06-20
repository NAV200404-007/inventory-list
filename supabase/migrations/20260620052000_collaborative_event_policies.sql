-- Allow an assigned team to collaborate on event progress while keeping
-- inventory administration and event creation restricted to employers.

drop policy if exists event_staff_read on public.event_staff;
create policy event_staff_read on public.event_staff for select to authenticated
using (
  public.is_employer()
  or profile_id = auth.uid()
  or public.is_event_staff(event_id)
);

create policy events_staff_update on public.events for update to authenticated
using (public.is_event_staff(id))
with check (public.is_event_staff(id));

drop policy if exists notifications_employer_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated
with check (
  public.is_employer()
  or exists (
    select 1 from public.profiles recipient
    where recipient.id = recipient_id and recipient.portal = 'employer'
  )
);

