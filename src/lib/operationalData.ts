import type { SupabaseClient } from '@supabase/supabase-js'

type PortalMode = 'employer' | 'employee'
type Role = 'Employer' | 'Inventory Manager' | 'Employee'
type EventStatus = 'Draft' | 'Reserved' | 'Packed' | 'Checked Out' | 'Returned' | 'Closed'
type AssetStatus = 'Available' | 'Reserved' | 'In Use' | 'Damaged' | 'Missing'
type ReturnStatus = 'Returned' | 'Damaged' | 'Missing'

export type OperationalUser = {
  id: string
  name: string
  portal: PortalMode
}

export type OperationalInventoryItem = {
  id: string
  name: string
  category: string
  total: number
  damaged: number
  missing: number
  location: string
  unit: string
  assetIds: string[]
  assetConditions?: Record<string, {
    status: 'Damaged' | 'Missing'
    remarks: string
    eventId: string
    eventTitle: string
    reportedBy: string
  }>
}

export type OperationalEvent = {
  recordId: string
  id: string
  title: string
  type: string
  location: string
  start: string
  startTime: string
  end: string
  endTime: string
  assignedEmployees: string[]
  status: EventStatus
  reservations: { itemId: string; quantity: number; selectedAssetIds: string[] }[]
  packingProgress: Record<string, boolean>
  packedAssetIds: Record<string, boolean>
  packedBy?: string
  checkoutApproved: boolean
  checkedOutBy?: string
  returnReport?: Record<string, { returned: number; damaged: number; missing: number; remarks: string }>
  assetReturnReport?: Record<string, { status: ReturnStatus; remarks: string }>
  returnReportBy?: string
}

export type OperationalNotification = {
  id: string
  staff: string
  eventId: string
  title: string
  message: string
  read: boolean
}

export type OperationalAuditLog = {
  id: string
  staff: string
  action: string
  detail: string
  time: string
}

export type OperationalSnapshot = {
  inventory: OperationalInventoryItem[]
  events: OperationalEvent[]
  notifications: OperationalNotification[]
  auditLogs: OperationalAuditLog[]
}

type ProfileRow = { id: string; name: string; role: Role; portal: PortalMode }
type ItemRow = { id: string; name: string; category: string; unit: string; location: string; total: number }
type AssetRow = {
  id: string
  inventory_item_id: string
  asset_code: string
  active: boolean
  status: AssetStatus
  issue_remarks: string
  issue_event_id: string | null
  issue_reported_by: string | null
}
type EventRow = {
  id: string
  event_code: string
  title: string
  event_type: string
  location: string
  starts_at: string
  ends_at: string
  status: EventStatus
  packed_by: string | null
  checkout_approved: boolean
  checked_out_by: string | null
  return_report_by: string | null
}
type StaffRow = { event_id: string; profile_id: string }
type RequirementRow = { event_id: string; inventory_item_id: string; quantity: number }
type EventAssetRow = {
  event_id: string
  asset_id: string
  packed: boolean
  return_status: ReturnStatus | null
  return_remarks: string
}
type NotificationRow = {
  id: string
  recipient_id: string
  event_id: string | null
  title: string
  message: string
  read: boolean
}
type AuditRow = { id: string; actor_id: string | null; action: string; detail: string; created_at: string }

function localDateParts(value: string) {
  const date = new Date(value)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? ''
  return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` }
}

function toTimestamp(date: string, time: string) {
  return new Date(`${date}T${time}:00+08:00`).toISOString()
}

function requireData<T>(data: T | null, error: { message: string } | null, label: string): T {
  if (error) throw new Error(`${label}: ${error.message}`)
  return data ?? ([] as T)
}

export async function loadOperationalData(client: SupabaseClient): Promise<OperationalSnapshot> {
  const results = await Promise.all([
    client.from('profiles').select('id,name,role,portal'),
    client.from('inventory_items').select('id,name,category,unit,location,total').order('name'),
    client.from('inventory_assets').select('id,inventory_item_id,asset_code,active,status,issue_remarks,issue_event_id,issue_reported_by').order('asset_code'),
    client.from('events').select('id,event_code,title,event_type,location,starts_at,ends_at,status,packed_by,checkout_approved,checked_out_by,return_report_by').order('starts_at'),
    client.from('event_staff').select('event_id,profile_id'),
    client.from('event_requirements').select('event_id,inventory_item_id,quantity'),
    client.from('event_assets').select('event_id,asset_id,packed,return_status,return_remarks'),
    client.from('notifications').select('id,recipient_id,event_id,title,message,read').order('created_at', { ascending: false }),
    client.from('audit_logs').select('id,actor_id,action,detail,created_at').order('created_at', { ascending: false }),
  ])

  const profiles = requireData(results[0].data as ProfileRow[] | null, results[0].error, 'Profiles')
  const items = requireData(results[1].data as ItemRow[] | null, results[1].error, 'Inventory')
  const assets = requireData(results[2].data as AssetRow[] | null, results[2].error, 'Assets')
  const eventRows = requireData(results[3].data as EventRow[] | null, results[3].error, 'Events')
  const staffRows = requireData(results[4].data as StaffRow[] | null, results[4].error, 'Event staff')
  const requirements = requireData(results[5].data as RequirementRow[] | null, results[5].error, 'Requirements')
  const eventAssets = requireData(results[6].data as EventAssetRow[] | null, results[6].error, 'Event assets')
  const notificationRows = requireData(results[7].data as NotificationRow[] | null, results[7].error, 'Notifications')
  const auditRows = requireData(results[8].data as AuditRow[] | null, results[8].error, 'Audit logs')
  const profileName = new Map(profiles.map((profile) => [profile.id, profile.name]))
  const assetById = new Map(assets.map((asset) => [asset.id, asset]))
  const eventById = new Map(eventRows.map((event) => [event.id, event]))

  const inventory = items.map((item) => {
    const itemAssets = assets.filter((asset) => asset.inventory_item_id === item.id && asset.active)
    const assetConditions = Object.fromEntries(itemAssets.filter((asset) => asset.status === 'Damaged' || asset.status === 'Missing').map((asset) => {
      const issueEvent = asset.issue_event_id ? eventById.get(asset.issue_event_id) : undefined
      return [asset.asset_code, {
        status: asset.status as 'Damaged' | 'Missing',
        remarks: asset.issue_remarks,
        eventId: issueEvent?.event_code ?? 'Manual update',
        eventTitle: issueEvent?.title ?? 'Inventory',
        reportedBy: asset.issue_reported_by ? profileName.get(asset.issue_reported_by) ?? 'Unknown' : 'Unknown',
      }]
    }))
    return {
      ...item,
      damaged: itemAssets.filter((asset) => asset.status === 'Damaged').length,
      missing: itemAssets.filter((asset) => asset.status === 'Missing').length,
      assetIds: itemAssets.map((asset) => asset.asset_code),
      assetConditions,
    }
  })

  const events = eventRows.map((event): OperationalEvent => {
    const starts = localDateParts(event.starts_at)
    const ends = localDateParts(event.ends_at)
    const assignedEmployees = staffRows.filter((row) => row.event_id === event.id).map((row) => profileName.get(row.profile_id)).filter((name): name is string => Boolean(name))
    const eventAssetRows = eventAssets.filter((row) => row.event_id === event.id)
    const reservations = requirements.filter((row) => row.event_id === event.id).map((requirement) => ({
      itemId: requirement.inventory_item_id,
      quantity: requirement.quantity,
      selectedAssetIds: eventAssetRows.map((row) => assetById.get(row.asset_id)).filter((asset) => asset?.inventory_item_id === requirement.inventory_item_id).map((asset) => asset?.asset_code ?? ''),
    }))
    const assetReturnReport = Object.fromEntries(eventAssetRows.filter((row) => row.return_status).map((row) => [assetById.get(row.asset_id)?.asset_code ?? '', { status: row.return_status as ReturnStatus, remarks: row.return_remarks }]))
    const returnReport = Object.fromEntries(reservations.map((reservation) => {
      const lines = reservation.selectedAssetIds.map((assetCode) => assetReturnReport[assetCode]).filter(Boolean)
      return [reservation.itemId, {
        returned: lines.filter((line) => line.status === 'Returned').length,
        damaged: lines.filter((line) => line.status === 'Damaged').length,
        missing: lines.filter((line) => line.status === 'Missing').length,
        remarks: reservation.selectedAssetIds.map((assetCode) => assetReturnReport[assetCode]?.remarks ? `${assetCode}: ${assetReturnReport[assetCode].remarks}` : '').filter(Boolean).join('; '),
      }]
    }))
    return {
      recordId: event.id, id: event.event_code, title: event.title, type: event.event_type,
      location: event.location, start: starts.date, startTime: starts.time, end: ends.date, endTime: ends.time,
      assignedEmployees, status: event.status, reservations,
      packingProgress: Object.fromEntries(reservations.map((reservation) => [reservation.itemId, reservation.selectedAssetIds.length > 0 && reservation.selectedAssetIds.every((code) => eventAssetRows.find((row) => assetById.get(row.asset_id)?.asset_code === code)?.packed)])),
      packedAssetIds: Object.fromEntries(eventAssetRows.map((row) => [assetById.get(row.asset_id)?.asset_code ?? '', row.packed])),
      packedBy: event.packed_by ? profileName.get(event.packed_by) : undefined,
      checkoutApproved: event.checkout_approved,
      checkedOutBy: event.checked_out_by ? profileName.get(event.checked_out_by) : undefined,
      returnReport: Object.keys(assetReturnReport).length ? returnReport : undefined,
      assetReturnReport: Object.keys(assetReturnReport).length ? assetReturnReport : undefined,
      returnReportBy: event.return_report_by ? profileName.get(event.return_report_by) : undefined,
    }
  })

  return {
    inventory,
    events,
    notifications: notificationRows.map((row) => ({ id: row.id, staff: profileName.get(row.recipient_id) ?? '', eventId: row.event_id ?? '', title: row.title, message: row.message, read: row.read })),
    auditLogs: auditRows.map((row) => ({ id: row.id, staff: row.actor_id ? profileName.get(row.actor_id) ?? 'Unknown' : 'Unknown', action: row.action, detail: row.detail, time: new Date(row.created_at).toLocaleString('en-SG') })),
  }
}

export async function syncOperationalData(client: SupabaseClient, user: OperationalUser, snapshot: OperationalSnapshot) {
  const { data: profileRows, error: profileError } = await client.from('profiles').select('id,name,portal')
  if (profileError) throw profileError
  const profiles = (profileRows ?? []) as { id: string; name: string; portal: PortalMode }[]
  const profileId = new Map(profiles.map((profile) => [profile.name, profile.id]))

  if (snapshot.inventory.length) {
    const { error } = await client.from('inventory_items').upsert(snapshot.inventory.map((item) => ({ id: item.id, name: item.name, category: item.category, unit: item.unit, location: item.location, total: item.total })))
    if (error) throw error
    const assetRows = snapshot.inventory.flatMap((item) => item.assetIds.filter(Boolean).map((assetCode) => {
      const condition = item.assetConditions?.[assetCode]
      return { inventory_item_id: item.id, asset_code: assetCode, active: true, status: condition?.status ?? 'Available', issue_remarks: condition?.remarks ?? '', issue_event_id: null, issue_reported_by: condition ? user.id : null }
    }))
    if (assetRows.length) {
      const { error: assetError } = await client.from('inventory_assets').upsert(assetRows, { onConflict: 'asset_code' })
      if (assetError) throw assetError
    }
  }

  const { data: assetRows, error: assetError } = await client.from('inventory_assets').select('id,inventory_item_id,asset_code,active')
  if (assetError) throw assetError

  if (snapshot.inventory.length) {
    for (const item of snapshot.inventory) {
      const activeCodes = new Set(item.assetIds.filter(Boolean))
      const surplusIds = (assetRows ?? [])
        .filter((asset) =>
          asset.inventory_item_id === item.id &&
          asset.active &&
          !activeCodes.has(asset.asset_code),
        )
        .map((asset) => asset.id)
      if (surplusIds.length) {
        const { error } = await client
          .from('inventory_assets')
          .update({ active: false })
          .in('id', surplusIds)
        if (error) throw error
      }
    }
  }
  const assetId = new Map((assetRows ?? []).map((asset) => [asset.asset_code as string, asset.id as string]))

  for (const event of snapshot.events) {
    const eventRow = {
      id: event.recordId,
      event_code: event.id,
      title: event.title,
      event_type: event.type,
      location: event.location,
      starts_at: toTimestamp(event.start, event.startTime),
      ends_at: toTimestamp(event.end, event.endTime),
      status: event.status,
      created_by: user.id,
      packed_by: event.packedBy ? profileId.get(event.packedBy) ?? null : null,
      checkout_approved: event.checkoutApproved,
      checked_out_by: event.checkedOutBy ? profileId.get(event.checkedOutBy) ?? null : null,
      return_report_by: event.returnReportBy ? profileId.get(event.returnReportBy) ?? null : null,
      closed_by: event.status === 'Closed' ? user.id : null,
    }
    const eventWrite = user.portal === 'employer'
      ? client.from('events').upsert(eventRow)
      : client.from('events').update({
          status: event.status,
          packed_by: event.packedBy ? profileId.get(event.packedBy) ?? null : null,
          checkout_approved: event.checkoutApproved,
          checked_out_by: event.checkedOutBy ? profileId.get(event.checkedOutBy) ?? null : null,
          return_report_by: event.returnReportBy ? profileId.get(event.returnReportBy) ?? null : null,
        }).eq('id', event.recordId)
    const { error: eventError } = await eventWrite
    if (eventError) throw eventError

    if (user.portal === 'employer') {
      await client.from('event_staff').delete().eq('event_id', event.recordId)
      const staff = event.assignedEmployees.map((name) => profileId.get(name)).filter((id): id is string => Boolean(id)).map((id) => ({ event_id: event.recordId, profile_id: id }))
      if (staff.length) {
        const { error } = await client.from('event_staff').insert(staff)
        if (error) throw error
      }
      await client.from('event_requirements').delete().eq('event_id', event.recordId)
      if (event.reservations.length) {
        const { error } = await client.from('event_requirements').insert(event.reservations.map((reservation) => ({ event_id: event.recordId, inventory_item_id: reservation.itemId, quantity: reservation.quantity })))
        if (error) throw error
      }
      await client.from('event_assets').delete().eq('event_id', event.recordId)
    }
    const allocations = event.reservations.flatMap((reservation) => reservation.selectedAssetIds.map((code) => assetId.get(code)).filter((id): id is string => Boolean(id)).map((id) => ({
      event_id: event.recordId,
      asset_id: id,
      packed: Boolean(event.packedAssetIds[assetRows?.find((asset) => asset.id === id)?.asset_code as string]),
      packed_by: event.packedAssetIds[assetRows?.find((asset) => asset.id === id)?.asset_code as string] ? profileId.get(event.packedBy ?? user.name) ?? user.id : null,
      packed_at: event.packedAssetIds[assetRows?.find((asset) => asset.id === id)?.asset_code as string] ? new Date().toISOString() : null,
      return_status: event.assetReturnReport?.[assetRows?.find((asset) => asset.id === id)?.asset_code as string]?.status ?? null,
      return_remarks: event.assetReturnReport?.[assetRows?.find((asset) => asset.id === id)?.asset_code as string]?.remarks ?? '',
      returned_at: event.assetReturnReport?.[assetRows?.find((asset) => asset.id === id)?.asset_code as string] ? new Date().toISOString() : null,
    })))
    if (user.portal === 'employee') {
      const { error } = await client.from('event_assets').delete().eq('event_id', event.recordId)
      if (error) throw error
    }
    if (allocations.length) {
      const { error } = await client.from('event_assets').upsert(allocations, { onConflict: 'event_id,asset_id' })
      if (error) throw error
    }
  }

  const notificationRows = snapshot.notifications.filter((notification) => profileId.has(notification.staff)).map((notification) => ({ id: notification.id, recipient_id: profileId.get(notification.staff), event_id: notification.eventId || null, title: notification.title, message: notification.message, read: notification.read }))
  if (user.portal === 'employer' && notificationRows.length) {
    const { error } = await client.from('notifications').upsert(notificationRows)
    if (error) throw error
  } else if (user.portal === 'employee') {
    const ownNotifications = notificationRows.filter((row) => row.recipient_id === user.id)
    for (const notification of ownNotifications) {
      const { error } = await client.from('notifications').update({ read: notification.read }).eq('id', notification.id)
      if (error) throw error
    }
    const employerNotifications = notificationRows.filter((row) => profiles.find((profile) => profile.id === row.recipient_id)?.portal === 'employer')
    if (employerNotifications.length) {
      const { error } = await client.from('notifications').upsert(employerNotifications)
      if (error) throw error
    }
  }
  const auditRows = snapshot.auditLogs.filter((log) => log.staff === user.name).map((log) => ({ id: log.id, actor_id: user.id, action: log.action, detail: log.detail }))
  if (auditRows.length) {
    const { error } = await client.from('audit_logs').upsert(auditRows)
    if (error) throw error
  }
}
