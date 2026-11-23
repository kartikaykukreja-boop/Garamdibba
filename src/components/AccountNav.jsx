import Link from 'next/link'

// Tabs shown at the top of every signed-in page. Links depend on the user's roles.
export default function AccountNav({ profile, active }) {
  const links = [
    { href: '/order', label: 'Order' },
    { href: '/orders', label: 'My orders' },
    { href: '/account', label: 'Account' },
  ]
  if (profile.company_role === 'hr') links.push({ href: '/company', label: 'Company' })
  if (profile.role === 'rider' || profile.role === 'admin') links.push({ href: '/rider', label: 'Rider' })
  if (profile.role === 'admin') links.push({ href: '/admin', label: 'Kitchen admin' })

  return (
    <nav className="account-nav" aria-label="Account">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={active === link.href ? 'is-active' : undefined}
          aria-current={active === link.href ? 'page' : undefined}
        >
          {link.label}
        </Link>
      ))}
      <form action="/auth/signout" method="post">
        <button type="submit">Sign out</button>
      </form>
    </nav>
  )
}
