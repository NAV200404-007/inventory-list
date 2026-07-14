import type { EventRecord, InventoryItem } from '../types'
import { overlaps } from './eventDomain'

export function numberedIds(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(3, '0')}`)
}

export function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `item-${Date.now()}`
  )
}

export function makeAssetPrefix(value: string) {
  return (
    value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 8) || 'ITEM'
  )
}

export function normalizeInventoryItem(item: InventoryItem): InventoryItem {
  const total = Math.max(0, Number.isInteger(item.total) ? item.total : 0)
  const prefix = makeAssetPrefix(item.assetIds[0]?.split('-')[0] ?? item.name ?? item.id)
  const uniqueIds: string[] = []
  for (const assetId of item.assetIds) {
    const normalizedId = assetId.trim().toUpperCase()
    if (normalizedId && !uniqueIds.includes(normalizedId)) uniqueIds.push(normalizedId)
    if (uniqueIds.length >= total) break
  }

  let nextNumber = 1
  while (uniqueIds.length < total) {
    const nextId = `${prefix}-${String(nextNumber).padStart(3, '0')}`
    if (!uniqueIds.includes(nextId)) uniqueIds.push(nextId)
    nextNumber += 1
  }

  const activeIdSet = new Set(uniqueIds)
  const assetConditions = Object.fromEntries(
    Object.entries(item.assetConditions ?? {}).filter(([assetId]) => activeIdSet.has(assetId)),
  )
  const damaged = Math.min(total, Math.max(0, Number.isInteger(item.damaged) ? item.damaged : 0))
  const missing = Math.min(
    Math.max(0, total - damaged),
    Math.max(0, Number.isInteger(item.missing) ? item.missing : 0),
  )

  return { ...item, total, damaged, missing, assetIds: uniqueIds, assetConditions }
}

export function normalizeInventory(items: InventoryItem[]) {
  return items.map(normalizeInventoryItem)
}

export function getUsable(item: InventoryItem) {
  return Math.max(0, item.total - item.damaged - item.missing)
}

export function usedAssetIdsForItem(
  events: EventRecord[],
  itemId: string,
  start: string,
  end: string,
) {
  return events
    .filter((event) => event.status !== 'Closed' && overlaps(start, end, event.start, event.end))
    .flatMap((event) => event.reservations)
    .filter((reservation) => reservation.itemId === itemId)
    .flatMap((reservation) => reservation.selectedAssetIds)
}

export function pickAssetIds(
  item: InventoryItem,
  quantity: number,
  events: EventRecord[],
  start: string,
  end: string,
) {
  const used = new Set(usedAssetIdsForItem(events, item.id, start, end))
  return item.assetIds
    .filter((assetId) => !used.has(assetId) && !item.assetConditions?.[assetId])
    .slice(0, quantity)
}
