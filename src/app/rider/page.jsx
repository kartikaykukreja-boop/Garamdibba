import { requireRole } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { formatDate, todayIST } from '../../lib/dates.js'
import AccountNav from '../../components/AccountNav.jsx'
import RiderConsole from './RiderConsole.jsx'

export const metadata = { title: 'Rider | Garam Dibba', robots: { index: false } }

const ORDER = { out_for_delivery: 0, preparing: 1, scheduled: 2, delivered: 3, cancelled: 4 }

export default async function RiderPage() {
  const { user, profile } = await requireRole(['rider', 'admin'], '/rider')
  const today = todayIST()

  const { data } = await createAdminClient()
    .from('deliveries')
    .select('id, status, item_name, quantity, delivered_at, order:orders(order_number, customer_name, customer_phone, address_line, address_landmark, lat, lng, notes)')
    .eq('rider_id', user.id)
    .eq('delivery_date', today)
    .neq('status', 'cancelled')

  const deliveries = (data ?? []).sort((a, b) => ORDER[a.status] - ORDER[b.status])

  return (
    <main className="app-page">
      <div className="shell">
        <AccountNav profile={profile} active="/rider" />
        <header className="app-head">
          <p className="eyebrow">Rider</p>
          <h1 className="app-title">Today’s drops · {formatDate(today)}</h1>
          <p className="app-muted">
            {deliveries.filter((d) => d.status === 'delivered').length} of {deliveries.length} delivered
          </p>
        </header>
        <RiderConsole riderId={user.id} deliveries={deliveries} />
      </div>
    </main>
  )
}
