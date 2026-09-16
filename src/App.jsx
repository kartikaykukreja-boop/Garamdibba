import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Heart,
  Leaf,
  Menu as MenuIcon,
  MessageCircle,
  Package,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import './App.css'

// Add the 10-digit business number with country code (for example: 919876543210).
// Until then, WhatsApp opens with the order message ready to share.
const WHATSAPP_NUMBER = '919690223377'

const menu = {
  'Week 1': [
    { day: 'Monday', main: 'Dal Tadka', veg: 'Seasonal Veg', sides: 'Curd · Rice · 3 Rotis · Salad' },
    { day: 'Tuesday', main: 'Chole', veg: 'Seasonal Veg', sides: 'Curd · Rice · 3 Rotis · Salad' },
    { day: 'Wednesday', main: 'Rajma', veg: 'Seasonal Veg', sides: 'Curd · Rice · 3 Rotis · Salad' },
    { day: 'Thursday', main: 'Kadhi + Dal', veg: 'Seasonal Veg', sides: 'Curd · Rice · 3 Rotis · Salad' },
    { day: 'Friday', main: 'Makhani Dal + Paneer', veg: 'Seasonal Veg', sides: 'Curd · Rice · 3 Rotis · Salad', special: true },
    { day: 'Saturday', main: 'Black Chana', veg: 'Seasonal Veg', sides: 'Curd · Rice · 3 Rotis · Salad' },
  ],
  'Week 2': [
    { day: 'Monday', main: 'Dal Tadka', veg: 'Seasonal Veg', sides: 'Curd · Rice · 3 Rotis · Salad' },
    { day: 'Tuesday', main: 'Bhindi', veg: 'Seasonal Veg', sides: '3 Rotis · Raita · Salad' },
    { day: 'Wednesday', main: 'Veg Pulao', veg: 'Light Seasonal Dry Sabzi', sides: 'Raita · Salad' },
    { day: 'Thursday', main: 'Aloo Paratha', veg: 'Light Seasonal Dry Sabzi', sides: 'Dahi · Chutney · Salad' },
    { day: 'Friday', main: 'Makhani Dal + Paneer', veg: 'Seasonal Veg', sides: 'Curd · Rice · 3 Rotis · Salad', special: true },
    { day: 'Saturday', main: 'Gobi Aloo Paratha', veg: 'Light Seasonal Dry Sabzi', sides: 'Curd · Chutney · Salad' },
  ],
}

function whatsappHref(message = 'Hi Garam Dabba! I would like to order a lunch dabba. 🍱') {
  const number = WHATSAPP_NUMBER.replace(/\D/g, '')
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-label="Garam Dabba">
      <span>Garam</span>
      <Utensils aria-hidden="true" />
      <span>Dabba</span>
    </span>
  )
}

function SiteHeader() {
  const [open, setOpen] = useState(false)
  const links = [
    { to: '/', label: 'Home', end: true },
    { to: '/about', label: 'Our story' },
    { to: '/menu', label: 'Lunch menu' },
  ]

  return (
    <>
      <div className="announcement">
        <span>Fresh lunch, Monday to Saturday</span>
        <span className="announcement-dot" aria-hidden="true">✦</span>
        <span>Ghar ka khana. Tiffin mein.</span>
      </div>
      <header className="site-header">
        <Link className="logo-link" to="/" onClick={() => setOpen(false)}>
          <BrandMark />
        </Link>

        <nav className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Primary navigation">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          ))}
          <a
            className="button button-small nav-order"
            href={whatsappHref()}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            <MessageCircle size={18} />
            Order on WhatsApp
          </a>
        </nav>

        <button
          className="menu-toggle"
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X /> : <MenuIcon />}
        </button>
      </header>
    </>
  )
}

function Eyebrow({ children, light = false }) {
  return <p className={light ? 'eyebrow eyebrow-light' : 'eyebrow'}>{children}</p>
}

function OrderButton({ className = '', message, children = 'Order on WhatsApp' }) {
  return (
    <a
      className={`button ${className}`.trim()}
      href={whatsappHref(message)}
      target="_blank"
      rel="noreferrer"
    >
      <MessageCircle size={20} />
      {children}
      <ArrowRight size={18} />
    </a>
  )
}

function HomePage() {
  return (
    <main>
      <section className="home-hero shell">
        <div className="hero-copy">
          <Eyebrow light>Hot • Homely • Happily sorted</Eyebrow>
          <h1>Lunch that feels like <em>home.</em></h1>
          <p className="hero-lede">
            Familiar Indian meals, packed with warmth and made for everyday lunch breaks.
            Simple khana. Full satisfaction.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/menu">
              See the menu
              <ArrowRight size={19} />
            </Link>
            <OrderButton className="button-cream">Order a dabba</OrderButton>
          </div>
          <div className="hero-meta" aria-label="Service highlights">
            <span><CalendarDays size={18} /> Monday–Saturday</span>
            <span><Sparkles size={18} /> 2-week variety</span>
          </div>
        </div>

        <div className="hero-art" aria-label="Illustrated Garam Dabba meals">
          <img src="/garam-dabba-art.png" alt="Hand-drawn Indian tiffin boxes filled with homestyle food" />
          <div className="hero-sticker">
            <span>Aaj ka lunch?</span>
            <strong>Sorted.</strong>
          </div>
        </div>
      </section>

      <div className="marquee" aria-label="Garam Dabba qualities">
        <div>
          <span>Ghar jaisa</span><b>✦</b><span>Full of flavour</span><b>✦</b>
          <span>Everyday comfort</span><b>✦</b><span>Dabba kholke dekho</span><b>✦</b>
        </div>
      </div>

      <section className="section shell home-intro">
        <div>
          <Eyebrow>Why Garam Dabba</Eyebrow>
          <h2>Your everyday lunch, with actual personality.</h2>
        </div>
        <div className="intro-copy">
          <p>
            Garam Dabba is built around that first happy moment of opening a hot tiffin:
            familiar food, a generous plate and the comfort of knowing lunch is handled.
          </p>
          <Link className="text-link" to="/about">
            Meet Garam Dabba <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="features shell" aria-label="What makes Garam Dabba special">
        <article className="feature-card feature-red">
          <div className="feature-icon"><Heart /></div>
          <span className="card-number">01</span>
          <h3>Feels familiar</h3>
          <p>Dal, rajma, kadhi, parathas and the food you already love coming home to.</p>
        </article>
        <article className="feature-card feature-mustard">
          <div className="feature-icon"><Package /></div>
          <span className="card-number">02</span>
          <h3>A complete dabba</h3>
          <p>Main dish, seasonal sabzi and thoughtful sides—all together, no overthinking.</p>
        </article>
        <article className="feature-card feature-cream">
          <div className="feature-icon"><Leaf /></div>
          <span className="card-number">03</span>
          <h3>Simple & honest</h3>
          <p>No fancy food jargon. Just a satisfying Indian lunch with plenty of character.</p>
        </article>
      </section>

      <section className="section menu-teaser">
        <div className="shell">
          <div className="section-heading heading-row">
            <div>
              <Eyebrow>What’s in the dabba</Eyebrow>
              <h2>A week full of favourites.</h2>
            </div>
            <Link className="button button-outline" to="/menu">
              Full 2-week menu <ArrowRight size={18} />
            </Link>
          </div>

          <div className="teaser-grid">
            {menu['Week 1'].slice(0, 3).map((item, index) => (
              <article className="teaser-card" key={item.day}>
                <span className="teaser-day">0{index + 1} / {item.day}</span>
                <h3>{item.main}</h3>
                <p>{item.veg}</p>
                <div className="teaser-sides">{item.sides}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CallToAction />
    </main>
  )
}

const values = [
  {
    icon: Heart,
    title: 'Warm',
    text: 'Welcoming, comforting and always close to the feeling of a meal made with care.',
  },
  {
    icon: Sparkles,
    title: 'Playful',
    text: 'Bold colour, friendly language and plenty of character—without trying too hard.',
  },
  {
    icon: Package,
    title: 'Generous',
    text: 'A proper lunch should leave you happy, satisfied and ready for the rest of your day.',
  },
  {
    icon: Leaf,
    title: 'Honest',
    text: 'Recognisable dishes, simple words and everyday Indian food at the centre of it all.',
  },
]

function AboutPage() {
  return (
    <main>
      <section className="page-hero about-hero">
        <div className="shell page-hero-grid">
          <div className="page-hero-copy">
            <Eyebrow light>Our story</Eyebrow>
            <h1>A hot dabba. A homely feeling.</h1>
            <p>
              We’re here to make everyday Indian lunch feel familiar, satisfying and full of care.
            </p>
          </div>
          <div className="about-hero-art">
            <img src="/garam-dabba-art.png" alt="Hand-drawn Indian tiffin boxes filled with homestyle food" />
          </div>
        </div>
      </section>

      <section className="section shell story-grid">
        <div className="story-title">
          <Eyebrow>What we believe</Eyebrow>
          <h2>Good lunch doesn’t need to be complicated.</h2>
        </div>
        <div className="story-copy">
          <p className="story-lede">
            Garam Dabba began with one simple idea: lunch should feel like opening a tiffin
            packed by someone who knows what you like.
          </p>
          <p>
            Our world is rooted in everyday Indian food culture—colourful, comforting and
            completely unpretentious. It’s made for busy workdays, study breaks and every
            “aaj lunch mein kya hai?” in between.
          </p>
          <p>
            We keep the food familiar and the experience cheerful, because a small moment
            of comfort in the middle of the day goes a long way.
          </p>
        </div>
      </section>

      <section className="values-section">
        <div className="shell">
          <div className="section-heading centered-heading">
            <Eyebrow>Our personality</Eyebrow>
            <h2>This is how we show up.</h2>
          </div>
          <div className="values-grid">
            {values.map(({ icon: Icon, title, text }, index) => (
              <article className="value-card" key={title}>
                <span className="value-index">0{index + 1}</span>
                <Icon aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section shell promise-grid">
        <div className="promise-art">
          <img src="/garam-dabba-art.png" alt="Hand-drawn homestyle Indian meal boxes" />
          <div className="promise-note">Made for real lunch breaks.</div>
        </div>
        <div className="promise-copy">
          <Eyebrow>The Garam Dabba promise</Eyebrow>
          <h2>Food first. Always.</h2>
          <p>
            We want every part of Garam Dabba to carry the same feeling as the meal itself:
            warm, straightforward and unmistakably Indian.
          </p>
          <ul className="check-list">
            <li><Check /> Familiar meals with a changing two-week rhythm</li>
            <li><Check /> Seasonal vegetables chosen around freshness</li>
            <li><Check /> Friendly ordering, without unnecessary fuss</li>
          </ul>
          <Link className="text-link" to="/menu">
            Explore the lunch menu <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <CallToAction title="Hungry already? That makes two of us." />
    </main>
  )
}

function MenuPage() {
  const [activeWeek, setActiveWeek] = useState('Week 1')

  return (
    <main>
      <section className="menu-page-hero">
        <div className="shell menu-hero-inner">
          <div>
            <Eyebrow light>2-week lunch menu</Eyebrow>
            <h1>Har din, kuch ghar jaisa.</h1>
          </div>
          <p>
            Six lunches a week. Plenty of familiar favourites. One less thing to think about.
          </p>
        </div>
      </section>

      <section className="menu-section shell">
        <div className="week-switcher" role="tablist" aria-label="Choose menu week">
          {Object.keys(menu).map((week) => (
            <button
              key={week}
              type="button"
              role="tab"
              aria-selected={activeWeek === week}
              className={activeWeek === week ? 'week-tab is-active' : 'week-tab'}
              onClick={() => setActiveWeek(week)}
            >
              <span>{week}</span>
              <small>{week === 'Week 1' ? 'Dal, chole, rajma & more' : 'Bhindi, pulao, parathas & more'}</small>
            </button>
          ))}
        </div>

        <div className="active-week-heading">
          <div>
            <Eyebrow>{activeWeek} / Monday–Saturday</Eyebrow>
            <h2>Your lunch line-up.</h2>
          </div>
          <span className="veg-badge"><span>●</span> Vegetarian menu</span>
        </div>

        <div className="menu-grid" role="tabpanel">
          {menu[activeWeek].map((item, index) => (
            <article className={item.special ? 'menu-card is-special' : 'menu-card'} key={`${activeWeek}-${item.day}`}>
              <div className="menu-card-top">
                <span className="menu-index">0{index + 1}</span>
                <span className="menu-day">{item.day}</span>
                {item.special && <span className="special-label">Friday favourite</span>}
              </div>
              <div className="menu-main-row">
                <div>
                  <span className="menu-label">Main dish</span>
                  <h3>{item.main}</h3>
                </div>
                <Flame aria-hidden="true" />
              </div>
              <div className="menu-detail">
                <span className="menu-label">Seasonal / supporting veg</span>
                <p>{item.veg}</p>
              </div>
              <div className="menu-sides">
                <Utensils size={17} />
                <span>{item.sides}</span>
              </div>
              <OrderButton
                className="menu-order-link"
                message={`Hi Garam Dabba! I would like to order the ${item.day} ${activeWeek} lunch with ${item.main}. 🍱`}
              >
                Order this dabba
              </OrderButton>
            </article>
          ))}
        </div>

        <div className="seasonal-note">
          <Leaf />
          <p><strong>A small seasonal note</strong> Seasonal vegetables may change based on freshness and availability.</p>
        </div>
      </section>

      <section className="how-section">
        <div className="shell">
          <div className="section-heading centered-heading">
            <Eyebrow>Lunch, sorted</Eyebrow>
            <h2>From menu to dabba in three taps.</h2>
          </div>
          <div className="how-grid">
            <article>
              <span>1</span>
              <CalendarDays />
              <h3>Pick your lunch</h3>
              <p>Choose your day and the dabba that sounds good.</p>
            </article>
            <ChevronRight className="how-arrow" />
            <article>
              <span>2</span>
              <MessageCircle />
              <h3>Tap WhatsApp</h3>
              <p>Your order message opens ready for you to send.</p>
            </article>
            <ChevronRight className="how-arrow" />
            <article>
              <span>3</span>
              <Clock3 />
              <h3>Lunch is sorted</h3>
              <p>Confirm the details with us and get back to your day.</p>
            </article>
          </div>
        </div>
      </section>

      <CallToAction title="Aaj ka dabba is calling." />
    </main>
  )
}

function CallToAction({ title = 'Ready for a proper lunch?' }) {
  return (
    <section className="cta-section">
      <div className="shell cta-inner">
        <div>
          <Eyebrow light>Garam hai. Ghar jaisa hai.</Eyebrow>
          <h2>{title}</h2>
          <p>Tell us what you’d like. Your WhatsApp message is already packed and ready.</p>
        </div>
        <OrderButton className="button-cream">Chat & order</OrderButton>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <BrandMark />
          <p>Ghar ka khana. Tiffin mein.</p>
        </div>
        <div className="footer-links">
          <p>Explore</p>
          <Link to="/about">Our story</Link>
          <Link to="/menu">Lunch menu</Link>
        </div>
        <div className="footer-links">
          <p>Hungry?</p>
          <a href={whatsappHref()} target="_blank" rel="noreferrer">Order on WhatsApp</a>
          <span>Monday–Saturday</span>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} Garam Dabba</span>
        <span>Made with warmth, served with character. 🍱</span>
      </div>
    </footer>
  )
}

function WhatsAppFloat() {
  return (
    <a
      className="whatsapp-float"
      href={whatsappHref()}
      target="_blank"
      rel="noreferrer"
      aria-label="Order on WhatsApp"
    >
      <MessageCircle />
      <span>Order on WhatsApp</span>
    </a>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <SiteHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
      <SiteFooter />
      <WhatsAppFloat />
    </BrowserRouter>
  )
}

export default App
