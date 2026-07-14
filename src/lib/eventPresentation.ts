import type { EventRecord, EventStatus, InventoryStatus } from '../types'

export const eventFlowSteps = [
  { key: 'Draft', label: 'Draft' },
  { key: 'Reserved', label: 'Reserved' },
  { key: 'Packed', label: 'Packed' },
  { key: 'Checked Out', label: 'Checked out' },
  { key: 'Returned', label: 'Returned' },
  { key: 'Closed', label: 'Closed' },
] as const

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

export function formatEventSchedule(
  event: Pick<EventRecord, 'start' | 'startTime' | 'end' | 'endTime'>,
) {
  return `${formatDate(event.start)}, ${event.startTime} to ${formatDate(event.end)}, ${event.endTime}`
}

export function eventStatusLabel(status: EventStatus) {
  if (status === 'Returned') return 'Return report submitted'
  return status
}

export function eventStatusTone(status: EventStatus) {
  if (status === 'Closed') return 'neutral'
  if (status === 'Packed') return 'success'
  if (status === 'Checked Out' || status === 'Returned') return 'warning'
  return 'info'
}

export function assetJourneyTone(status: string) {
  if (status === 'Returned' || status === 'Packed') return 'success'
  if (status === 'Damaged') return 'warning'
  if (status === 'Missing') return 'danger'
  if (status === 'Checked out') return 'info'
  return 'neutral'
}

export function eventStepIndex(status: EventStatus) {
  return eventFlowSteps.findIndex((step) => step.key === status)
}

export function inventoryStatusTone(status: InventoryStatus) {
  if (status === 'Available') return 'success'
  if (status === 'Reserved' || status === 'In Use') return 'info'
  if (status === 'Damaged' || status === 'Missing') return 'danger'
  return 'neutral'
}
