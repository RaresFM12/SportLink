import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'

const keyPath = process.env.SSL_KEY_PATH
const certPath = process.env.SSL_CERT_PATH

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    https: keyPath && certPath ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    } : undefined,
  },
  test: {
    environment: 'jsdom',
  },
})
