-- Avoid rewriting every asset during each save. Only changed rows emit
-- Realtime events, making inventory editing substantially smoother.
create or replace function public.sync_inventory(inventory_payload jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  item jsonb;
  current_asset_code text;
  desired_codes text[];
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
    select coalesce(array_agg(code), array[]::text[])
    into desired_codes
    from (
      select trim(value #>> '{}') as code
      from jsonb_array_elements(coalesce(item -> 'assetIds', '[]'::jsonb))
      where trim(value #>> '{}') <> ''
      limit item_total
    ) requested_codes;

    if cardinality(desired_codes) <> cardinality(array(select distinct unnest(desired_codes))) then
      raise exception 'Item IDs must be unique within each inventory item.';
    end if;

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
      total = excluded.total
    where (
      inventory_items.name,
      inventory_items.category,
      inventory_items.unit,
      inventory_items.location,
      inventory_items.total
    ) is distinct from (
      excluded.name,
      excluded.category,
      excluded.unit,
      excluded.location,
      excluded.total
    );

    update public.inventory_assets
    set active = false
    where inventory_item_id = item_id
      and active
      and not (asset_code = any(desired_codes));

    foreach current_asset_code in array desired_codes
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
        issue_reported_by = excluded.issue_reported_by
      where (
        inventory_assets.inventory_item_id,
        inventory_assets.active,
        inventory_assets.status,
        inventory_assets.issue_remarks,
        inventory_assets.issue_event_id,
        inventory_assets.issue_reported_by
      ) is distinct from (
        excluded.inventory_item_id,
        excluded.active,
        excluded.status,
        excluded.issue_remarks,
        excluded.issue_event_id,
        excluded.issue_reported_by
      );
    end loop;
  end loop;
end;
$$;

