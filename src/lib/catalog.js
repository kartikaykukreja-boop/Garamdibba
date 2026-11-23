// What can be ordered online, and how much it costs.
// Prices and dishes come from siteData.js so the website and checkout never disagree.

import { bowls, northIndianMenu, plans, proteinBowlPlans, proteinBowlRotation } from '../siteData.js'
import { addDays, deliveryDates, weekday } from './dates.js'

// A Monday on which the North Indian menu runs "Week 1". Weeks then alternate 1, 2, 1, 2…
// Change this if the kitchen's cycle is out of step with the website.
export const NORTH_INDIAN_WEEK1_MONDAY = '2026-11-16'

export const MENUS = {
  protein_bowl: { id: 'protein_bowl', name: 'Protein Bowls', plans: proteinBowlPlans },
  north_indian: { id: 'north_indian', name: 'North Indian Lunch', plans },
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function findPlan(menuId, planId) {
  return MENUS[menuId]?.plans.find((plan) => plan.id === planId) ?? null
}

export function findBowl(slug) {
  return bowls.find((bowl) => bowl.slug === slug) ?? null
}

function northIndianWeek(ymd) {
  const monday = addDays(ymd, -((weekday(ymd) + 6) % 7))
  const weeks = Math.round((Date.parse(monday) - Date.parse(NORTH_INDIAN_WEEK1_MONDAY)) / (7 * 864e5))
  return ((weeks % 2) + 2) % 2 === 0 ? 'Week 1' : 'Week 2'
}

export function itemForDate(menuId, ymd, bowlSlug) {
  const dayName = DAY_NAMES[weekday(ymd)]
  if (menuId === 'protein_bowl') {
    const chosen = findBowl(bowlSlug)
    if (chosen) return chosen.name
    return proteinBowlRotation.find((entry) => entry.day === dayName)?.bowl ?? 'Protein Bowl'
  }
  const day = northIndianMenu[northIndianWeek(ymd)]?.find((entry) => entry.day === dayName)
  return day ? `North Indian Lunch: ${day.main}` : 'North Indian Lunch'
}

// Single source of truth for the price and schedule of an order.
export function quoteOrder({ menu, planId, quantity, startDate, bowlSlug }) {
  const plan = findPlan(menu, planId)
  if (!plan) return null
  const qty = Math.trunc(Number(quantity))
  if (!Number.isFinite(qty) || qty < 1 || qty > 20) return null
  const bowl = menu === 'protein_bowl' ? findBowl(bowlSlug) : null

  const schedule = deliveryDates(startDate, plan.boxes).map((date) => ({
    date,
    item: itemForDate(menu, date, bowl?.slug),
  }))

  return {
    plan,
    bowl,
    quantity: qty,
    schedule,
    total: plan.total * qty,
  }
}
