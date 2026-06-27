type ExportReservation = {
  itemId: string
  quantity: number
  selectedAssetIds: string[]
}

type ExportPhoto = {
  signedUrl: string
  uploadedBy: string
  uploadedAt: string
}

type ExportEvent = {
  id: string
  title: string
  type: string
  location: string
  comments?: string
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
  packingPhotos: ExportPhoto[]
  returnPhotos: ExportPhoto[]
}

type ExportInventoryItem = {
  name: string
  unit: string
}

type PdfDocument = InstanceType<typeof import('jspdf').jsPDF>
type AutoTable = typeof import('jspdf-autotable').autoTable

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase()
}

function displaySchedule(event: ExportEvent) {
  return `${event.start} ${event.startTime} to ${event.end} ${event.endTime}`
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Unable to read report image.'))
    reader.readAsDataURL(blob)
  })
}

async function loadLogo() {
  const response = await fetch('/app-logo.png')
  if (!response.ok) throw new Error('Unable to load the Future Ready logo.')
  return blobToDataUrl(await response.blob())
}

async function optimizeReportPhoto(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Unable to load an evidence photo.')
  const blob = await response.blob()
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    const objectUrl = URL.createObjectURL(blob)
    element.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(element)
    }
    element.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unable to decode an evidence photo.'))
    }
    element.src = objectUrl
  })
  const maxEdge = 1200
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to prepare an evidence photo.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.76), width, height }
}

function addReportHeader(
  document: PdfDocument,
  autoTable: AutoTable,
  logo: string,
  reportTitle: string,
  event: ExportEvent,
) {
  const pageWidth = document.internal.pageSize.getWidth()
  const logoWidth = 112
  const logoHeight = logoWidth * (694 / 1323)
  document.addImage(logo, 'PNG', (pageWidth - logoWidth) / 2, 5, logoWidth, logoHeight)
  document.setFont('helvetica', 'bold')
  document.setFontSize(19)
  document.setTextColor(17, 24, 39)
  document.text(reportTitle, pageWidth / 2, 70, { align: 'center' })
  document.setDrawColor(0, 122, 255)
  document.setLineWidth(0.7)
  document.line(16, 75, pageWidth - 16, 75)
  const eventDetails = [
    ['Event', `${event.id} - ${event.title}`],
    ['Type / location', `${event.type} / ${event.location}`],
    ['Schedule', displaySchedule(event)],
    ['Assigned staff', event.assignedEmployees.join(', ') || 'Unassigned'],
    ['Status', event.status],
  ]
  if (event.comments?.trim()) {
    eventDetails.push(['Employer comments', event.comments.trim()])
  }

  autoTable(document, {
    startY: 80,
    theme: 'plain',
    body: eventDetails,
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold', textColor: [55, 65, 81] },
      1: { textColor: [17, 24, 39] },
    },
    styles: { font: 'helvetica', fontSize: 10.5, cellPadding: 2.4, overflow: 'linebreak' },
    margin: { left: 16, right: 16 },
  })
}

function finalTableY(document: PdfDocument) {
  return (document as PdfDocument & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 128
}

async function addEvidencePhotos(
  document: PdfDocument,
  photos: ExportPhoto[],
  sectionTitle: string,
) {
  if (!photos.length) return

  for (let index = 0; index < photos.length; index += 2) {
    document.addPage()
    document.setFont('helvetica', 'bold')
    document.setFontSize(16)
    document.setTextColor(17, 24, 39)
    document.text(sectionTitle, 16, 18)

    const pagePhotos = photos.slice(index, index + 2)
    for (let photoIndex = 0; photoIndex < pagePhotos.length; photoIndex += 1) {
      const photo = pagePhotos[photoIndex]
      const y = photoIndex === 0 ? 27 : 157
      try {
        const image = await optimizeReportPhoto(photo.signedUrl)
        const maxWidth = 178
        const maxHeight = 105
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height)
        const width = image.width * scale
        const height = image.height * scale
        const x = (210 - width) / 2
        document.addImage(image.dataUrl, 'JPEG', x, y, width, height, undefined, 'FAST')
        document.setFont('helvetica', 'normal')
        document.setFontSize(9.5)
        document.setTextColor(75, 85, 99)
        document.text(`Photo ${index + photoIndex + 1} - ${photo.uploadedBy} - ${photo.uploadedAt}`, 16, y + maxHeight + 8)
      } catch {
        document.setFont('helvetica', 'normal')
        document.setFontSize(10)
        document.setTextColor(185, 28, 28)
        document.text(`Photo ${index + photoIndex + 1} could not be loaded.`, 16, y + 12)
      }
    }
  }
}

function addPageNumbers(document: PdfDocument) {
  const pageCount = document.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page)
    document.setFont('helvetica', 'normal')
    document.setFontSize(8.5)
    document.setTextColor(107, 114, 128)
    document.text(`Future Ready Inventory | Page ${page} of ${pageCount}`, 105, 290, { align: 'center' })
  }
}

async function reportDependencies() {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  return { document: new jsPDF({ unit: 'mm', format: 'a4' }), autoTable, logo: await loadLogo() }
}

export async function exportPackingListPdf(
  event: ExportEvent,
  inventoryById: Record<string, ExportInventoryItem>,
) {
  const { document, autoTable, logo } = await reportDependencies()
  addReportHeader(document, autoTable, logo, 'Packing List', event)

  const rows = event.reservations.flatMap((reservation) => {
    const item = inventoryById[reservation.itemId]
    if (!item) return []
    const assetIds = reservation.selectedAssetIds.length
      ? reservation.selectedAssetIds
      : Array.from({ length: reservation.quantity }, (_, index) => `Untracked item ${index + 1}`)
    return assetIds.map((assetId, index) => [
      index === 0 ? item.name : '',
      index === 0 ? `${reservation.quantity} ${item.unit}${reservation.quantity === 1 ? '' : 's'}` : '',
      assetId,
      event.packedAssetIds[assetId] ? 'Packed' : 'Not packed',
    ])
  })

  autoTable(document, {
    startY: finalTableY(document) + 7,
    head: [['Equipment', 'Quantity', 'Asset ID', 'Packing status']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [0, 122, 255], textColor: 255, fontSize: 11, fontStyle: 'bold', cellPadding: 3.2 },
    bodyStyles: { fontSize: 10.5, textColor: [17, 24, 39], cellPadding: 3.1, valign: 'middle' },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 35 }, 2: { cellWidth: 57 }, 3: { cellWidth: 41 } },
    margin: { left: 16, right: 16, bottom: 14 },
  })

  autoTable(document, {
    startY: finalTableY(document) + 7,
    theme: 'plain',
    body: [
      ['Packed by', event.packedBy || 'Not recorded'],
      ['Packing photos', String(event.packingPhotos.length)],
      ['Generated', new Date().toLocaleString('en-SG')],
    ],
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' } },
    margin: { left: 16, right: 16 },
  })

  await addEvidencePhotos(document, event.packingPhotos, 'Packing Photo Evidence')
  addPageNumbers(document)
  document.save(`${safeFileName(event.id)}-packing-list.pdf`)
}

export async function exportReturnReportPdf(
  event: ExportEvent,
  inventoryById: Record<string, ExportInventoryItem>,
) {
  const { document, autoTable, logo } = await reportDependencies()
  addReportHeader(document, autoTable, logo, 'Return Report', event)

  const rows = event.reservations.flatMap((reservation) => {
    const item = inventoryById[reservation.itemId]
    if (!item) return []
    return reservation.selectedAssetIds.map((assetId, index) => {
      const result = event.assetReturnReport?.[assetId]
      return [index === 0 ? item.name : '', assetId, result?.status || 'Not reported', result?.remarks || '-']
    })
  })

  autoTable(document, {
    startY: finalTableY(document) + 7,
    head: [['Equipment', 'Asset ID', 'Return status', 'Remarks']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [0, 122, 255], textColor: 255, fontSize: 11, fontStyle: 'bold', cellPadding: 3.2 },
    bodyStyles: { fontSize: 10.5, textColor: [17, 24, 39], cellPadding: 3.1, valign: 'middle' },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 44 }, 2: { cellWidth: 37 }, 3: { cellWidth: 55 } },
    margin: { left: 16, right: 16, bottom: 14 },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 2) return
      const status = String(data.cell.raw)
      if (status === 'Returned') data.cell.styles.textColor = [22, 101, 52]
      if (status === 'Damaged') data.cell.styles.textColor = [180, 83, 9]
      if (status === 'Missing') data.cell.styles.textColor = [185, 28, 28]
      data.cell.styles.fontStyle = 'bold'
    },
  })

  autoTable(document, {
    startY: finalTableY(document) + 7,
    theme: 'plain',
    body: [
      ['Packed by', event.packedBy || 'Not recorded'],
      ['Checked out by', event.checkedOutBy || 'Not recorded'],
      ['Submitted by', event.returnReportBy || 'Not recorded'],
      ['Employer review', event.returnReviewed ? `Approved by ${event.returnReviewedBy || 'employer'}` : 'Pending'],
      ['Return photos', String(event.returnPhotos.length)],
      ['Generated', new Date().toLocaleString('en-SG')],
    ],
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' } },
    margin: { left: 16, right: 16 },
  })

  await addEvidencePhotos(document, event.returnPhotos, 'Return Photo Evidence')
  addPageNumbers(document)
  document.save(`${safeFileName(event.id)}-return-report.pdf`)
}
