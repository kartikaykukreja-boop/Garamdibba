import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import NorthIndianWeeks from '../../NorthIndianWeeks.jsx'
import {
  BowlCards,
  ButtonLink,
  CallToAction,
  Eyebrow,
  HeroMosaic,
  HowSteps,
  OrderButton,
  PageHero,
} from '../../site.jsx'
import { photos } from '../../images.js'
import { buildMetadata } from '../../metadata.js'

export const metadata = buildMetadata('/menu')

export default function MenuPage() {
  return (
    <main>
      <PageHero
        eyebrow="Vegetarian tiffin menu"
        title="Vegetarian Tiffin Menu in Dehradun"
        art={<HeroMosaic />}
        actions={(
          <>
            <ButtonLink to="/meal-plans">View Meal Plans</ButtonLink>
            <OrderButton className="button-cream">Order Now</OrderButton>
          </>
        )}
      >
        <p>
          Looking for a vegetarian tiffin menu in Dehradun with more variety than the usual everyday meal?
        </p>
      </PageHero>

      <section className="section shell story-grid">
        <div className="story-title">
          <Eyebrow>What’s cooking</Eyebrow>
          <h2>Two menus. One easy lunch.</h2>
        </div>
        <div className="story-copy">
          <p className="story-lede">
            Explore the current Garam Dibba menu: eight vegetarian protein bowls with different flavour
            profiles and a modern take on everyday tiffin, plus a two-week North Indian lunch menu.
          </p>
          <p>
            From comforting Indian favourites like Paneer Lababdar and Pindi Chole to contemporary
            options such as Tex-Mex Bowl, Pesto Paneer Bowl and Korean Paneer Bowl, Garam Dibba gives
            you more ways to keep your everyday meals interesting.
          </p>
          <p>
            Whether you’re trying a single meal or choosing a longer meal plan, browse the menu and find
            your next Garam Dibba meal.
          </p>
          <nav className="menu-jump" aria-label="Menu sections">
            <a href="#protein-bowls"><strong>Protein Bowls</strong><small>8 vegetarian bowls</small><ArrowRight size={18} /></a>
            <a href="#north-indian"><strong>North Indian Lunch</strong><small>2-week menu</small><ArrowRight size={18} /></a>
          </nav>
        </div>
      </section>

      <section className="menu-section shell anchor-section" id="protein-bowls">
        <div className="active-week-heading">
          <div>
            <Eyebrow>Protein bowls / 8 vegetarian meals</Eyebrow>
            <h2>Protein Bowls</h2>
          </div>
          <span className="veg-badge"><span>●</span> Vegetarian menu</span>
        </div>
        <p className="section-sub section-sub-left">
          Four Indian favourites and four modern flavours, each built around paneer or chickpeas and
          packed hot in a Garam Dibba bowl.
        </p>
        <BowlCards />
      </section>

      <section className="north-section anchor-section" id="north-indian">
        <div className="shell">
          <div className="north-head">
            <div>
              <Eyebrow>North Indian lunch / Monday–Saturday</Eyebrow>
              <h2>North Indian Lunch: 2-Week Menu</h2>
              <p>
                Six homestyle lunches a week, rotating over two weeks. Dal, rajma, kadhi, parathas and a
                Friday favourite of makhani dal with paneer, with rice, rotis, curd and salad.
              </p>
            </div>
            <div className="north-photos">
              <Image
                src={photos.rajmaChawal}
                alt="Rajma chawal thali with pickled onion and green chutney"
                placeholder="blur"
                sizes="(max-width: 980px) 50vw, 260px"
              />
              <Image
                src={photos.alooParatha}
                alt="Aloo paratha served with fresh curd"
                placeholder="blur"
                sizes="(max-width: 980px) 50vw, 260px"
              />
            </div>
          </div>

          <NorthIndianWeeks />
        </div>
      </section>

      <HowSteps />

      <CallToAction title="Aaj ka dibba is calling." />
    </main>
  )
}
