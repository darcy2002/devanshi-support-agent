import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = (req.headers as Record<string, string>)['authorization']
            if (auth) proxyReq.setHeader('Authorization', auth)
          })
        },
      },
      '/auth': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
