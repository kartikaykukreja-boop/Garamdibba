import { notFound } from 'next/navigation'
import { requireSession } from '../../../../lib/auth.js'
import { createAdminClient } from '../../../../lib/supabase/server.js'
import { formatDate, formatDateTime } from '../../../../lib/dates.js'
import { rupees } from '../../../../lib/status.js'
import { BUSINESS, MEALS, PRICES_INCLUDE_GST, slotLabel } from '../../../../lib/rules.js'
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY } from '../../../../siteData.js'
import PrintButton from './PrintButton.jsx'

export const metadata = { title: 'Receipt | Garam Dibba', robots: { index: false } }

// Printable receipt. Becomes a tax invoice once a GSTIN is set (NEXT_PUBLIC_GSTIN).
export default async function ReceiptPage({ params }) {
  const { id } = await params
  const { user, profile } = await requireSession(`/orders/${id}/receipt`)
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const { data: o } = await createAdminClient().from('orders').select('*').eq('id', id).maybeSingle()
  if (!o || (o.user_id !== user.id && profile.role !== 'admin') || o.status === 'pending_payment') notFound()

  const extras = Array.isArray(o.extras) ? o.extras : []
  const mealsTotal = o.meals_total ?? o.total - (o.delivery_fee ?? 0) - (o.extras_total ?? 0)

  return (
    <main className="app-page receipt-page">
      <div className="shell app-narrow">
        <article className="app-card receipt">
          <header>
            <h1 className="app-title">{BUSINESS.gstin ? 'Tax invoice' : 'Receipt'}</h1>
            <p className="app-muted">
              {BUSINESS.legalName} · {BUSINESS.kitchenAddress}
              <br />
              {CONTACT_PHONE_DISPLAY} · {CONTACT_EMAIL}
              {BUSINESS.gstin && <><br />GSTIN {BUSINESS.gstin}</>}
              {BUSINESS.fssai && <><br />FSSAI licence {BUSINESS.fssai}</>}
            </p>
          </header>
          <dl className="receipt-meta">
            <div><dt>Order</dt><dd>#{o.order_number}</dd></div>
            <div><dt>Paid</dt><dd>{o.paid_at ? formatDateTime(o.paid_at) : '—'}</dd></div>
            <div><dt>Billed to</dt><dd>{o.customer_name} · {o.customer_phone}</dd></div>
            <div><dt>Payment</dt><dd>{o.payment_method === 'company' ? 'Company budget' : `Online${o.razorpay_payment_id ? ` · ${o.razorpay_payment_id}` : ''}`}</dd></div>
            <div><dt>Delivery</dt><dd>{MEALS[o.meal]?.label ?? 'Lunch'}, {slotLabel(o.meal, o.slot)} · from {formatDate(o.start_date)}</dd></div>
          </dl>
          <table className="app-table receipt-lines">
            <tbody>
              <tr><td>{o.plan_name}{o.quantity > 1 ? ` × ${o.quantity}` : ''} ({o.boxes} {o.boxes === 1 ? 'meal' : 'meals'})</td><td className="num">{rupees(mealsTotal)}</td></tr>
              {extras.map((x) => <tr key={x.id}><td>{x.name}{x.qty > 1 ? ` × ${x.qty}` : ''}</td><td className="num">{rupees(x.total)}</td></tr>)}
              <tr><td>Delivery</td><td className="num">{o.delivery_fee ? rupees(o.delivery_fee) : 'Free'}</td></tr>
              <tr className="receipt-total"><td>Total{PRICES_INCLUDE_GST && ' (inclusive of GST)'}</td><td className="num">{rupees(o.total)}</td></tr>
              {o.refund_due && <tr><td>Refund due</td><td className="num">−{rupees(o.refund_due)}</td></tr>}
            </tbody>
          </table>
          <PrintButton />
        </article>
      </div>
    </main>
  )
}
