-- Both authenticated roles may maintain the shared inventory. Event creation,
-- assignments, approvals, and closure remain employer-only.
drop policy if exists inventory_items_manage on public.inventory_items;
create policy inventory_items_manage on public.inventory_items for all to authenticated
using (true) with check (true);

drop policy if exists inventory_assets_manage on public.inventory_assets;
create policy inventory_assets_manage on public.inventory_assets for all to authenticated
using (true) with check (true);

