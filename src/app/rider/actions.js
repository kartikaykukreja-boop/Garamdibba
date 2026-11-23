'use server'

import { actionSession } from '../../lib/auth.js'
import { createAdminClient } from '../../lib/supabase/server.js'
import { completeOrderIfDone, statusPatch } from '../../lib/orders.js'

const RIDER_STATUSES = ['out_for_delivery', 'delivered']

export async function setRiderStatus(deliveryId, status) {
  const session = await actionSession()
  if (!session || !['rider', 'admin'].includes(session.profile.role)) return { error: 'Not allowed.' }
  if (!RIDER_STATUSES.includes(status)) return { error: 'Unknown status.' }

  const admin = createAdminClient()
  const { data: delivery } = await admin
    .from('deliveries')
    .select('id, order_id, rider_id, status')
    .eq('id', deliveryId)
    .maybeSingle()
  if (!delivery || (delivery.rider_id !== session.user.id && session.profile.role !== 'admin')) {
    return { error: 'This delivery isn’t assigned to you.' }
  }
  if (delivery.status === 'cancelled' || delivery.status === 'delivered') {
    return { error: 'This delivery is already closed.' }
  }

  const { error } = await admin.from('deliveries').update(statusPatch(status)).eq('id', deliveryId)
  if (error) return { error: 'Could not update. Please try again.' }
  if (status === 'delivered') await completeOrderIfDone(admin, delivery.order_id)
  return { ok: true }
}
