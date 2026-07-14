import type { EventRecord, InventoryItem, Reservation, ReturnLine } from '../types'
import {
  assetJourneyTone,
  eventFlowSteps,
  eventStatusLabel,
  eventStatusTone,
  eventStepIndex,
  formatEventSchedule,
} from '../lib/eventPresentation'
import { Badge } from './Badge'

export function FlowStep({ index, text, title }: { index: number; text: string; title: string }) {
  return (
    <div className="flow-step">
      <span>{index}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  )
}

export function TeamChips({ employees }: { employees: string[] }) {
  if (employees.length === 0) {
    return <div className="team-chips"><span>Unassigned</span></div>
  }

  return (
    <div className="team-chips" aria-label="Assigned staff">
      {employees.map((employee) => (
        <span key={employee}>{employee}</span>
      ))}
    </div>
  )
}

export function EventSummary({
  active,
  event,
  inventoryById,
  onSelect,
}: {
  active?: boolean
  event: EventRecord
  inventoryById: Record<string, InventoryItem>
  onSelect: () => void
}) {
  return (
    <button className={`event-card ${active ? 'active' : ''}`} onClick={onSelect} type="button">
      <div>
        <strong>{event.title}</strong>
        <span>{event.id} - {event.type} - {formatEventSchedule(event)}</span>
        <span>{event.location}</span>
        <TeamChips employees={event.assignedEmployees} />
      </div>
      <Badge tone={eventStatusTone(event.status)}>{eventStatusLabel(event.status)}</Badge>
      <p>
        {event.reservations
          .map((reservation) => {
            const item = inventoryById[reservation.itemId]
            return item ? `${reservation.quantity} ${item.name}` : null
          })
          .filter(Boolean)
          .join(', ')}
      </p>
    </button>
  )
}

export function EventProgress({ status }: { status: EventRecord['status'] }) {
  const currentStep = eventStepIndex(status)

  return (
    <div className="event-progress" aria-label={`Event status: ${eventStatusLabel(status)}`}>
      {eventFlowSteps.map((step, index) => (
        <div
          className={`progress-step ${index <= currentStep ? 'complete' : ''} ${
            index === currentStep ? 'current' : ''
          }`}
          key={step.key}
        >
          <span>{index + 1}</span>
          <strong>{step.label}</strong>
        </div>
      ))}
    </div>
  )
}

export function ReturnReportSummary({
  event,
  inventoryById,
}: {
  event: EventRecord
  inventoryById: Record<string, InventoryItem>
}) {
  const reportLines = event.reservations
    .map((reservation) => {
      const item = inventoryById[reservation.itemId]
      const report = event.returnReport?.[reservation.itemId]
      return item && report ? { item, reservation, report } : null
    })
    .filter(Boolean) as Array<{
      item: InventoryItem
      reservation: Reservation
      report: ReturnLine
    }>

  if (reportLines.length === 0) return null

  const totalMissing = reportLines.reduce((total, line) => total + line.report.missing, 0)
  const totalDamaged = reportLines.reduce((total, line) => total + line.report.damaged, 0)

  return (
    <section className="return-summary" aria-label="Submitted return report">
      <div className="section-heading compact-heading">
        <div>
          <h2>Return report submitted</h2>
          <p>Employer review: {totalMissing} missing, {totalDamaged} damaged.</p>
          <p>{formatEventSchedule(event)}</p>
          <p>Packed by: {event.packedBy || 'Not recorded'} - Checked out by: {event.checkedOutBy || 'Not recorded'} - Report submitted by: {event.returnReportBy || 'Not recorded'}</p>
        </div>
        <Badge tone={event.returnReviewed ? 'success' : totalMissing > 0 || totalDamaged > 0 ? 'warning' : 'info'}>
          {event.returnReviewed ? 'Employer reviewed' : 'Ready for review'}
        </Badge>
      </div>
      {event.returnPhotos.length > 0 && (
        <div className="return-summary-photos">
          <strong>Return photos</strong>
          <div className="packing-photo-grid">
            {event.returnPhotos.map((photo, index) => (
              <figure className="packing-photo" key={photo.id}>
                <a href={photo.signedUrl} rel="noreferrer" target="_blank">
                  <img alt={`Return report photo ${index + 1}`} src={photo.signedUrl} />
                </a>
                <figcaption><span>{photo.uploadedBy}</span><small>{photo.uploadedAt}</small></figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
      <div className="return-summary-list">
        {reportLines.map(({ item, reservation, report }) => (
          <div className="return-summary-row" key={item.id}>
            <strong>{item.name}</strong>
            <span>Checked out: {reservation.quantity}</span>
            <span>Returned: {report.returned}</span>
            <span>Damaged: {report.damaged}</span>
            <span>Missing: {report.missing}</span>
            <p>{report.remarks || 'No remarks'}</p>
            <div className="asset-summary-items">
              {reservation.selectedAssetIds.map((assetId) => {
                const assetLine = event.assetReturnReport?.[assetId]
                const status = assetLine?.status ?? 'Returned'
                return (
                  <span key={assetId}>
                    <strong>{assetId}</strong>
                    <Badge tone={assetJourneyTone(status)}>{status}</Badge>
                    {assetLine?.remarks && <small>{assetLine.remarks}</small>}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
