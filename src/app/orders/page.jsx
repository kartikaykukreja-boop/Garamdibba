import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { requireSession } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { formatDate, todayIST } from '../../lib/dates.js'
import { DELIVERY_STATUS, ORDER_STATUS, rupees } from '../../lib/status.js'
import StatusPill from '../../components/StatusPill.jsx'
import AccountNav from '../../components/AccountNav.jsx'

export const metadata = { title: 'My orders | Garam Dibba', robots: { index: false } }

export default async function OrdersPage() {
  const { user, profile } = await requireSession('/orders')
  const admin = createAdminClient()
  const { data: orders } = await admin
    .from('orders')
    .select('id, order_number, plan_name, quantity, total, status, payment_method, start_date, created_at, deliveries(id, delivery_date, status, item_name)')
    .eq('user_id', user.id)
    .neq('status', 'pending_payment')
    .order('created_at', { ascending: false })
    .limit(50)

  const today = todayIST()

  return (
    <main className="app-page">
      <div className="shell">
        <AccountNav profile={profile} active="/orders" />
        <header className="app-head app-head-row">
          <h1 className="app-title">My orders</h1>
          <Link className="button button-small" href="/order">New order</Link>
        </header>

        {!orders?.length && (
          <div className="app-card app-empty">
            <p>No orders yet.</p>
            <Link className="button" href="/order">Order your first dibba</Link>
          </div>
        )}

        <ul className="order-list">
          {orders?.map((order) => {
            const deliveries = [...order.deliveries].sort((a, b) => a.delivery_date.localeCompare(b.delivery_date))
            const live = deliveries.find((d) => d.status === 'out_for_delivery')
            const next = live ?? deliveries.find((d) => d.delivery_date >= today && !['delivered', 'cancelled'].includes(d.status))
            const done = deliveries.filter((d) => d.status === 'delivered').length
            return (
              <li key={order.id}>
                <Link className="app-card order-row" href={`/orders/${order.id}`}>
                  <div>
                    <p className="order-row-top">
                      <strong>#{order.order_number}</strong>
                      <StatusPill status={order.status} map={ORDER_STATUS} />
                      {order.payment_method === 'company' && <span className="status-pill status-neutral">Company</span>}
                    </p>
                    <p className="order-row-title">{order.plan_name}{order.quantity > 1 ? ` × ${order.quantity}` : ''}</p>
                    <p className="app-muted">
                      {done}/{deliveries.length} delivered · {rupees(order.total)}
                      {next && <> · Next: {formatDate(next.delivery_date)} <StatusPill status={next.status} map={DELIVERY_STATUS} /></>}
                    </p>
                  </div>
                  {live ? <span className="live-badge">Track live</span> : <ChevronRight aria-hidden="true" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
