export type InventoryStatus = 'Available' | 'Reserved' | 'In Use' | 'Damaged' | 'Missing'

export type EventStatus = 'Draft' | 'Reserved' | 'Packed' | 'Checked Out' | 'Returned' | 'Closed'
export type Role = 'Employer' | 'Inventory Manager' | 'Employee'
export type PortalMode = 'employer' | 'employee'

export type AssetCondition = {
  status: 'Damaged' | 'Missing'
  remarks: string
  eventId: string
  eventTitle: string
  reportedBy: string
}

export type InventoryItem = {
  id: string
  name: string
  category: string
  total: number
  damaged: number
  missing: number
  location: string
  unit: string
  assetIds: string[]
  assetConditions?: Record<string, AssetCondition>
}

export type Reservation = {
  itemId: string
  quantity: number
  selectedAssetIds: string[]
}

export type AssetReturnStatus = 'Returned' | 'Missing' | 'Damaged'

export type AssetReturnLine = {
  status: AssetReturnStatus
  remarks: string
}

export type PackingPhoto = {
  id: string
  storagePath: string
  signedUrl: string
  uploadedBy: string
  uploadedById: string
  uploadedAt: string
}

export type EventBoxPart = {
  id: string
  name: string
  expectedQuantity: number | null
  returnedQuantity: number | null
  expectedQuantityEditable?: boolean
  note?: string
}

export type EventBoxCategory = {
  id: string
  name: string
  parts: EventBoxPart[]
}

export type EventRecord = {
  recordId: string
  id: string
  title: string
  type: string
  location: string
  comments: string
  boxChecklist: EventBoxCategory[]
  start: string
  startTime: string
  end: string
  endTime: string
  staff?: string
  assignedEmployees: string[]
  status: EventStatus
  reservations: Reservation[]
  packingProgress: Record<string, boolean>
  packedAssetIds: Record<string, boolean>
  packedBy?: string
  checkoutApproved: boolean
  checkedOutBy?: string
  returnReport?: Record<string, ReturnLine>
  assetReturnReport?: Record<string, AssetReturnLine>
  returnReportBy?: string
  returnReviewed: boolean
  returnReviewedBy?: string
  packingPhotos: PackingPhoto[]
  returnPhotos: PackingPhoto[]
}

export type NotificationRecord = {
  id: string
  staff: string
  eventId: string
  title: string
  message: string
  read: boolean
}

export type AuditLog = {
  id: string
  staff: string
  action: string
  detail: string
  time: string
}

export type ToastRecord = {
  id: string
  tone: 'success' | 'error' | 'info'
  message: string
}

export type StaffUser = {
  name: string
  role: Role
}

export type LoginAccount = StaffUser & {
  id: string
  email: string
  portal: PortalMode
}

export type ReturnLine = {
  returned: number
  damaged: number
  missing: number
  remarks: string
}

export type TabId = 'dashboard' | 'planner' | 'events' | 'inventory' | 'returns' | 'audit' | 'flow' | 'profile'
