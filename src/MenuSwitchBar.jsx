'use client'

import { useEffect, useState } from 'react'

const sections = [
  { id: 'protein-bowls', label: 'Protein Bowls', note: '8 bowls' },
  { id: 'north-indian', label: 'North Indian Lunch', note: '2-week menu' },
]

// Sticks under the site header while either menu is on screen and marks the one being read.
export default function MenuSwitchBar() {
  const [active, setActive] = useState(sections[0].id)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    sections.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <nav className="menu-switch" aria-label="Switch menu">
      <div className="shell menu-switch-inner">
        <span className="menu-switch-label">Two menus</span>
        <div className="menu-switch-pills">
          {sections.map(({ id, label, note }) => (
            <a
              key={id}
              href={`#${id}`}
              className={active === id ? 'menu-switch-pill is-active' : 'menu-switch-pill'}
              aria-current={active === id ? 'true' : undefined}
              onClick={() => setActive(id)}
            >
              <strong>{label}</strong>
              <small>{note}</small>
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
