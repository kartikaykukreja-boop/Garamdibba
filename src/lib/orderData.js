// Database helpers shared by the order, account, rider and admin screens. Server-only.
import { addDays, planDates, todayIST } from './dates.js'
import { dishFor } from './catalog.js'

// Kitchen closed dates (holidays) from today onwards, as 'YYYY-MM-DD' strings.
export async function loadClosedDates(admin) {
  const { data } = await admin.from('closed_dates').select('date').gte('date', todayIST()).lte('date', addDays(todayIST(), 120))
  return (data ?? []).map((row) => row.date)
}

// Add-ons customers can buy right now (active and in stock).
export async function loadExtras(admin) {
  const { data } = await admin
    .from('extras')
    .select('id, name, kind, price, mrp, stock, active, menus, note, image_url, sort')
    .eq('active', true)
    .order('sort')
  return (data ?? [])
    .filter((x) => x.stock == null || x.stock > 0)
    .map((x) => ({ ...x, price: Number(x.price), mrp: x.mrp == null ? null : Number(x.mrp) }))
}

// Boxes already booked per slot for a date and meal, plus today's same-day orders.
const BOOKED = ['scheduled', 'preparing', 'out_for_delivery', 'delivered']
export async function slotLoad(admin, date, meal) {
  const { data } = await admin
    .from('deliveries')
    .select('slot, quantity')
    .eq('delivery_date', date)
    .eq('meal', meal)
    .in('status', BOOKED)
  const bySlot = {}
  let total = 0
  for (const row of data ?? []) {
    bySlot[row.slot] = (bySlot[row.slot] ?? 0) + 1
    total += row.quantity
  }
  return { bySlot, total }
}

// Same-day boxes ordered today for today's meal (counts toward SAME_DAY_CAP).
export async function sameDayBoxes(admin, meal) {
  const today = todayIST()
  const { data } = await admin
    .from('orders')
    .select('quantity')
    .eq('start_date', today)
    .eq('meal', meal)
    .in('plan_id', ['1-day', 'bowl-1-day'])
    .in('status', ['confirmed', 'completed'])
  return (data ?? []).reduce((n, row) => n + row.quantity, 0)
}

// Where a carried-over or make-up box goes: the first open, chosen weekday after both
// `notBefore` and the order's last pending box. Returns { date, item }.
export async function nextCreditSlot(admin, order, notBefore, closed) {
  const { data } = await admin
    .from('deliveries')
    .select('delivery_date')
    .eq('order_id', order.id)
    .in('status', ['scheduled', 'preparing', 'out_for_delivery', 'paused'])
    .order('delivery_date', { ascending: false })
    .limit(1)
  const last = data?.[0]?.delivery_date
  const from = addDays(last && last > notBefore ? last : notBefore, 1)
  const weekdays = order.weekdays?.length ? order.weekdays : [1, 2, 3, 4, 5, 6]
  const { dates } = planDates(from, 1, { weekdays, closed })
  const date = dates[0]
  return { date, item: dishFor(order.menu, date, order.bowl_choice).label }
}

// ── Proof photos (private "proofs" bucket) ──────────────────────────────
// JPEG, PNG or WebP only (no SVG/HTML, which could carry scripts).
function imageType(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}
export async function uploadPhoto(admin, path, file) {
  if (!file || typeof file.arrayBuffer !== 'function' || !file.size) return null
  if (file.size > 4 * 1024 * 1024) return null
  const bytes = Buffer.from(await file.arrayBuffer())
  // Trust the file's actual bytes, not its name or the browser's MIME type.
  const type = imageType(bytes)
  if (!type) return null
  const { error } = await admin.storage.from('proofs').upload(path, bytes, { contentType: type, upsert: true })
  if (error) {
    console.error('photo upload failed', error)
    return null
  }
  return path
}

export async function signedPhotoUrls(admin, paths) {
  const list = [...new Set(paths.filter(Boolean))]
  if (!list.length) return {}
  const { data } = await admin.storage.from('proofs').createSignedUrls(list, 60 * 60)
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]))
}
