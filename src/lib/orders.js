// Server-only order helpers shared by the rider and admin screens.

// Marks an order completed once none of its deliveries are still pending.
export async function completeOrderIfDone(admin, orderId) {
  const { count } = await admin
    .from('deliveries')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId)
    .not('status', 'in', '(delivered,cancelled)')
  if (count === 0) {
    await admin.from('orders').update({ status: 'completed' }).eq('id', orderId).eq('status', 'confirmed')
  }
}

// Timestamps that go with each delivery status change.
export function statusPatch(status) {
  const patch = { status }
  if (status === 'out_for_delivery') patch.out_at = new Date().toISOString()
  if (status === 'delivered') patch.delivered_at = new Date().toISOString()
  return patch
}
