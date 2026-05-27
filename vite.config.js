import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://breathe-esg-backend-77b2.onrender.com',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
