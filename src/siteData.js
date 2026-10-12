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

export const proteinBowlPlans = [
  { id: 'bowl-1-day', name: '1-Day Plan', short: '1 Day', price: 180, boxes: 1, total: 180, note: 'One protein bowl.' },
  { id: 'bowl-3-day', name: '3-Day Plan', short: '3 Days', price: 160, boxes: 3, total: 480, note: 'Three bowls across three delivery days.' },
  { id: 'bowl-1-week', name: '1-Week Plan', short: '1 Week', price: 145, boxes: 6, total: 870, note: 'Six bowls, Monday to Saturday.' },
  { id: 'bowl-2-week', name: '2-Week Plan', short: '2 Weeks', price: 130, boxes: 12, total: 1560, note: 'Twelve bowls across two weeks.', best: true },
]

export const bowls = [
  {
    slug: 'hot-and-sour-paneer',
    name: 'Hot & Sour Paneer Bowl',
    style: 'Modern flavours',
    protein: 26,
    blurb: 'Paneer and vegetables in a bold hot-and-sour sauce, served with rice and spring onion.',
    alt: 'Hot and Sour Paneer Bowl with paneer, vegetables, rice and spring onion',
  },
  {
    slug: 'tandoori-malai-paneer',
    name: 'Tandoori Malai Paneer',
    style: 'Indian favourite',
    protein: 26,
    blurb: 'Char-grilled paneer with a creamy, mildly spiced sauce, mushrooms and greens.',
    alt: 'Tandoori Malai Paneer bowl with grilled paneer, creamy orange sauce, mushrooms, broccoli and rice',
  },
  {
    slug: 'pindi-chole',
    name: 'Pindi Chole',
    style: 'Indian favourite',
    protein: 26,
    blurb: 'Deep, robustly spiced chickpeas with rice, pickled onion and ginger.',
    alt: 'Pindi Chole bowl with spiced chickpeas, rice, pickled onion rings and ginger juliennes',
  },
  {
    slug: 'paneer-lababdar',
    name: 'Paneer Lababdar',
    style: 'Indian favourite',
    protein: 26,
    blurb: 'Soft paneer in a rich, chunky onion-tomato gravy, served with rice.',
    alt: 'Paneer Lababdar bowl with paneer cubes in a rich onion-tomato gravy beside steamed rice',
  },
  {
    slug: 'tex-mex',
    name: 'Tex-Mex Bowl',
    style: 'Modern flavours',
    protein: 30,
    blurb: 'Spiced paneer with peppers, black beans and corn, finished with a creamy drizzle.',
    alt: 'Tex-Mex bowl with spiced paneer, peppers, black beans, corn and a creamy drizzle beside rice',
  },
  {
    slug: 'paneer-pasanda',
    name: 'Paneer Pasanda Bowl',
    style: 'Indian favourite',
    protein: 26,
    blurb: 'Paneer in a rich, creamy onion-tomato gravy, served with fragrant rice and pickled onion.',
    alt: 'Paneer Pasanda Bowl with paneer in creamy gravy, rice and pickled onion',
  },
  {
    slug: 'pesto-paneer',
    name: 'Pesto Paneer Bowl',
    style: 'Modern flavours',
    protein: 26,
    blurb: 'Paneer coated in a fresh, herby pesto, served over rice.',
    alt: 'Pesto Paneer bowl with pesto-coated paneer cubes and basil over rice',
  },
  {
    slug: 'korean-paneer',
    name: 'Korean Paneer Bowl',
    style: 'Modern flavours',
    protein: 26,
    blurb: 'Glossy, sweet-spicy Korean-style paneer with peppers, onion and sesame.',
    alt: 'Korean Paneer bowl with glossy paneer, peppers, red onion, sesame and spring onion beside rice',
  },
].map((bowl) => ({ ...bowl, image: `/bowls/${bowl.slug}.jpg` }))

export const proteinBowlRotation = [
  { day: 'Monday', bowl: 'Hot & Sour Paneer Bowl' },
  { day: 'Tuesday', bowl: 'Pindi Chole' },
  { day: 'Wednesday', bowl: 'Paneer Pasanda Bowl' },
  { day: 'Thursday', bowl: 'Tex-Mex Bowl' },
  { day: 'Friday', bowl: 'Pesto Paneer Bowl' },
  { day: 'Saturday', bowl: 'Paneer Lababdar' },
]

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
    a: 'Protein bowl plans run from ₹130 to ₹180 per box. The separate North Indian lunch plans run from ₹110 to ₹180 per box.',
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
      'Explore eight vegetarian protein bowls, a Monday-to-Saturday bowl rotation and a separate two-week North Indian lunch menu in Dehradun.',
  },
  '/meal-plans': {
    title: 'Tiffin Plans & Prices in Dehradun | Garam Dibba',
    description:
      'Compare separate protein bowl and North Indian lunch plans in Dehradun, with delivery Monday to Saturday and protein bowl plans from ₹130 per box.',
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
