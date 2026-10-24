import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serve il sito sotto /Journey-Planner/
const webBase = '/Journey-Planner/'

// `vite build --mode native` prepara i file per l'app Android/iOS (Capacitor):
// percorsi relativi, nessun service worker (i file stanno già dentro l'app).
export default defineConfig(({ mode }) => {
  const native = mode === 'native'
  const base = native ? './' : webBase
  return {
  base,
  // data di costruzione: in Impostazioni si vede quale versione sta girando sul telefono
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __NATIVE__: JSON.stringify(native),
  },
  plugins: [
    preact(),
    tailwindcss(),
    VitePWA({
      // nell'app nativa il modulo virtual:pwa-register resta, ma non fa nulla
      disable: native,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-64.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Journey Planner',
        short_name: 'Journey',
        description: 'Il tuo planner di viaggio, sempre in tasca.',
        lang: 'it',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF6EE',
        theme_color: '#FAF6EE',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // le tessere di mappa già viste restano disponibili offline (nessun download in blocco)
        runtimeCaching: [
          // le foto dei luoghi già viste (miniature Wikimedia) restano disponibili offline
          {
            urlPattern: /^https:\/\/upload\.wikimedia\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'place-photos',
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: { target: 'es2022' },
  test: { environment: 'node', include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'] },
  }
})
