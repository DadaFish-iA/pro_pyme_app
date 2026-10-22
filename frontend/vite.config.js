import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Pro Pyme ERP',
        short_name: 'ProPyme',
        description: 'ERP Simplificado para Pymes Chilenas',
        theme_color: '#05070a',
        background_color: '#05070a',
        display: 'standalone', // Esto hace que se abra sin barra de direcciones
        icons: [
          {
            src: 'vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'vite.svg',
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
    host: true // Permite acceso desde celulares en la misma red Wi-Fi
  }
})