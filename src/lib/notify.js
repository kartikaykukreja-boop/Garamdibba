// Customer notifications. Server-only.
// The spec sends these on WhatsApp (WhatsApp Business API). Until a provider such as
// Meta Cloud API, AiSensy or Interakt is connected, messages are only logged here, and
// customers see the same information on their order page.
// To connect one: implement send() below with the provider's API and approved templates.

const TEMPLATES = {
  order_confirmed: (d) => `Order confirmed ✅ ${d.meal} · first box ${d.firstDate}, ${d.slot}. ${d.credits} meal${d.credits === 1 ? '' : 's'} on your plan.`,
  on_the_way: (d) => `Your dibba is on the way 🛵 arriving ${d.slot}. Track: ${d.link}`,
  delivered: (d) => `Delivered${d.where ? ` (${d.where})` : ''} at ${d.time}. Box ${d.n} of ${d.total} delivered · ${d.left} left. Didn’t get it? ${d.link}`,
  skip_confirmed: (d) => `Skipped ${d.date}. Your credit is kept; your last box is now ${d.lastDate}.`,
  missed_delivery: (d) => `Sorry, we missed your delivery. Your make-up box comes on ${d.date}, ${d.slot}.`,
}

async function send(phone, text) {
  // Provider not connected yet.
  console.info(`[notify] → ${phone ? `+91${phone}` : 'unknown'}: ${text}`)
}

export async function notify(event, { phone, ...data }) {
  try {
    const text = TEMPLATES[event]?.(data)
    if (text) await send(phone, text)
  } catch (error) {
    console.error('notify failed', event, error)
  }
}
