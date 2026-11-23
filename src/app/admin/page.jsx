import Link from 'next/link'
import { requireRole } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { formatDate, formatDateTime, isValidYmd, todayIST } from '../../lib/dates.js'
import { DELIVERY_STATUS, ORDER_STATUS, rupees } from '../../lib/status.js'
import StatusPill from '../../components/StatusPill.jsx'
import AccountNav from '../../components/AccountNav.jsx'
import Flash from '../../components/Flash.jsx'
import {
  adjustWallet,
  assignRider,
  bulkAssign,
  bulkPreparing,
  cancelOrder,
  setCompanyActive,
  setDeliveryStatus,
  setUserRole,
} from './actions.js'

export const metadata = { title: 'Kitchen admin | Garam Dibba', robots: { index: false } }

const TABS = [
  { id: 'deliveries', label: 'Deliveries' },
  { id: 'orders', label: 'Orders' },
  { id: 'companies', label: 'Companies' },
  { id: 'users', label: 'Users & riders' },
]

const MESSAGES = {
  saved: 'Saved.',
  assigned: 'Unassigned deliveries were given to the rider.',
  preparing: 'All scheduled deliveries are now marked as being prepared.',
  cancelled: 'Order cancelled.',
  wallet: 'Company budget updated.',
  rider: 'Pick a rider first.',
  amount: 'Enter an amount like 5000 (add) or -500 (deduct).',
  balance: 'That would make the budget negative.',
  self: 'You can’t remove your own admin access.',
  generic: 'Something went wrong. Please try again.',
}

export default async function AdminPage({ searchParams }) {
  const params = await searchParams
  const { profile } = await requireRole(['admin'], '/admin')
  const tab = TABS.some((t) => t.id === params.tab) ? params.tab : 'deliveries'
  const date = isValidYmd(params.date) ? params.date : todayIST()
  const admin = createAdminClient()
  const { data: riders } = await admin.from('profiles').select('id, full_name, email, role').in('role', ['rider', 'admin']).order('full_name')

  return (
    <main className="app-page">
      <div className="shell">
        <AccountNav profile={profile} active="/admin" />
        <Flash params={params} messages={MESSAGES} />
        {params.msg === 'cancelled' && Number(params.refund) > 0 && (
          <p className="app-alert">Refund due: {rupees(params.refund)}. Company orders were refunded to the budget automatically. For online payments, refund it from the Razorpay dashboard.</p>
        )}

        <header className="app-head">
          <p className="eyebrow">Kitchen admin</p>
          <nav className="app-segment app-tabs" aria-label="Admin sections">
            {TABS.map((t) => (
              <Link key={t.id} href={`/admin?tab=${t.id}`} className={tab === t.id ? 'is-active' : undefined} aria-current={tab === t.id ? 'page' : undefined}>
                {t.label}
              </Link>
            ))}
          </nav>
        </header>

        {tab === 'deliveries' && <DeliveriesTab admin={admin} date={date} riders={riders ?? []} />}
        {tab === 'orders' && <OrdersTab admin={admin} />}
        {tab === 'companies' && <CompaniesTab admin={admin} />}
        {tab === 'users' && <UsersTab admin={admin} query={params.q ?? ''} riders={riders ?? []} myId={profile.id} />}
      </div>
    </main>
  )
}

const riderLabel = (r) => r.full_name || r.email

function RiderSelect({ riders, value, name = 'rider_id', label }) {
  return (
    <select name={name} defaultValue={value ?? ''} aria-label={label}>
      <option value="">Unassigned</option>
      {riders.map((r) => <option key={r.id} value={r.id}>{riderLabel(r)}</option>)}
    </select>
  )
}

async function DeliveriesTab({ admin, date, riders }) {
  const backTo = `/admin?tab=deliveries&date=${date}`
  const { data } = await admin
    .from('deliveries')
    .select('id, status, item_name, quantity, rider_id, order:orders(id, order_number, customer_name, customer_phone, address_line, address_landmark, distance_km, notes, payment_method)')
    .eq('delivery_date', date)
    .order('created_at')
  const deliveries = data ?? []
  const active = deliveries.filter((d) => d.status !== 'cancelled')

  const prep = new Map()
  for (const d of active) prep.set(d.item_name, (prep.get(d.item_name) ?? 0) + d.quantity)
  const count = (s) => active.filter((d) => d.status === s).length

  return (
    <>
      <form className="app-inline-form admin-date" method="get">
        <input type="hidden" name="tab" value="deliveries" />
        <label className="app-field">
          <span>Delivery date</span>
          <input type="date" name="date" defaultValue={date} />
        </label>
        <button className="button button-small button-cream" type="submit">Show</button>
      </form>

      <div className="stat-row">
        <div className="stat-tile"><span>Boxes to cook</span><strong>{active.reduce((n, d) => n + d.quantity, 0)}</strong></div>
        <div className="stat-tile"><span>Scheduled / preparing</span><strong>{count('scheduled')} / {count('preparing')}</strong></div>
        <div className="stat-tile"><span>On the road</span><strong>{count('out_for_delivery')}</strong></div>
        <div className="stat-tile"><span>Delivered</span><strong>{count('delivered')}</strong></div>
      </div>

      <div className="detail-grid">
        <section className="app-card">
          <h2 className="app-subtitle">Kitchen prep list · {formatDate(date)}</h2>
          {prep.size ? (
            <ul className="prep-list">
              {[...prep].sort((a, b) => b[1] - a[1]).map(([item, qty]) => (
                <li key={item}><span>{item}</span><strong>{qty}</strong></li>
              ))}
            </ul>
          ) : <p className="app-muted">Nothing to cook for this date.</p>}
        </section>
        <section className="app-card">
          <h2 className="app-subtitle">Quick actions</h2>
          <form action={bulkPreparing} className="app-form">
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="back" value={backTo} />
            <button className="button button-small" type="submit">Mark all scheduled as “being prepared”</button>
          </form>
          <form action={bulkAssign} className="app-inline-form">
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="back" value={backTo} />
            <RiderSelect riders={riders} label="Rider for all unassigned deliveries" />
            <button className="button button-small" type="submit">Assign all unassigned</button>
          </form>
          {!riders.length && <p className="app-hint">No riders yet. Make someone a rider in “Users & riders”.</p>}
        </section>
      </div>

      <section className="app-card">
        <h2 className="app-subtitle">Deliveries ({deliveries.length})</h2>
        <div className="table-wrap">
          <table className="app-table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Address</th><th>Item</th><th>Status</th><th>Rider</th></tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id} className={d.status === 'cancelled' ? 'is-muted' : undefined}>
                  <td><Link href={`/orders/${d.order.id}`}>#{d.order.order_number}</Link>{d.order.payment_method === 'company' && <small className="app-muted"> · company</small>}</td>
                  <td>{d.order.customer_name}<br /><a href={`tel:+91${d.order.customer_phone}`}>{d.order.customer_phone}</a></td>
                  <td className="cell-wide">{d.order.address_line}{d.order.address_landmark && <> · near {d.order.address_landmark}</>}<br /><small className="app-muted">{d.order.distance_km} km{d.order.notes && ` · Note: ${d.order.notes}`}</small></td>
                  <td>{d.item_name}{d.quantity > 1 && <strong> × {d.quantity}</strong>}</td>
                  <td>
                    <form action={setDeliveryStatus} className="app-row-form">
                      <input type="hidden" name="delivery_id" value={d.id} />
                      <input type="hidden" name="back" value={backTo} />
                      <select name="status" defaultValue={d.status} aria-label={`Status for order ${d.order.order_number}`}>
                        {Object.entries(DELIVERY_STATUS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <button className="app-linkbutton" type="submit">Save</button>
                    </form>
                  </td>
                  <td>
                    <form action={assignRider} className="app-row-form">
                      <input type="hidden" name="delivery_id" value={d.id} />
                      <input type="hidden" name="back" value={backTo} />
                      <RiderSelect riders={riders} value={d.rider_id} label={`Rider for order ${d.order.order_number}`} />
                      <button className="app-linkbutton" type="submit">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!deliveries.length && <tr><td colSpan={6} className="app-muted">No deliveries on this date.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

async function OrdersTab({ admin }) {
  const { data: orders } = await admin
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, plan_name, quantity, total, payment_method, status, created_at, refund_due, razorpay_payment_id, company:companies(name)')
    .neq('status', 'pending_payment')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <section className="app-card">
      <h2 className="app-subtitle">Latest orders</h2>
      <div className="table-wrap">
        <table className="app-table">
          <thead>
            <tr><th>Order</th><th>Placed</th><th>Customer</th><th>Plan</th><th className="num">Total</th><th>Paid via</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {orders?.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/orders/${o.id}`}>#{o.order_number}</Link></td>
                <td>{formatDateTime(o.created_at)}</td>
                <td>{o.customer_name}<br /><small className="app-muted">{o.customer_phone}</small></td>
                <td>{o.plan_name}{o.quantity > 1 && ` × ${o.quantity}`}</td>
                <td className="num">{rupees(o.total)}</td>
                <td>{o.payment_method === 'company' ? o.company?.name ?? 'Company' : <>Online<br /><small className="app-muted">{o.razorpay_payment_id}</small></>}</td>
                <td>
                  <StatusPill status={o.status} map={ORDER_STATUS} />
                  {o.refund_due && <><br /><small className="app-danger">Refund {rupees(o.refund_due)} on Razorpay</small></>}
                </td>
                <td>
                  {o.status === 'confirmed' && (
                    <form action={cancelOrder}>
                      <input type="hidden" name="order_id" value={o.id} />
                      <input type="hidden" name="back" value="/admin?tab=orders" />
                      <button className="app-linkbutton app-danger" type="submit">Cancel remaining</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

async function CompaniesTab({ admin }) {
  const { data: companies } = await admin
    .from('companies')
    .select('id, name, join_code, wallet_balance, monthly_limit, employee_monthly_limit, active, created_at, members:profiles(count)')
    .order('created_at', { ascending: false })

  return (
    <section className="app-card">
      <h2 className="app-subtitle">Company accounts</h2>
      <p className="app-muted">To credit a bank transfer, enter a positive amount. To deduct, enter a negative amount.</p>
      <div className="table-wrap">
        <table className="app-table">
          <thead>
            <tr><th>Company</th><th>Code</th><th>Employees</th><th className="num">Budget</th><th>Adjust budget</th><th>Status</th></tr>
          </thead>
          <tbody>
            {companies?.map((c) => (
              <tr key={c.id} className={c.active ? undefined : 'is-muted'}>
                <td>{c.name}<br /><small className="app-muted">Since {formatDate(c.created_at.slice(0, 10))}</small></td>
                <td><code>{c.join_code}</code></td>
                <td>{c.members?.[0]?.count ?? 0}</td>
                <td className="num">{rupees(c.wallet_balance)}</td>
                <td>
                  <form action={adjustWallet} className="app-row-form">
                    <input type="hidden" name="company_id" value={c.id} />
                    <input type="hidden" name="back" value="/admin?tab=companies" />
                    <input name="amount" inputMode="numeric" placeholder="±₹" aria-label={`Amount for ${c.name}`} required className="input-short" />
                    <input name="note" placeholder="Note (e.g. NEFT ref)" aria-label="Note" />
                    <button className="app-linkbutton" type="submit">Apply</button>
                  </form>
                </td>
                <td>
                  <form action={setCompanyActive}>
                    <input type="hidden" name="company_id" value={c.id} />
                    <input type="hidden" name="active" value={String(!c.active)} />
                    <input type="hidden" name="back" value="/admin?tab=companies" />
                    <button className={c.active ? 'app-linkbutton app-danger' : 'app-linkbutton'} type="submit">{c.active ? 'Pause' : 'Reactivate'}</button>
                  </form>
                </td>
              </tr>
            ))}
            {!companies?.length && <tr><td colSpan={6} className="app-muted">No companies yet. HR creates one from their account page.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

async function UsersTab({ admin, query, riders, myId }) {
  const q = query.trim().replace(/[%,()]/g, '')
  const { data: found } = q
    ? await admin.from('profiles').select('id, email, full_name, phone, role').or(`email.ilike.%${q}%,full_name.ilike.%${q}%,phone.ilike.%${q}%`).limit(25)
    : { data: [] }
  const rows = q ? found ?? [] : riders

  return (
    <section className="app-card">
      <h2 className="app-subtitle">Users & riders</h2>
      <p className="app-muted">To add a rider: ask them to sign in once on this website, then search their email here and set the role to Rider.</p>
      <form method="get" className="app-inline-form">
        <input type="hidden" name="tab" value="users" />
        <input name="q" defaultValue={query} placeholder="Search email, name or phone" aria-label="Search users" />
        <button className="button button-small button-cream" type="submit">Search</button>
      </form>
      <div className="table-wrap">
        <table className="app-table">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name || '—'}</td>
                <td>{u.email}</td>
                <td>{u.phone || '—'}</td>
                <td>
                  <form action={setUserRole} className="app-row-form">
                    <input type="hidden" name="user_id" value={u.id} />
                    <input type="hidden" name="back" value={`/admin?tab=users&q=${encodeURIComponent(query)}`} />
                    <select name="role" defaultValue={u.role} aria-label={`Role for ${u.email}`} disabled={u.id === myId}>
                      <option value="customer">Customer</option>
                      <option value="rider">Rider</option>
                      <option value="admin">Admin</option>
                    </select>
                    {u.id !== myId && <button className="app-linkbutton" type="submit">Save</button>}
                  </form>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="app-muted">{q ? 'No users found.' : 'No riders or admins yet.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
