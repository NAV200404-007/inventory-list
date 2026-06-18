import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Bell,
  Building2,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Laptop,
  LockKeyhole,
  LogOut,
  Menu,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  UserCog,
  Wrench,
} from 'lucide-react'
import './App.css'

type InventoryStatus =
  | 'Available'
  | 'Reserved'
  | 'In Use'
  | 'Damaged'
  | 'Missing'

type EventStatus = 'Draft' | 'Reserved' | 'Packed' | 'Checked Out' | 'Returned' | 'Closed'
type Role = 'Employer' | 'Inventory Manager' | 'Employee'
type PortalMode = 'employer' | 'employee'

type InventoryItem = {
  id: string
  name: string
  category: string
  total: number
  damaged: number
  missing: number
  location: string
  unit: string
  assetIds: string[]
}

type Reservation = {
  itemId: string
  quantity: number
  selectedAssetIds: string[]
}

type EventRecord = {
  id: string
  title: string
  type: string
  location: string
  start: string
  end: string
  staff?: string
  assignedEmployees: string[]
  status: EventStatus
  reservations: Reservation[]
  packingProgress: Record<string, boolean>
  returnReport?: Record<string, ReturnLine>
}

type NotificationRecord = {
  id: string
  staff: string
  eventId: string
  title: string
  message: string
  read: boolean
}

type AuditLog = {
  id: string
  staff: string
  action: string
  detail: string
  time: string
}

type StaffUser = {
  name: string
  role: Role
}

type LoginAccount = StaffUser & {
  password: string
  portal: PortalMode
}

type ReturnLine = {
  returned: number
  damaged: number
  missing: number
}

type TabId = 'dashboard' | 'planner' | 'events' | 'inventory' | 'returns' | 'audit' | 'flow' | 'profile'

const defaultLoginAccounts: LoginAccount[] = []
const demoAccountNames = new Set(['Grace Wong', 'Ben Lim', 'Aisha Tan'])
const demoEventIds = new Set(['EVT-2026-001', 'EVT-2026-002', 'EVT-2026-003'])

const storagePrefix = 'event-inventory-system:'

function normalizeEventStatus(status: string): EventStatus {
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

function normalizeEventRecord(event: EventRecord & { staff?: string }) {
  const assignedEmployees =
    event.assignedEmployees?.length
      ? event.assignedEmployees
      : event.staff && event.staff !== 'Unassigned'
        ? [event.staff]
        : []

  return {
    ...event,
    assignedEmployees,
    packingProgress: event.packingProgress ?? {},
    status: normalizeEventStatus(event.status),
  }
}

function readStoredValue<T>(key: string, fallback: T) {
  try {
    const storedValue = window.localStorage.getItem(`${storagePrefix}${key}`)
    if (!storedValue) {
      return fallback
    }

    const parsedValue = JSON.parse(storedValue)
    if (key === 'accounts') {
      return (parsedValue as LoginAccount[]).filter((account) => !demoAccountNames.has(account.name)) as T
    }
    if (key === 'events') {
      return (parsedValue as EventRecord[])
        .filter((event) => !demoEventIds.has(event.id))
        .map((event) => normalizeEventRecord(event)) as T
    }
    if (key === 'auditLogs') {
      return (parsedValue as AuditLog[]).filter((log) => !demoAccountNames.has(log.staff)) as T
    }
    if (key === 'notifications') {
      return (parsedValue as NotificationRecord[]).filter(
        (notification) =>
          !demoAccountNames.has(notification.staff) && !demoEventIds.has(notification.eventId),
      ) as T
    }

    return parsedValue as T
  } catch {
    return fallback
  }
}

function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStoredValue(key, fallback))

  useEffect(() => {
    window.localStorage.setItem(`${storagePrefix}${key}`, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}

function numberedIds(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(3, '0')}`)
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `item-${Date.now()}`
  )
}

function makeAssetPrefix(value: string) {
  return (
    value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 8) || 'ITEM'
  )
}

const initialInventory: InventoryItem[] = [
  {
    id: 'vex-iq-kit',
    name: 'VEX IQ',
    category: 'Robotics Kits',
    total: 42,
    damaged: 2,
    missing: 1,
    location: 'Robotics Store A',
    unit: 'kit',
    assetIds: numberedIds('VIQ', 42),
  },
  {
    id: 'laptop',
    name: 'Laptop',
    category: 'Computing',
    total: 58,
    damaged: 3,
    missing: 0,
    location: 'IT Cage',
    unit: 'unit',
    assetIds: numberedIds('LAP', 58),
  },
  {
    id: 'ipad',
    name: 'iPad',
    category: 'Computing',
    total: 30,
    damaged: 1,
    missing: 1,
    location: 'IT Cage',
    unit: 'unit',
    assetIds: numberedIds('IPAD', 30),
  },
  {
    id: 'uaro',
    name: 'UARO',
    category: 'Robotics Kits',
    total: 20,
    damaged: 0,
    missing: 0,
    location: 'Robotics Store B',
    unit: 'kit',
    assetIds: numberedIds('UARO', 20),
  },
]

const initialEvents: EventRecord[] = []

const templates: Record<string, Reservation[]> = {
  'VEX IQ workshop': [
    { itemId: 'vex-iq-kit', quantity: 16, selectedAssetIds: [] },
    { itemId: 'laptop', quantity: 20, selectedAssetIds: [] },
    { itemId: 'ipad', quantity: 8, selectedAssetIds: [] },
  ],
  'Coding camp': [
    { itemId: 'laptop', quantity: 24, selectedAssetIds: [] },
    { itemId: 'ipad', quantity: 8, selectedAssetIds: [] },
  ],
  'Robotics competition': [
    { itemId: 'vex-iq-kit', quantity: 20, selectedAssetIds: [] },
    { itemId: 'uaro', quantity: 12, selectedAssetIds: [] },
    { itemId: 'laptop', quantity: 12, selectedAssetIds: [] },
    { itemId: 'ipad', quantity: 12, selectedAssetIds: [] },
  ],
}

const initialAudit: AuditLog[] = []

const initialNotifications: NotificationRecord[] = []

const navItems: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
  { id: 'dashboard', label: 'Home', icon: BarChart3 },
  { id: 'planner', label: 'Create Event', icon: CalendarDays },
  { id: 'events', label: 'Events', icon: ClipboardList },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'profile', label: 'Profile', icon: Menu },
]

function dateValue(date: string) {
  return new Date(`${date}T00:00:00`).getTime()
}

function parseWholeNumber(value: string) {
  const trimmedValue = value.trim()
  if (trimmedValue === '') {
    return 0
  }
  if (!/^\d+$/.test(trimmedValue)) {
    return null
  }
  return Number.parseInt(trimmedValue, 10)
}

function passwordValidationMessage(password: string) {
  if (!password) {
    return 'Enter a password.'
  }
  if (password.length < 4) {
    return 'Password must be at least 4 characters.'
  }
  if (password !== password.trim()) {
    return 'Password cannot start or end with a space.'
  }
  return ''
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return dateValue(startA) <= dateValue(endB) && dateValue(startB) <= dateValue(endA)
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function getUsable(item: InventoryItem) {
  return Math.max(0, item.total - item.damaged - item.missing)
}

const eventFlowSteps = [
  { key: 'Draft', label: 'Draft' },
  { key: 'Reserved', label: 'Reserved' },
  { key: 'Packed', label: 'Packed' },
  { key: 'Checked Out', label: 'Checked out' },
  { key: 'Returned', label: 'Returned' },
  { key: 'Closed', label: 'Closed' },
] as const

function eventStatusLabel(status: EventStatus) {
  return status
}

function eventStatusTone(status: EventStatus) {
  if (status === 'Closed') return 'neutral'
  if (status === 'Packed') return 'success'
  if (status === 'Checked Out' || status === 'Returned') return 'warning'
  return 'info'
}

function eventStepIndex(status: EventStatus) {
  if (status === 'Draft') return 0
  if (status === 'Reserved') return 1
  if (status === 'Packed') return 2
  if (status === 'Checked Out') return 3
  if (status === 'Returned') return 4
  return 5
}

function usedAssetIdsForItem(events: EventRecord[], itemId: string, start: string, end: string) {
  return events
    .filter((event) => event.status !== 'Closed' && overlaps(start, end, event.start, event.end))
    .flatMap((event) => event.reservations)
    .filter((reservation) => reservation.itemId === itemId)
    .flatMap((reservation) => reservation.selectedAssetIds)
}

function pickAssetIds(
  item: InventoryItem,
  quantity: number,
  events: EventRecord[],
  start: string,
  end: string,
) {
  const used = new Set(usedAssetIdsForItem(events, item.id, start, end))
  return item.assetIds.filter((assetId) => !used.has(assetId)).slice(0, quantity)
}

function App() {
  const [accounts, setAccounts] = useStoredState('accounts', defaultLoginAccounts)
  const [authenticatedUser, setAuthenticatedUser] = useState<LoginAccount | null>(null)
  const [authView, setAuthView] = useState<'login' | 'register'>('login')
  const [loginPortal, setLoginPortal] = useState<PortalMode>('employer')
  const [loginName, setLoginName] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [registerPortal, setRegisterPortal] = useState<PortalMode>('employee')
  const [registerName, setRegisterName] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [registerSuccess, setRegisterSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [inventory, setInventory] = useStoredState('inventory', initialInventory)
  const [events, setEvents] = useStoredState('events', initialEvents)
  const [auditLogs, setAuditLogs] = useStoredState('auditLogs', initialAudit)
  const [notifications, setNotifications] = useStoredState('notifications', initialNotifications)
  const [currentStaff, setCurrentStaff] = useState<StaffUser>({
    name: '',
    role: 'Employer',
  })
  const [selectedEventId, setSelectedEventId] = useState('')
  const [eventSearch, setEventSearch] = useState('')
  const [eventStatusFilter, setEventStatusFilter] = useState<'All' | EventStatus>('All')
  const [eventStaffFilter, setEventStaffFilter] = useState('All')
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryFilter, setInventoryFilter] = useState<'All' | 'Low stock' | 'Issues'>('All')
  const [newInventoryName, setNewInventoryName] = useState('')
  const [newInventoryPrefix, setNewInventoryPrefix] = useState('')
  const [newInventoryTotal, setNewInventoryTotal] = useState(1)
  const [newInventoryUnit, setNewInventoryUnit] = useState('unit')
  const [inventoryFormError, setInventoryFormError] = useState('')
  const [inventoryQuantityError, setInventoryQuantityError] = useState('')
  const [newEvent, setNewEvent] = useState<EventRecord>({
    id: 'EVT-2026-004',
    title: 'STEM Holiday Robotics Camp',
    type: 'VEX IQ workshop',
    location: 'Training Lab 1',
    start: '2026-06-24',
    end: '2026-06-26',
    assignedEmployees: [],
    status: 'Draft',
    reservations: templates['VEX IQ workshop'],
    packingProgress: {},
  })
  const [returnLines, setReturnLines] = useState<Record<string, ReturnLine>>({})
  const [checkoutMessage, setCheckoutMessage] = useState('')
  const [userManagementMessage, setUserManagementMessage] = useState('')
  const [editingPackingEventId, setEditingPackingEventId] = useState('')

  const inventoryById = useMemo(
    () => Object.fromEntries(inventory.map((item) => [item.id, item])),
    [inventory],
  )

  const portalMode = authenticatedUser?.portal ?? loginPortal
  const staffUsers = accounts.map(({ name, role }) => ({ name, role }))
  const assignableStaff = staffUsers.filter((staff) => staff.role !== 'Employer')
  const employerCount = accounts.filter((account) => account.portal === 'employer').length
  const loginOptions = accounts.filter((account) => account.portal === loginPortal)
  const allowedNavItems =
    portalMode === 'employee'
      ? navItems.filter((item) => item.id !== 'planner' && item.id !== 'inventory')
      : navItems
  const assignedEvents = events.filter((event) => event.assignedEmployees.includes(currentStaff.name))
  const visibleEvents = portalMode === 'employee' ? assignedEvents : events
  const selectedEvent =
    visibleEvents.find((event) => event.id === selectedEventId) ?? visibleEvents[0]
  const selectedEventAllPacked =
    selectedEvent
      ? selectedEvent.reservations.length > 0 &&
        selectedEvent.reservations.every(
          (reservation) => selectedEvent.packingProgress[reservation.itemId],
        )
      : false
  const selectedEventEditMode = selectedEvent?.id === editingPackingEventId
  const staffNotifications = notifications.filter((notification) => notification.staff === currentStaff.name)
  const unreadNotificationCount = staffNotifications.filter((notification) => !notification.read).length
  const currentAccount = accounts.find((account) => account.name === currentStaff.name)

  const handleLogin = () => {
    const passwordError = passwordValidationMessage(loginPassword)
    if (passwordError) {
      setLoginError(passwordError)
      return
    }

    const account = accounts.find(
      (candidate) =>
        candidate.portal === loginPortal &&
        candidate.name === loginName &&
        candidate.password === loginPassword,
    )

    if (!account) {
      setLoginError('Invalid password for this portal.')
      return
    }

    setAuthenticatedUser(account)
    setCurrentStaff({ name: account.name, role: account.role })
    setActiveTab('dashboard')
    setLoginPassword('')
    setLoginError('')
  }

  const handlePortalChoice = (portal: PortalMode) => {
    setLoginPortal(portal)
    const firstAccount = accounts.find((account) => account.portal === portal)
    setLoginName(firstAccount?.name ?? '')
    setLoginPassword('')
    setRegisterSuccess('')
    setLoginError('')
  }

  const handleRegister = () => {
    const name = registerName.trim()
    const password = registerPassword

    if (!name) {
      setRegisterError('Enter a name.')
      return
    }

    const passwordError = passwordValidationMessage(password)
    if (passwordError) {
      setRegisterError(passwordError)
      return
    }

    const duplicateAccount = accounts.some(
      (account) => account.name.toLowerCase() === name.toLowerCase(),
    )
    if (duplicateAccount) {
      setRegisterError('An account with this name already exists.')
      return
    }

    const newAccount: LoginAccount = {
      name,
      password,
      portal: registerPortal,
      role: registerPortal === 'employer' ? 'Employer' : 'Employee',
    }

    setAccounts((currentAccounts) => [...currentAccounts, newAccount])
    setRegisterName('')
    setRegisterPassword('')
    setRegisterError('')
    setRegisterSuccess(`${name} was added. You can log in now.`)
    setLoginPortal(registerPortal)
    setLoginName(name)
    setLoginPassword(password)
    setLoginError('')
    setAuthView('login')
  }

  const handleLogout = () => {
    setAuthenticatedUser(null)
    setLoginPortal(portalMode)
    setLoginName(currentStaff.name)
    setActiveTab('dashboard')
  }

  const addLog = (action: string, detail: string) => {
    const time = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date())

    setAuditLogs((logs) => [
      {
        id: `log-${Date.now()}`,
        staff: currentStaff.name,
        action,
        detail,
        time,
      },
      ...logs,
    ])
  }

  const reservedQuantity = (
    itemId: string,
    start: string,
    end: string,
    excludeEventId?: string,
  ) =>
    events
      .filter(
        (event) =>
          event.id !== excludeEventId &&
          event.status !== 'Closed' &&
          overlaps(start, end, event.start, event.end),
      )
      .flatMap((event) => event.reservations)
      .filter((reservation) => reservation.itemId === itemId)
      .reduce((total, reservation) => total + reservation.quantity, 0)

  const availableForWindow = (
    itemId: string,
    start: string,
    end: string,
    excludeEventId?: string,
  ) => getUsable(inventoryById[itemId]) - reservedQuantity(itemId, start, end, excludeEventId)

  const plannerLines = newEvent.reservations.flatMap((reservation) => {
    const item = inventoryById[reservation.itemId]
    if (!item) {
      return []
    }
    const available = availableForWindow(reservation.itemId, newEvent.start, newEvent.end)
    return [{
      ...reservation,
      item,
      available,
      shortage: Math.max(0, reservation.quantity - available),
    }]
  })

  const hasShortage = plannerLines.some((line) => line.shortage > 0)
  const activeEvents = events.filter((event) => event.status !== 'Closed')
  const visibleActiveEvents = visibleEvents.filter((event) => event.status !== 'Closed')
  const filteredVisibleEvents = visibleEvents.filter((event) => {
    const matchesSearch = `${event.id} ${event.title} ${event.type} ${event.location} ${event.assignedEmployees.join(' ')}`
      .toLowerCase()
      .includes(eventSearch.toLowerCase())
    const matchesStatus = eventStatusFilter === 'All' || event.status === eventStatusFilter
    const matchesStaff =
      eventStaffFilter === 'All' ||
      event.assignedEmployees.includes(eventStaffFilter) ||
      (eventStaffFilter === 'Unassigned' && event.assignedEmployees.length === 0)
    return matchesSearch && matchesStatus && matchesStaff
  })

  const dashboardStats = {
    usable: inventory.reduce((total, item) => total + getUsable(item), 0),
    reserved: activeEvents
      .flatMap((event) => event.reservations)
      .reduce((total, reservation) => total + reservation.quantity, 0),
    issues: inventory.reduce(
      (total, item) => total + item.damaged + item.missing,
      0,
    ),
    upcoming: visibleEvents.filter((event) => dateValue(event.start) >= dateValue('2026-06-02')).length,
  }
  const profileEvents = portalMode === 'employee' ? assignedEvents : events
  const profileActiveEvents = profileEvents.filter((event) => event.status !== 'Closed')
  const profilePackedEvents = profileEvents.filter(
    (event) => event.status === 'Packed' || event.status === 'Checked Out',
  )
  const profileLogs =
    portalMode === 'employee'
      ? auditLogs.filter((log) => log.staff === currentStaff.name).slice(0, 4)
      : auditLogs.slice(0, 4)
  const profileInitials =
    currentStaff.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = `${item.name} ${item.category} ${item.location}`
      .toLowerCase()
      .includes(inventorySearch.toLowerCase())
    const reserved = reservedQuantity(item.id, '2026-06-02', '2026-12-31')
    const usable = getUsable(item)
    const matchesFilter =
      inventoryFilter === 'All' ||
      (inventoryFilter === 'Low stock' && usable - reserved <= 5) ||
      (inventoryFilter === 'Issues' && item.damaged + item.missing > 0)

    return matchesSearch && matchesFilter
  })

  const updateReservation = (itemId: string, value: string) => {
    const quantity = parseWholeNumber(value)
    if (quantity === null) {
      setInventoryQuantityError('Quantities must be whole numbers only. Decimals are not saved.')
      return
    }
    setInventoryQuantityError('')
    setNewEvent((event) => ({
      ...event,
      reservations: event.reservations.map((reservation) =>
        reservation.itemId === itemId
          ? { ...reservation, quantity }
          : reservation,
      ),
    }))
  }

  const addReservationItem = (itemId: string) => {
    if (newEvent.reservations.some((reservation) => reservation.itemId === itemId)) {
      return
    }

    setNewEvent((event) => ({
      ...event,
      reservations: [...event.reservations, { itemId, quantity: 1, selectedAssetIds: [] }],
    }))
  }

  const removeReservationItem = (itemId: string) => {
    setNewEvent((event) => ({
      ...event,
      reservations: event.reservations.filter((reservation) => reservation.itemId !== itemId),
    }))
  }

  const toggleAssignedEmployee = (employeeName: string) => {
    setNewEvent((event) => {
      const isAssigned = event.assignedEmployees.includes(employeeName)
      return {
        ...event,
        assignedEmployees: isAssigned
          ? event.assignedEmployees.filter((name) => name !== employeeName)
          : [...event.assignedEmployees, employeeName],
      }
    })
  }

  const togglePackedItem = (eventId: string, itemId: string, packed: boolean) => {
    setEvents((records) =>
      records.map((record) =>
        record.id === eventId
          ? {
              ...record,
              packingProgress: {
                ...record.packingProgress,
                [itemId]: packed,
              },
            }
          : record,
      ),
    )
  }

  const rebuildEventReservationAssets = (event: EventRecord, reservations: Reservation[]) =>
    reservations.map((reservation) => {
      const item = inventoryById[reservation.itemId]
      if (!item) {
        return reservation
      }
      return {
        ...reservation,
        selectedAssetIds: pickAssetIds(
          item,
          reservation.quantity,
          events.filter((record) => record.id !== event.id),
          event.start,
          event.end,
        ),
      }
    })

  const updateEventReservationQuantity = (eventId: string, itemId: string, value: string) => {
    const quantity = parseWholeNumber(value)
    if (quantity === null) {
      setInventoryQuantityError('Packing list quantities must be whole numbers only.')
      return
    }
    setInventoryQuantityError('')
    setEvents((records) =>
      records.map((record) => {
        if (record.id !== eventId) {
          return record
        }
        const reservations = record.reservations.map((reservation) =>
          reservation.itemId === itemId ? { ...reservation, quantity } : reservation,
        )
        return {
          ...record,
          reservations: rebuildEventReservationAssets(record, reservations),
          packingProgress: {
            ...record.packingProgress,
            [itemId]: false,
          },
        }
      }),
    )
  }

  const addEventReservationItem = (eventId: string, itemId: string) => {
    if (!itemId) {
      return
    }
    setEvents((records) =>
      records.map((record) => {
        if (record.id !== eventId || record.reservations.some((reservation) => reservation.itemId === itemId)) {
          return record
        }
        const reservations = [...record.reservations, { itemId, quantity: 1, selectedAssetIds: [] }]
        return {
          ...record,
          reservations: rebuildEventReservationAssets(record, reservations),
          packingProgress: {
            ...record.packingProgress,
            [itemId]: false,
          },
        }
      }),
    )
  }

  const removeEventReservationItem = (eventId: string, itemId: string) => {
    setEvents((records) =>
      records.map((record) => {
        if (record.id !== eventId) {
          return record
        }
        const nextProgress = { ...record.packingProgress }
        delete nextProgress[itemId]
        return {
          ...record,
          reservations: record.reservations.filter((reservation) => reservation.itemId !== itemId),
          packingProgress: nextProgress,
        }
      }),
    )
  }

  const updateInventoryItem = (
    itemId: string,
    field: keyof Omit<InventoryItem, 'id'>,
    value: string | number,
  ) => {
    const isQuantityField = field === 'total' || field === 'damaged' || field === 'missing'
    const nextQuantity = isQuantityField ? parseWholeNumber(String(value)) : null

    if (isQuantityField && nextQuantity === null) {
      setInventoryQuantityError('Inventory quantities must be whole numbers only. Decimals are not saved.')
      return
    }

    setInventoryQuantityError('')
    setInventory((items) =>
      items.map((item) => {
        if (item.id !== itemId) {
          return item
        }

        const quantityValue = nextQuantity ?? 0

        return {
          ...item,
          [field]: isQuantityField ? quantityValue : value,
          assetIds:
            field === 'total'
              ? numberedIds(item.assetIds[0]?.split('-')[0] ?? item.id.toUpperCase(), quantityValue)
              : item.assetIds,
        }
      }),
    )
  }

  const updateNewInventoryTotal = (value: string) => {
    const nextQuantity = parseWholeNumber(value)
    if (nextQuantity === null) {
      setInventoryQuantityError('New inventory quantity must be a whole number. Decimals are not saved.')
      return
    }
    setInventoryQuantityError('')
    setInventoryFormError('')
    setNewInventoryTotal(nextQuantity)
  }

  const addInventoryItem = () => {
    const name = newInventoryName.trim()
    const prefix = makeAssetPrefix(newInventoryPrefix || name)
    const id = slugify(name)

    if (!name) {
      setInventoryFormError('Enter an item name.')
      return
    }

    if (inventory.some((item) => item.id === id || item.name.toLowerCase() === name.toLowerCase())) {
      setInventoryFormError('This inventory item already exists.')
      return
    }

    if (!Number.isInteger(newInventoryTotal)) {
      setInventoryFormError('Total quantity must be a whole number.')
      return
    }

    const totalQuantity = Math.max(0, newInventoryTotal)

    const itemToAdd: InventoryItem = {
      id,
      name,
      category: 'Custom',
      total: totalQuantity,
      damaged: 0,
      missing: 0,
      location: '',
      unit: newInventoryUnit.trim() || 'unit',
      assetIds: numberedIds(prefix, totalQuantity),
    }

    setInventory((items) => [...items, itemToAdd])
    setNewInventoryName('')
    setNewInventoryPrefix('')
    setNewInventoryTotal(1)
    setNewInventoryUnit('unit')
    setInventoryFormError('')
    addLog('Added inventory item', `${itemToAdd.name} added with ${itemToAdd.total} total stock.`)
  }

  const deleteEvent = (eventId: string) => {
    const eventToDelete = events.find((event) => event.id === eventId)
    if (!eventToDelete) {
      return
    }

    const shouldDelete = window.confirm(
      `Delete ${eventToDelete.title}? This will remove the event, packing list, and related notifications.`,
    )
    if (!shouldDelete) {
      return
    }

    setEvents((records) => records.filter((event) => event.id !== eventId))
    setNotifications((records) => records.filter((notification) => notification.eventId !== eventId))
    setSelectedEventId((currentEventId) => {
      if (currentEventId !== eventId) {
        return currentEventId
      }
      const remainingEvent = events.find((event) => event.id !== eventId)
      return remainingEvent?.id ?? ''
    })
    addLog('Deleted event', `${eventToDelete.id} - ${eventToDelete.title} was deleted.`)
  }

  const deleteAccount = (accountName: string) => {
    const accountToDelete = accounts.find((account) => account.name === accountName)
    if (!accountToDelete) {
      return
    }

    if (accountToDelete.name === currentStaff.name) {
      setUserManagementMessage('You cannot delete the account you are currently using.')
      return
    }

    if (accountToDelete.portal === 'employer' && employerCount <= 1) {
      setUserManagementMessage('Keep at least one employer account so the app stays manageable.')
      return
    }

    const shouldDelete = window.confirm(
      `Delete ${accountToDelete.name}? They will be removed from assigned event teams.`,
    )
    if (!shouldDelete) {
      return
    }

    setAccounts((records) => records.filter((account) => account.name !== accountName))
    setEvents((records) =>
      records.map((event) =>
        event.assignedEmployees.includes(accountName)
          ? {
              ...event,
              assignedEmployees: event.assignedEmployees.filter((name) => name !== accountName),
            }
          : event,
      ),
    )
    setNotifications((records) =>
      records.filter((notification) => notification.staff !== accountName),
    )
    setNewEvent((record) =>
      record.assignedEmployees.includes(accountName)
        ? {
            ...record,
            assignedEmployees: record.assignedEmployees.filter((name) => name !== accountName),
          }
        : record,
    )
    setUserManagementMessage(`${accountName} deleted and removed from assigned teams.`)
    addLog('Deleted user', `${accountName} was removed from the system.`)
  }

  const confirmEvent = () => {
    if (hasShortage || !newEvent.title.trim()) {
      return
    }

    const reservationsWithAssets = newEvent.reservations
      .filter((itemReservation) => itemReservation.quantity > 0)
      .map((itemReservation) => {
        const item = inventoryById[itemReservation.itemId]
        return {
          ...itemReservation,
          selectedAssetIds: pickAssetIds(
            item,
            itemReservation.quantity,
            events,
            newEvent.start,
            newEvent.end,
          ),
        }
      })

    const eventToAdd: EventRecord = {
      ...newEvent,
      id: newEvent.id.trim() || `EVT-${Date.now()}`,
      status: 'Reserved',
      reservations: reservationsWithAssets,
      packingProgress: {},
    }
    const assignedNotifications = eventToAdd.assignedEmployees.map((employeeName, index) => ({
      id: `note-${Date.now()}-${index}`,
      staff: employeeName,
      eventId: eventToAdd.id,
      title: `Assigned: ${eventToAdd.title}`,
      message: `${currentStaff.name} assigned you to ${eventToAdd.location}. Open the packing list and item IDs.`,
      read: false,
    }))

    setEvents((records) => [eventToAdd, ...records])
    setNotifications((records) => [...assignedNotifications, ...records])
    setSelectedEventId(eventToAdd.id)
    setActiveTab('events')
    addLog(
      'Confirmed reservation and assigned staff',
      `${eventToAdd.id} assigned to ${eventToAdd.assignedEmployees.join(', ') || 'no employees'} at ${eventToAdd.location}.`,
    )
  }

  const packEvent = (eventId: string) => {
    const event = events.find((record) => record.id === eventId)
    if (!event) {
      return
    }

    const employerNotifications = accounts
      .filter((account) => account.portal === 'employer')
      .map((account, index) => ({
        id: `note-${Date.now()}-${index}`,
        staff: account.name,
        eventId: event.id,
        title: `Packed and ready: ${event.title}`,
        message: `${currentStaff.name} marked the shared packing list as packed and ready for ${event.location}.`,
        read: false,
      }))

    setEvents((records) =>
      records.map((record) =>
        record.id === eventId
          ? {
              ...record,
              status: 'Packed',
              packingProgress: Object.fromEntries(
                record.reservations.map((reservation) => [reservation.itemId, true]),
              ),
            }
          : record,
      ),
    )
    setNotifications((records) => [...employerNotifications, ...records])
    setCheckoutMessage('Message sent. Employer has been notified that equipment is packed and ready.')
    addLog('Packed equipment', `${event.title} equipment marked as packed and ready.`)
  }

  const checkoutEvent = (eventId: string) => {
    const event = events.find((record) => record.id === eventId)
    if (!event) {
      return
    }

    setEvents((records) =>
      records.map((record) =>
        record.id === eventId ? { ...record, status: 'Checked Out' } : record,
      ),
    )
    setCheckoutMessage('Items checked out for deployment.')
    addLog('Checked out equipment', `${event.title} equipment moved to Checked Out.`)
  }

  const submitReturnReport = () => {
    if (!selectedEvent) {
      return
    }

    const report = Object.fromEntries(
      selectedEvent.reservations.map((reservation) => {
        const line = returnLines[reservation.itemId] ?? {
          returned: reservation.quantity,
          damaged: 0,
          missing: 0,
        }
        return [reservation.itemId, line]
      }),
    )

    const employerNotifications = accounts
      .filter((account) => account.portal === 'employer')
      .map((account, index) => ({
        id: `note-${Date.now()}-return-${index}`,
        staff: account.name,
        eventId: selectedEvent.id,
        title: `Return report ready: ${selectedEvent.title}`,
        message: `${currentStaff.name} submitted the return report for review.`,
        read: false,
      }))

    setEvents((records) =>
      records.map((record) =>
        record.id === selectedEvent.id
          ? { ...record, returnReport: report, status: 'Returned' }
          : record,
      ),
    )
    setNotifications((records) => [...employerNotifications, ...records])
    addLog('Submitted return report', `${selectedEvent.title} return report submitted for employer review.`)
    setReturnLines({})
    setActiveTab('events')
  }

  const setReturnValue = (itemId: string, key: keyof ReturnLine, value: string) => {
    const nextQuantity = parseWholeNumber(value)
    if (nextQuantity === null) {
      setInventoryQuantityError('Return quantities must be whole numbers only. Decimals are not saved.')
      return
    }
    setInventoryQuantityError('')
    setReturnLines((lines) => ({
      ...lines,
      [itemId]: {
        ...(lines[itemId] ?? { returned: 0, damaged: 0, missing: 0 }),
        [key]: nextQuantity,
      },
    }))
  }

  const closeEvent = () => {
    if (!selectedEvent) {
      return
    }

    setInventory((items) =>
      items.map((item) => {
        const line = selectedEvent.returnReport?.[item.id] ?? returnLines[item.id]
        if (!line) {
          return item
        }

        return {
          ...item,
          damaged: item.damaged + line.damaged,
          missing: item.missing + line.missing,
        }
      }),
    )
    setEvents((records) =>
      records.map((record) =>
        record.id === selectedEvent.id ? { ...record, status: 'Closed' } : record,
      ),
    )
    addLog(
      'Closed event',
      `${selectedEvent.title} reviewed and closed with return notes for ${selectedEvent.reservations.length} item groups.`,
    )
    setReturnLines({})
  }

  const statusForItem = (item: InventoryItem): InventoryStatus => {
    const hasInUse = events.some(
      (event) =>
        event.status === 'Checked Out' &&
        event.reservations.some((reservation) => reservation.itemId === item.id),
    )

    const hasReserved = events.some(
      (event) =>
        (event.status === 'Reserved' || event.status === 'Packed' || event.status === 'Returned') &&
        event.reservations.some((reservation) => reservation.itemId === item.id),
    )

    if (item.missing > 0) return 'Missing'
    if (item.damaged > 0) return 'Damaged'
    if (hasInUse) return 'In Use'
    if (hasReserved) return 'Reserved'
    return 'Available'
  }

  if (!authenticatedUser) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="brand login-brand">
            <img
              alt="Future Ready Academy Inventory"
              className="brand-logo"
              src="/app-logo.png"
            />
          </div>

          <div>
            <span className="eyebrow">Role-based access</span>
            <h1>Sign in to continue</h1>
            <p className="login-copy">
              Employer users can create and assign events. Employee users see assigned tasks,
              notifications, packing lists, and returns.
            </p>
          </div>

          <div className="auth-mode-switcher" aria-label="Login or create account">
            <button
              className={authView === 'login' ? 'active' : ''}
              onClick={() => setAuthView('login')}
              type="button"
            >
              Login
            </button>
            <button
              className={authView === 'register' ? 'active' : ''}
              onClick={() => setAuthView('register')}
              type="button"
            >
              Create account
            </button>
          </div>

          {authView === 'login' && (
            <>
              <div className="login-role-switcher">
                <button
                  className={loginPortal === 'employer' ? 'active' : ''}
                  onClick={() => handlePortalChoice('employer')}
                  type="button"
                >
                  <Building2 size={17} aria-hidden="true" />
                  Employer
                </button>
                <button
                  className={loginPortal === 'employee' ? 'active' : ''}
                  onClick={() => handlePortalChoice('employee')}
                  type="button"
                >
                  <Bell size={17} aria-hidden="true" />
                  Employee
                </button>
              </div>

              <form
                className="login-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  handleLogin()
                }}
              >
                <label>
                  Account
                  <select
                    value={loginName}
                    onChange={(event) => {
                      setLoginName(event.target.value)
                      setLoginError('')
                    }}
                  >
                    {loginOptions.length === 0 && (
                      <option value="">No accounts yet</option>
                    )}
                    {loginOptions.map((account) => (
                      <option key={account.name} value={account.name}>
                        {account.name} - {account.role}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Password
                  <input
                    autoComplete="current-password"
                    minLength={4}
                    placeholder="Enter password"
                    type="password"
                    value={loginPassword}
                    onChange={(event) => {
                      setLoginPassword(event.target.value)
                      setLoginError('')
                    }}
                  />
                </label>

                {loginError && <p className="login-error">{loginError}</p>}
                {registerSuccess && <p className="login-success">{registerSuccess}</p>}
                {loginOptions.length === 0 && (
                  <p className="login-hint">
                    No {loginPortal} accounts yet. Create an account first.
                  </p>
                )}

                <button className="primary-action" disabled={loginOptions.length === 0} type="submit">
                  <LockKeyhole size={18} aria-hidden="true" />
                  Login to {loginPortal === 'employer' ? 'Employer' : 'Employee'} portal
                </button>
              </form>
            </>
          )}

          {authView === 'register' && (
            <form
              className="login-form"
              onSubmit={(event) => {
                event.preventDefault()
                handleRegister()
              }}
            >
              <div className="login-role-switcher">
                <button
                  className={registerPortal === 'employer' ? 'active' : ''}
                  onClick={() => {
                    setRegisterPortal('employer')
                    setRegisterError('')
                  }}
                  type="button"
                >
                  <Building2 size={17} aria-hidden="true" />
                  New employer
                </button>
                <button
                  className={registerPortal === 'employee' ? 'active' : ''}
                  onClick={() => {
                    setRegisterPortal('employee')
                    setRegisterError('')
                  }}
                  type="button"
                >
                  <Bell size={17} aria-hidden="true" />
                  New employee
                </button>
              </div>

              <label>
                Name
                <input
                  autoComplete="name"
                  placeholder="Enter full name"
                  value={registerName}
                  onChange={(event) => {
                    setRegisterName(event.target.value)
                    setRegisterError('')
                  }}
                />
              </label>

              <label>
                Password
                <input
                  autoComplete="new-password"
                  minLength={4}
                  placeholder="Create password"
                  type="password"
                  value={registerPassword}
                  onChange={(event) => {
                    setRegisterPassword(event.target.value)
                    setRegisterError('')
                  }}
                />
              </label>
              <p className="field-hint">Use at least 4 characters. Avoid spaces at the start or end.</p>

              {registerError && <p className="login-error">{registerError}</p>}

              <button className="primary-action" type="submit">
                <Plus size={18} aria-hidden="true" />
                Add {registerPortal === 'employer' ? 'employer' : 'employee'}
              </button>
            </form>
          )}

          <div className="login-hint">
            <strong>For testing:</strong>
            <span>Created accounts, inventory edits, and events are saved in this browser.</span>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <img
            alt="Future Ready Academy Inventory"
            className="brand-logo"
            src="/app-logo.png"
          />
        </div>

        <div className="role-card" aria-label="Current portal">
          {portalMode === 'employer' ? (
            <Building2 size={18} aria-hidden="true" />
          ) : (
            <Bell size={18} aria-hidden="true" />
          )}
          <div>
            <span>{portalMode === 'employer' ? 'Employer portal' : 'Employee portal'}</span>
            {unreadNotificationCount > 0 && (
              <strong>
                {unreadNotificationCount} unread notification{unreadNotificationCount === 1 ? '' : 's'}
              </strong>
            )}
          </div>
        </div>

        <nav
          className="nav-list"
          style={{ gridTemplateColumns: `repeat(${allowedNavItems.length}, minmax(0, 1fr))` }}
        >
          {allowedNavItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={activeTab === item.id ? 'active' : ''}
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                type="button"
                title={item.label}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="staff-switcher">
          <UserCog size={18} aria-hidden="true" />
          <span>Signed in as</span>
          <p>{currentStaff.name}</p>
          <strong>{currentStaff.role}</strong>
          <button className="logout-button" onClick={handleLogout} type="button">
            <LogOut size={16} aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow premium-pill">Future Ready Inventory</span>
            <h1>Educational and robotics event inventory</h1>
          </div>
          <div className="top-actions">
            <div className="notification-pill">
              <Bell size={16} aria-hidden="true" />
              {unreadNotificationCount > 0
                ? `${unreadNotificationCount} unread notification${unreadNotificationCount === 1 ? '' : 's'}`
                : portalMode === 'employee'
                  ? 'No new tasks'
                  : 'Employer portal'}
            </div>
            {portalMode === 'employer' && (
              <button type="button" onClick={() => setActiveTab('planner')}>
                <Plus size={17} aria-hidden="true" />
                New event
              </button>
            )}
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <section className="panel-stack">
            <div className="metric-grid">
              <Metric
                icon={PackageCheck}
                label="Available stock"
                value={dashboardStats.usable}
                note="After damaged or missing"
              />
              <Metric
                icon={Truck}
                label="Reserved"
                value={dashboardStats.reserved}
                note="For active events"
              />
              <Metric
                icon={CalendarDays}
                label={portalMode === 'employee' ? 'My events' : 'Events'}
                value={dashboardStats.upcoming}
                note={portalMode === 'employee' ? 'Assigned to me' : 'Upcoming'}
              />
            </div>

            <div className="two-column">
              <section className="surface">
                <div className="section-heading">
                  <div>
                    <h2>{portalMode === 'employee' ? 'My assigned events' : 'Upcoming events'}</h2>
                    <p>Select an event to view the packing list.</p>
                  </div>
                </div>
                <div className="event-list compact">
                  {visibleActiveEvents.length === 0 && (
                    <div className="empty-state">
                      {portalMode === 'employee'
                        ? 'No assigned active events yet.'
                        : 'No active events yet. Create an event to get started.'}
                    </div>
                  )}
                  {visibleActiveEvents.map((event) => (
                    <EventSummary
                      event={event}
                      inventoryById={inventoryById}
                      key={event.id}
                      onSelect={() => {
                        setCheckoutMessage('')
                        setSelectedEventId(event.id)
                        setActiveTab('events')
                      }}
                    />
                  ))}
                </div>
              </section>

              <section className="surface">
                {staffNotifications.length > 0 && (
                  <>
                    <div className="section-heading">
                      <div>
                        <h2>Notifications</h2>
                        <p>
                          {portalMode === 'employee'
                            ? 'Assignments and updates for your events.'
                            : 'Updates from employees after packing or checkout.'}
                        </p>
                      </div>
                    </div>
                    <div className="notification-list">
                      {staffNotifications.map((notification) => (
                        <button
                          className={notification.read ? 'notification-row read' : 'notification-row'}
                          key={notification.id}
                          onClick={() => {
                            setNotifications((records) =>
                              records.map((record) =>
                                record.id === notification.id ? { ...record, read: true } : record,
                              ),
                            )
                            setSelectedEventId(notification.eventId)
                            setActiveTab('events')
                          }}
                          type="button"
                        >
                          <strong>{notification.title}</strong>
                          <span>{notification.message}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="section-heading">
                  <div>
                    <h2>{portalMode === 'employee' ? 'My next steps' : 'Quick actions'}</h2>
                    <p>
                      {portalMode === 'employee'
                        ? 'Open your event, pack the listed items, then check them out.'
                        : 'Most common things to do from here.'}
                    </p>
                  </div>
                </div>
                <div className="quick-actions">
                  {portalMode === 'employer' && (
                    <button type="button" onClick={() => setActiveTab('planner')}>
                      <Plus size={18} aria-hidden="true" />
                      Create event
                    </button>
                  )}
                  {portalMode === 'employer' && (
                    <button type="button" onClick={() => setActiveTab('inventory')}>
                      <Boxes size={18} aria-hidden="true" />
                      Edit inventory
                    </button>
                  )}
                  <button type="button" onClick={() => setActiveTab('events')}>
                    <ClipboardList size={18} aria-hidden="true" />
                    {portalMode === 'employee' ? 'Open my packing list' : 'View packing lists'}
                  </button>
                </div>

                {portalMode === 'employer' && (
                  <div className="user-management">
                    <div className="section-heading compact-heading">
                      <div>
                        <h2>Manage users</h2>
                        <p>Add users from login, or remove accounts here.</p>
                      </div>
                    </div>
                    <div className="user-list">
                      {accounts.map((account) => {
                        const isCurrentUser = account.name === currentStaff.name
                        const isLastEmployer = account.portal === 'employer' && employerCount <= 1
                        const cannotDelete = isCurrentUser || isLastEmployer

                        return (
                          <div className="user-row" key={account.name}>
                            <div>
                              <strong>{account.name}</strong>
                              <span>
                                {account.role} - {account.portal === 'employer' ? 'Employer login' : 'Employee login'}
                              </span>
                            </div>
                            <button
                              disabled={cannotDelete}
                              onClick={() => deleteAccount(account.name)}
                              title={
                                isCurrentUser
                                  ? 'You are signed in with this account'
                                  : isLastEmployer
                                    ? 'Keep at least one employer account'
                                    : `Delete ${account.name}`
                              }
                              type="button"
                            >
                              <Trash2 size={17} aria-hidden="true" />
                              Delete
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    {userManagementMessage && (
                      <p className="inline-success">{userManagementMessage}</p>
                    )}
                  </div>
                )}

                {portalMode === 'employer' && <div className="simple-flow">
                  <h2>Simple flow</h2>
                  <ol>
                    <li>Employer creates event and assigns a staff team.</li>
                    <li>System checks available Laptop, iPad, VEX IQ, and UARO stock.</li>
                    <li>Assigned employees see the shared task and packing list.</li>
                    <li>Employee checks out and returns items after the event.</li>
                  </ol>
                </div>}
              </section>
            </div>
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="panel-stack profile-page">
            <section className="surface profile-hero">
              <div className="profile-title">
                <div className="profile-avatar" aria-hidden="true">
                  {profileInitials}
                </div>
                <div>
                  <span className="eyebrow">
                    {portalMode === 'employer' ? 'Employer profile' : 'Employee profile'}
                  </span>
                  <h2>{currentStaff.name}</h2>
                  <p>{currentStaff.role}</p>
                </div>
              </div>
              <Badge tone={portalMode === 'employer' ? 'info' : 'success'}>
                {portalMode === 'employer' ? 'Employer' : 'Employee'}
              </Badge>
            </section>

            <div className="profile-grid">
              <section className="surface profile-panel">
                <div className="section-heading">
                  <div>
                    <h2>Account</h2>
                    <p>Your login and access level.</p>
                  </div>
                </div>
                <dl className="profile-detail-list">
                  <div>
                    <dt>Name</dt>
                    <dd>{currentStaff.name}</dd>
                  </div>
                  <div>
                    <dt>Role</dt>
                    <dd>{currentStaff.role}</dd>
                  </div>
                  <div>
                    <dt>Portal</dt>
                    <dd>{currentAccount?.portal === 'employer' ? 'Employer login' : 'Employee login'}</dd>
                  </div>
                  <div>
                    <dt>Notifications</dt>
                    <dd>{unreadNotificationCount} unread</dd>
                  </div>
                </dl>
              </section>

              <section className="surface profile-panel">
                <div className="section-heading">
                  <div>
                    <h2>{portalMode === 'employer' ? 'Workspace' : 'My work'}</h2>
                    <p>
                      {portalMode === 'employer'
                        ? 'Current system overview.'
                        : 'Tasks assigned to this account.'}
                    </p>
                  </div>
                </div>
                <div className="profile-stats">
                  <div>
                    <span>{portalMode === 'employer' ? 'Users' : 'Assigned events'}</span>
                    <strong>{portalMode === 'employer' ? accounts.length : assignedEvents.length}</strong>
                  </div>
                  <div>
                    <span>{portalMode === 'employer' ? 'Events' : 'Active tasks'}</span>
                    <strong>
                      {portalMode === 'employer' ? profileEvents.length : profileActiveEvents.length}
                    </strong>
                  </div>
                  <div>
                    <span>{portalMode === 'employer' ? 'Active events' : 'Packed or in use'}</span>
                    <strong>
                      {portalMode === 'employer' ? profileActiveEvents.length : profilePackedEvents.length}
                    </strong>
                  </div>
                  <div>
                    <span>Unread notices</span>
                    <strong>{unreadNotificationCount}</strong>
                  </div>
                </div>
              </section>

              <section className="surface profile-panel">
                <div className="section-heading">
                  <div>
                    <h2>Quick menu</h2>
                    <p>Common actions for this login.</p>
                  </div>
                </div>
                <div className="profile-actions">
                  {portalMode === 'employer' && (
                    <button type="button" onClick={() => setActiveTab('planner')}>
                      <Plus size={18} aria-hidden="true" />
                      Create event
                    </button>
                  )}
                  {portalMode === 'employer' && (
                    <button type="button" onClick={() => setActiveTab('inventory')}>
                      <Boxes size={18} aria-hidden="true" />
                      Manage inventory
                    </button>
                  )}
                  <button type="button" onClick={() => setActiveTab('events')}>
                    <ClipboardList size={18} aria-hidden="true" />
                    {portalMode === 'employee' ? 'My events' : 'All events'}
                  </button>
                  <button type="button" onClick={handleLogout}>
                    <LogOut size={18} aria-hidden="true" />
                    Logout
                  </button>
                </div>
              </section>

              <section className="surface profile-panel">
                <div className="section-heading">
                  <div>
                    <h2>Recent activity</h2>
                    <p>
                      {portalMode === 'employee'
                        ? 'Actions recorded under your name.'
                        : 'Latest inventory and event updates.'}
                    </p>
                  </div>
                </div>
                <div className="profile-activity">
                  {profileLogs.length === 0 && (
                    <div className="empty-state">No activity recorded yet.</div>
                  )}
                  {profileLogs.map((log) => (
                    <div className="profile-activity-row" key={log.id}>
                      <div>
                        <strong>{log.action}</strong>
                        <span>{log.detail}</span>
                      </div>
                      <time>{log.time}</time>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}

        {activeTab === 'planner' && (
          <section className="panel-stack">
            <section className="surface planner-grid">
              <div className="form-panel">
                <div className="section-heading step-heading">
                  <span>1</span>
                  <div>
                    <h2>Event details</h2>
                    <p>Set the event, location, dates, and assigned team.</p>
                  </div>
                </div>

                <label>
                  Event name
                  <input
                    value={newEvent.title}
                    onChange={(event) =>
                      setNewEvent((record) => ({ ...record, title: event.target.value }))
                    }
                  />
                </label>

                <div className="form-grid">
                  <label>
                    Event ID
                    <input
                      value={newEvent.id}
                      onChange={(event) =>
                        setNewEvent((record) => ({ ...record, id: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Event location
                    <input
                      value={newEvent.location}
                      onChange={(event) =>
                        setNewEvent((record) => ({ ...record, location: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Event type
                    <input
                      list="event-type-options"
                      value={newEvent.type}
                      onChange={(event) =>
                        setNewEvent((record) => ({ ...record, type: event.target.value }))
                      }
                    />
                    <datalist id="event-type-options">
                      {Object.keys(templates).map((template) => (
                        <option key={template} value={template} />
                      ))}
                    </datalist>
                  </label>
                  <div className="team-selector">
                    <span>Assigned staff</span>
                    <div className="team-options">
                      {assignableStaff.length === 0 && (
                        <p className="empty-state">Add employee accounts before assigning a team.</p>
                      )}
                      {assignableStaff.map((staff) => (
                        <button
                          className={newEvent.assignedEmployees.includes(staff.name) ? 'selected' : ''}
                          key={staff.name}
                          onClick={() => toggleAssignedEmployee(staff.name)}
                          type="button"
                        >
                          {staff.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label>
                    Start date
                    <input
                      type="date"
                      value={newEvent.start}
                      onChange={(event) =>
                        setNewEvent((record) => ({ ...record, start: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    End date
                    <input
                      type="date"
                      value={newEvent.end}
                      onChange={(event) =>
                        setNewEvent((record) => ({ ...record, end: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Created by
                    <input value={currentStaff.name} readOnly />
                  </label>
                </div>

                <div className="step-divider">
                  <div className="section-heading step-heading">
                    <span>2</span>
                    <div>
                      <h2>Equipment needed</h2>
                      <p>Add items and enter the quantity required.</p>
                    </div>
                  </div>

                  <label>
                    Add equipment
                    <select
                      value=""
                      onChange={(event) => addReservationItem(event.target.value)}
                    >
                      <option value="" disabled>
                        Select inventory item
                      </option>
                      {inventory.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="allocation-panel">
                <div className="section-heading step-heading">
                  <span>3</span>
                  <div>
                    <h2>Check and confirm</h2>
                    <p>
                      {formatDate(newEvent.start)} to {formatDate(newEvent.end)}
                    </p>
                  </div>
                  <Badge tone={hasShortage ? 'danger' : 'success'}>
                    {hasShortage ? 'Shortage found' : 'Ready to reserve'}
                  </Badge>
                </div>

                <div className="allocation-table">
                  {plannerLines.map((line) => (
                    <div className="allocation-row" key={line.item.id}>
                      <div>
                        <strong>{line.item.name}</strong>
                        <AssetIdPreview
                          assetIds={pickAssetIds(
                            line.item,
                            line.quantity,
                            events,
                            newEvent.start,
                            newEvent.end,
                          )}
                        />
                      </div>
                      <input
                        aria-label={`${line.item.name} quantity`}
                        inputMode="numeric"
                        min={0}
                        pattern="[0-9]*"
                        step={1}
                        type="number"
                        value={line.quantity}
                        onChange={(event) =>
                          updateReservation(line.item.id, event.target.value)
                        }
                      />
                      <div className="availability">
                        <strong>{line.available}</strong>
                        <span>available</span>
                      </div>
                      <Badge tone={line.shortage > 0 ? 'danger' : 'success'}>
                        {line.shortage > 0 ? `${line.shortage} short` : 'OK'}
                      </Badge>
                      <button
                        className="icon-action danger"
                        onClick={() => removeReservationItem(line.item.id)}
                        title={`Remove ${line.item.name}`}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  className="primary-action"
                  disabled={hasShortage}
                  onClick={confirmEvent}
                  type="button"
                >
                  <CheckCircle2 size={18} aria-hidden="true" />
                  Confirm reservation
                </button>
              </div>
              {inventoryQuantityError && (
                <p className="form-error quantity-warning">{inventoryQuantityError}</p>
              )}
            </section>
          </section>
        )}

        {activeTab === 'events' && (
          <section className="panel-stack two-column event-workspace">
            <section className="surface">
              <div className="section-heading">
                <div>
                  <h2>{portalMode === 'employee' ? 'My events' : 'Events'}</h2>
                  <p>
                    {portalMode === 'employee'
                      ? 'Only events assigned to you are shown here.'
                      : 'Search and filter allocations, packing, and checkout status.'}
                  </p>
                </div>
              </div>
              <div className="filter-bar">
                <label className="search-box">
                  <Search size={17} aria-hidden="true" />
                  <input
                    placeholder="Search events"
                    value={eventSearch}
                    onChange={(event) => setEventSearch(event.target.value)}
                  />
                </label>
                <select
                  aria-label="Filter by status"
                  value={eventStatusFilter}
                  onChange={(event) =>
                    setEventStatusFilter(event.target.value as 'All' | EventStatus)
                  }
                >
                  <option>All</option>
                  <option>Draft</option>
                  <option>Reserved</option>
                  <option>Packed</option>
                  <option>Checked Out</option>
                  <option>Returned</option>
                  <option>Closed</option>
                </select>
                {portalMode === 'employer' && (
                  <select
                    aria-label="Filter by assigned staff"
                    value={eventStaffFilter}
                    onChange={(event) => setEventStaffFilter(event.target.value)}
                  >
                    <option>All</option>
                    {staffUsers.map((staff) => (
                      <option key={staff.name}>{staff.name}</option>
                    ))}
                    <option>Unassigned</option>
                  </select>
                )}
              </div>
              <div className="event-list">
                {filteredVisibleEvents.length === 0 && (
                  <div className="empty-state">No events match these filters.</div>
                )}
                {filteredVisibleEvents.map((event) => (
                  <EventSummary
                    active={selectedEvent?.id === event.id}
                    event={event}
                    inventoryById={inventoryById}
                    key={event.id}
                    onSelect={() => {
                      setCheckoutMessage('')
                      setSelectedEventId(event.id)
                      setEditingPackingEventId('')
                    }}
                  />
                ))}
              </div>
            </section>

            <section className="surface">
              <div className="section-heading">
                <div>
                  <h2>{portalMode === 'employee' ? 'My task' : 'Packing list'}</h2>
                  <p>{selectedEvent ? selectedEvent.title : 'Select an event'}</p>
                </div>
                {selectedEvent && (
                  <div className="packing-heading-actions">
                    <Badge tone={eventStatusTone(selectedEvent.status)}>
                      {eventStatusLabel(selectedEvent.status)}
                    </Badge>
                    {portalMode === 'employer' && (
                      <button
                        className="icon-action"
                        disabled={selectedEvent.status === 'Closed'}
                        onClick={() =>
                          setEditingPackingEventId((currentId) =>
                            currentId === selectedEvent.id ? '' : selectedEvent.id,
                          )
                        }
                        type="button"
                      >
                        {selectedEventEditMode ? 'Done editing' : 'Edit'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {selectedEvent && (
                <>
                  <EventProgress status={selectedEvent.status} />
                  <TeamChips employees={selectedEvent.assignedEmployees} />
                  {portalMode === 'employer' && selectedEventEditMode && (
                    <label className="packing-add-item">
                      Add item
                      <select
                        value=""
                        onChange={(event) => addEventReservationItem(selectedEvent.id, event.target.value)}
                      >
                        <option value="" disabled>
                          Select inventory item
                        </option>
                        {inventory
                          .filter(
                            (item) =>
                              !selectedEvent.reservations.some(
                                (reservation) => reservation.itemId === item.id,
                              ),
                          )
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  {inventoryQuantityError && selectedEventEditMode && (
                    <p className="form-error quantity-warning">{inventoryQuantityError}</p>
                  )}
                  <div className="packing-list" key={selectedEvent.id}>
                    {selectedEvent.reservations.map((reservation) => {
                      const item = inventoryById[reservation.itemId]
                      if (!item) {
                        return null
                      }
                      return (
                        <label className="packing-row" key={reservation.itemId}>
                          <input
                            checked={selectedEvent.packingProgress[reservation.itemId] ?? false}
                            disabled={selectedEvent.status !== 'Reserved' && selectedEvent.status !== 'Packed'}
                            type="checkbox"
                            onChange={(event) =>
                              togglePackedItem(selectedEvent.id, reservation.itemId, event.target.checked)
                            }
                          />
                          <div>
                            <strong>{item.name}</strong>
                            <span>
                              {reservation.quantity} {item.unit}
                              {reservation.quantity > 1 ? 's' : ''}
                            </span>
                            <AssetIdPreview assetIds={reservation.selectedAssetIds} />
                          </div>
                          {portalMode === 'employer' && selectedEventEditMode && (
                            <div className="packing-edit-controls">
                              <input
                                aria-label={`${item.name} quantity`}
                                inputMode="numeric"
                                min={0}
                                pattern="[0-9]*"
                                step={1}
                                type="number"
                                value={reservation.quantity}
                                onChange={(event) =>
                                  updateEventReservationQuantity(
                                    selectedEvent.id,
                                    reservation.itemId,
                                    event.target.value,
                                  )
                                }
                              />
                              <button
                                className="icon-action danger"
                                onClick={(event) => {
                                  event.preventDefault()
                                  removeEventReservationItem(selectedEvent.id, reservation.itemId)
                                }}
                                type="button"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </label>
                      )
                    })}
                  </div>

                  <div className="action-row">
                    {portalMode === 'employee' && (
                      <button
                        className="primary-action"
                        disabled={
                          (selectedEvent.status !== 'Reserved' && selectedEvent.status !== 'Packed') ||
                          !selectedEventAllPacked
                        }
                        onClick={() => packEvent(selectedEvent.id)}
                        type="button"
                      >
                        <PackageCheck size={18} aria-hidden="true" />
                        Mark packed and ready
                      </button>
                    )}
                    <button
                      className="secondary-action"
                      disabled={selectedEvent.status !== 'Packed'}
                      onClick={() => checkoutEvent(selectedEvent.id)}
                      type="button"
                    >
                      <Truck size={18} aria-hidden="true" />
                      {portalMode === 'employee' ? 'Check out items' : 'Approve checkout'}
                    </button>
                  </div>
                  <div className="action-row">
                    <button
                      className="secondary-action"
                      disabled={selectedEvent.status !== 'Checked Out'}
                      onClick={() => setActiveTab('returns')}
                      type="button"
                    >
                      <ClipboardList size={18} aria-hidden="true" />
                      {portalMode === 'employee' ? 'Submit return report' : 'Review returns'}
                    </button>
                    {portalMode === 'employer' && (
                      <button
                        className="primary-action"
                        disabled={selectedEvent.status !== 'Returned'}
                        onClick={closeEvent}
                        type="button"
                      >
                        <CheckCircle2 size={18} aria-hidden="true" />
                        Close event
                      </button>
                    )}
                  </div>
                  {checkoutMessage && <p className="inline-success">{checkoutMessage}</p>}
                  {portalMode === 'employer' && (
                    <button
                      className="delete-action"
                      onClick={() => deleteEvent(selectedEvent.id)}
                      type="button"
                    >
                      Delete event
                    </button>
                  )}
                </>
              )}
            </section>
          </section>
        )}

        {activeTab === 'inventory' && (
          <section className="surface">
            <div className="section-heading inventory-heading">
              <div>
                <h2>Centralized inventory tracker</h2>
                <p>Edit the total, damaged, and missing counts for each item.</p>
              </div>
              <label className="search-box">
                <Search size={17} aria-hidden="true" />
                <input
                  placeholder="Search inventory"
                  value={inventorySearch}
                  onChange={(event) => setInventorySearch(event.target.value)}
                />
              </label>
            </div>
            <div className="segmented-filter" aria-label="Inventory filters">
              {(['All', 'Low stock', 'Issues'] as const).map((filter) => (
                <button
                  className={inventoryFilter === filter ? 'active' : ''}
                  key={filter}
                  onClick={() => setInventoryFilter(filter)}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>

            <section className="add-inventory-panel">
              <div className="section-heading step-heading">
                <span>+</span>
                <div>
                  <h2>Add inventory item</h2>
                  <p>Add future equipment such as new kits, tablets, or teaching materials.</p>
                </div>
              </div>

              {inventoryQuantityError && (
                <p className="form-error quantity-warning">{inventoryQuantityError}</p>
              )}

              <div className="add-inventory-grid">
                <label>
                  Item name
                  <input
                    placeholder="e.g. Drone Kit"
                    value={newInventoryName}
                    onChange={(event) => {
                      setNewInventoryName(event.target.value)
                      setInventoryFormError('')
                    }}
                  />
                </label>
                <label>
                  ID prefix
                  <input
                    placeholder="e.g. DRONE"
                    value={newInventoryPrefix}
                    onChange={(event) => {
                      setNewInventoryPrefix(event.target.value)
                      setInventoryFormError('')
                    }}
                  />
                </label>
                <label>
                  Total
                  <input
                    inputMode="numeric"
                    min={0}
                    pattern="[0-9]*"
                    step={1}
                    type="number"
                    value={newInventoryTotal}
                    onChange={(event) => updateNewInventoryTotal(event.target.value)}
                  />
                </label>
                <label>
                  Unit
                  <input
                    placeholder="unit, kit, set"
                    value={newInventoryUnit}
                    onChange={(event) => setNewInventoryUnit(event.target.value)}
                  />
                </label>
                <button className="secondary-action" onClick={addInventoryItem} type="button">
                  <Plus size={17} aria-hidden="true" />
                  Add item
                </button>
              </div>
              {inventoryFormError && <p className="form-error">{inventoryFormError}</p>}
            </section>

            <div className="inventory-table">
              <div className="table-header">
                <span>Item</span>
                <span>Stock</span>
                <span>Reserved</span>
                <span>Damaged / missing</span>
                <span>Status</span>
              </div>
              {filteredInventory.map((item) => (
                <div className="inventory-row" key={item.id}>
                  <div className="item-cell">
                    <InventoryIcon category={item.category} />
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.category}</span>
                      <AssetIdPreview assetIds={item.assetIds} />
                    </div>
                  </div>
                  <div className="stock-editor">
                    <label>
                      Total
                      <input
                        inputMode="numeric"
                        min={0}
                        pattern="[0-9]*"
                        step={1}
                        type="number"
                        value={item.total}
                        onChange={(event) =>
                          updateInventoryItem(item.id, 'total', event.target.value)
                        }
                      />
                    </label>
                    <strong>{getUsable(item)} usable</strong>
                  </div>
                  <span>{reservedQuantity(item.id, '2026-06-02', '2026-12-31')}</span>
                  <div className="issue-inputs">
                    <label>
                      Damaged
                      <input
                        inputMode="numeric"
                        min={0}
                        pattern="[0-9]*"
                        step={1}
                        type="number"
                        value={item.damaged}
                        onChange={(event) =>
                          updateInventoryItem(item.id, 'damaged', event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Missing
                      <input
                        inputMode="numeric"
                        min={0}
                        pattern="[0-9]*"
                        step={1}
                        type="number"
                        value={item.missing}
                        onChange={(event) =>
                          updateInventoryItem(item.id, 'missing', event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <div className="status-cell">
                    <Badge tone={statusTone(statusForItem(item))}>{statusForItem(item)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'returns' && selectedEvent && (
          <section className="surface">
            <div className="section-heading">
              <div>
                <h2>{portalMode === 'employee' ? 'Submit return report' : 'Review returns'}</h2>
                <p>
                  {portalMode === 'employee'
                    ? 'Record returned, damaged, and missing equipment for employer review.'
                    : 'Review the submitted return report before closing the event.'}
                </p>
              </div>
              <select
                value={selectedEvent.id}
                onChange={(event) => setSelectedEventId(event.target.value)}
              >
                {visibleEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="return-table">
              {inventoryQuantityError && (
                <p className="form-error quantity-warning">{inventoryQuantityError}</p>
              )}
              <div className="table-header">
                <span>Item</span>
                <span>Checked out</span>
                <span>Returned</span>
                <span>Damaged</span>
                <span>Missing</span>
              </div>
              {selectedEvent.reservations.map((reservation) => {
                const item = inventoryById[reservation.itemId]
                if (!item) {
                  return null
                }
                const line = returnLines[item.id] ?? {
                  returned: selectedEvent.returnReport?.[item.id]?.returned ?? reservation.quantity,
                  damaged: selectedEvent.returnReport?.[item.id]?.damaged ?? 0,
                  missing: selectedEvent.returnReport?.[item.id]?.missing ?? 0,
                }

                return (
                  <div className="return-row" key={item.id}>
                    <strong>{item.name}</strong>
                    <span>{reservation.quantity}</span>
                    <input
                      inputMode="numeric"
                      min={0}
                      pattern="[0-9]*"
                      step={1}
                      type="number"
                      value={line.returned}
                      onChange={(event) =>
                        setReturnValue(item.id, 'returned', event.target.value)
                      }
                    />
                    <input
                      inputMode="numeric"
                      min={0}
                      pattern="[0-9]*"
                      step={1}
                      type="number"
                      value={line.damaged}
                      onChange={(event) =>
                        setReturnValue(item.id, 'damaged', event.target.value)
                      }
                    />
                    <input
                      inputMode="numeric"
                      min={0}
                      pattern="[0-9]*"
                      step={1}
                      type="number"
                      value={line.missing}
                      onChange={(event) =>
                        setReturnValue(item.id, 'missing', event.target.value)
                      }
                    />
                  </div>
                )
              })}
            </div>

            <button
              className="primary-action"
              disabled={
                portalMode === 'employee'
                  ? selectedEvent.status !== 'Checked Out'
                  : selectedEvent.status !== 'Returned'
              }
              onClick={portalMode === 'employee' ? submitReturnReport : closeEvent}
              type="button"
            >
              <PackageCheck size={18} aria-hidden="true" />
              {portalMode === 'employee' ? 'Submit return report' : 'Close event'}
            </button>
          </section>
        )}

        {activeTab === 'audit' && (
          <section className="surface">
            <div className="section-heading">
              <div>
                <h2>History log</h2>
                <p>Accountability for bookings, checkouts, and returns.</p>
              </div>
            </div>
            <div className="audit-list">
              {auditLogs.map((log) => (
                <div className="audit-row" key={log.id}>
                  <div className="audit-icon">
                    <ShieldCheck size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <strong>{log.action}</strong>
                    <p>{log.detail}</p>
                    <span>
                      {log.staff} - {log.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'flow' && (
          <section className="surface">
            <div className="section-heading">
              <div>
                <h2>User experience flow</h2>
                <p>How the employer and employee sides work together.</p>
              </div>
            </div>

            <div className="flow-grid">
              <section className="flow-lane">
                <h3>Employer portal</h3>
                <FlowStep
                  index={1}
                  title="Create event"
                  text="Enter event ID, event name, date range, venue, and event type."
                />
                <FlowStep
                  index={2}
                  title="Assign staff"
                  text="Select one or more employees responsible for packing, checkout, and on-site handling."
                />
                <FlowStep
                  index={3}
                  title="Reserve inventory"
                  text="Choose required equipment quantities and let the system assign available item IDs."
                />
                <FlowStep
                  index={4}
                  title="Notify employee"
                  text="Every assigned staff member receives an unread task notification in their portal."
                />
              </section>

              <section className="flow-lane">
                <h3>Employee portal</h3>
                <FlowStep
                  index={5}
                  title="Receive task"
                  text="Open the notification to view the assigned event, location, and packing list."
                />
                <FlowStep
                  index={6}
                  title="Pack exact items"
                  text="Use the generated item IDs, such as IPAD-001 to IPAD-008, to collect the correct assets."
                />
                <FlowStep
                  index={7}
                  title="Check out and return"
                  text="Mark equipment in use, then record returned, damaged, or missing items after the event."
                />
                <FlowStep
                  index={8}
                  title="Audit trail"
                  text="Every assignment, checkout, and return is recorded for accountability."
                />
              </section>
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

function Metric({
  icon: Icon,
  label,
  note,
  value,
}: {
  icon: typeof BarChart3
  label: string
  note: string
  value: number
}) {
  return (
    <section className="metric-card">
      <div className="metric-icon">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{note}</p>
      </div>
    </section>
  )
}

function FlowStep({ index, text, title }: { index: number; text: string; title: string }) {
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

function TeamChips({ employees }: { employees: string[] }) {
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

function EventSummary({
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
        <span>
          {event.id} - {event.type} - {formatDate(event.start)} to {formatDate(event.end)}
        </span>
        <span>
          {event.location}
        </span>
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

function EventProgress({ status }: { status: EventStatus }) {
  const currentStep = eventStepIndex(status)

  return (
    <div className="event-progress" aria-label={`Event status: ${eventStatusLabel(status)}`}>
      {eventFlowSteps.map((step, index) => (
        <div
          className={`progress-step ${index <= currentStep ? 'complete' : ''} ${
            index === currentStep ? 'current' : ''
          }`}
          key={`${step.label}-${index}`}
        >
          <span>{index + 1}</span>
          <strong>{step.label}</strong>
        </div>
      ))}
    </div>
  )
}

function AssetIdPreview({ assetIds }: { assetIds: string[] }) {
  if (assetIds.length === 0) {
    return <span className="asset-id-summary">IDs assigned after confirmation</span>
  }

  const firstId = assetIds[0]
  const lastId = assetIds[assetIds.length - 1]
  const idText =
    assetIds.length === 1
      ? firstId
      : `${firstId} to ${lastId} (${assetIds.length} items)`

  return (
    <span className="asset-id-summary" aria-label="Assigned item IDs">
      IDs: {idText}
    </span>
  )
}

function Badge({
  children,
  tone,
}: {
  children: string | number
  tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral'
}) {
  return <span className={`badge ${tone}`}>{children}</span>
}

function statusTone(status: InventoryStatus) {
  if (status === 'Available') return 'success'
  if (status === 'Reserved' || status === 'In Use') return 'info'
  if (status === 'Damaged' || status === 'Missing') return 'danger'
  return 'neutral'
}

function InventoryIcon({ category }: { category: string }) {
  if (category === 'Computing') return <Laptop size={18} aria-hidden="true" />
  return <Wrench size={18} aria-hidden="true" />
}

export default App
