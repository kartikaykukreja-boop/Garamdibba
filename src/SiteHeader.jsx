'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu as MenuIcon, MessageCircle, Phone, X } from 'lucide-react'
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_SHORT, PHONE_HREF, whatsappHref } from './siteData.js'
import { BrandMark } from './site.jsx'

const links = [
  { to: '/menu', label: 'Menu' },
  { to: '/meal-plans', label: 'Meal plans' },
  { to: '/tiffin-service-dehradun', label: 'Tiffin in Dehradun' },
  { to: '/tiffin-delivery-dehradun', label: 'Delivery' },
  { to: '/about', label: 'Our story' },
  { to: '/contact', label: 'Contact' },
]

export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isActive = (to) => pathname === to || pathname.startsWith(`${to}/`)

  return (
    <>
      <div className="announcement">
        <a className="announcement-phone" href={PHONE_HREF}>
          <Phone size={13} aria-hidden="true" />
          Call or WhatsApp {CONTACT_PHONE_DISPLAY}
        </a>
        <span className="announcement-dot" aria-hidden="true">✦</span>
        <span className="announcement-extra">Vegetarian tiffin delivery in Dehradun, Monday–Saturday</span>
      </div>
      <header className="site-header">
        <Link className="logo-link" href="/" onClick={() => setOpen(false)}>
          <BrandMark />
        </Link>

        <nav className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Primary navigation">
          {links.map((link) => (
            <Link
              key={link.to}
              href={link.to}
              onClick={() => setOpen(false)}
              className={isActive(link.to) ? 'nav-link is-active' : 'nav-link'}
              aria-current={isActive(link.to) ? 'page' : undefined}
            >
              {link.label}
            </Link>
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

        <div className="header-actions">
          <a className="header-phone" href={PHONE_HREF} aria-label={`Call Garam Dibba on ${CONTACT_PHONE_DISPLAY}`}>
            <Phone size={17} aria-hidden="true" />
            <span className="header-phone-full">{CONTACT_PHONE_DISPLAY}</span>
            <span className="header-phone-short">{CONTACT_PHONE_SHORT}</span>
          </a>
          <button
            className="menu-toggle"
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X /> : <MenuIcon />}
          </button>
        </div>
      </header>
    </>
  )
}
