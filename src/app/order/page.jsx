import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { getSession } from '../../lib/auth.js'
import { createAdminClient, supabaseConfigured } from '../../lib/supabase/server.js'
import { DELIVERY_RADIUS_KM, KITCHEN } from '../../lib/config.js'
import { MENUS } from '../../lib/catalog.js'
import { loadClosedDates, loadExtras } from '../../lib/orderData.js'
import { addDays, todayIST } from '../../lib/dates.js'
import { MAX_DELIVERY_KM } from '../../lib/rules.js'
import { bowls } from '../../siteData.js'
import OrderFlow from './OrderFlow.jsx'

export const metadata = { title: 'Order online | Garam Dibba', robots: { index: false } }

const UUID = /^[0-9a-f-]{36}$/i

// Site buttons link here as /order?plan=<plan id> or /order?bowl=<bowl slug>.
// "Order again" links use /order?again=<order id> (same meal tomorrow, or renew a plan).
function initialFromParams({ plan, bowl, menu }) {
  const fromPlan = Object.values(MENUS).find((m) => m.plans.some((p) => p.id === plan))
  const bowlSlug = bowls.some((b) => b.slug === bowl) ? bowl : ''
  const menuId = fromPlan?.id ?? (MENUS[menu] ? menu : bowlSlug ? 'protein_bowl' : null)
  return {
    menu: menuId,
    planId: fromPlan ? plan : null,
    bowlSlug: menuId === 'protein_bowl' ? bowlSlug : '',
    fromLink: Boolean(fromPlan || bowlSlug || MENUS[menu]),
  }
}

export default async function OrderPage({ searchParams }) {
  await connection()
  if (!supabaseConfigured()) redirect('/setup-needed')
  const params = await searchParams
  const session = await getSession()
  const admin = createAdminClient()
  const [closed, extras] = await Promise.all([loadClosedDates(admin), loadExtras(admin)])

  const initial = initialFromParams(params)

  // Staff land on their own screen: admins handle orders in Kitchen admin, riders see their drops.
  // They can still order for themselves with /order?as=customer (the "Order" tab in their menu).
  const staffHome = { admin: '/admin', rider: '/rider' }[session?.profile.role]
  if (staffHome && params.as !== 'customer' && !initial.fromLink && !params.again) redirect(staffHome)

  // One-tap reorder: same menu, bowl, meal and slot. Single meals repeat tomorrow; plans renew
  // from the day after the last box.
  if (session && UUID.test(params.again ?? '')) {
    const { data: prev } = await admin
      .from('orders')
      .select('id, user_id, menu, plan_id, bowl_choice, quantity, meal, slot, weekdays, deliveries(delivery_date)')
      .eq('id', params.again)
      .maybeSingle()
    if (prev && prev.user_id === session.user.id) {
      const last = prev.deliveries.map((d) => d.delivery_date).sort().at(-1)
      const crossSell = MENUS[params.menu] && params.menu !== prev.menu
      const menu = crossSell ? params.menu : prev.menu
      Object.assign(initial, {
        menu,
        planId: crossSell ? MENUS[menu].plans[0].id : prev.plan_id,
        bowlSlug: crossSell ? '' : prev.bowl_choice ?? '',
        quantity: prev.quantity,
        meal: prev.meal ?? 'lunch',
        slot: prev.slot,
        weekdays: prev.weekdays,
        startDate: prev.plan_id.endsWith('1-day') || crossSell ? addDays(todayIST(), 1) : addDays(last ?? todayIST(), 1),
        again: true,
        fromLink: true,
      })
    }
  }

  const p = session?.profile
  const saved = p
    ? {
        email: session.user.email,
        name: p.full_name ?? '',
        phone: p.phone ?? '',
        addressLine: p.address_line ?? '',
        landmark: p.address_landmark ?? '',
        point: p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null,
        roadKm: p.road_km != null ? Number(p.road_km) : null,
        deliveryNote: p.delivery_note ?? '',
        deliveryContact: p.delivery_contact ?? '',
        allergies: p.allergies ?? [],
        allergyOther: p.allergy_other ?? '',
        preferences: p.preferences ?? [],
        handoff: p.handoff ?? null,
        isOffice: p.is_office ?? false,
        receptionOk: p.reception_ok ?? true,
        defaultMeal: p.default_meal ?? null,
        defaultSlot: p.default_slot ?? null,
        company: p.company?.active ? { name: p.company.name } : null,
      }
    : null

  return (
    <main className="app-page order-page">
      <div className="shell">
        <OrderFlow
          kitchen={KITCHEN}
          radiusKm={Math.min(DELIVERY_RADIUS_KM, MAX_DELIVERY_KM)}
          closed={closed}
          extrasCatalog={extras}
          saved={saved}
          initial={initial}
        />
      </div>
    </main>
  )
}
