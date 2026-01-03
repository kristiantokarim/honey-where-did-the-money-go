import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    allowedHosts: ['hwdtmg.share.zrok.io'],
    port: 5173,      // Default Vite port
  }
})
