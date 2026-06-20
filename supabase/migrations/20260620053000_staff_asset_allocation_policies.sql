-- Assigned staff may maintain the exact asset list for their event. Inventory
-- item creation and global asset status management remain employer-only.

create policy event_assets_staff_insert on public.event_assets for insert to authenticated
with check (public.is_event_staff(event_id));

create policy event_assets_staff_delete on public.event_assets for delete to authenticated
using (public.is_event_staff(event_id));

