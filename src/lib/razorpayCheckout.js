'use client'

let loading

function loadRazorpay() {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve(window.Razorpay)
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(window.Razorpay)
    script.onerror = () => {
      loading = null
      reject(new Error('Could not load Razorpay. Check your internet connection and try again.'))
    }
    document.body.appendChild(script)
  })
  return loading
}

// Opens Razorpay Checkout. `checkout` comes from a server action.
export async function openRazorpay(checkout, { onSuccess, onDismiss, onFailure }) {
  const Razorpay = await loadRazorpay()
  const rzp = new Razorpay({
    key: checkout.key,
    amount: checkout.amount,
    currency: 'INR',
    order_id: checkout.orderId,
    name: 'Garam Dibba',
    description: checkout.description,
    prefill: checkout.prefill,
    theme: { color: '#AD2517' },
    handler: onSuccess,
    modal: { ondismiss: onDismiss, confirm_close: true },
  })
  rzp.on('payment.failed', (response) => onFailure?.(response.error?.description || 'Payment failed.'))
  rzp.open()
}
