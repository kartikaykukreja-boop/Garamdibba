// Photo for a dish in the order flow. Safe to import in client components.
import { bowlImages, photos } from './images.js'

export const menuImages = {
  north_indian: photos.rajmaChawal,
  protein_bowl: bowlImages['paneer-lababdar'],
}

// dish comes from catalog.dishFor(): { name, bowlSlug? }
export function dishImage(menu, dish) {
  if (menu === 'protein_bowl') return bowlImages[dish?.bowlSlug] ?? menuImages.protein_bowl
  return /paratha/i.test(dish?.name ?? '') ? photos.alooParatha : photos.rajmaChawal
}
