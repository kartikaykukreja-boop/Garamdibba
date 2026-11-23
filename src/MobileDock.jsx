'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageCircle, Package, ShoppingBag, Utensils } from 'lucide-react'
import { whatsappHref } from './siteData.js'

const items = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/menu', label: 'Menu', icon: Utensils },
  { href: '/order', label: 'Order', icon: ShoppingBag, primary: true },
  { href: '/orders', label: 'My orders', icon: Package },
]

export default function MobileDock() {
  const pathname = usePathname()
  const isActive = (href) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))

  return (
    <nav className="mobile-dock" aria-label="Quick navigation">
      {items.map(({ href, label, icon: Icon, primary }) => (
        <Link
          className={`mobile-dock-link${primary ? ' mobile-dock-primary' : ''}${isActive(href) ? ' is-active' : ''}`}
          href={href}
          aria-current={isActive(href) ? 'page' : undefined}
          key={href}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
      <a
        className="mobile-dock-link mobile-dock-order"
        href={whatsappHref()}
        target="_blank"
        rel="noreferrer"
      >
        <MessageCircle aria-hidden="true" />
        <span>WhatsApp</span>
      </a>
    </nav>
  )
}
