<!-- app/pages/manager/floor-plan/index.vue -->
<script setup lang="ts">
import type {
  FloorPlan,
  FloorPlanAssets,
  LayoutElement,
  LayoutTable,
  TableStatus,
} from '~/services/FloorPlanService'
import type { EditorElement, EditorTable } from '~/components/floor-plan/Inspector.vue'
import {
  DOOR_ASSETS,
  DRAWN,
  doorAsset,
  tableAsset,
  type PlaceSpec,
} from '~/utils/floorPlanCatalog'

definePageMeta({
  role: 'Manager',
})

const links = [
  { label: 'Dashboard', to: '/manager/dashboard', icon: 'squares-2x2' },
  { label: 'Servings', to: '/manager/servings', icon: 'cake' },
  { label: 'Floor Plan', to: '/manager/floor-plan', icon: 'map' },
]

const DEFAULT_CANVAS = { width: 760, height: 640 }
const UNDO_LIMIT = 50
const GRID = 20 // matches the dotted canvas background
const NUDGE = GRID

const service = useFloorPlanService('manager')
const { confirmDialog, alertDialog, askConfirm, runConfirm, showAlert } = useDialogs()

// ── State ────────────────────────────────────────────────────────────────
const branches = ref<{ uuid: string; branch_name: string }[]>([])
const branchUuid = ref('')
const catalog = ref<FloorPlanAssets | null>(null)
const plans = ref<FloorPlan[]>([])
const plan = ref<FloorPlan | null>(null)

const tables = ref<EditorTable[]>([])
const elements = ref<EditorElement[]>([])
const selected = ref<{ type: 'table' | 'element'; uid: string } | null>(null)
const baseline = ref('')
const undoStack = ref<string[]>([])

const preview = ref(false)
const snapOn = ref(true)
const panMode = ref(false) // Pan button: dragging scrolls the canvas instead of moving items
const panning = ref(false)
const scrollEl = ref<HTMLElement | null>(null)
const loading = ref(true)
const saving = ref(false)
const statusBusy = ref(false)
const errorMessage = ref('')
const planLocked = ref(false) // API 403: plan has no reservations feature
const saveErrors = ref<Record<string, string[]>>({})

const panel = ref<null | 'new' | 'settings'>(null)
const form = reactive({ name: '', width: DEFAULT_CANVAS.width, height: DEFAULT_CANVAS.height })
const formBusy = ref(false)
const formError = ref('')

const canvasEl = ref<HTMLElement | null>(null)

const limits = computed(() => catalog.value?.limits)
const statuses = computed<TableStatus[]>(() => catalog.value?.table_statuses ?? ['available', 'occupied', 'reserved', 'cleaning'])
const canvasW = computed(() => plan.value?.canvas_width ?? DEFAULT_CANVAS.width)
const canvasH = computed(() => plan.value?.canvas_height ?? DEFAULT_CANVAS.height)

const selectedTable = computed(() =>
  selected.value?.type === 'table' ? tables.value.find((t) => t.uid === selected.value!.uid) ?? null : null)
const selectedElement = computed(() =>
  selected.value?.type === 'element' ? elements.value.find((e) => e.uid === selected.value!.uid) ?? null : null)

// Server errors of the selected row, flattened to field -> first message.
const selectedErrors = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {}
  const t = selectedTable.value
  const e = selectedElement.value
  const prefix = t ? `tables.${tables.value.indexOf(t)}.` : e ? `elements.${elements.value.indexOf(e)}.` : null
  if (!prefix) return out
  for (const [key, msgs] of Object.entries(saveErrors.value)) {
    if (key.startsWith(prefix)) out[key.slice(prefix.length)] = msgs[0] ?? ''
  }
  return out
})

// ── Layout <-> editor rows ───────────────────────────────────────────────
let uidCounter = 0
const newUid = () => `n${++uidCounter}`

function fromPlan(p: FloorPlan) {
  tables.value = (p.tables ?? []).map((t) => ({
    uid: t.uuid,
    uuid: t.uuid,
    table_name: t.table_name,
    capacity: t.capacity,
    asset_key: t.asset_key ?? 'table_sqr_4',
    x: t.x_location,
    y: t.y_location,
    rotation: t.rotation,
    status: t.status,
  }))
  elements.value = (p.elements ?? []).map((e) => ({
    uid: e.uuid,
    uuid: e.uuid,
    category: e.category,
    asset_key: e.asset_key,
    label: e.label,
    x: e.x_location,
    y: e.y_location,
    width: e.width,
    height: e.height,
    rotation: e.rotation,
    z_index: e.z_index,
  }))
}

// Everything the Save button sends. Status is excluded: it has its own endpoint.
function layoutPayload(): { tables: LayoutTable[]; elements: LayoutElement[] } {
  return {
    tables: tables.value.map((t) => ({
      uuid: t.uuid,
      table_name: t.table_name.trim(),
      capacity: t.capacity,
      asset_key: t.asset_key,
      x_location: Math.round(t.x),
      y_location: Math.round(t.y),
      rotation: t.rotation,
    })),
    elements: elements.value.map((e, i) => ({
      uuid: e.uuid,
      category: e.category,
      asset_key: e.asset_key,
      label: e.label?.trim() || null,
      x_location: Math.round(e.x),
      y_location: Math.round(e.y),
      width: e.width,
      height: e.height,
      rotation: e.rotation,
      z_index: i,
    })),
  }
}

const signature = () => JSON.stringify(layoutPayload())
const dirty = computed(() => !!plan.value && signature() !== baseline.value)

function snapshot() {
  return JSON.stringify({ tables: tables.value, elements: elements.value })
}

function pushUndo() {
  undoStack.value.push(snapshot())
  if (undoStack.value.length > UNDO_LIMIT) undoStack.value.shift()
}

function undo() {
  const last = undoStack.value.pop()
  if (!last) return
  const s = JSON.parse(last)
  tables.value = s.tables
  elements.value = s.elements
  if (selected.value && ![...tables.value, ...elements.value].some((i) => i.uid === selected.value!.uid)) selected.value = null
}

function applyPlan(p: FloorPlan) {
  plan.value = p
  fromPlan(p)
  baseline.value = signature()
  undoStack.value = []
  saveErrors.value = {}
}

// ── Sizing ───────────────────────────────────────────────────────────────
function itemSize(kind: 'table' | 'element', item: EditorTable | EditorElement) {
  if (kind === 'table') {
    const a = tableAsset((item as EditorTable).asset_key)
    return { w: a?.w ?? 112, h: a?.h ?? 90 }
  }
  const e = item as EditorElement
  if (e.category === 'door') {
    const d = doorAsset(e.asset_key)
    return { w: d?.w ?? 64, h: d?.h ?? 64 }
  }
  return { w: e.width ?? 100, h: e.height ?? 10 }
}

// The box rotates around its centre while x/y stay the unrotated top-left, so the
// on-screen footprint is the rotated box's bounding rectangle.
function footprint(kind: 'table' | 'element', item: EditorTable | EditorElement) {
  const { w, h } = itemSize(kind, item)
  const rad = (item.rotation * Math.PI) / 180
  const c = Math.abs(Math.cos(rad))
  const s = Math.abs(Math.sin(rad))
  const r2 = (n: number) => Math.round(n * 100) / 100
  const vw = r2(w * c + h * s)
  const vh = r2(w * s + h * c)
  return { w, h, vw, vh, offX: (w - vw) / 2, offY: (h - vh) / 2 }
}

function clamp(kind: 'table' | 'element', item: EditorTable | EditorElement) {
  const { offX, offY, vw, vh } = footprint(kind, item)
  const vx = Math.min(Math.max(0, item.x + offX), Math.max(0, canvasW.value - vw))
  const vy = Math.min(Math.max(0, item.y + offY), Math.max(0, canvasH.value - vh))
  item.x = vx - offX
  item.y = vy - offY
}

const snap = (v: number) => (snapOn.value ? Math.round(v / GRID) * GRID : v)

// Snap what the user sees (the rotated box's top-left), not the unrotated origin.
function snapPlace(kind: 'table' | 'element', item: EditorTable | EditorElement, x: number, y: number) {
  const { offX, offY } = footprint(kind, item)
  item.x = snap(x + offX) - offX
  item.y = snap(y + offY) - offY
}

function tableLabel(name: string) {
  const m = name.match(/(\d+)\s*$/)
  return m ? m[1] : name.slice(0, 3)
}

function nextTableName() {
  const used = new Set(tables.value.map((t) => t.table_name.trim().toLowerCase()))
  let n = 1
  while (used.has(`table ${n}`)) n++
  return `Table ${n}`
}

// ── Editing ──────────────────────────────────────────────────────────────
function addItem(spec: PlaceSpec, at?: { x: number; y: number }) {
  if (!plan.value || preview.value) return

  const isTable = spec.kind === 'table'
  const max = isTable ? limits.value?.max_tables : limits.value?.max_elements
  const count = isTable ? tables.value.length : elements.value.length
  if (max && count >= max) {
    showAlert('Limit reached', `A floor plan can hold up to ${max} ${isTable ? 'tables' : 'fixtures'}.`)
    return
  }

  pushUndo()
  const uid = newUid()

  if (spec.kind === 'table') {
    const a = tableAsset(spec.key)
    if (!a) return
    const t: EditorTable = {
      uid, uuid: null, table_name: nextTableName(), capacity: a.seats, asset_key: a.key,
      x: 0, y: 0, rotation: 0, status: 'available',
    }
    place(t, 'table', a.w, a.h, at)
    tables.value.push(t)
    selected.value = { type: 'table', uid }
    return
  }

  let e: EditorElement
  let w: number
  let h: number
  if (spec.kind === 'door') {
    const d = DOOR_ASSETS.find((x) => x.key === spec.key)
    if (!d) return
    ;[w, h] = [d.w, d.h]
    e = { uid, uuid: null, category: 'door', asset_key: d.key, label: null, x: 0, y: 0, width: null, height: null, rotation: 0, z_index: 0 }
  } else {
    const d = DRAWN[spec.kind]
    ;[w, h] = [d.w, d.h]
    e = { uid, uuid: null, category: spec.kind, asset_key: null, label: d.label, x: 0, y: 0, width: d.w, height: d.h, rotation: 0, z_index: 0 }
  }
  place(e, 'element', w, h, at)
  elements.value.push(e)
  selected.value = { type: 'element', uid }
}

// Centre of the drop point, or the middle of the plan when added by click.
function place(item: EditorTable | EditorElement, kind: 'table' | 'element', w: number, h: number, at?: { x: number; y: number }) {
  snapPlace(kind, item, (at?.x ?? canvasW.value / 2) - w / 2, (at?.y ?? canvasH.value / 2) - h / 2)
  clamp(kind, item)
}

function patchSelected(patch: Record<string, any>) {
  const item = selectedTable.value ?? selectedElement.value
  if (!item) return
  // Typing in a text box is many patches: only the first of a run is an undo step.
  const key = Object.keys(patch).join(',')
  if (lastPatchKey !== `${item.uid}:${key}`) pushUndo()
  lastPatchKey = `${item.uid}:${key}`
  Object.assign(item, patch)
  clamp(selectedTable.value ? 'table' : 'element', item)
}
let lastPatchKey = ''

function rotateSelected() {
  const item = selectedTable.value ?? selectedElement.value
  if (!item) return
  pushUndo()
  lastPatchKey = ''
  item.rotation = (item.rotation + 90) % 360
  clamp(selectedTable.value ? 'table' : 'element', item) // the turned footprint may overhang the edge
}

function duplicateSelected() {
  const t = selectedTable.value
  const e = selectedElement.value
  if (!t && !e) return
  const max = t ? limits.value?.max_tables : limits.value?.max_elements
  if (max && (t ? tables.value.length : elements.value.length) >= max) {
    showAlert('Limit reached', `A floor plan can hold up to ${max} ${t ? 'tables' : 'fixtures'}.`)
    return
  }
  pushUndo()
  lastPatchKey = ''
  const uid = newUid()
  if (t) {
    const copy: EditorTable = { ...t, uid, uuid: null, table_name: nextTableName(), status: 'available', x: t.x + NUDGE, y: t.y + NUDGE }
    clamp('table', copy)
    tables.value.push(copy)
    selected.value = { type: 'table', uid }
  } else if (e) {
    const copy: EditorElement = { ...e, uid, uuid: null, x: e.x + NUDGE, y: e.y + NUDGE }
    clamp('element', copy)
    elements.value.push(copy)
    selected.value = { type: 'element', uid }
  }
}

function removeSelected() {
  if (!selected.value) return
  pushUndo()
  lastPatchKey = ''
  const { type, uid } = selected.value
  if (type === 'table') tables.value = tables.value.filter((t) => t.uid !== uid)
  else elements.value = elements.value.filter((e) => e.uid !== uid)
  selected.value = null
}

// ── Pointer drag on the canvas ───────────────────────────────────────────
let drag: { type: 'table' | 'element'; uid: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null = null

function startDrag(e: PointerEvent, type: 'table' | 'element', item: EditorTable | EditorElement) {
  if (preview.value || panMode.value || e.button !== 0) return
  selected.value = { type, uid: item.uid }
  drag = { type, uid: item.uid, sx: e.clientX, sy: e.clientY, ox: item.x, oy: item.y, moved: false }
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', endDrag, { once: true })
}

function onDragMove(e: PointerEvent) {
  if (!drag) return
  const item = (drag.type === 'table' ? tables.value : elements.value).find((i) => i.uid === drag!.uid)
  if (!item) return
  const dx = e.clientX - drag.sx
  const dy = e.clientY - drag.sy
  if (!drag.moved) {
    if (Math.abs(dx) + Math.abs(dy) < 3) return
    pushUndo()
    lastPatchKey = ''
    drag.moved = true
  }
  snapPlace(drag.type, item, drag.ox + dx, drag.oy + dy)
  if (drag.type === 'element') magnetMove(item as EditorElement)
  clamp(drag.type, item)
}

function endDrag() {
  drag = null
  window.removeEventListener('pointermove', onDragMove)
}

// ── Panning (Pan button, or the middle mouse button any time) ────────────
let pan: { sx: number; sy: number; sl: number; st: number } | null = null

function togglePan() {
  panMode.value = !panMode.value
  if (panMode.value) selected.value = null
}

function startPan(e: PointerEvent) {
  const el = scrollEl.value
  if (!el || !(panMode.value ? e.button === 0 || e.button === 1 : e.button === 1)) return
  e.preventDefault()
  pan = { sx: e.clientX, sy: e.clientY, sl: el.scrollLeft, st: el.scrollTop }
  panning.value = true
  window.addEventListener('pointermove', onPanMove)
  window.addEventListener('pointerup', endPan, { once: true })
}

function onPanMove(e: PointerEvent) {
  if (!pan || !scrollEl.value) return
  scrollEl.value.scrollLeft = pan.sl - (e.clientX - pan.sx)
  scrollEl.value.scrollTop = pan.st - (e.clientY - pan.sy)
}

function endPan() {
  pan = null
  panning.value = false
  window.removeEventListener('pointermove', onPanMove)
}

// ── Joining walls ────────────────────────────────────────────────────────
// Grid snapping puts a wall's *edge* on a grid line, so its 8px-thick centre line is 4px off
// and ends miss each other. While snap is on, a wall end that comes within MAGNET px of another
// wall's centre line (or end) is pulled onto it, so corners and T-junctions meet exactly.
const MAGNET = 12

function wallSegment(el: EditorElement) {
  const { w, h } = itemSize('element', el)
  const rad = (el.rotation * Math.PI) / 180
  const ux = Math.cos(rad)
  const uy = Math.sin(rad)
  const cx = el.x + w / 2
  const cy = el.y + h / 2
  return { a: { x: cx - (ux * w) / 2, y: cy - (uy * w) / 2 }, b: { x: cx + (ux * w) / 2, y: cy + (uy * w) / 2 } }
}

function nearestOnWalls(p: { x: number; y: number }, excludeUid: string) {
  let best: { pt: { x: number; y: number }; d: number } | null = null
  for (const o of elements.value) {
    if (o.category !== 'wall' || o.uid === excludeUid) continue
    const { a, b } = wallSegment(o)
    const vx = b.x - a.x
    const vy = b.y - a.y
    const len2 = vx * vx + vy * vy || 1
    const t = Math.min(Math.max(((p.x - a.x) * vx + (p.y - a.y) * vy) / len2, 0), 1)
    const pt = { x: a.x + t * vx, y: a.y + t * vy }
    const d = Math.hypot(pt.x - p.x, pt.y - p.y)
    if (!best || d < best.d) best = { pt, d }
  }
  return best
}

function magnetMove(el: EditorElement) {
  if (!snapOn.value || el.category !== 'wall') return
  const { a, b } = wallSegment(el)
  let best: { dx: number; dy: number; d: number } | null = null
  for (const end of [a, b]) {
    const hit = nearestOnWalls(end, el.uid)
    if (hit && hit.d <= MAGNET && (!best || hit.d < best.d)) best = { dx: hit.pt.x - end.x, dy: hit.pt.y - end.y, d: hit.d }
  }
  if (!best) return
  el.x = Math.round((el.x + best.dx) * 100) / 100
  el.y = Math.round((el.y + best.dy) * 100) / 100
}

// ── Rotating with the mouse (knob above the selected item) ───────────────
const ROTATE_STEP = 15

let rotating: { type: 'table' | 'element'; uid: string; moved: boolean } | null = null

function startRotate(e: PointerEvent, type: 'table' | 'element', item: EditorTable | EditorElement) {
  if (preview.value || panMode.value || e.button !== 0) return
  selected.value = { type, uid: item.uid }
  rotating = { type, uid: item.uid, moved: false }
  window.addEventListener('pointermove', onRotateMove)
  window.addEventListener('pointerup', endRotate, { once: true })
}

function onRotateMove(e: PointerEvent) {
  if (!rotating || !canvasEl.value) return
  const item = (rotating.type === 'table' ? tables.value : elements.value).find((i) => i.uid === rotating!.uid)
  if (!item) return
  // The knob sits straight above the centre at 0 degrees, so the pointer angle + 90 is the rotation.
  const { w, h } = itemSize(rotating.type, item)
  const rect = canvasEl.value.getBoundingClientRect()
  const cx = rect.left + canvasEl.value.clientLeft + item.x + w / 2
  const cy = rect.top + canvasEl.value.clientTop + item.y + h / 2
  const deg = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90
  const step = snapOn.value ? ROTATE_STEP : 1
  const next = (((Math.round(deg / step) * step) % 360) + 360) % 360
  if (next === item.rotation) return
  if (!rotating.moved) {
    pushUndo()
    lastPatchKey = ''
    rotating.moved = true
  }
  item.rotation = next
  clamp(rotating.type, item)
}

function endRotate() {
  rotating = null
  window.removeEventListener('pointermove', onRotateMove)
}

// ── Extending walls / counters from either end ───────────────────────────
// Drawn fixtures grow along their own (rotated) axis. The opposite end stays put.
const MIN_LENGTH = GRID
const isDrawn = (el: EditorElement) => el.category === 'wall' || el.category === 'counter'

let resize: {
  uid: string; side: 'start' | 'end'; ux: number; uy: number
  ax: number; ay: number; sx: number; sy: number; w0: number; moved: boolean
} | null = null

function startResize(e: PointerEvent, el: EditorElement, side: 'start' | 'end') {
  if (preview.value || panMode.value || e.button !== 0) return
  selected.value = { type: 'element', uid: el.uid }
  const { w, h } = itemSize('element', el)
  const rad = (el.rotation * Math.PI) / 180
  const ux = Math.cos(rad)
  const uy = Math.sin(rad)
  const cx = el.x + w / 2
  const cy = el.y + h / 2
  // Anchor = the end that does not move.
  const dir = side === 'end' ? -1 : 1
  resize = { uid: el.uid, side, ux, uy, ax: cx + (dir * ux * w) / 2, ay: cy + (dir * uy * w) / 2, sx: e.clientX, sy: e.clientY, w0: w, moved: false }
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', endResize, { once: true })
}

function onResizeMove(e: PointerEvent) {
  if (!resize) return
  const el = elements.value.find((i) => i.uid === resize!.uid)
  if (!el) return
  const r = resize
  const p = (e.clientX - r.sx) * r.ux + (e.clientY - r.sy) * r.uy
  if (!r.moved) {
    if (Math.abs(p) < 3) return
    pushUndo()
    lastPatchKey = ''
    r.moved = true
  }
  const max = Math.abs(r.uy) > Math.abs(r.ux) ? canvasH.value : canvasW.value
  const raw = r.side === 'end' ? r.w0 + p : r.w0 - p
  let w = Math.round(Math.min(Math.max(snap(raw), MIN_LENGTH), max))
  const h = el.height ?? 10
  const sign = r.side === 'end' ? 1 : -1
  if (snapOn.value && el.category === 'wall') {
    // Pull the moving end onto a neighbouring wall, measured along this wall's own axis.
    const hit = nearestOnWalls({ x: r.ax + sign * r.ux * w, y: r.ay + sign * r.uy * w }, el.uid)
    if (hit && hit.d <= MAGNET) {
      const along = sign * ((hit.pt.x - r.ax) * r.ux + (hit.pt.y - r.ay) * r.uy)
      if (along >= MIN_LENGTH && along <= max) w = Math.round(along)
    }
  }
  const cx = r.ax + (sign * r.ux * w) / 2
  const cy = r.ay + (sign * r.uy * w) / 2
  el.width = w
  el.x = cx - w / 2
  el.y = cy - h / 2
  clamp('element', el)
}

function endResize() {
  resize = null
  window.removeEventListener('pointermove', onResizeMove)
}

function onDrop(e: DragEvent) {
  const raw = e.dataTransfer?.getData('application/x-floorplan')
  if (!raw || !canvasEl.value) return
  e.preventDefault()
  const rect = canvasEl.value.getBoundingClientRect()
  try {
    addItem(JSON.parse(raw) as PlaceSpec, { x: e.clientX - rect.left, y: e.clientY - rect.top })
  } catch {
    /* not ours */
  }
}

function onKeydown(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  if (el && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    undo()
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected.value && !preview.value) {
    e.preventDefault()
    removeSelected()
  }
}

// ── API ──────────────────────────────────────────────────────────────────
function failure(e: any, fallback: string) {
  planLocked.value = e?.response?.status === 403 && !!e?.data?.required_feature
  errorMessage.value = planLocked.value
    ? 'Floor plans are not included in your cafe\'s plan.'
    : e?.data?.message ?? fallback
}

async function loadPlans(preferUuid?: string) {
  const res = await service.list(branchUuid.value)
  plans.value = res.floor_plans
  const target = res.floor_plans.find((p) => p.uuid === preferUuid)
    ?? res.floor_plans.find((p) => p.is_active)
    ?? res.floor_plans[0]
  if (target) await openPlan(target.uuid)
  else {
    plan.value = null
    tables.value = []
    elements.value = []
    baseline.value = ''
    panel.value = 'new' // nothing yet: go straight to creating the first plan
  }
}

async function openPlan(uuid: string) {
  const res = await service.show(branchUuid.value, uuid)
  applyPlan(res.floor_plan)
  selected.value = null
  preview.value = false
}

// Switching away from unsaved work asks first.
function guard(action: () => void | Promise<void>) {
  if (!dirty.value) return void action()
  askConfirm({
    title: 'Discard changes?',
    message: 'You have unsaved layout changes. Leave them behind?',
    confirmText: 'Discard',
    isDestructive: true,
    onConfirm: action,
  })
}

function selectPlan(uuid: string) {
  if (uuid === plan.value?.uuid) return
  guard(async () => {
    try {
      errorMessage.value = ''
      await openPlan(uuid)
    } catch (e: any) {
      failure(e, 'Could not open that floor plan.')
    }
  })
}

async function saveLayout() {
  if (!plan.value || saving.value || !dirty.value) return
  saving.value = true
  errorMessage.value = ''
  saveErrors.value = {}
  const keepTable = selectedTable.value?.table_name
  const keepElement = selectedElement.value ? elements.value.indexOf(selectedElement.value) : -1
  try {
    const { tables: t, elements: e } = layoutPayload()
    const res = await service.saveLayout(branchUuid.value, plan.value.uuid, t, e)
    applyPlan(res.floor_plan)
    if (keepTable) {
      const hit = tables.value.find((x) => x.table_name === keepTable.trim())
      selected.value = hit ? { type: 'table', uid: hit.uid } : null
    } else if (keepElement >= 0 && elements.value[keepElement]) {
      selected.value = { type: 'element', uid: elements.value[keepElement]!.uid }
    } else selected.value = null
  } catch (e: any) {
    saveErrors.value = e?.data?.errors ?? {}
    const first = Object.values(saveErrors.value)[0]?.[0]
    failure(e, 'Could not save the layout.')
    if (first && !planLocked.value) errorMessage.value = first
  } finally {
    saving.value = false
  }
}

async function changeStatus(status: TableStatus) {
  const t = selectedTable.value
  if (!t?.uuid || statusBusy.value) return
  statusBusy.value = true
  try {
    const res = await service.tableStatus(branchUuid.value, t.uuid, status)
    t.status = res.table.status
  } catch (e: any) {
    failure(e, 'Could not change the table status.')
  } finally {
    statusBusy.value = false
  }
}

function openPanel(kind: 'new' | 'settings') {
  formError.value = ''
  if (kind === 'settings' && plan.value) {
    form.name = plan.value.floorplan_name
    form.width = plan.value.canvas_width
    form.height = plan.value.canvas_height
  } else {
    form.name = ''
    form.width = DEFAULT_CANVAS.width
    form.height = DEFAULT_CANVAS.height
  }
  panel.value = panel.value === kind ? null : kind
}

function formFailure(e: any, fallback: string) {
  const errs = e?.data?.errors as Record<string, string[]> | undefined
  formError.value = (errs && Object.values(errs)[0]?.[0]) || e?.data?.message || fallback
}

async function submitPanel() {
  if (formBusy.value) return
  formBusy.value = true
  formError.value = ''
  const body = { floorplan_name: form.name.trim(), canvas_width: Number(form.width), canvas_height: Number(form.height) }
  try {
    if (panel.value === 'new') {
      const res = await service.create(branchUuid.value, body)
      panel.value = null
      await loadPlans(res.floor_plan.uuid)
    } else if (plan.value) {
      const res = await service.update(branchUuid.value, plan.value.uuid, body)
      // Resize / rename only: keep the unsaved layout the user is working on.
      plan.value = { ...plan.value, ...res.floor_plan, tables: plan.value.tables, elements: plan.value.elements }
      plans.value = (await service.list(branchUuid.value)).floor_plans
      panel.value = null
    }
  } catch (e: any) {
    formFailure(e, 'Could not save the floor plan.')
  } finally {
    formBusy.value = false
  }
}

async function activatePlan() {
  if (!plan.value || plan.value.is_active) return
  try {
    const res = await service.activate(branchUuid.value, plan.value.uuid)
    plans.value = (await service.list(branchUuid.value)).floor_plans
    plan.value = { ...plan.value, is_active: res.floor_plan.is_active }
  } catch (e: any) {
    formFailure(e, 'Could not activate the floor plan.')
  }
}

function deletePlan() {
  const p = plan.value
  if (!p) return
  askConfirm({
    title: 'Delete floor plan?',
    message: `"${p.floorplan_name}" and its layout will be removed.`,
    confirmText: 'Delete',
    isDestructive: true,
    onConfirm: async () => {
      try {
        await service.remove(branchUuid.value, p.uuid)
        panel.value = null
        await loadPlans()
      } catch (e: any) {
        // e.g. 409: upcoming reservations
        formFailure(e, 'Could not delete the floor plan.')
        showAlert('Could not delete', formError.value)
      }
    },
  })
}

function togglePreview() {
  preview.value = !preview.value
  if (preview.value) selected.value = null
}

async function loadBranch() {
  loading.value = true
  errorMessage.value = ''
  panel.value = null
  try {
    const [a] = await Promise.all([service.assets(branchUuid.value), loadPlans()])
    catalog.value = a
  } catch (e: any) {
    failure(e, 'Could not load the floor plan.')
  } finally {
    loading.value = false
  }
}

watch(branchUuid, (_, old) => {
  if (!old) return void loadBranch()
  guard(loadBranch)
})

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('beforeunload', onBeforeUnload)
  try {
    const res = await service.managedBranches()
    branches.value = res.branches
    if (!res.branches.length) errorMessage.value = 'You are not assigned to a branch yet.'
    else branchUuid.value = res.branches[0]!.uuid
  } catch (e: any) {
    failure(e, 'Could not load your branches.')
  }
  loading.value = false
})

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value) e.preventDefault()
}

onBeforeRouteLeave(() => {
  if (dirty.value && !window.confirm('You have unsaved changes. Leave without saving?')) return false
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  endDrag()
  endResize()
  endRotate()
  endPan()
})

// ── Template helpers ─────────────────────────────────────────────────────
function itemStyle(kind: 'table' | 'element', item: EditorTable | EditorElement, z: number) {
  const { w, h } = itemSize(kind, item)
  return {
    left: `${item.x}px`,
    top: `${item.y}px`,
    width: `${w}px`,
    height: `${h}px`,
    transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
    zIndex: z,
  }
}

const isSelected = (type: 'table' | 'element', uid: string) => selected.value?.type === type && selected.value.uid === uid
const doorSrc = (key: string | null) => doorAsset(key)?.src

const iconBtn = 'flex items-center gap-2 rounded-[10px] px-4 py-[11px] text-[13px] text-[#2D2521] transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
const inputCls = 'bg-[#FFFDF9] border border-[#DED4CA] rounded-[6px] px-[9px] py-[8px] text-[12px] text-[#2D2521] outline-none focus:border-[#A96746]'
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FFF8EA]">
    <NavBar :links="links" />
    <main class="flex-1 min-w-0 p-6 lg:px-10 lg:py-8 flex flex-col gap-5">
      <!-- Header -->
      <header class="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-[#EDD8CC] pb-4">
        <div class="flex flex-col gap-1">
          <h1 class="font-display font-bold text-[36px] leading-[39px] text-[#3D2B24]">Floor Plan</h1>
          <p class="font-display text-[12px] text-[#7D5A50]">Arrange your cafe, set capacities, and prepare tables for reservations.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <select
            v-if="branches.length > 1"
            v-model="branchUuid"
            class="bg-white border border-[#DED4CA] rounded-[10px] px-3 py-[11px] text-[13px] outline-none"
            aria-label="Branch"
          >
            <option v-for="b in branches" :key="b.uuid" :value="b.uuid">{{ b.branch_name }}</option>
          </select>
          <button type="button" :class="iconBtn" :disabled="!undoStack.length || preview" @click="undo">
            <Icon name="heroicons:arrow-uturn-left" class="size-4" />
            Undo
          </button>
          <button
            type="button"
            :class="[iconBtn, 'border border-[#DED4CA]', preview ? 'bg-[#F1E9DE]' : 'bg-[#FFFDF9]']"
            :disabled="!plan"
            :aria-pressed="preview"
            @click="togglePreview"
          >
            <Icon :name="preview ? 'heroicons:pencil-square' : 'heroicons:eye'" class="size-4" />
            {{ preview ? 'Edit' : 'Preview' }}
          </button>
          <button
            type="button"
            :class="[iconBtn, 'bg-[#3A2923] text-white hover:bg-[#2C1E19]']"
            :disabled="!dirty || saving"
            @click="saveLayout"
          >
            <Icon name="heroicons:arrow-down-tray" class="size-4" />
            {{ saving ? 'Saving...' : 'Save layout' }}
          </button>
        </div>
      </header>

      <p
        v-if="errorMessage"
        role="alert"
        class="bg-[#FFE0E0] text-[#B31E1E] border border-[#B31E1E]/20 rounded-xl px-4 py-3 text-[14px]"
      >
        {{ errorMessage }}
      </p>

      <p v-if="loading" class="text-[14px] text-[#9E7060]">Loading...</p>

      <div v-else-if="!planLocked && branchUuid" class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_270px] gap-5 items-start">
        <!-- Canvas card -->
        <section class="bg-white border border-[#F4E6DE] rounded-2xl overflow-hidden min-w-0">
          <div class="flex flex-wrap items-center justify-between gap-2 px-[18px] py-3 border-b border-[#F4E6DE]">
            <div class="flex flex-wrap items-center gap-[6px]" role="tablist" aria-label="Floor plans">
              <button
                v-for="p in plans"
                :key="p.uuid"
                type="button"
                role="tab"
                :aria-selected="p.uuid === plan?.uuid"
                class="relative rounded-[8px] px-5 py-[9px] text-[12px] font-semibold border border-[#3D2B24] transition-colors"
                :class="p.uuid === plan?.uuid ? 'bg-[#3D2B24] text-white' : 'bg-white text-[#3D2B24] hover:bg-[#F1E9DE]'"
                @click="selectPlan(p.uuid)"
              >
                {{ p.floorplan_name }}
                <span v-if="p.is_active" class="ml-2 inline-block size-[6px] rounded-full bg-[#4CAF7D] align-middle" title="Active on the register">
                  <span class="sr-only">(active)</span>
                </span>
              </button>
              <button
                type="button"
                class="size-[35px] rounded-[6px] border border-[#3D2B24] flex items-center justify-center hover:bg-[#F1E9DE] transition-colors"
                aria-label="New floor plan"
                :aria-expanded="panel === 'new'"
                @click="openPanel('new')"
              >
                <Icon name="heroicons:plus" class="size-4" />
              </button>
            </div>
            <div v-if="plan" class="flex items-center gap-[6px]">
              <button
                type="button"
                class="h-[35px] px-3 rounded-[6px] border border-[#3A2923] flex items-center gap-2 text-[12px] transition-colors"
                :class="panMode ? 'bg-[#3A2923] text-white' : 'hover:bg-[#F1E9DE]'"
                :aria-pressed="panMode"
                title="Drag the canvas to scroll it (middle mouse button also works)"
                @click="togglePan"
              >
                <Icon name="heroicons:hand-raised" class="size-4" />
                Pan
              </button>
              <button
                type="button"
                class="h-[35px] px-3 rounded-[6px] border border-[#3A2923] flex items-center gap-2 text-[12px] transition-colors"
                :class="snapOn ? 'bg-[#3A2923] text-white' : 'hover:bg-[#F1E9DE]'"
                :aria-pressed="snapOn"
                :title="`Snap objects to a ${GRID}px grid`"
                @click="snapOn = !snapOn"
              >
                <Icon name="heroicons:squares-2x2" class="size-4" />
                Snap to grid
              </button>
              <button
                type="button"
                class="size-[35px] rounded-[6px] border border-[#3A2923] flex items-center justify-center hover:bg-[#F1E9DE] transition-colors"
                aria-label="Floor plan settings"
                :aria-expanded="panel === 'settings'"
                @click="openPanel('settings')"
              >
                <Icon name="heroicons:cog-6-tooth" class="size-4" />
              </button>
            </div>
          </div>

          <!-- New / settings form -->
          <form
            v-if="panel"
            class="flex flex-wrap items-end gap-3 px-[18px] py-3 bg-[#FFFDF9] border-b border-[#F4E6DE]"
            @submit.prevent="submitPanel"
          >
            <label class="flex flex-col gap-1 text-[10px] text-[#736761]">
              Name
              <input v-model="form.name" required maxlength="60" type="text" :class="[inputCls, 'w-44']" placeholder="e.g. Indoor">
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-[#736761]">
              Width
              <input v-model.number="form.width" required type="number" :min="limits?.canvas_min ?? 100" :max="limits?.canvas_max ?? 10000" :class="[inputCls, 'w-24']">
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-[#736761]">
              Height
              <input v-model.number="form.height" required type="number" :min="limits?.canvas_min ?? 100" :max="limits?.canvas_max ?? 10000" :class="[inputCls, 'w-24']">
            </label>
            <button type="submit" :disabled="formBusy" class="bg-[#3A2923] text-white rounded-[8px] px-4 py-2 text-[12px] disabled:opacity-50">
              {{ panel === 'new' ? 'Create plan' : 'Save details' }}
            </button>
            <template v-if="panel === 'settings' && plan">
              <button
                type="button"
                :disabled="plan.is_active"
                class="border border-[#DED4CA] rounded-[8px] px-4 py-2 text-[12px] text-[#2D2521] hover:bg-[#F1E9DE] disabled:opacity-50 disabled:cursor-default"
                @click="activatePlan"
              >
                {{ plan.is_active ? 'Active on the register' : 'Make active' }}
              </button>
              <button type="button" class="bg-[#F3DFDC] text-[#A85F57] rounded-[8px] px-4 py-2 text-[12px] hover:bg-[#EBCFCB]" @click="deletePlan">
                Delete plan
              </button>
            </template>
            <p v-if="formError" role="alert" class="basis-full text-[12px] text-[#B31E1E]">{{ formError }}</p>
          </form>

          <!-- Canvas -->
          <div
            v-if="plan"
            ref="scrollEl"
            class="overflow-auto p-[18px] max-h-[78vh] bg-white"
            :class="panning ? 'cursor-grabbing' : panMode ? 'cursor-grab touch-none' : ''"
            @pointerdown="startPan"
          >
            <div
              ref="canvasEl"
              class="relative mx-auto rounded-[10px] border border-[#F4E6DE] select-none touch-none"
              :class="preview ? 'bg-white' : 'bg-[#FFFDF9] [background-image:radial-gradient(#EADFD0_1px,transparent_1px)]'"
              :style="{ width: `${canvasW}px`, height: `${canvasH}px`, ...(preview ? {} : { backgroundSize: `${GRID}px ${GRID}px` }) }"
              @dragover.prevent
              @drop="onDrop"
              @pointerdown.self="selected = null"
            >
              <!-- Drawn and image fixtures -->
              <div
                v-for="(el, i) in elements"
                :key="el.uid"
                class="absolute"
                :class="[
                  preview || panMode ? '' : 'cursor-move',
                  isSelected('element', el.uid) ? 'outline outline-2 outline-offset-2 outline-[#A96746] rounded-[6px]' : '',
                ]"
                :style="itemStyle('element', el, i + 1)"
                @pointerdown.prevent="startDrag($event, 'element', el)"
              >
                <img v-if="el.category === 'door'" :src="doorSrc(el.asset_key)" alt="Door" class="size-full pointer-events-none" draggable="false">
                <div
                  v-else-if="el.category === 'counter'"
                  class="size-full rounded-[16px] bg-[#3D2B24] text-[#EDD8CC] font-display font-semibold text-[16px] flex items-center justify-center px-3 overflow-hidden whitespace-nowrap"
                >
                  {{ el.label }}
                </div>
                <!-- Walls run half a thickness past each end, so joined walls fill the corner -->
                <div
                  v-else
                  class="absolute inset-y-0 bg-[#D9D9D9]"
                  :style="{ left: `${-(el.height ?? 10) / 2}px`, right: `${-(el.height ?? 10) / 2}px` }"
                />

                <!-- Drag the knob to rotate -->
                <template v-if="isSelected('element', el.uid) && !preview">
                  <span class="absolute left-1/2 -top-[18px] h-[18px] w-px bg-[#A96746] -translate-x-1/2 pointer-events-none" />
                  <span
                    class="absolute left-1/2 -top-[30px] size-[14px] -translate-x-1/2 rounded-full border-2 border-[#A96746] bg-white cursor-grab touch-none"
                    aria-label="Rotate"
                    @pointerdown.stop.prevent="startRotate($event, 'element', el)"
                  />
                </template>

                <!-- Drag either end to lengthen or shorten -->
                <template v-if="isSelected('element', el.uid) && !preview && isDrawn(el)">
                  <span
                    v-for="side in (['start', 'end'] as const)"
                    :key="side"
                    class="absolute top-1/2 size-[14px] -translate-y-1/2 rounded-full border-2 border-[#A96746] bg-white cursor-ew-resize touch-none"
                    :class="side === 'start' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'"
                    :aria-label="side === 'start' ? 'Extend from the start' : 'Extend from the end'"
                    @pointerdown.stop.prevent="startResize($event, el, side)"
                  />
                </template>
              </div>

              <!-- Tables sit above fixtures -->
              <div
                v-for="t in tables"
                :key="t.uid"
                class="absolute"
                :class="[
                  preview || panMode ? '' : 'cursor-move',
                  isSelected('table', t.uid) ? 'outline outline-2 outline-offset-2 outline-[#A96746] rounded-[12px]' : '',
                ]"
                :style="itemStyle('table', t, 1000)"
                :title="`${t.table_name} (${t.capacity} seats, ${t.status})`"
                @pointerdown.prevent="startDrag($event, 'table', t)"
              >
                <FloorPlanTable
                  :asset-key="t.asset_key"
                  :label="tableLabel(t.table_name)"
                  :status="preview ? t.status : 'available'"
                  :selected="isSelected('table', t.uid)"
                  class="pointer-events-none"
                />

                <template v-if="isSelected('table', t.uid) && !preview">
                  <span class="absolute left-1/2 -top-[18px] h-[18px] w-px bg-[#A96746] -translate-x-1/2 pointer-events-none" />
                  <span
                    class="absolute left-1/2 -top-[30px] size-[14px] -translate-x-1/2 rounded-full border-2 border-[#A96746] bg-white cursor-grab touch-none"
                    aria-label="Rotate"
                    @pointerdown.stop.prevent="startRotate($event, 'table', t)"
                  />
                </template>
              </div>

              <p
                v-if="!tables.length && !elements.length"
                class="absolute inset-0 flex items-center justify-center text-[13px] text-[#9E7060] pointer-events-none"
              >
                Drag an object from the library to start your layout.
              </p>
            </div>
          </div>
          <p v-else class="p-10 text-center text-[14px] text-[#9E7060]">
            Create your first floor plan to start arranging tables.
          </p>
        </section>

        <!-- Side panels -->
        <aside v-if="!preview" class="flex flex-col gap-5">
          <FloorPlanLibrary :disabled="!plan" @add="addItem($event)" />
          <FloorPlanInspector
            :table="selectedTable"
            :element="selectedElement"
            :max-seats="limits?.max_table_capacity ?? 50"
            :statuses="statuses"
            :status-busy="statusBusy"
            :errors="selectedErrors"
            @patch="patchSelected"
            @status="changeStatus"
            @rotate="rotateSelected"
            @duplicate="duplicateSelected"
            @remove="removeSelected"
          />
        </aside>
        <aside v-else class="bg-[#FFFDF9] border border-[#EDD8CC] rounded-[14px] p-[15px] text-[12px] text-[#736761] flex flex-col gap-2">
          <h2 class="font-bold text-[14px] text-[#2D2521]">Preview</h2>
          <p>Tables are coloured by their current status, as on the register.</p>
          <p class="text-[#7D5A50]">Pick Edit to keep arranging.</p>
        </aside>
      </div>
    </main>

    <CommonConfirmModal
      :show="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :is-destructive="confirmDialog.isDestructive"
      @close="confirmDialog.show = false"
      @confirm="runConfirm"
    />
    <CommonAlertModal
      :show="alertDialog.show"
      :title="alertDialog.title"
      :message="alertDialog.message"
      @close="alertDialog.show = false"
    />
  </div>
</template>
