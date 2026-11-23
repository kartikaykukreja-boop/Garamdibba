'use server'

import { redirect } from 'next/navigation'
import { actionSession } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { makeJoinCode } from '../../lib/codes.js'
import { clean, normalisePhone } from '../../lib/validate.js'

async function signedIn() {
  const session = await actionSession()
  if (!session) redirect('/login?next=/account')
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
