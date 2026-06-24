type ExportReservation = {
  itemId: string
  quantity: number
  selectedAssetIds: string[]
}

type ExportEvent = {
  id: string
  title: string
  type: string
  location: string
  start: string
  startTime: string
  end: string
  endTime: string
  status: string
  assignedEmployees: string[]
  reservations: ExportReservation[]
  packedAssetIds: Record<string, boolean>
  packedBy?: string
  checkedOutBy?: string
  returnReportBy?: string
  returnReviewed: boolean
  returnReviewedBy?: string
  assetReturnReport?: Record<string, { status: string; remarks: string }>
  packingPhotos: unknown[]
  returnPhotos: unknown[]
}

type ExportInventoryItem = {
  name: string
  unit: string
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase()
}

function displaySchedule(event: ExportEvent) {
  return `${event.start} ${event.startTime} to ${event.end} ${event.endTime}`
}

async function createReport(title: string, event: ExportEvent) {
  const { jsPDF } = await import('jspdf')
  const document = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = document.internal.pageSize.getWidth()
  const margin = 16
  let y = 18

  const ensureSpace = (height: number) => {
    if (y + height <= 280) return
    document.addPage()
    y = 18
  }

  const text = (value: string, size = 10, weight: 'normal' | 'bold' = 'normal', indent = 0) => {
    document.setFont('helvetica', weight)
    document.setFontSize(size)
    document.setTextColor(17, 24, 39)
    const lines = document.splitTextToSize(value, pageWidth - margin * 2 - indent)
    ensureSpace(lines.length * 5 + 2)
    document.text(lines, margin + indent, y)
    y += lines.length * 5 + 2
  }

  document.setFillColor(0, 122, 255)
  document.roundedRect(margin, 12, pageWidth - margin * 2, 20, 3, 3, 'F')
  document.setTextColor(255, 255, 255)
  document.setFont('helvetica', 'bold')
  document.setFontSize(16)
  document.text('Future Ready Inventory', margin + 5, 20)
  document.setFontSize(10)
  document.text(title, margin + 5, 27)
  y = 40

  text(`${event.id} - ${event.title}`, 15, 'bold')
  text(`${event.type} | ${event.location}`, 10)
  text(displaySchedule(event), 10)
  text(`Status: ${event.status}`, 10, 'bold')
  text(`Assigned staff: ${event.assignedEmployees.join(', ') || 'Unassigned'}`, 10)
  y += 2

  return { document, text, ensureSpace, getY: () => y, setY: (value: number) => { y = value } }
}

export async function exportPackingListPdf(
  event: ExportEvent,
  inventoryById: Record<string, ExportInventoryItem>,
) {
  const report = await createReport('Packing List', event)
  report.text('Equipment', 12, 'bold')

  for (const reservation of event.reservations) {
    const item = inventoryById[reservation.itemId]
    if (!item) continue
    report.ensureSpace(16)
    report.text(`${item.name} - ${reservation.quantity} ${item.unit}${reservation.quantity === 1 ? '' : 's'}`, 11, 'bold')
    const assetIds = reservation.selectedAssetIds.length
      ? reservation.selectedAssetIds
      : Array.from({ length: reservation.quantity }, (_, index) => `Untracked item ${index + 1}`)
    for (const assetId of assetIds) {
      report.text(`[${event.packedAssetIds[assetId] ? 'x' : ' '}] ${assetId}`, 9, 'normal', 4)
    }
  }

  report.setY(report.getY() + 3)
  report.text(`Packed by: ${event.packedBy || 'Not recorded'}`, 10)
  report.text(`Packing photos: ${event.packingPhotos.length}`, 10)
  report.text(`Generated: ${new Date().toLocaleString('en-SG')}`, 8)
  report.document.save(`${safeFileName(event.id)}-packing-list.pdf`)
}

export async function exportReturnReportPdf(
  event: ExportEvent,
  inventoryById: Record<string, ExportInventoryItem>,
) {
  const report = await createReport('Return Report', event)
  report.text('Item outcomes', 12, 'bold')

  for (const reservation of event.reservations) {
    const item = inventoryById[reservation.itemId]
    if (!item) continue
    report.ensureSpace(16)
    report.text(item.name, 11, 'bold')
    for (const assetId of reservation.selectedAssetIds) {
      const result = event.assetReturnReport?.[assetId]
      report.text(`${assetId} - ${result?.status || 'Not reported'}`, 9, 'bold', 4)
      if (result?.remarks) report.text(`Remarks: ${result.remarks}`, 9, 'normal', 8)
    }
  }

  report.setY(report.getY() + 3)
  report.text(`Packed by: ${event.packedBy || 'Not recorded'}`, 10)
  report.text(`Checked out by: ${event.checkedOutBy || 'Not recorded'}`, 10)
  report.text(`Report submitted by: ${event.returnReportBy || 'Not recorded'}`, 10)
  report.text(`Employer review: ${event.returnReviewed ? `Approved by ${event.returnReviewedBy || 'employer'}` : 'Pending'}`, 10)
  report.text(`Return photos: ${event.returnPhotos.length}`, 10)
  report.text(`Generated: ${new Date().toLocaleString('en-SG')}`, 8)
  report.document.save(`${safeFileName(event.id)}-return-report.pdf`)
}
