// What can be ordered online, and how much it costs.
// Dishes and plan prices come from siteData.js, rules from rules.js, so the website,
// the order screen and the server always agree. Shared by the browser and the server.

import { bowls, northIndianMenu, plans, proteinBowlPlans, proteinBowlRotation } from '../siteData.js'
import { addDays, daysBetween, planDates, weekday } from './dates.js'
import {
  CREDIT_VALIDITY_FACTOR,
  FREE_DELIVERY_MIN_MEALS,
  FREE_DELIVERY_ORDER_VALUE,
  MEALS,
  SINGLE_MEAL_PRICE,
  deliveryFeeFor,
} from './rules.js'

// A Monday on which the Everyday Dabba menu runs "Week 1". Weeks then alternate 1, 2, 1, 2…
export const NORTH_INDIAN_WEEK1_MONDAY = '2026-11-16'

// TO CONFIRM: allergen tags below follow the spec's notes and the usual recipes.
// The kitchen must verify them; until then the site says they are provisional.
export const ALLERGENS_VERIFIED = false

const BOWL_ALLERGENS = {
  'tandoori-malai-paneer': ['dairy'],
  'pindi-chole': [],
  'paneer-lababdar': ['dairy', 'tree_nuts'],
  'tex-mex': ['dairy'],
  'pesto-paneer': ['dairy', 'tree_nuts'],
  'korean-paneer': ['dairy', 'soy', 'sesame', 'gluten'],
  'paneer-pasanda': ['dairy', 'tree_nuts'],
  'hot-and-sour-paneer': ['dairy', 'soy', 'gluten'],
}
// Every Everyday Dabba has curd (dairy) and rotis or paratha (gluten), except the pulao day.
const dabbaAllergens = (main) => (/pulao/i.test(main) ? ['dairy'] : ['dairy', 'gluten'])

const withMeta = (menu, list) =>
  list.map((plan) => ({
    ...plan,
    savings: SINGLE_MEAL_PRICE * plan.boxes - plan.total,
    tag: plan.best ? 'Best value' : menu === 'north_indian' && plan.id === '1-week' ? 'Most popular' : null,
  }))

export const MENUS = {
  north_indian: {
    id: 'north_indian',
    name: 'Everyday Dabba',
    unit: 'box',
    units: 'boxes',
    blurb: 'Dal, sabzi, rice, 3 rotis, curd and salad. Homestyle North Indian.',
    plans: withMeta('north_indian', plans),
  },
  protein_bowl: {
    id: 'protein_bowl',
    name: 'Protein Bowls',
    unit: 'bowl',
    units: 'bowls',
    blurb: 'Eight paneer and chickpea bowls, 26g protein (30g in the Tex-Mex).',
    plans: withMeta('protein_bowl', proteinBowlPlans),
  },
}
export const MENU_ORDER = ['north_indian', 'protein_bowl']

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const findPlan = (menuId, planId) => MENUS[menuId]?.plans.find((plan) => plan.id === planId) ?? null
export const findBowl = (slug) => bowls.find((bowl) => bowl.slug === slug) ?? null
export const bowlAllergens = (slug) => BOWL_ALLERGENS[slug] ?? []

function northIndianWeek(ymd) {
  const monday = addDays(ymd, -((weekday(ymd) + 6) % 7))
  const weeks = Math.round((Date.parse(monday) - Date.parse(NORTH_INDIAN_WEEK1_MONDAY)) / (7 * 864e5))
  return ((weeks % 2) + 2) % 2 === 0 ? 'Week 1' : 'Week 2'
}

// The dish served for a menu on a date: { name, label, allergens, bowlSlug?, sides? }.
export function dishFor(menuId, ymd, bowlSlug) {
  const dayName = DAY_NAMES[weekday(ymd)]
  if (menuId === 'protein_bowl') {
    const bowl =
      findBowl(bowlSlug) ??
      bowls.find((b) => b.name === proteinBowlRotation.find((entry) => entry.day === dayName)?.bowl) ??
      null
    return bowl
      ? { name: bowl.name, label: bowl.name, allergens: bowlAllergens(bowl.slug), bowlSlug: bowl.slug, protein: bowl.protein }
      : { name: 'Protein Bowl', label: 'Protein Bowl', allergens: ['dairy'] }
  }
  const day = northIndianMenu[northIndianWeek(ymd)]?.find((entry) => entry.day === dayName)
  if (!day) return { name: 'Everyday Dabba', label: 'Everyday Dabba', allergens: ['dairy', 'gluten'] }
  return {
    name: day.main,
    label: `Everyday Dabba: ${day.main}`,
    allergens: dabbaAllergens(day.main),
    sides: `${day.veg} · ${day.sides}`,
  }
}

// Kept for callers that only need the label.
export const itemForDate = (menuId, ymd, bowlSlug) => dishFor(menuId, ymd, bowlSlug).label

export const conflicts = (dishAllergens = [], customerAllergies = []) =>
  dishAllergens.filter((a) => customerAllergies.includes(a))

// Price an extras selection against the catalog. Unknown, inactive or out-of-stock items are dropped.
export function priceExtras(selection = [], catalog = []) {
  const lines = []
  for (const pick of selection) {
    const item = catalog.find((x) => x.id === pick.id && x.active)
    const qty = Math.trunc(Number(pick.qty))
    if (!item || !Number.isFinite(qty) || qty < 1 || qty > 10) continue
    if (item.stock != null && item.stock < qty) continue
    lines.push({ id: item.id, name: item.name, kind: item.kind, price: Number(item.price), qty, total: Number(item.price) * qty })
  }
  return { lines, total: lines.reduce((sum, line) => sum + line.total, 0) }
}

/**
 * Single source of truth for an order's schedule and price.
 * Returns null for an invalid menu/plan/quantity, otherwise a quote that may carry `problem`
 * (a customer-facing reason the order can't be placed as chosen).
 */
export function quoteOrder({
  menu,
  planId,
  quantity = 1,
  startDate,
  weekdays,
  meal = 'lunch',
  bowlSlug,
  allergies = [],
  closed = [],
  roadKm = null,
  extras = [],
  extrasCatalog = [],
}) {
  const plan = findPlan(menu, planId)
  if (!plan || !MEALS[meal] || !startDate) return null
  const qty = Math.trunc(Number(quantity))
  if (!Number.isFinite(qty) || qty < 1 || qty > 20) return null
  const bowl = menu === 'protein_bowl' ? findBowl(bowlSlug) : null
  const days = plan.boxes === 1 ? [0, 1, 2, 3, 4, 5, 6] : (weekdays?.length ? weekdays : [1, 2, 3, 4, 5, 6])

  let problem = null
  if (bowl && conflicts(bowlAllergens(bowl.slug), allergies).length) {
    problem = `${bowl.name} contains something you’re allergic to. Please pick another bowl.`
  }

  // Plans skip days whose fixed menu contains the customer's allergen (credit kept).
  const unsafe = (ymd) => conflicts(dishFor(menu, ymd, bowl?.slug).allergens, allergies).length > 0
  const { dates, skipped, complete } = planDates(startDate, plan.boxes, {
    weekdays: days,
    closed,
    skip: plan.boxes === 1 ? () => false : unsafe,
  })

  if (!problem && plan.boxes === 1 && dates[0] && unsafe(dates[0])) {
    problem = `That day’s ${MENUS[menu].name} (${dishFor(menu, dates[0], bowl?.slug).name}) contains something you’re allergic to. Please pick another day or menu.`
  }
  if (!problem && !complete) {
    problem = 'This menu doesn’t have enough days that are safe for your allergies. Please try the other menu or call us.'
  }
  // A single meal is for exactly the chosen day; a plan starts on the first chosen weekday from then.
  if (!problem && plan.boxes === 1 && dates[0] !== startDate) {
    problem = 'We don’t deliver on that day. Please pick another day.'
  }

  const schedule = dates.map((date) => ({ date, item: dishFor(menu, date, bowl?.slug).label }))
  const mealsTotal = plan.total * qty
  const extrasPriced = priceExtras(extras, extrasCatalog)

  const perDelivery = roadKm == null ? 0 : deliveryFeeFor(roadKm) ?? 0
  const waivedByPlan = FREE_DELIVERY_MIN_MEALS != null && plan.boxes >= FREE_DELIVERY_MIN_MEALS
  const waivedByValue =
    FREE_DELIVERY_ORDER_VALUE != null && mealsTotal + extrasPriced.total >= FREE_DELIVERY_ORDER_VALUE
  const feeWaived = perDelivery > 0 && (waivedByPlan || waivedByValue)
  const deliveryFee = feeWaived ? 0 : perDelivery * schedule.length

  const endDate = schedule[schedule.length - 1]?.date ?? startDate
  const span = schedule.length ? daysBetween(schedule[0].date, endDate) + 1 : 1
  const validUntil = addDays(startDate, Math.max(span, Math.ceil(span * CREDIT_VALIDITY_FACTOR)) - 1)

  return {
    plan,
    bowl,
    quantity: qty,
    meal,
    weekdays: days,
    schedule,
    skippedForAllergy: skipped,
    problem,
    mealsTotal,
    perDeliveryFee: perDelivery,
    feeWaived,
    waivedByPlan,
    deliveryFee,
    extras: extrasPriced.lines,
    extrasTotal: extrasPriced.total,
    total: mealsTotal + deliveryFee + extrasPriced.total,
    savings: plan.savings * qty,
    endDate,
    validUntil,
  }
}
