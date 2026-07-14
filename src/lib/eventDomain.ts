import type { EventRecord, EventStatus } from '../types'

export function normalizeEventStatus(status: string): EventStatus {
  if (status === 'In Use') return 'Checked Out'
  if (status === 'Completed') return 'Closed'
  if (
    status === 'Draft' ||
    status === 'Reserved' ||
    status === 'Packed' ||
    status === 'Checked Out' ||
    status === 'Returned' ||
    status === 'Closed'
  ) {
    return status
  }
  return 'Draft'
}

export function createEventRecordId() {
  return crypto.randomUUID()
}

export function createRecordId() {
  return crypto.randomUUID()
}

export function normalizeEventRecord(event: EventRecord & { staff?: string; recordId?: string }) {
  const assignedEmployees = event.assignedEmployees?.length
    ? event.assignedEmployees
    : event.staff && event.staff !== 'Unassigned'
      ? [event.staff]
      : []

  return {
    ...event,
    recordId: event.recordId ?? createEventRecordId(),
    assignedEmployees,
    comments: event.comments ?? '',
    startTime: event.startTime ?? '09:00',
    endTime: event.endTime ?? '17:00',
    packingProgress: event.packingProgress ?? {},
    packedAssetIds: event.packedAssetIds ?? {},
    checkoutApproved: event.checkoutApproved ?? false,
    packingPhotos: event.packingPhotos ?? [],
    returnPhotos: event.returnPhotos ?? [],
    returnReviewed: event.returnReviewed ?? false,
    status: normalizeEventStatus(event.status),
  }
}

export function eventSyncSignature(event: EventRecord) {
  const { packingPhotos: _packingPhotos, returnPhotos: _returnPhotos, ...persistentEvent } = event
  void _packingPhotos
  void _returnPhotos
  return JSON.stringify(persistentEvent)
}

export function changedRecordIds<T extends { id: string }>(current: T[], previous: T[]) {
  const previousById = new Map(previous.map((record) => [record.id, JSON.stringify(record)]))
  return current
    .filter((record) => previousById.get(record.id) !== JSON.stringify(record))
    .map((record) => record.id)
}

export function dateValue(date: string) {
  return new Date(`${date}T00:00:00`).getTime()
}

export function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return dateValue(startA) <= dateValue(endB) && dateValue(startB) <= dateValue(endA)
}
