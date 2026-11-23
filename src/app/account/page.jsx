import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { requireSession } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { rupees } from '../../lib/status.js'
import AccountNav from '../../components/AccountNav.jsx'
import Flash from '../../components/Flash.jsx'
import BoxTracker from '../../components/BoxTracker.jsx'
import { KITCHEN } from '../../lib/config.js'
import { ALLERGENS, HANDOFFS, MAX_DELIVERY_KM, PREFERENCES } from '../../lib/rules.js'
import { ALLERGENS_VERIFIED } from '../../lib/catalog.js'
import PinEditor from './PinEditor.jsx'
import { createCompany, joinCompany, leaveCompany, updatePreferences, updateProfile } from './actions.js'

export const metadata = { title: 'My account | Garam Dibba', robots: { index: false } }

const MESSAGES = {
  saved: 'Your details are saved.',
  prefs: 'Your delivery details and preferences are saved.',
  reception: 'Your building doesn’t accept food at reception, so choose “Call me first” and add a delivery contact.',
  joined: 'You’ve joined your company. You can now charge orders to the company budget.',
  left: 'You’ve left the company account.',
  phone: 'Please enter a valid 10-digit mobile number.',
  already: 'You’re already part of a company. Leave it first to join or create another.',
  code: 'That company code doesn’t match an active company. Check it with your HR.',
  company_name: 'Please enter your company’s name.',
  last_hr: 'You’re the only HR admin. Make a colleague HR from the Company page before leaving.',
  rate: 'Too many attempts. Please wait a few minutes and try again.',
  generic: 'Something went wrong. Please try again.',
}

export default async function AccountPage({ searchParams }) {
  const params = await searchParams
  const { user, profile } = await requireSession('/account')
  const company = profile.company

  // Active plans for the box tracker at the top of My Account.
  const { data: plans } = await createAdminClient()
    .from('orders')
    .select('id, plan_name, boxes, deliveries(id, status, kind, delivery_date, meal, slot)')
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .gt('boxes', 1)
    .order('created_at', { ascending: false })
    .limit(5)

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

        {plans?.length > 0 && (
          <div className="tracker-stack">
            {plans.map((plan) => <BoxTracker key={plan.id} order={plan} deliveries={plan.deliveries} href={`/orders/${plan.id}`} />)}
          </div>
        )}

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

        <div className="detail-grid">
          <section className="app-card">
            <h2 className="app-subtitle">Delivery details</h2>
            <form action={updatePreferences} className="app-form" id="prefs">
              <label className="app-field"><span>Full address</span><textarea name="address_line" rows={2} defaultValue={profile.address_line ?? ''} placeholder="Flat / house no., building, street, area" /></label>
              <label className="app-field"><span>Landmark</span><input name="address_landmark" defaultValue={profile.address_landmark ?? ''} /></label>
              <label className="app-field"><span>Note for our rider</span><input name="delivery_note" defaultValue={profile.delivery_note ?? ''} placeholder="3rd floor, Tower B, ring twice" /></label>
              <label className="app-field"><span>Delivery contact (optional)</span><input name="delivery_contact" type="tel" defaultValue={profile.delivery_contact ?? ''} placeholder="A colleague who can collect" /></label>
              <label className="pref-check"><input type="checkbox" name="is_office" defaultChecked={Boolean(profile.is_office)} /> This is an office or tech-park address</label>
              <label className="app-field">
                <span>If it’s an office: does your building accept food at reception?</span>
                <select name="reception_ok" defaultValue={profile.reception_ok === false ? 'no' : 'yes'}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <fieldset className="pref-group">
                <legend>If we can’t reach you, where should we leave your dibba?</legend>
                {HANDOFFS.map((h) => (
                  <label key={h.id} className="pref-check"><input type="radio" name="handoff" value={h.id} defaultChecked={(profile.handoff ?? 'call_then_guard') === h.id} /> {h.label}</label>
                ))}
              </fieldset>
              <fieldset className="pref-group">
                <legend>Food allergies</legend>
                {ALLERGENS.map((a) => (
                  <label key={a.id} className="pref-check"><input type="checkbox" name="allergies" value={a.id} defaultChecked={profile.allergies?.includes(a.id)} /> {a.label}</label>
                ))}
                <label className="app-field"><span>Other</span><input name="allergy_other" defaultValue={profile.allergy_other ?? ''} /></label>
                <p className="app-hint">Our kitchen handles dairy, gluten and nuts. We take care to keep your meal safe, but we can’t guarantee zero traces. If your allergy is severe, please call us before ordering.{!ALLERGENS_VERIFIED && ' Dish allergen details are still being verified.'}</p>
              </fieldset>
              <fieldset className="pref-group">
                <legend>Preferences</legend>
                {PREFERENCES.map((p) => (
                  <label key={p.id} className="pref-check"><input type="checkbox" name="preferences" value={p.id} defaultChecked={profile.preferences?.includes(p.id)} /> {p.label}</label>
                ))}
              </fieldset>
              <button className="button button-small" type="submit">Save delivery details</button>
            </form>
          </section>

          <section className="app-card">
            <h2 className="app-subtitle">Delivery pin</h2>
            <p className="app-muted">Riders navigate to this exact point. Drag it to your gate or building.</p>
            <PinEditor
              kitchen={KITCHEN}
              radiusKm={MAX_DELIVERY_KM}
              initial={profile.lat != null ? { lat: profile.lat, lng: profile.lng } : null}
              roadKm={profile.road_km != null ? Number(profile.road_km) : null}
            />
          </section>
        </div>
        </div>
      </div>
    </main>
  )
}
