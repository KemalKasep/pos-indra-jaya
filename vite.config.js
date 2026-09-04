import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Otomatis update aplikasi jika ada versi baru
      manifest: {
        name: 'Kasir Indra Jaya Pusat',
        short_name: 'Indra Jaya',
        description: 'Sistem POS Kasir Indra Jaya Pusat',
        theme_color: '#1e293b',
        background_color: '#f1f5f9',
        display: 'standalone', // Membuatnya full screen tanpa address bar
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})