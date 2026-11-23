import { notFound } from 'next/navigation'
import { MapPin, Phone } from 'lucide-react'
import { requireSession } from '../../../lib/auth.js'
import { createAdminClient } from '../../../lib/supabase/server.js'
import { KITCHEN } from '../../../lib/config.js'
import { formatDate, formatDateTime, todayIST } from '../../../lib/dates.js'
import { DELIVERY_STATUS, ORDER_STATUS, rupees } from '../../../lib/status.js'
import StatusPill from '../../../components/StatusPill.jsx'
import AccountNav from '../../../components/AccountNav.jsx'
import LiveTracker from './LiveTracker.jsx'

export const metadata = { title: 'Track order | Garam Dibba', robots: { index: false } }

export default async function OrderDetailPage({ params, searchParams }) {
  const { id } = await params
  const { placed } = await searchParams
  const { user, profile } = await requireSession(`/orders/${id}`)
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const admin = createAdminClient()
  const { data: order } = await admin
    .from('orders')
    .select('*, deliveries(*)')
    .eq('id', id)
    .maybeSingle()
  if (!order || (order.user_id !== user.id && profile.role !== 'admin')) notFound()

  const deliveries = [...order.deliveries].sort((a, b) => a.delivery_date.localeCompare(b.delivery_date))
  const today = todayIST()
  const active =
    deliveries.find((d) => d.status === 'out_for_delivery') ??
    deliveries.find((d) => d.delivery_date === today && ['scheduled', 'preparing'].includes(d.status)) ??
    null

  let rider = null
  if (active?.rider_id && active.status === 'out_for_delivery') {
    const [{ data: riderProfile }, { data: location }] = await Promise.all([
      admin.from('profiles').select('full_name, phone').eq('id', active.rider_id).maybeSingle(),
      admin.from('rider_locations').select('lat, lng, updated_at').eq('rider_id', active.rider_id).maybeSingle(),
    ])
    rider = { id: active.rider_id, name: riderProfile?.full_name || 'Your rider', phone: riderProfile?.phone, location }
  }

  return (
    <main className="app-page">
      <div className="shell">
        <AccountNav profile={profile} active="/orders" />

        {placed && order.status === 'confirmed' && (
          <p className="app-alert app-alert-ok">Order placed! We’ll start cooking on {formatDate(deliveries[0]?.delivery_date ?? order.start_date)}.</p>
        )}
        {placed && order.status === 'pending_payment' && (
          <p className="app-alert">We’re confirming your payment. This page will update in a moment; refresh if it doesn’t.</p>
        )}

        <header className="app-head">
          <p className="order-row-top">
            <strong>Order #{order.order_number}</strong>
            <StatusPill status={order.status} map={ORDER_STATUS} />
          </p>
          <h1 className="app-title">{order.plan_name}{order.quantity > 1 ? ` × ${order.quantity}` : ''}</h1>
          <p className="app-muted">
            {rupees(order.total)} · {order.payment_method === 'company' ? 'Charged to company budget' : 'Paid online'}
            {order.paid_at && ` · ${formatDateTime(order.paid_at)}`}
          </p>
          {order.refund_due && (
            <p className="app-alert">A refund of {rupees(order.refund_due)} is being processed to your original payment method.</p>
          )}
        </header>

        {active && (
          <LiveTracker
            key={`${active.id}-${active.status}`}
            orderId={order.id}
            delivery={{ id: active.id, status: active.status, item: active.item_name, date: active.delivery_date }}
            destination={{ lat: order.lat, lng: order.lng }}
            kitchen={KITCHEN}
            rider={rider}
          />
        )}

        <div className="detail-grid">
          <section className="app-card">
            <h2 className="app-subtitle">Deliveries</h2>
            <ol className="delivery-list">
              {deliveries.map((d) => (
                <li key={d.id} className={d.delivery_date === today ? 'is-today' : undefined}>
                  <span className="delivery-date">{formatDate(d.delivery_date)}{d.delivery_date === today && <b> · Today</b>}</span>
                  <span className="delivery-item">{d.item_name}{d.quantity > 1 ? ` × ${d.quantity}` : ''}</span>
                  <StatusPill status={d.status} map={DELIVERY_STATUS} />
                  {d.delivered_at && <small className="app-muted">Delivered {formatDateTime(d.delivered_at)}</small>}
                </li>
              ))}
            </ol>
            {!deliveries.length && <p className="app-muted">Deliveries appear here once payment is confirmed.</p>}
          </section>

          <section className="app-card">
            <h2 className="app-subtitle">Delivering to</h2>
            <p className="detail-line"><MapPin size={18} aria-hidden="true" /> <span>{order.address_line}{order.address_landmark && <><br />Near {order.address_landmark}</>}</span></p>
            <p className="detail-line"><Phone size={18} aria-hidden="true" /> <span>{order.customer_name} · {order.customer_phone}</span></p>
            {order.notes && <p className="app-muted">Note: {order.notes}</p>}
          </section>
        </div>
      </div>
    </main>
  )
}
