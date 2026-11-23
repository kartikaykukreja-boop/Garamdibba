import { ArrowRight, CalendarDays, Package, Repeat } from 'lucide-react'
import {
  ButtonLink,
  CallToAction,
  Eyebrow,
  FaqSection,
  HowSteps,
  OrderOnlineButton,
  PageHero,
  PlanGrid,
  ProteinBowlProgram,
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
        image={bowlImages['paneer-pasanda']}
        alt="Garam Dibba Paneer Pasanda bowl with paneer, creamy gravy, rice and pickled onion"
        actions={(
          <>
            <OrderOnlineButton />
            <ButtonLink to="/menu" className="button-cream">View Menu</ButtonLink>
          </>
        )}
      >
        <p>
          Choose a plan for protein bowls or the North Indian lunch menu. Each menu has its own pricing,
          with delivery from Monday to Saturday.
        </p>
      </PageHero>

      <section className="section shell protein-plans-page anchor-section" id="protein-bowl-plans">
        <div className="active-week-heading">
          <div>
            <span className="menu-number">Plan menu 1 of 2</span>
            <h2>Protein Bowl Plans</h2>
          </div>
          <span className="veg-badge"><span>●</span> 8 bowls to choose from</span>
        </div>
        <ProteinBowlProgram />
      </section>

      <section className="section shell plans-light anchor-section" id="plans">
        <div className="section-heading centered-heading">
          <Eyebrow>Plan menu 2 of 2</Eyebrow>
          <h2>North Indian Lunch Plans</h2>
          <p className="section-sub">These existing plans apply to the separate North Indian lunch menu.</p>
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
            <p className="story-lede">Two menus, with a plan for each routine.</p>
            <p>Protein bowls and North Indian lunches have separate pricing, so you can choose the food and duration that work for you.</p>
            <p>
              Start with a 1-Day Plan, choose a 1-Week Plan, or go for a 2-Week or 4-Week Plan when you
              want a longer-term tiffin routine.
            </p>
            <p>With delivery Monday to Saturday, Garam Dibba is built around making everyday meals easier to manage.</p>
            <ul className="check-list">
              <li><Repeat /> Daily tiffin: the 1-Day Plan at ₹180/box</li>
              <li><CalendarDays /> Weekly tiffin: the 1-Week Plan at ₹135/box</li>
              <li><Package /> Monthly tiffin: the 4-Week Plan at ₹120/box</li>
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
