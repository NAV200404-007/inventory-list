-- Enforce that the number of active asset IDs can never exceed an item's total.
-- Historical surplus assets remain inactive for past event reports.

create or replace function public.cap_active_inventory_asset()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  allowed_total integer;
  current_active integer;
begin
  if not new.active then
    return new;
  end if;

  select total into allowed_total
  from public.inventory_items
  where id = new.inventory_item_id;

  select count(*) into current_active
  from public.inventory_assets
  where inventory_item_id = new.inventory_item_id
    and active
    and id <> new.id;

  if current_active >= coalesce(allowed_total, 0) then
    new.active := false;
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_assets_cap_active on public.inventory_assets;
create trigger inventory_assets_cap_active
before insert or update of active, inventory_item_id on public.inventory_assets
for each row execute function public.cap_active_inventory_asset();

create or replace function public.trim_inventory_assets_to_total()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  with ranked_active as (
    select id, row_number() over (order by asset_code, created_at) as position
    from public.inventory_assets
    where inventory_item_id = new.id and active
  )
  update public.inventory_assets asset
  set active = false
  from ranked_active ranked
  where asset.id = ranked.id and ranked.position > new.total;
  return new;
end;
$$;

drop trigger if exists inventory_items_trim_assets on public.inventory_items;
create trigger inventory_items_trim_assets
after insert or update of total on public.inventory_items
for each row execute function public.trim_inventory_assets_to_total();

-- Repair existing mismatches immediately.
with ranked_active as (
  select
    asset.id,
    row_number() over (
      partition by asset.inventory_item_id
      order by asset.asset_code, asset.created_at
    ) as position,
    item.total
  from public.inventory_assets asset
  join public.inventory_items item on item.id = asset.inventory_item_id
  where asset.active
)
update public.inventory_assets asset
set active = false
from ranked_active ranked
where ranked.id = asset.id and ranked.position > ranked.total;

