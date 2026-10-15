// Static imports let next/image read each photo's dimensions at build time,
// generate blur placeholders and serve resized AVIF/WebP versions.
import hotAndSourPaneer from '../public/bowls/hot-and-sour-paneer.jpg'
import tandooriMalaiPaneer from '../public/bowls/tandoori-malai-paneer.jpg'
import pindiChole from '../public/bowls/pindi-chole.jpg'
import paneerLababdar from '../public/bowls/paneer-lababdar.jpg'
import texMex from '../public/bowls/tex-mex.jpg'
import paneerPasanda from '../public/bowls/paneer-pasanda.jpg'
import pestoPaneer from '../public/bowls/pesto-paneer.jpg'
import koreanPaneer from '../public/bowls/korean-paneer.jpg'
import heroBowl from '../public/hero-bowl.png'
import founder from '../public/founder.jpg'
import founderWide from '../public/founder-wide.jpg'
import garamDabbaArt from '../public/garam-dabba-art.png'
import whatsappQr from '../public/whatsapp-qr-card.png'
import rajmaChawal from '../public/gallery/dibba-rajma-chawal.jpg'
import choleBhature from '../public/gallery/dibba-chole-bhature.jpg'
import alooParatha from '../public/gallery/dibba-aloo-paratha.jpg'
import poha from '../public/gallery/dibba-poha.jpg'
import idliVadaSambar from '../public/gallery/dibba-idli-vada-sambar.jpg'
import vadaPav from '../public/gallery/dibba-vada-pav.jpg'
import vadaPavChutney from '../public/gallery/dibba-vada-pav-chutney.jpg'
import friedRiceManchurian from '../public/gallery/dibba-fried-rice-manchurian.jpg'

export const bowlImages = {
  'hot-and-sour-paneer': hotAndSourPaneer,
  'tandoori-malai-paneer': tandooriMalaiPaneer,
  'pindi-chole': pindiChole,
  'paneer-lababdar': paneerLababdar,
  'tex-mex': texMex,
  'paneer-pasanda': paneerPasanda,
  'pesto-paneer': pestoPaneer,
  'korean-paneer': koreanPaneer,
}

export const photos = {
  heroBowl,
  founder,
  founderWide,
  garamDabbaArt,
  whatsappQr,
  rajmaChawal,
  alooParatha,
}

export const dishGallery = [
  { src: rajmaChawal, alt: 'Rajma chawal thali with pickled onion and green chutney' },
  { src: choleBhature, alt: 'Chole bhature with fluffy fried bhature' },
  { src: alooParatha, alt: 'Buttery aloo paratha served with fresh curd and paneer cubes' },
  { src: poha, alt: 'Poha with peanuts, onion and coriander' },
  { src: idliVadaSambar, alt: 'Idli and vada with hot sambar and coconut chutney' },
  { src: vadaPav, alt: 'Mumbai-style vada pav with spiced potato filling' },
  { src: vadaPavChutney, alt: 'Vada pav with green chutney, dry garlic chutney and pickled onion' },
  { src: friedRiceManchurian, alt: 'Spiced fried rice with vegetable manchurian gravy' },
]
