import { requireHr } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { formatDateTime, todayIST } from '../../lib/dates.js'
import { rupees } from '../../lib/status.js'
import AccountNav from '../../components/AccountNav.jsx'
import Flash from '../../components/Flash.jsx'
import TopUp from './TopUp.jsx'
import { regenerateCode, removeMember, setMemberRole, updateLimits } from './actions.js'

export const metadata = { title: 'Company dashboard | Garam Dibba', robots: { index: false } }

const MESSAGES = {
  created: 'Company created! Add money to the budget, then share the join code with your team.',
  limits: 'Spending limits saved.',
  code: 'New join code created. The old code no longer works.',
  role: 'Role updated.',
  removed: 'Employee removed from the company.',
  amount: 'Please enter limits as plain numbers, e.g. 100000. Leave blank for no limit.',
  last_hr: 'You’re the only HR admin. Make someone else HR first.',
  self: 'You can’t remove yourself here. Use “Leave company” on your account page.',
  generic: 'Something went wrong. Please try again.',
}

const KIND_LABEL = { topup: 'Top-up', order: 'Order', refund: 'Refund', adjustment: 'Adjustment' }

export default async function CompanyPage({ searchParams }) {
  const params = await searchParams
  const { user, profile } = await requireHr('/company')
  const admin = createAdminClient()
  const monthStart = `${todayIST().slice(0, 7)}-01T00:00:00+05:30`

  const [{ data: company }, { data: members }, { data: monthTx }, { data: recentTx }] = await Promise.all([
    admin.from('companies').select('*').eq('id', profile.company_id).single(),
    admin.from('profiles').select('id, email, full_name, phone, company_role').eq('company_id', profile.company_id).order('full_name'),
    admin.from('company_transactions').select('user_id, amount, kind').eq('company_id', profile.company_id).in('kind', ['order', 'refund']).gte('created_at', monthStart),
    admin.from('company_transactions').select('*, person:profiles(full_name, email)').eq('company_id', profile.company_id).order('created_at', { ascending: false }).limit(40),
  ])

  const spendBy = new Map()
  let monthSpend = 0
  for (const tx of monthTx ?? []) {
    monthSpend -= Number(tx.amount)
    spendBy.set(tx.user_id, (spendBy.get(tx.user_id) ?? 0) - Number(tx.amount))
  }

  return (
    <main className="app-page">
      <div className="shell">
        <AccountNav profile={profile} active="/company" />
        <Flash params={params} messages={MESSAGES} />

        <header className="app-head">
          <p className="eyebrow">Company dashboard</p>
          <h1 className="app-title">{company.name}</h1>
          {!company.active && <p className="app-alert app-alert-error">This company account is paused by Garam Dibba. Contact us to reactivate.</p>}
        </header>

        <div className="stat-row">
          <div className="stat-tile"><span>Budget left</span><strong>{rupees(company.wallet_balance)}</strong></div>
          <div className="stat-tile"><span>Spent this month</span><strong>{rupees(monthSpend)}</strong>
            {company.monthly_limit != null && <small>of {rupees(company.monthly_limit)} limit</small>}
          </div>
          <div className="stat-tile"><span>Employees</span><strong>{members?.length ?? 0}</strong></div>
          <div className="stat-tile"><span>Join code</span><strong className="join-code">{company.join_code}</strong>
            <form action={regenerateCode}><button className="app-linkbutton" type="submit">Make a new code</button></form>
          </div>
        </div>

        <div className="detail-grid">
          <section className="app-card">
            <h2 className="app-subtitle">Add money to the budget</h2>
            <TopUp />
          </section>

          <section className="app-card">
            <h2 className="app-subtitle">Spending limits</h2>
            <form action={updateLimits} className="app-form">
              <label className="app-field">
                <span>Company limit per month (₹)</span>
                <input name="monthly_limit" inputMode="numeric" defaultValue={company.monthly_limit ?? ''} placeholder="No limit" />
              </label>
              <label className="app-field">
                <span>Limit per employee per month (₹)</span>
                <input name="employee_monthly_limit" inputMode="numeric" defaultValue={company.employee_monthly_limit ?? ''} placeholder="No limit" />
              </label>
              <p className="app-hint">Orders are blocked once a limit or the budget runs out. Employees can still pay themselves.</p>
              <button className="button button-small" type="submit">Save limits</button>
            </form>
          </section>
        </div>

        <section className="app-card">
          <h2 className="app-subtitle">Team</h2>
          <p className="app-muted">Employees join by entering code <strong>{company.join_code}</strong> on their Garam Dibba account page.</p>
          <div className="table-wrap">
            <table className="app-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Spent this month</th><th>Role</th><th /></tr>
              </thead>
              <tbody>
                {members?.map((m) => (
                  <tr key={m.id}>
                    <td>{m.full_name || '—'}{m.id === user.id && ' (you)'}</td>
                    <td>{m.email}</td>
                    <td>
                      {rupees(spendBy.get(m.id) ?? 0)}
                      {company.employee_monthly_limit != null && <small className="app-muted"> / {rupees(company.employee_monthly_limit)}</small>}
                    </td>
                    <td>
                      <form action={setMemberRole} className="app-row-form">
                        <input type="hidden" name="user_id" value={m.id} />
                        <select name="role" defaultValue={m.company_role} aria-label={`Role for ${m.full_name || m.email}`}>
                          <option value="employee">Employee</option>
                          <option value="hr">HR admin</option>
                        </select>
                        <button className="app-linkbutton" type="submit">Save</button>
                      </form>
                    </td>
                    <td>
                      {m.id !== user.id && (
                        <form action={removeMember}>
                          <input type="hidden" name="user_id" value={m.id} />
                          <button className="app-linkbutton app-danger" type="submit">Remove</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="app-card">
          <h2 className="app-subtitle">Budget history</h2>
          <div className="table-wrap">
            <table className="app-table">
              <thead>
                <tr><th>When</th><th>What</th><th>Who</th><th className="num">Amount</th><th className="num">Balance</th></tr>
              </thead>
              <tbody>
                {recentTx?.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDateTime(tx.created_at)}</td>
                    <td>{KIND_LABEL[tx.kind]}{tx.note && <small className="app-muted"> · {tx.note}</small>}</td>
                    <td>{tx.person?.full_name || tx.person?.email || '—'}</td>
                    <td className={Number(tx.amount) < 0 ? 'num app-danger' : 'num app-positive'}>
                      {Number(tx.amount) < 0 ? '−' : '+'}{rupees(Math.abs(tx.amount))}
                    </td>
                    <td className="num">{rupees(tx.balance_after)}</td>
                  </tr>
                ))}
                {!recentTx?.length && (
                  <tr><td colSpan={5} className="app-muted">No activity yet. Add money to get started.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
