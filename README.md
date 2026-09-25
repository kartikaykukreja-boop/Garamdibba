# Garam Dibba

A warm, responsive website for Garam Dibba — a vegetarian tiffin service in
Dehradun with eight protein bowls, a two-week North Indian lunch menu, flexible
meal plans and WhatsApp-first ordering.

Built with Next.js (App Router). Every page is pre-rendered to static HTML, and
all photos go through `next/image` (resized, served as AVIF/WebP, blur placeholders).

## Pages

- `/` Home: Dehradun intro, protein bowls, meal plans, the person behind Garam Dibba
- `/tiffin-service-dehradun`: main local SEO page with FAQs
- `/menu`: protein bowls and the Week 1 / Week 2 North Indian menu
- `/meal-plans`: prices and daily / weekly / monthly plans
- `/tiffin-delivery-dehradun`, `/vegetarian-tiffin-dehradun`, `/healthy-tiffin-dehradun`
- `/about`, `/contact`

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run start
```

## Content

Contact details, bowls, plans, FAQs, delivery areas and per-page titles and
descriptions live in `src/siteData.js`. Add verified delivery areas to
`DELIVERY_AREAS` to list them on the Dehradun and Delivery pages.

Bowl photos are in `public/bowls/` and are registered in `src/images.js`.

## Brand system

The site uses Garam Red, Deep Masala, Dibba Mustard, Cream and Warm Peach, with
Baloo 2, Poppins and Kalam typography.
