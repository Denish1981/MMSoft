
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()
  ],
    server: {
    host: true, // This will expose the server to your network
    proxy: {
      // Forward all requests starting with /api to your Express backend
      '/api': {
        target: 'http://localhost:4001', // Set this to your Express backend URL & port
        changeOrigin: true,
        secure: false,
      }
    }
  }
})