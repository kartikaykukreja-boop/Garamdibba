import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { requireSession } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { rupees } from '../../lib/status.js'
import AccountNav from '../../components/AccountNav.jsx'
import Flash from '../../components/Flash.jsx'
import { createCompany, joinCompany, leaveCompany, updateProfile } from './actions.js'

export const metadata = { title: 'My account | Garam Dibba', robots: { index: false } }

const MESSAGES = {
  saved: 'Your details are saved.',
  joined: 'You’ve joined your company. You can now charge orders to the company budget.',
  left: 'You’ve left the company account.',
  phone: 'Please enter a valid 10-digit mobile number.',
  already: 'You’re already part of a company. Leave it first to join or create another.',
  code: 'That company code doesn’t match an active company. Check it with your HR.',
  company_name: 'Please enter your company’s name.',
  last_hr: 'You’re the only HR admin. Make a colleague HR from the Company page before leaving.',
  generic: 'Something went wrong. Please try again.',
}

export default async function AccountPage({ searchParams }) {
  const params = await searchParams
  const { user, profile } = await requireSession('/account')
  const company = profile.company

  let spent = null
  if (company) {
    const { data } = await createAdminClient().rpc('company_month_spend', { p_company_id: company.id, p_user_id: user.id })
    spent = Number(data ?? 0)
  }

  return (
    <main className="app-page">
      <div className="shell">
        <AccountNav profile={profile} active="/account" />
        {params.denied && <p className="app-alert app-alert-error">You don’t have access to that page.</p>}
        <Flash params={params} messages={MESSAGES} />

        <header className="app-head">
          <h1 className="app-title">My account</h1>
          <p className="app-muted">{user.email}</p>
        </header>

        <div className="detail-grid">
          <section className="app-card">
            <h2 className="app-subtitle">Your details</h2>
            <form action={updateProfile} className="app-form">
              <label className="app-field">
                <span>Name</span>
                <input name="full_name" defaultValue={profile.full_name ?? ''} autoComplete="name" />
              </label>
              <label className="app-field">
                <span>Mobile number</span>
                <input name="phone" type="tel" defaultValue={profile.phone ?? ''} autoComplete="tel-national" />
              </label>
              <button className="button button-small" type="submit">Save</button>
            </form>
          </section>

          <section className="app-card">
            <h2 className="app-subtitle"><Building2 size={20} aria-hidden="true" /> Company account</h2>
            {company ? (
              <>
                <p>
                  You’re part of <strong>{company.name}</strong> as {profile.company_role === 'hr' ? 'HR admin' : 'an employee'}.
                </p>
                <p className="app-muted">
                  Your company-paid orders this month: {rupees(spent)}
                  {company.employee_monthly_limit != null && <> of your {rupees(company.employee_monthly_limit)} monthly limit</>}.
                </p>
                <div className="app-actions">
                  {profile.company_role === 'hr' && <Link className="button button-small" href="/company">Open company dashboard</Link>}
                  <form action={leaveCompany}>
                    <button className="button button-small button-outline" type="submit">Leave company</button>
                  </form>
                </div>
              </>
            ) : (
              <>
                <p className="app-muted">If your employer pays for your meals, enter the company code from your HR.</p>
                <form action={joinCompany} className="app-inline-form">
                  <input name="code" required placeholder="Company code, e.g. K7MPQ2" aria-label="Company code" autoCapitalize="characters" />
                  <button className="button button-small" type="submit">Join</button>
                </form>

                <details className="app-details">
                  <summary>I’m from HR and want to set up meals for my team</summary>
                  <p className="app-muted">
                    Create a company account, add money to its budget, and share the code with employees. Their orders are paid from the budget and you can see every rupee spent.
                  </p>
                  <form action={createCompany} className="app-inline-form">
                    <input name="company_name" required placeholder="Company name" aria-label="Company name" />
                    <button className="button button-small" type="submit">Create company</button>
                  </form>
                </details>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
