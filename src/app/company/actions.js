'use server'

import { redirect } from 'next/navigation'
import { actionSession } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { makeJoinCode } from '../../lib/codes.js'
import { createRazorpayOrder, razorpayKeyId } from '../../lib/razorpay.js'

const MIN_TOPUP = 500
const MAX_TOPUP = 500000

async function hrSession() {
  const session = await actionSession()
  if (!session) redirect('/login?next=/company')
  if (!session.profile.company_id || session.profile.company_role !== 'hr') redirect('/account?denied=1')
  return session
}

function money(value) {
  const text = String(value ?? '').replace(/[,₹\s]/g, '')
  if (!text) return null
  const n = Number(text)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN
}

export async function updateLimits(formData) {
  const { profile } = await hrSession()
  const monthly = money(formData.get('monthly_limit'))
  const perEmployee = money(formData.get('employee_monthly_limit'))
  if (Number.isNaN(monthly) || Number.isNaN(perEmployee)) redirect('/company?err=amount')
  await createAdminClient()
    .from('companies')
    .update({ monthly_limit: monthly, employee_monthly_limit: perEmployee })
    .eq('id', profile.company_id)
  redirect('/company?msg=limits')
}

export async function regenerateCode() {
  const { profile } = await hrSession()
  const admin = createAdminClient()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await admin.from('companies').update({ join_code: makeJoinCode() }).eq('id', profile.company_id)
    if (!error) redirect('/company?msg=code')
  }
  redirect('/company?err=generic')
}

async function memberOfMyCompany(admin, companyId, userId) {
  const { data } = await admin.from('profiles').select('id, company_role').eq('id', userId).eq('company_id', companyId).maybeSingle()
  return data
}

export async function setMemberRole(formData) {
  const { user, profile } = await hrSession()
  const admin = createAdminClient()
  const memberId = String(formData.get('user_id'))
  const role = formData.get('role') === 'hr' ? 'hr' : 'employee'
  const member = await memberOfMyCompany(admin, profile.company_id, memberId)
  if (!member) redirect('/company?err=generic')
  if (memberId === user.id && role === 'employee') {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('company_role', 'hr')
    if ((count ?? 0) <= 1) redirect('/company?err=last_hr')
  }
  await admin.from('profiles').update({ company_role: role }).eq('id', memberId)
  redirect('/company?msg=role')
}

export async function removeMember(formData) {
  const { user, profile } = await hrSession()
  const admin = createAdminClient()
  const memberId = String(formData.get('user_id'))
  if (memberId === user.id) redirect('/company?err=self')
  const member = await memberOfMyCompany(admin, profile.company_id, memberId)
  if (!member) redirect('/company?err=generic')
  await admin.from('profiles').update({ company_id: null, company_role: null }).eq('id', memberId)
  redirect('/company?msg=removed')
}

// Called from the browser; returns Razorpay Checkout details.
export async function startTopup(amountInput) {
  const session = await actionSession()
  if (!session?.profile.company_id || session.profile.company_role !== 'hr') return { error: 'Only HR can add money.' }
  const amount = money(amountInput)
  if (!amount || Number.isNaN(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
    return { error: `Enter an amount between ₹${MIN_TOPUP} and ₹${MAX_TOPUP.toLocaleString('en-IN')}.` }
  }

  try {
    const rzOrder = await createRazorpayOrder({
      amount,
      receipt: `TOPUP-${Date.now()}`,
      notes: { company_id: session.profile.company_id, type: 'company_topup' },
    })
    const { error } = await createAdminClient().from('company_topups').insert({
      company_id: session.profile.company_id,
      amount,
      razorpay_order_id: rzOrder.id,
      created_by: session.user.id,
    })
    if (error) throw error
    return {
      checkout: {
        key: razorpayKeyId(),
        orderId: rzOrder.id,
        amount: rzOrder.amount,
        description: `Company budget top-up: ${session.profile.company.name}`,
        prefill: { name: session.profile.full_name ?? '', email: session.user.email },
      },
    }
  } catch (error) {
    console.error('startTopup failed', error)
    return { error: 'Online payment is unavailable right now. Please try again in a minute.' }
  }
}
