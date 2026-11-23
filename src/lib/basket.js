// A basket: several meals (e.g. an Everyday Dabba plan AND a Protein Bowl) paid together.
// Shared by the browser and the server; the server always recalculates it.
import { MENUS, priceExtras, quoteOrder } from './catalog.js'
import { FREE_DELIVERY_MIN_MEALS, FREE_DELIVERY_ORDER_VALUE, deliveryFeeFor } from './rules.js'

export const MAX_LINES = 4

export const lineLabel = (line) => {
  const plan = MENUS[line.menu]?.plans.find((p) => p.id === line.planId)
  return `${MENUS[line.menu]?.name ?? 'Meal'}${plan ? ` · ${plan.boxes === 1 ? 'single meal' : plan.name}` : ''}`
}

/**
 * lines: [{ menu, planId, bowlSlug, quantity, meal, startDate, weekdays, slot }]
 * One delivery fee per drop (same date, meal and slot), not per meal: two meals in one bag
 * cost one trip. A drop is free if any meal in it belongs to a plan that gets free delivery.
 * Returns null if any line is invalid, else a quote that may carry `problem`.
 */
export function quoteBasket({ lines, allergies = [], closed = [], roadKm = null, extras = [], extrasCatalog = [] }) {
  if (!Array.isArray(lines) || !lines.length || lines.length > MAX_LINES) return null
  const quotes = []
  for (const line of lines) {
    const q = quoteOrder({ ...line, allergies, closed, roadKm: null })
    if (!q) return null
    quotes.push(q)
  }
  const problemIndex = quotes.findIndex((q) => q.problem)
  const problem = problemIndex >= 0 ? `${lineLabel(lines[problemIndex])}: ${quotes[problemIndex].problem}` : null

  const menus = [...new Set(lines.map((l) => l.menu))]
  const extrasPriced = priceExtras(extras, extrasCatalog.filter((x) => x.menus.some((m) => menus.includes(m))))
  const mealsTotal = quotes.reduce((sum, q) => sum + q.mealsTotal, 0)

  const perDelivery = roadKm == null ? 0 : deliveryFeeFor(roadKm) ?? 0
  const valueWaiver = FREE_DELIVERY_ORDER_VALUE != null && mealsTotal + extrasPriced.total >= FREE_DELIVERY_ORDER_VALUE
  const drops = new Map()
  quotes.forEach((q, i) => {
    const waived = FREE_DELIVERY_MIN_MEALS != null && q.plan.boxes >= FREE_DELIVERY_MIN_MEALS
    for (const s of q.schedule) {
      const key = `${s.date}|${lines[i].meal}|${lines[i].slot}`
      const drop = drops.get(key) ?? { firstLine: i, waived: false }
      drop.waived ||= waived
      drops.set(key, drop)
    }
  })
  const lineFees = quotes.map(() => 0)
  let charged = 0
  for (const drop of drops.values()) {
    if (perDelivery > 0 && !drop.waived && !valueWaiver) {
      lineFees[drop.firstLine] += perDelivery
      charged += 1
    }
  }
  const deliveryFee = perDelivery * charged

  return {
    lines: quotes.map((q, i) => ({ ...lines[i], quote: q, deliveryFee: lineFees[i] })),
    problem,
    mealsTotal,
    perDeliveryFee: perDelivery,
    drops: drops.size,
    chargedDrops: charged,
    feeWaived: perDelivery > 0 && charged < drops.size,
    deliveryFee,
    extras: extrasPriced.lines,
    extrasTotal: extrasPriced.total,
    total: mealsTotal + deliveryFee + extrasPriced.total,
    savings: quotes.reduce((sum, q) => sum + q.savings, 0),
    meals: quotes.reduce((sum, q) => sum + q.schedule.length * q.quantity, 0),
  }
}
