-- Save the complete inventory in one transaction. This prevents partial
-- Realtime reloads and keeps total quantities aligned with active asset IDs.
create or replace function public.sync_inventory(inventory_payload jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  item jsonb;
  current_asset_code text;
  condition jsonb;
  item_id text;
  item_total integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;
  if jsonb_typeof(inventory_payload) <> 'array' then
    raise exception 'Inventory payload must be an array.';
  end if;

  for item in select value from jsonb_array_elements(inventory_payload)
  loop
    item_id := item ->> 'id';
    item_total := greatest(0, coalesce((item ->> 'total')::integer, 0));

    insert into public.inventory_items (id, name, category, unit, location, total)
    values (
      item_id,
      trim(item ->> 'name'),
      coalesce(nullif(item ->> 'category', ''), 'Custom'),
      coalesce(nullif(item ->> 'unit', ''), 'unit'),
      coalesce(item ->> 'location', ''),
      item_total
    )
    on conflict (id) do update set
      name = excluded.name,
      category = excluded.category,
      unit = excluded.unit,
      location = excluded.location,
      total = excluded.total;

    update public.inventory_assets
    set active = false
    where inventory_item_id = item_id and active;

    for current_asset_code in
      select trim(value #>> '{}')
      from jsonb_array_elements(coalesce(item -> 'assetIds', '[]'::jsonb))
      where trim(value #>> '{}') <> ''
      limit item_total
    loop
      condition := coalesce(item -> 'assetConditions' -> current_asset_code, '{}'::jsonb);
      if exists (
        select 1 from public.inventory_assets existing_asset
        where existing_asset.asset_code = current_asset_code
          and existing_asset.inventory_item_id <> item_id
      ) then
        raise exception 'Item ID % already belongs to another inventory item.', current_asset_code;
      end if;
      insert into public.inventory_assets (
        inventory_item_id,
        asset_code,
        active,
        status,
        issue_remarks,
        issue_event_id,
        issue_reported_by
      )
      values (
        item_id,
        current_asset_code,
        true,
        case
          when condition ->> 'status' = 'Damaged' then 'Damaged'::public.asset_status
          when condition ->> 'status' = 'Missing' then 'Missing'::public.asset_status
          else 'Available'::public.asset_status
        end,
        coalesce(condition ->> 'remarks', ''),
        null,
        case when condition ? 'status' then auth.uid() else null end
      )
      on conflict (asset_code) do update set
        inventory_item_id = excluded.inventory_item_id,
        active = excluded.active,
        status = excluded.status,
        issue_remarks = excluded.issue_remarks,
        issue_event_id = excluded.issue_event_id,
        issue_reported_by = excluded.issue_reported_by;
    end loop;
  end loop;
end;
$$;

revoke all on function public.sync_inventory(jsonb) from public, anon;
grant execute on function public.sync_inventory(jsonb) to authenticated;
