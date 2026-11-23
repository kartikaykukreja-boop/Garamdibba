export const DELIVERY_STATUS = {
  scheduled: { label: 'Scheduled', tone: 'neutral' },
  preparing: { label: 'Being prepared', tone: 'warm' },
  out_for_delivery: { label: 'Out for delivery', tone: 'live' },
  delivered: { label: 'Delivered', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
  skipped: { label: 'Skipped · credit kept', tone: 'muted' },
  missed: { label: 'Missed · make-up booked', tone: 'warm' },
  paused: { label: 'Paused', tone: 'muted' },
}

export const ORDER_STATUS = {
  pending_payment: { label: 'Awaiting payment', tone: 'muted' },
  confirmed: { label: 'Confirmed', tone: 'warm' },
  completed: { label: 'Completed', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
}

export const rupees = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
