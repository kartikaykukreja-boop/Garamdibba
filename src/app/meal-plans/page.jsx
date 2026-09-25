import { ArrowRight, CalendarDays, Package, Repeat } from 'lucide-react'
import {
  ButtonLink,
  CallToAction,
  Eyebrow,
  FaqSection,
  HowSteps,
  OrderButton,
  PageHero,
  PlanGrid,
} from '../../site.jsx'
import { dehradunFaqs } from '../../siteData.js'
import { bowlImages } from '../../images.js'
import { buildMetadata } from '../../metadata.js'

export const metadata = buildMetadata('/meal-plans')

export default function MealPlansPage() {
  return (
    <main>
      <PageHero
        eyebrow="Meal plans & prices"
        title="Tiffin Plans & Prices in Dehradun"
        image={bowlImages['peri-peri-paneer']}
        alt="Garam Dibba Peri-Peri Paneer bowl with glazed paneer over rice"
        actions={(
          <>
            <OrderButton>Order on WhatsApp</OrderButton>
            <ButtonLink to="/menu" className="button-cream">View Menu</ButtonLink>
          </>
        )}
      >
        <p>
          Whether you’re trying Garam Dibba for a day or planning your meals for the next month,
          choose the plan that works for you. Plans start at ₹110 per box.
        </p>
      </PageHero>

      <section className="section shell plans-light anchor-section" id="plans">
        <div className="section-heading centered-heading">
          <Eyebrow>Current prices</Eyebrow>
          <h2>Tiffin Plans That Fit Your Routine</h2>
        </div>
        <PlanGrid />
        <div className="plans-foot">
          <p>
            <CalendarDays size={18} aria-hidden="true" />
            <span><strong>Delivery: Monday–Saturday.</strong> The longer your plan, the lower the current per-box price.</span>
          </p>
        </div>
      </section>

      <section className="values-section">
        <div className="shell story-grid">
          <div className="story-title">
            <Eyebrow>Recurring tiffin</Eyebrow>
            <h2>Daily, Weekly or Monthly Tiffin?</h2>
          </div>
          <div className="story-copy">
            <p className="story-lede">Need a meal for today or want your food sorted for longer?</p>
            <p>Garam Dibba offers flexible plans so you can choose how long you want your meals planned.</p>
            <p>
              Start with a 1-Day Plan, choose a 1-Week Plan, or go for a 2-Week or 4-Week Plan when you
              want a longer-term tiffin routine.
            </p>
            <p>With delivery Monday to Saturday, Garam Dibba is built around making everyday meals easier to manage.</p>
            <ul className="check-list">
              <li><Repeat /> Daily tiffin: the 1-Day Plan at ₹180/box</li>
              <li><CalendarDays /> Weekly tiffin: the 1-Week Plan at ₹130/box</li>
              <li><Package /> Monthly tiffin: the 4-Week Plan at ₹110/box</li>
            </ul>
            <a className="text-link" href="#plans">View All Plans <ArrowRight size={18} /></a>
          </div>
        </div>
      </section>

      <HowSteps title="Start your plan in three taps." />

      <FaqSection
        title="Plan questions"
        faqs={dehradunFaqs.filter(({ q }) => /cost|daily|order/i.test(q))}
      />

      <CallToAction title="Pick a plan. We’ll handle lunch." />
    </main>
  )
}
