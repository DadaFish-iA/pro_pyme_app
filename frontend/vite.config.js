import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// En desarrollo el backend corre aparte (uvicorn:8001) y en producción
// nginx hace de proxy. En ambos casos el frontend usa rutas relativas.
const BACKEND = process.env.VITE_BACKEND_URL || 'http://localhost:8001'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Pro Pyme ERP',
        short_name: 'ProPyme',
        description: 'ERP Simplificado para Pymes Chilenas',
        theme_color: '#05070a',
        background_color: '#05070a',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 5176,
    strictPort: true,
    host: true, // Permite acceso desde celulares en la misma red Wi-Fi
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/static': { target: BACKEND, changeOrigin: true },
    },
  }
})
