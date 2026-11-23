import { requireSession } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { DELIVERY_RADIUS_KM, KITCHEN } from '../../lib/config.js'
import { earliestStartDate, latestStartDate } from '../../lib/dates.js'
import { MENUS } from '../../lib/catalog.js'
import { bowls } from '../../siteData.js'
import OrderBuilder from './OrderBuilder.jsx'

export const metadata = { title: 'Order online | Garam Dibba', robots: { index: false } }

// Site buttons link here as /order?plan=<plan id> or /order?bowl=<bowl slug>
// so the chosen plan or bowl is already selected.
function initialChoice({ plan, bowl }) {
  const menu = Object.values(MENUS).find((m) => m.plans.some((p) => p.id === plan))
  const bowlSlug = bowls.some((b) => b.slug === bowl) ? bowl : ''
  if (menu) return { menu: menu.id, planId: plan, bowlSlug: menu.id === 'protein_bowl' ? bowlSlug : '' }
  return { menu: 'protein_bowl', planId: MENUS.protein_bowl.plans[0].id, bowlSlug }
}

export default async function OrderPage({ searchParams }) {
  const params = await searchParams
  const query = new URLSearchParams(
    Object.entries({ plan: params.plan, bowl: params.bowl }).filter(([, v]) => typeof v === 'string'),
  ).toString()
  const { user, profile } = await requireSession(query ? `/order?${query}` : '/order')
  const admin = createAdminClient()

  const { data: lastOrder } = await admin
    .from('orders')
    .select('address_line, address_landmark, lat, lng')
    .eq('user_id', user.id)
    .neq('status', 'pending_payment')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let company = null
  if (profile.company?.active) {
    const c = profile.company
    let personalLeft = null
    if (c.employee_monthly_limit != null) {
      const { data: spent } = await admin.rpc('company_month_spend', { p_company_id: c.id, p_user_id: user.id })
      personalLeft = Math.max(0, Number(c.employee_monthly_limit) - Number(spent ?? 0))
    }
    company = { name: c.name, personalLeft }
  }

  return (
    <main className="app-page">
      <div className="shell">
        <header className="app-head">
          <p className="eyebrow">Order online</p>
          <h1 className="app-title">Build your dibba</h1>
          <p className="app-muted">Delivered Monday to Saturday, within {DELIVERY_RADIUS_KM} km of our Dehradun kitchen.</p>
        </header>
        <OrderBuilder
          kitchen={KITCHEN}
          radiusKm={DELIVERY_RADIUS_KM}
          earliest={earliestStartDate()}
          latest={latestStartDate()}
          company={company}
          initial={initialChoice(params)}
          defaults={{
            name: profile.full_name ?? '',
            phone: profile.phone ?? '',
            addressLine: lastOrder?.address_line ?? '',
            landmark: lastOrder?.address_landmark ?? '',
            point: lastOrder ? { lat: lastOrder.lat, lng: lastOrder.lng } : null,
          }}
        />
      </div>
    </main>
  )
}
