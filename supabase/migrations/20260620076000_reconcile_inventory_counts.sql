-- Final reconciliation for inventory created before transactional syncing.
-- Preserve current active IDs, trim surplus, then reactivate historical IDs
-- only when an item has fewer active IDs than its total.
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

with item_counts as (
  select
    item.id,
    item.total,
    count(asset.id) filter (where asset.active) as active_count
  from public.inventory_items item
  left join public.inventory_assets asset on asset.inventory_item_id = item.id
  group by item.id, item.total
),
ranked_inactive as (
  select
    asset.id,
    asset.inventory_item_id,
    row_number() over (
      partition by asset.inventory_item_id
      order by asset.asset_code, asset.created_at
    ) as position
  from public.inventory_assets asset
  where not asset.active
)
update public.inventory_assets asset
set active = true
from ranked_inactive ranked
join item_counts counts on counts.id = ranked.inventory_item_id
where asset.id = ranked.id
  and ranked.position <= greatest(0, counts.total - counts.active_count);

