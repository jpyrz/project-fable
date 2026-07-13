import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.png', 'bramblewick-town.png'],
      manifest: {
        name: 'Project Fable',
        short_name: 'Fable',
        description: 'A cozy social pet-collecting world.',
        theme_color: '#68415f',
        background_color: '#fff8e8',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/app-icon.png', sizes: '1536x1536', type: 'image/png', purpose: 'any maskable' }]
      },
      workbox: { navigateFallback: '/index.html', runtimeCaching: [] }
    })
  ]
})
