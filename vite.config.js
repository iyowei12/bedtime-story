import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const base = mode === 'production' ? '/bedtime-story/' : '/'

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
        },
        manifest: {
          id: base,
          name: '睡前故事產生器 Bedtime Story',
          short_name: '睡前故事',
          description: '把故事書變成專屬睡前故事',
          theme_color: '#0a1930',
          background_color: '#0a1930',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'zh-Hant',
          start_url: base,
          scope: base,
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        devOptions: {
          enabled: true
        }
      })
    ],
    server: {
      open: true
    }
  }
})
