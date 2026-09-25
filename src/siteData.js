// Shared site content: contact details, menu, plans, FAQs and per-page SEO.

export const SITE_URL = 'https://garamdibba.com'
export const WHATSAPP_NUMBER = '919690223377'
export const CONTACT_PHONE_DISPLAY = '+91 96902 23377'
export const CONTACT_PHONE_SHORT = '96902 23377'
export const CONTACT_EMAIL = 'udaikukreja@garamdibba.com'
export const PHONE_HREF = `tel:+${WHATSAPP_NUMBER}`
export const CHECK_DELIVERY_MESSAGE =
  'Hi Garam Dibba! Do you currently deliver to my area in Dehradun? My location is: '

export function whatsappHref(message = 'Hi Garam Dibba! I would like to order a tiffin. 🍱') {
  const number = WHATSAPP_NUMBER.replace(/\D/g, '')
  return `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`
}

// Add verified delivery areas here, e.g. ['Rajpur Road', 'Clement Town'].
// While empty, pages ask customers to check availability on WhatsApp instead.
export const DELIVERY_AREAS = []

export const plans = [
  { id: '1-day', name: '1-Day Plan', short: '1-Day', price: 180, note: 'Need a meal for today? Start here.' },
  { id: '3-day', name: '3-Day Plan', short: '3-Day', price: 150, note: 'Try a few different meals.' },
  { id: '1-week', name: '1-Week Plan', short: '1-Week', price: 130, note: 'Your meals, sorted for the week.' },
  { id: '2-week', name: '2-Week Plan', short: '2-Week', price: 120, note: 'Planning a little further ahead.' },
  { id: '4-week', name: '4-Week Plan', short: '4-Week', price: 110, note: 'A longer-term tiffin routine.', best: true },
]

export const bowls = [
  {
    slug: 'tangy-tomato',
    name: 'Tangy Tomato',
    style: 'Indian favourite',
    blurb: 'Grilled paneer with sautéed mushrooms and a bright, tangy tomato and pepper sauce.',
    alt: 'Tangy Tomato bowl with grilled paneer strips, sautéed mushrooms, tomato and pepper sauce and rice',
  },
  {
    slug: 'tandoori-malai-paneer',
    name: 'Tandoori Malai Paneer',
    style: 'Indian favourite',
    blurb: 'Char-grilled paneer with a creamy, mildly spiced sauce, mushrooms and greens.',
    alt: 'Tandoori Malai Paneer bowl with grilled paneer, creamy orange sauce, mushrooms, broccoli and rice',
  },
  {
    slug: 'pindi-chole',
    name: 'Pindi Chole',
    style: 'Indian favourite',
    blurb: 'Deep, robustly spiced chickpeas with rice, pickled onion and ginger.',
    alt: 'Pindi Chole bowl with spiced chickpeas, rice, pickled onion rings and ginger juliennes',
  },
  {
    slug: 'paneer-lababdar',
    name: 'Paneer Lababdar',
    style: 'Indian favourite',
    blurb: 'Soft paneer in a rich, chunky onion-tomato gravy, served with rice.',
    alt: 'Paneer Lababdar bowl with paneer cubes in a rich onion-tomato gravy beside steamed rice',
  },
  {
    slug: 'tex-mex',
    name: 'Tex-Mex Bowl',
    style: 'Modern flavours',
    blurb: 'Spiced paneer with peppers, black beans and corn, finished with a creamy drizzle.',
    alt: 'Tex-Mex bowl with spiced paneer, peppers, black beans, corn and a creamy drizzle beside rice',
  },
  {
    slug: 'peri-peri-paneer',
    name: 'Peri-Peri Paneer Bowl',
    style: 'Modern flavours',
    blurb: 'Paneer tossed in a fiery peri-peri glaze over a bed of rice.',
    alt: 'Peri-Peri Paneer bowl with glazed paneer cubes over rice',
  },
  {
    slug: 'pesto-paneer',
    name: 'Pesto Paneer Bowl',
    style: 'Modern flavours',
    blurb: 'Paneer coated in a fresh, herby pesto, served over rice.',
    alt: 'Pesto Paneer bowl with pesto-coated paneer cubes and basil over rice',
  },
  {
    slug: 'korean-paneer',
    name: 'Korean Paneer Bowl',
    style: 'Modern flavours',
    blurb: 'Glossy, sweet-spicy Korean-style paneer with peppers, onion and sesame.',
    alt: 'Korean Paneer bowl with glossy paneer, peppers, red onion, sesame and spring onion beside rice',
  },
].map((bowl) => ({ ...bowl, image: `/bowls/${bowl.slug}.jpg` }))

export const bowlNames = bowls.map((bowl) => bowl.name)

export const northIndianMenu = {
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

export const dehradunFaqs = [
  {
    q: 'What is Garam Dibba?',
    a: 'Garam Dibba is a vegetarian tiffin and meal-delivery service in Dehradun offering modern meals and flexible meal plans.',
  },
  {
    q: 'Does Garam Dibba provide tiffin delivery in Dehradun?',
    a: 'Yes, Garam Dibba operates as a tiffin and meal-delivery service in Dehradun. Check current delivery availability for your location.',
  },
  {
    q: 'Is Garam Dibba vegetarian?',
    a: 'Yes. The current Garam Dibba menu is vegetarian.',
  },
  {
    q: 'How much does Garam Dibba cost?',
    a: 'Current plans range from ₹110 per box on the 4-Week Plan to ₹180 per box on the 1-Day Plan.',
  },
  {
    q: 'Do you offer daily tiffin?',
    a: 'Garam Dibba offers a 1-Day Plan as well as longer meal plans. Delivery operates Monday to Saturday.',
  },
  {
    q: 'Do you offer home tiffin delivery?',
    a: 'Garam Dibba provides tiffin and meal delivery based on current service availability. Check whether your area is covered before ordering.',
  },
  {
    q: 'What meals are available?',
    a: `The current menu includes ${bowlNames.slice(0, -1).join(', ')} and ${bowlNames.at(-1)}, alongside a two-week North Indian lunch menu.`,
  },
  {
    q: 'How do I order?',
    a: 'Explore the menu, choose your plan and message Garam Dibba on WhatsApp to place your order.',
  },
]

const faqSchema = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
})

export const businessSchema = {
  '@context': 'https://schema.org',
  '@type': 'FoodEstablishment',
  '@id': `${SITE_URL}/#business`,
  name: 'Garam Dibba',
  description:
    'Vegetarian tiffin and meal-delivery service in Dehradun offering protein bowls, a two-week North Indian lunch menu and flexible meal plans.',
  url: SITE_URL,
  telephone: `+${WHATSAPP_NUMBER}`,
  email: CONTACT_EMAIL,
  image: `${SITE_URL}/bowls/paneer-lababdar.jpg`,
  servesCuisine: ['Indian', 'North Indian', 'Vegetarian'],
  priceRange: '₹110–₹180 per box',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Dehradun',
    addressRegion: 'Uttarakhand',
    addressCountry: 'IN',
  },
  areaServed: { '@type': 'City', name: 'Dehradun' },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
}

// Per-route <head> content. Keys are the router paths.
export const pageMeta = {
  '/': {
    title: 'Tiffin Service in Dehradun | Garam Dibba',
    description:
      'Garam Dibba is a vegetarian tiffin service in Dehradun offering modern, protein-focused meals, flexible plans and convenient delivery.',
  },
  '/tiffin-service-dehradun': {
    title: 'Tiffin Service in Dehradun | Vegetarian Meals & Delivery | Garam Dibba',
    description:
      'Looking for a tiffin service in Dehradun? Garam Dibba offers vegetarian, protein-focused meals, flexible plans and convenient tiffin delivery.',
    schema: faqSchema(dehradunFaqs),
  },
  '/menu': {
    title: 'Vegetarian Tiffin Menu in Dehradun | Garam Dibba',
    description:
      'Explore the Garam Dibba vegetarian tiffin menu in Dehradun: eight protein bowls from Paneer Lababdar to Korean Paneer, plus a two-week North Indian lunch menu.',
  },
  '/meal-plans': {
    title: 'Tiffin Plans & Prices in Dehradun | Garam Dibba',
    description:
      'Daily, weekly and monthly vegetarian tiffin plans in Dehradun from ₹110 per box. Choose a 1-Day, 3-Day, 1-Week, 2-Week or 4-Week plan with delivery Monday to Saturday.',
  },
  '/tiffin-delivery-dehradun': {
    title: 'Tiffin Delivery in Dehradun | Garam Dibba',
    description:
      'Vegetarian tiffin delivery in Dehradun, Monday to Saturday. See how Garam Dibba delivery works and check whether we deliver to your area.',
  },
  '/vegetarian-tiffin-dehradun': {
    title: 'Vegetarian Tiffin Service in Dehradun | Garam Dibba',
    description:
      'Garam Dibba is a vegetarian tiffin service in Dehradun with eight protein bowls, a two-week North Indian lunch menu and flexible meal plans.',
  },
  '/healthy-tiffin-dehradun': {
    title: 'Healthy Tiffin Service in Dehradun | Garam Dibba',
    description:
      'Looking for a healthy tiffin service in Dehradun? Garam Dibba offers vegetarian, protein-focused meals built around convenience, variety and modern flavours.',
  },
  '/about': {
    title: 'The Person Behind Garam Dibba | Our Story',
    description:
      'Garam Dibba started with a mother wondering what her children would eat away from home. Meet the person behind Garam Dibba and Tea Time.',
  },
  '/contact': {
    title: 'Contact Garam Dibba | Tiffin Service in Dehradun',
    description:
      'Call, WhatsApp or email Garam Dibba to order vegetarian tiffin in Dehradun or check delivery availability for your area.',
  },
}
