-- Keep retired/surplus asset IDs for historical event reports without counting
-- them as part of the current editable inventory.
alter table public.inventory_assets
add column active boolean not null default true;

with ranked_assets as (
  select
    asset.id,
    row_number() over (
      partition by asset.inventory_item_id
      order by asset.asset_code, asset.created_at
    ) as position,
    item.total
  from public.inventory_assets asset
  join public.inventory_items item on item.id = asset.inventory_item_id
)
update public.inventory_assets asset
set active = ranked.position <= ranked.total
from ranked_assets ranked
where ranked.id = asset.id;

create index inventory_assets_active_item_idx
on public.inventory_assets(inventory_item_id, active);
