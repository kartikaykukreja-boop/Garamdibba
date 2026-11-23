import Link from 'next/link'
import { requireRole } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { formatDate, formatDateTime, formatTime, isValidYmd, todayIST } from '../../lib/dates.js'
import { DELIVERY_STATUS, ORDER_STATUS, rupees } from '../../lib/status.js'
import { signedPhotoUrls } from '../../lib/orderData.js'
import { ALLERGENS_VERIFIED } from '../../lib/catalog.js'
import { HANDOFFS, MEALS, MEAL_ORDER, PREFERENCES, REPORT_REASONS, SLOT_CAPACITY, allergenTicket, slotLabel } from '../../lib/rules.js'
import StatusPill from '../../components/StatusPill.jsx'
import AccountNav from '../../components/AccountNav.jsx'
import Flash from '../../components/Flash.jsx'
import {
  addClosedDate,
  adjustWallet,
  assignRider,
  bulkAssign,
  bulkPreparing,
  cancelOrder,
  markMissedAdmin,
  removeClosedDate,
  resolveReport,
  saveExtra,
  setCompanyActive,
  setDeliveryStatus,
  setUserRole,
} from './actions.js'

export const metadata = { title: 'Kitchen admin | Garam Dibba', robots: { index: false } }

const TABS = [
  { id: 'deliveries', label: 'Deliveries' },
  { id: 'orders', label: 'Orders' },
  { id: 'reports', label: 'Reports' },
  { id: 'catalog', label: 'Add-ons & dates' },
  { id: 'waitlist', label: 'Waitlist' },
  { id: 'companies', label: 'Companies' },
  { id: 'users', label: 'Users & riders' },
]

const MESSAGES = {
  saved: 'Saved.',
  assigned: 'Unassigned deliveries were given to the rider.',
  preparing: 'All scheduled deliveries are now marked as being prepared.',
  cancelled: 'Order cancelled.',
  wallet: 'Company budget updated.',
  makeup: 'Marked as missed. The customer keeps the credit and a make-up box is booked.',
  report_make_up: 'Report resolved: make-up box booked, credit restored.',
  report_refund: 'Report resolved: one box refunded (Razorpay refund due, or company budget credited).',
  report_rejected: 'Report closed. Share the rider’s photo and location with the customer.',
  closed: 'Closed date added. Customers can’t order for that day.',
  rider: 'Pick a rider first.',
  amount: 'Enter an amount like 5000 (add) or -500 (deduct).',
  balance: 'That would make the budget negative.',
  self: 'You can’t remove your own admin access.',
  extra: 'Enter numbers for price, MRP and stock (leave MRP or stock empty if not needed).',
  mrp: 'Packaged goods can’t be sold above MRP.',
  generic: 'Something went wrong. Please try again.',
}

const HANDOFF_SHORT = Object.fromEntries(HANDOFFS.map((h) => [h.id, h.short]))
const PREF_LABEL = Object.fromEntries(PREFERENCES.map((p) => [p.id, p.label]))

export default async function AdminPage({ searchParams }) {
  const params = await searchParams
  const { profile } = await requireRole(['admin'], '/admin')
  const tab = TABS.some((t) => t.id === params.tab) ? params.tab : 'deliveries'
  const date = isValidYmd(params.date) ? params.date : todayIST()
  const meal = MEALS[params.meal] ? params.meal : 'all'
  const admin = createAdminClient()
  const [{ data: riders }, { count: openReports }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, role').in('role', ['rider', 'admin']).order('full_name'),
    admin.from('delivery_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ])

  return (
    <main className="app-page">
      <div className="shell">
        <AccountNav profile={profile} active="/admin" />
        <Flash params={params} messages={MESSAGES} />
        {params.msg === 'cancelled' && Number(params.refund) > 0 && (
          <p className="app-alert">Refund due: {rupees(params.refund)}. Company orders were refunded to the budget automatically. For online payments, refund it from the Razorpay dashboard.</p>
        )}

        <header className="app-head app-head-row">
          <div>
            <p className="eyebrow">Kitchen admin</p>
            <h1 className="app-title">Hi {profile.full_name?.split(' ')[0] || 'there'}, here’s the kitchen</h1>
          </div>
          <Link className="button button-small button-cream" href="/order?as=customer">Place an order</Link>
        </header>
        <nav className="app-segment app-tabs" aria-label="Admin sections">
          {TABS.map((t) => (
            <Link key={t.id} href={`/admin?tab=${t.id}`} className={tab === t.id ? 'is-active' : undefined} aria-current={tab === t.id ? 'page' : undefined}>
              {t.label}{t.id === 'reports' && openReports > 0 && <b className="tab-badge">{openReports}</b>}
            </Link>
          ))}
        </nav>

        <div className="admin-body">
          {tab === 'deliveries' && <DeliveriesTab admin={admin} date={date} meal={meal} riders={riders ?? []} />}
          {tab === 'orders' && <OrdersTab admin={admin} />}
          {tab === 'reports' && <ReportsTab admin={admin} />}
          {tab === 'catalog' && <CatalogTab admin={admin} />}
          {tab === 'waitlist' && <WaitlistTab admin={admin} />}
          {tab === 'companies' && <CompaniesTab admin={admin} />}
          {tab === 'users' && <UsersTab admin={admin} query={params.q ?? ''} riders={riders ?? []} myId={profile.id} />}
        </div>
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

async function DeliveriesTab({ admin, date, meal, riders }) {
  const backTo = `/admin?tab=deliveries&date=${date}&meal=${meal}`
  let query = admin
    .from('deliveries')
    .select('id, status, item_name, quantity, rider_id, meal, slot, kind, extras, proof_path, proof_distance_m, handoff_result, delivered_at, order:orders(id, order_number, customer_name, customer_phone, address_line, address_landmark, distance_km, delivery_note, delivery_contact, handoff, allergies, allergy_other, preferences, payment_method)')
    .eq('delivery_date', date)
    .order('slot')
  if (meal !== 'all') query = query.eq('meal', meal)
  const { data } = await query
  const deliveries = data ?? []
  const cooking = deliveries.filter((d) => ['scheduled', 'preparing', 'out_for_delivery', 'delivered'].includes(d.status))
  const photos = await signedPhotoUrls(admin, deliveries.map((d) => d.proof_path))

  // Kitchen counts per meal and slot.
  const bySlot = new Map()
  for (const d of cooking) {
    const key = `${d.meal}|${d.slot ?? ''}`
    if (!bySlot.has(key)) bySlot.set(key, { meal: d.meal, slot: d.slot, drops: 0, items: new Map(), allergies: 0 })
    const row = bySlot.get(key)
    row.drops += 1
    row.items.set(d.item_name, (row.items.get(d.item_name) ?? 0) + d.quantity)
    if (d.order.allergies?.length) row.allergies += 1
  }
  const slotRows = [...bySlot.values()].sort((a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal) || (a.slot ?? '').localeCompare(b.slot ?? ''))

  const extrasToPack = new Map()
  for (const d of cooking) for (const x of d.extras ?? []) extrasToPack.set(x.name, (extrasToPack.get(x.name) ?? 0) + x.qty)
  const count = (s) => deliveries.filter((d) => d.status === s).length

  const { data: liveRiders } = await admin
    .from('rider_locations')
    .select('rider_id, lat, lng, updated_at, rider:profiles(full_name, email)')
    .gte('updated_at', new Date(Date.parse(`${todayIST()}T00:00:00+05:30`)).toISOString())

  return (
    <>
      <form className="app-inline-form admin-date" method="get">
        <input type="hidden" name="tab" value="deliveries" />
        <label className="app-field">
          <span>Delivery date</span>
          <input type="date" name="date" defaultValue={date} />
        </label>
        <label className="app-field">
          <span>Meal</span>
          <select name="meal" defaultValue={meal}>
            <option value="all">Lunch and dinner</option>
            {MEAL_ORDER.map((m) => <option key={m} value={m}>{MEALS[m].label}</option>)}
          </select>
        </label>
        <button className="button button-small button-cream" type="submit">Show</button>
      </form>

      <div className="stat-row">
        <div className="stat-tile"><span>Boxes to cook</span><strong>{cooking.reduce((n, d) => n + d.quantity, 0)}</strong></div>
        <div className="stat-tile"><span>Scheduled / preparing</span><strong>{count('scheduled')} / {count('preparing')}</strong></div>
        <div className="stat-tile"><span>On the road</span><strong>{count('out_for_delivery')}</strong></div>
        <div className="stat-tile"><span>Delivered</span><strong>{count('delivered')}</strong></div>
      </div>

      <div className="detail-grid">
        <section className="app-card">
          <h2 className="app-subtitle">Kitchen counts per slot · {formatDate(date)}</h2>
          {slotRows.length ? (
            <div className="slot-counts">
              {slotRows.map((row) => (
                <div key={`${row.meal}${row.slot}`} className="slot-count">
                  <p>
                    <strong>{MEALS[row.meal]?.label} · {slotLabel(row.meal, row.slot) || 'No slot'}</strong>
                    <span className={row.drops >= SLOT_CAPACITY ? 'app-danger' : 'app-muted'}>{row.drops}/{SLOT_CAPACITY} drops</span>
                  </p>
                  <ul className="prep-list">
                    {[...row.items].sort((a, b) => b[1] - a[1]).map(([item, qty]) => (
                      <li key={item}><span>{item.replace('Everyday Dabba: ', 'Dabba: ')}</span><strong>{qty}</strong></li>
                    ))}
                  </ul>
                  {row.allergies > 0 && <p className="ticket-allergy">{row.allergies} with allergies: check tickets below</p>}
                </div>
              ))}
            </div>
          ) : <p className="app-muted">Nothing to cook for this date.</p>}
          {extrasToPack.size > 0 && (
            <>
              <h3 className="of-subtitle">Add-ons to pack</h3>
              <ul className="prep-list">
                {[...extrasToPack].map(([name, qty]) => <li key={name}><span>{name}</span><strong>{qty}</strong></li>)}
              </ul>
              <p className="app-hint">Drinks and chocolates go chilled in the bag, not in the hot dibba.</p>
            </>
          )}
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
          <h3 className="of-subtitle">Riders today</h3>
          {liveRiders?.length ? (
            <ul className="prep-list">
              {liveRiders.map((r) => (
                <li key={r.rider_id}>
                  <span>{r.rider?.full_name || r.rider?.email} · last seen {formatTime(r.updated_at)}</span>
                  <a href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer">Map</a>
                </li>
              ))}
            </ul>
          ) : <p className="app-muted">No rider has shared their location today.</p>}
        </section>
      </div>

      <section className="app-card">
        <h2 className="app-subtitle">Deliveries ({deliveries.length})</h2>
        <div className="table-wrap">
          <table className="app-table">
            <thead>
              <tr><th>Order</th><th>Slot</th><th>Customer</th><th>Address & handoff</th><th>Item & ticket</th><th>Status</th><th>Rider</th></tr>
            </thead>
            <tbody>
              {deliveries.map((d) => {
                const o = d.order
                return (
                  <tr key={d.id} className={['cancelled', 'skipped', 'paused', 'missed'].includes(d.status) ? 'is-muted' : undefined}>
                    <td><Link href={`/orders/${o.id}`}>#{o.order_number}</Link>{o.payment_method === 'company' && <small className="app-muted"> · company</small>}{d.kind !== 'regular' && <><br /><em className="kind-tag">{d.kind === 'makeup' ? 'Make-up' : 'Carried'}</em></>}</td>
                    <td>{MEALS[d.meal]?.label}<br /><small>{slotLabel(d.meal, d.slot)}</small></td>
                    <td>{o.customer_name}<br /><a href={`tel:+91${o.customer_phone}`}>{o.customer_phone}</a>{o.delivery_contact && <><br /><small className="app-muted">Contact {o.delivery_contact}</small></>}</td>
                    <td className="cell-wide">
                      {o.address_line}{o.address_landmark && <> · near {o.address_landmark}</>}
                      <br /><small className="app-muted">{o.distance_km} km{o.handoff && ` · ${HANDOFF_SHORT[o.handoff]}`}{o.delivery_note && ` · ${o.delivery_note}`}</small>
                    </td>
                    <td>
                      {d.item_name.replace('Everyday Dabba: ', 'Dabba: ')}{d.quantity > 1 && <strong> × {d.quantity}</strong>}
                      {o.allergies?.length > 0 && <div className="ticket-allergy">{allergenTicket(o.allergies).join(' · ')}</div>}
                      {o.allergy_other && <div className="ticket-allergy">{o.allergy_other}</div>}
                      {o.preferences?.length > 0 && <div><small>{o.preferences.map((p) => PREF_LABEL[p] ?? p).join(', ')}</small></div>}
                      {d.extras?.length > 0 && <div><small className="app-muted">+ {d.extras.map((x) => `${x.name}${x.qty > 1 ? ` × ${x.qty}` : ''}`).join(', ')}</small></div>}
                    </td>
                    <td>
                      <form action={setDeliveryStatus} className="app-row-form">
                        <input type="hidden" name="delivery_id" value={d.id} />
                        <input type="hidden" name="back" value={backTo} />
                        <select name="status" defaultValue={d.status} aria-label={`Status for order ${o.order_number}`}>
                          {Object.entries(DELIVERY_STATUS).map(([value, { label }]) => <option key={value} value={value} disabled={['skipped', 'missed'].includes(value)}>{label}</option>)}
                        </select>
                        <button className="app-linkbutton" type="submit">Save</button>
                      </form>
                      {d.delivered_at && (
                        <small className="app-muted">
                          {formatTime(d.delivered_at)}{d.handoff_result && ` · ${d.handoff_result}`}{d.proof_distance_m != null && ` · ${d.proof_distance_m} m from pin`}
                          {photos[d.proof_path] && <> · <a href={photos[d.proof_path]} target="_blank" rel="noreferrer">photo</a></>}
                        </small>
                      )}
                      {['scheduled', 'preparing', 'out_for_delivery'].includes(d.status) && (
                        <form action={markMissedAdmin}>
                          <input type="hidden" name="delivery_id" value={d.id} />
                          <input type="hidden" name="back" value={backTo} />
                          <button className="app-linkbutton app-danger" type="submit">Missed → make-up</button>
                        </form>
                      )}
                    </td>
                    <td>
                      <form action={assignRider} className="app-row-form">
                        <input type="hidden" name="delivery_id" value={d.id} />
                        <input type="hidden" name="back" value={backTo} />
                        <RiderSelect riders={riders} value={d.rider_id} label={`Rider for order ${o.order_number}`} />
                        <button className="app-linkbutton" type="submit">Save</button>
                      </form>
                    </td>
                  </tr>
                )
              })}
              {!deliveries.length && <tr><td colSpan={7} className="app-muted">No deliveries on this date.</td></tr>}
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
    .select('id, order_number, customer_name, customer_phone, plan_name, quantity, total, delivery_fee, extras_total, meal, slot, payment_method, status, created_at, refund_due, razorpay_payment_id, company:companies(name)')
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
                <td>{o.plan_name}{o.quantity > 1 && ` × ${o.quantity}`}<br /><small className="app-muted">{MEALS[o.meal]?.label}, {slotLabel(o.meal, o.slot)}</small></td>
                <td className="num">{rupees(o.total)}{(o.delivery_fee > 0 || o.extras_total > 0) && <><br /><small className="app-muted">{o.delivery_fee > 0 && `fee ${rupees(o.delivery_fee)}`}{o.delivery_fee > 0 && o.extras_total > 0 && ' · '}{o.extras_total > 0 && `add-ons ${rupees(o.extras_total)}`}</small></>}</td>
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
      <p className="app-hint">Cancelling refunds unused credits minus the plan discount (used meals are re-priced at the single-meal price), plus unused delivery fees and add-ons.</p>
    </section>
  )
}

async function ReportsTab({ admin }) {
  const { data: reports } = await admin
    .from('delivery_reports')
    .select('id, reason, note, photo_path, status, resolution_note, created_at, resolved_at, user_id, rider_id, delivery:deliveries(id, delivery_date, meal, slot, item_name, delivered_at, handoff_result, proof_path, proof_distance_m), order:orders(id, order_number, customer_name, customer_phone, address_line, boxes), rider:profiles!delivery_reports_rider_id_fkey(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(60)
  const list = reports ?? []
  const photos = await signedPhotoUrls(admin, list.flatMap((r) => [r.photo_path, r.delivery?.proof_path]))
  const reasonLabel = Object.fromEntries(REPORT_REASONS.map((r) => [r.id, r.label]))

  // Repeated reports from one address or against one rider, for review.
  const byAddress = new Map()
  const byRider = new Map()
  for (const r of list) {
    byAddress.set(r.order?.address_line, (byAddress.get(r.order?.address_line) ?? 0) + 1)
    if (r.rider_id) byRider.set(r.rider?.full_name || r.rider?.email, (byRider.get(r.rider?.full_name || r.rider?.email) ?? 0) + 1)
  }
  const repeats = [...byAddress, ...byRider].filter(([, n]) => n > 1)

  return (
    <>
      {repeats.length > 0 && (
        <p className="app-alert">Repeated reports: {repeats.map(([who, n]) => `${who} (${n})`).join(' · ')}</p>
      )}
      <ul className="report-list">
        {list.map((r) => (
          <li key={r.id} className={`app-card report-card ${r.status === 'open' ? 'is-open' : ''}`}>
            <div className="rider-card-head">
              <strong>{reasonLabel[r.reason]} · #{r.order?.order_number} · {r.order?.customer_name}</strong>
              <span className={`status-pill ${r.status === 'open' ? 'status-live' : 'status-muted'}`}>{r.status === 'open' ? 'Open' : r.status.replace('_', '-')}</span>
            </div>
            <p className="app-muted">
              Reported {formatDateTime(r.created_at)} · box {formatDate(r.delivery?.delivery_date)}, {slotLabel(r.delivery?.meal, r.delivery?.slot)} · {r.delivery?.item_name}
              <br />{r.order?.address_line} · <a href={`tel:+91${r.order?.customer_phone}`}>{r.order?.customer_phone}</a>
            </p>
            {r.note && <p>“{r.note}”</p>}
            <p className="app-muted">
              Rider: {r.rider?.full_name || r.rider?.email || 'not assigned'}
              {r.delivery?.delivered_at && <> · marked delivered {formatTime(r.delivery.delivered_at)}{r.delivery.handoff_result && ` (${r.delivery.handoff_result})`}</>}
              {r.delivery?.proof_distance_m != null && <> · {r.delivery.proof_distance_m} m from pin</>}
              {photos[r.delivery?.proof_path] && <> · <a href={photos[r.delivery.proof_path]} target="_blank" rel="noreferrer">rider’s photo</a></>}
              {photos[r.photo_path] && <> · <a href={photos[r.photo_path]} target="_blank" rel="noreferrer">customer’s photo</a></>}
            </p>
            {r.status === 'open' ? (
              <form action={resolveReport} className="app-inline-form">
                <input type="hidden" name="report_id" value={r.id} />
                <input type="hidden" name="back" value="/admin?tab=reports" />
                <select name="outcome" defaultValue={r.order?.boxes > 1 ? 'make_up' : 'refund'} aria-label="Outcome">
                  <option value="make_up">Our mistake: make-up box (credit restored)</option>
                  <option value="refund">Our mistake: refund this box</option>
                  <option value="rejected">Left as the customer chose: close</option>
                </select>
                <input name="note" placeholder="Note (optional)" aria-label="Resolution note" />
                <button className="button button-small" type="submit">Resolve</button>
              </form>
            ) : (
              <p className="app-muted">Resolved {r.resolved_at && formatDateTime(r.resolved_at)}{r.resolution_note && ` · ${r.resolution_note}`}</p>
            )}
          </li>
        ))}
      </ul>
      {!list.length && <div className="app-card app-empty"><p>No reports. 🎉</p></div>}
    </>
  )
}

async function CatalogTab({ admin }) {
  const [{ data: extras }, { data: closed }] = await Promise.all([
    admin.from('extras').select('*').order('sort'),
    admin.from('closed_dates').select('*').gte('date', todayIST()).order('date'),
  ])
  return (
    <div className="detail-grid">
      <section className="app-card">
        <h2 className="app-subtitle">Add-ons</h2>
        <p className="app-muted">Starter prices are placeholders: set the real ones before launch. Packaged goods must be at or below MRP. Leave stock empty for kitchen-made items; at 0 an item disappears from the site.</p>
        <div className="table-wrap">
          <table className="app-table">
            <thead><tr><th>Item</th><th>Price</th><th>MRP</th><th>Stock</th><th>On site</th><th /></tr></thead>
            <tbody>
              {extras?.map((x) => (
                <tr key={x.id}>
                  <td>{x.name}<br /><small className="app-muted">{x.kind}{x.note && ` · ${x.note}`}</small></td>
                  <td colSpan={5}>
                    <form action={saveExtra} className="app-row-form extra-form">
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="back" value="/admin?tab=catalog" />
                      <input name="price" defaultValue={x.price} inputMode="decimal" className="input-short" aria-label={`Price of ${x.name}`} />
                      <input name="mrp" defaultValue={x.mrp ?? ''} inputMode="decimal" className="input-short" aria-label={`MRP of ${x.name}`} />
                      <input name="stock" defaultValue={x.stock ?? ''} inputMode="numeric" className="input-short" aria-label={`Stock of ${x.name}`} />
                      <label className="pref-check"><input type="checkbox" name="active" defaultChecked={x.active} /> Show</label>
                      <button className="app-linkbutton" type="submit">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!extras?.length && <tr><td colSpan={6} className="app-muted">Run supabase/migrations/002_ordering_spec.sql to add the starter catalogue.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="app-card">
        <h2 className="app-subtitle">Closed dates</h2>
        <p className="app-muted">Holidays and days off. Customers can’t order for these dates; plans skip them automatically.{' '}Sundays are always closed.</p>
        <form action={addClosedDate} className="app-inline-form">
          <input type="hidden" name="back" value="/admin?tab=catalog" />
          <input type="date" name="date" required aria-label="Closed date" min={todayIST()} />
          <input name="reason" placeholder="Reason, e.g. Diwali" aria-label="Reason" />
          <button className="button button-small" type="submit">Close this day</button>
        </form>
        <ul className="prep-list">
          {closed?.map((c) => (
            <li key={c.date}>
              <span>{formatDate(c.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}{c.reason && ` · ${c.reason}`}</span>
              <form action={removeClosedDate}>
                <input type="hidden" name="date" value={c.date} />
                <input type="hidden" name="back" value="/admin?tab=catalog" />
                <button className="app-linkbutton app-danger" type="submit">Reopen</button>
              </form>
            </li>
          ))}
        </ul>
        {!closed?.length && <p className="app-muted">No upcoming closed dates.</p>}
        <p className="app-hint">Dish allergen tags are {ALLERGENS_VERIFIED ? 'verified' : 'provisional until the kitchen verifies them (src/lib/catalog.js)'}.</p>
      </section>
    </div>
  )
}

async function WaitlistTab({ admin }) {
  const { data: rows } = await admin.from('waitlist').select('*').order('created_at', { ascending: false }).limit(200)
  return (
    <section className="app-card">
      <h2 className="app-subtitle">Waitlist ({rows?.length ?? 0})</h2>
      <p className="app-muted">People outside the delivery zone. Use this to decide where to expand or open a pickup point.</p>
      <div className="table-wrap">
        <table className="app-table">
          <thead><tr><th>When</th><th>Name</th><th>Phone</th><th>Distance</th><th>Area</th></tr></thead>
          <tbody>
            {rows?.map((w) => (
              <tr key={w.id}>
                <td>{formatDateTime(w.created_at)}</td>
                <td>{w.name}</td>
                <td><a href={`tel:+91${w.phone}`}>{w.phone}</a></td>
                <td>{w.road_km != null ? `${w.road_km} km` : '—'}</td>
                <td className="cell-wide">{w.address || '—'} · <a href={`https://www.google.com/maps?q=${w.lat},${w.lng}`} target="_blank" rel="noreferrer">map</a></td>
              </tr>
            ))}
            {!rows?.length && <tr><td colSpan={5} className="app-muted">Nobody on the waitlist yet.</td></tr>}
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
      <p className="app-muted">To add a rider: ask them to sign in once on this website, then search their email here and set the role to Rider. Admin emails in ADMIN_EMAILS become admins automatically when they sign in.</p>
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
