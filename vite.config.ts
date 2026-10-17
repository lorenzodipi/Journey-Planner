import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serve il sito sotto /Journey-Planner/
const base = '/Journey-Planner/'

export default defineConfig({
  base,
  plugins: [
    preact(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Journey Planner',
        short_name: 'Journey',
        description: 'Il tuo planner di viaggio, sempre in tasca.',
        lang: 'it',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f1e7',
        theme_color: '#c8402f',
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
      },
    }),
  ],
  build: { target: 'es2022' },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
