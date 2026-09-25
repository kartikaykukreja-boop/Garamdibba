'use client'

import { useState } from 'react'
import { Flame, Leaf, Utensils } from 'lucide-react'
import { northIndianMenu } from './siteData.js'
import { OrderButton } from './site.jsx'

export default function NorthIndianWeeks() {
  const [activeWeek, setActiveWeek] = useState('Week 1')

  return (
    <>
      <div className="week-switcher" role="tablist" aria-label="Choose menu week">
        {Object.keys(northIndianMenu).map((week) => (
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

      <div className="menu-grid" role="tabpanel">
        {northIndianMenu[activeWeek].map((item, index) => (
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
              message={`Hi Garam Dibba! I would like to order the ${item.day} ${activeWeek} North Indian lunch with ${item.main}. 🍱`}
            >
              Order this dibba
            </OrderButton>
          </article>
        ))}
      </div>

      <div className="seasonal-note">
        <Leaf />
        <p><strong>A small seasonal note</strong> Seasonal vegetables may change based on freshness and availability.</p>
      </div>
    </>
  )
}
