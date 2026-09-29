import Image from 'next/image'
import { ArrowDown, ArrowRight } from 'lucide-react'
import MenuSwitchBar from '../../MenuSwitchBar.jsx'
import NorthIndianWeeks from '../../NorthIndianWeeks.jsx'
import {
  BowlCards,
  ButtonLink,
  CallToAction,
  Eyebrow,
  HeroMosaic,
  HowSteps,
  PageHero,
} from '../../site.jsx'
import { bowlImages, photos } from '../../images.js'
import { buildMetadata } from '../../metadata.js'

export const metadata = buildMetadata('/menu')

const menuChoices = [
  {
    href: '#protein-bowls',
    tag: 'Menu 1',
    title: 'Protein Bowls',
    note: '8 vegetarian bowls, paneer & chickpea',
    image: bowlImages['paneer-lababdar'],
    alt: 'Paneer Lababdar protein bowl',
  },
  {
    href: '#north-indian',
    tag: 'Menu 2',
    title: 'North Indian Lunch',
    note: '2-week rotating menu, Monday–Saturday',
    image: photos.rajmaChawal,
    alt: 'Rajma chawal North Indian lunch',
  },
]

export default function MenuPage() {
  return (
    <main>
      <PageHero
        eyebrow="Vegetarian tiffin menu"
        title="Vegetarian Tiffin Menu in Dehradun"
        art={<HeroMosaic className="menu-hero-mosaic" />}
        actions={(
          <nav className="menu-choice" aria-label="Choose a menu">
            {menuChoices.map((choice) => (
              <a className="menu-choice-card" href={choice.href} key={choice.href}>
                <span className="menu-choice-photo">
                  <Image
                    src={choice.image}
                    alt={choice.alt}
                    fill
                    placeholder="blur"
                    sizes="96px"
                  />
                </span>
                <span className="menu-choice-copy">
                  <small>{choice.tag}</small>
                  <strong>{choice.title}</strong>
                  <span>{choice.note}</span>
                </span>
                <ArrowDown className="menu-choice-arrow" size={20} aria-hidden="true" />
              </a>
            ))}
          </nav>
        )}
      >
        <p>
          We have <strong>two separate menus</strong>. Pick one below: modern protein bowls, or a
          homestyle North Indian lunch that changes every day.
        </p>
      </PageHero>

      <div className="menu-switch-zone">
        <MenuSwitchBar />

        <section className="menu-section shell anchor-section menu-anchor" id="protein-bowls">
          <div className="active-week-heading">
            <div>
              <span className="menu-number">Menu 1 of 2</span>
              <h2>Protein Bowls</h2>
            </div>
            <span className="veg-badge"><span>●</span> Vegetarian menu</span>
          </div>
          <p className="section-sub section-sub-left">
            Four Indian favourites and four modern flavours, each built around paneer or chickpeas and
            packed hot in a Garam Dibba bowl.
          </p>
          <BowlCards />
          <a className="menu-next" href="#north-indian">
            <span>
              <small>Menu 2 of 2</small>
              <strong>Also on the menu: North Indian Lunch</strong>
            </span>
            <ArrowDown size={20} aria-hidden="true" />
          </a>
        </section>

        <section className="north-section anchor-section menu-anchor" id="north-indian">
          <div className="shell">
            <div className="north-head">
              <div>
                <span className="menu-number">Menu 2 of 2</span>
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
      </div>

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
            Found something you like? Try a single meal or choose a longer plan for a lower per-box price.
          </p>
          <ButtonLink to="/meal-plans">See Meal Plans & Prices</ButtonLink>
          <a className="text-link menu-top-link" href="#protein-bowls">
            Back to the menus <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <HowSteps />

      <CallToAction title="Aaj ka dibba is calling." />
    </main>
  )
}
