'use server'

import { redirect } from 'next/navigation'
import { actionSession } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { makeJoinCode } from '../../lib/codes.js'
import { clean, normalisePhone } from '../../lib/validate.js'
import { isValidPoint } from '../../lib/geo.js'
import { roadDistance } from '../../lib/distance.js'
import { ALLERGENS, HANDOFFS, MAX_DELIVERY_KM, PREFERENCES } from '../../lib/rules.js'
import { rateLimit } from '../../lib/rateLimit.js'

async function signedIn() {
  const session = await actionSession()
  if (!session) redirect('/login?next=/account')
  if (await rateLimit('profile', session.user.id)) redirect('/account?err=rate')
  return session
}

export async function updateProfile(formData) {
  const { user } = await signedIn()
  const name = clean(formData.get('full_name'), 80)
  const phoneRaw = clean(formData.get('phone'), 20)
  const phone = phoneRaw ? normalisePhone(phoneRaw) : null
  if (phoneRaw && !phone) redirect('/account?err=phone')
  await createAdminClient().from('profiles').update({ full_name: name || null, phone }).eq('id', user.id)
  redirect('/account?msg=saved')
}

export async function joinCompany(formData) {
  const { user, profile } = await signedIn()
  if (profile.company_id) redirect('/account?err=already')
  if (await rateLimit('joinCompany', user.id)) redirect('/account?err=rate')
  const code = clean(formData.get('code'), 12).toUpperCase().replace(/\s/g, '')
  const admin = createAdminClient()
  const { data: company } = await admin.from('companies').select('id, active').eq('join_code', code).maybeSingle()
  if (!company || !company.active) redirect('/account?err=code')
  await admin.from('profiles').update({ company_id: company.id, company_role: 'employee' }).eq('id', user.id)
  redirect('/account?msg=joined')
}

export async function createCompany(formData) {
  const { user, profile } = await signedIn()
  if (profile.company_id) redirect('/account?err=already')
  const name = clean(formData.get('company_name'), 120)
  if (name.length < 2) redirect('/account?err=company_name')

  const admin = createAdminClient()
  let company = null
  for (let attempt = 0; attempt < 5 && !company; attempt += 1) {
    const { data } = await admin
      .from('companies')
      .insert({ name, join_code: makeJoinCode(), created_by: user.id })
      .select('id')
      .maybeSingle()
    company = data
  }
  if (!company) redirect('/account?err=generic')
  await admin.from('profiles').update({ company_id: company.id, company_role: 'hr' }).eq('id', user.id)
  redirect('/company?msg=created')
}

export async function leaveCompany() {
  const { user, profile } = await signedIn()
  if (!profile.company_id) redirect('/account')
  const admin = createAdminClient()
  if (profile.company_role === 'hr') {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('company_role', 'hr')
    if ((count ?? 0) <= 1) redirect('/account?err=last_hr')
  }
  await admin.from('profiles').update({ company_id: null, company_role: null }).eq('id', user.id)
  redirect('/account?msg=left')
}

// Delivery details and preferences (spec: "Edit address, pin, allergies, delivery-handoff
// choice and delivery contact").
export async function updatePreferences(formData) {
  const { user } = await signedIn()
  const list = (key, allowed) => [...new Set(formData.getAll(key).map(String).filter((v) => allowed.includes(v)))]
  const handoff = String(formData.get('handoff') ?? '')
  const contactRaw = clean(formData.get('delivery_contact'), 20)
  const contact = contactRaw ? normalisePhone(contactRaw) : null
  if (contactRaw && !contact) redirect('/account?err=phone')
  const isOffice = formData.get('is_office') === 'on'
  const receptionOk = isOffice ? formData.get('reception_ok') !== 'no' : null
  if (isOffice && !receptionOk && (!handoff.startsWith('call_') || !contact)) redirect('/account?err=reception')
  await createAdminClient()
    .from('profiles')
    .update({
      address_line: clean(formData.get('address_line'), 300) || null,
      address_landmark: clean(formData.get('address_landmark'), 120) || null,
      delivery_note: clean(formData.get('delivery_note'), 200) || null,
      delivery_contact: contact,
      allergies: list('allergies', ALLERGENS.map((a) => a.id)),
      allergy_other: clean(formData.get('allergy_other'), 120) || null,
      preferences: list('preferences', PREFERENCES.map((p) => p.id)),
      handoff: HANDOFFS.some((h) => h.id === handoff) ? handoff : null,
      is_office: isOffice,
      reception_ok: receptionOk,
    })
    .eq('id', user.id)
  redirect('/account?msg=prefs')
}

// Saves a new delivery pin with its road distance. Called from the map on the account page.
export async function savePin({ lat, lng }) {
  const session = await actionSession()
  if (!session) return { error: 'Please sign in again.' }
  const limited = await rateLimit('profile', session.user.id)
  if (limited) return { error: limited }
  const point = { lat: Number(lat), lng: Number(lng) }
  if (!isValidPoint(point)) return { error: 'Please drop a pin on the map.' }
  const road = await roadDistance(point)
  if (road.km > MAX_DELIVERY_KM) return { error: `That pin is ${road.km} km away by road. We deliver within ${MAX_DELIVERY_KM} km.` }
  await createAdminClient().from('profiles').update({ lat: point.lat, lng: point.lng, road_km: road.km }).eq('id', session.user.id)
  return { ok: true, km: road.km }
}
