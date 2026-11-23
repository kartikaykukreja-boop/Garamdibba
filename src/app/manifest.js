// Web app manifest (served at /manifest.webmanifest) so customers can install
// Garam Dibba on their home screen and land straight on ordering.
export default function manifest() {
  return {
    name: 'Garam Dibba',
    short_name: 'Garam Dibba',
    description: 'Order vegetarian tiffin and protein bowls in Dehradun.',
    start_url: '/order',
    scope: '/',
    display: 'standalone',
    theme_color: '#AD2517',
    background_color: '#F7EAE5',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
