import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'

const defaultKeyPath = new URL('../certs/sportlink-key.pem', import.meta.url)
const defaultCertPath = new URL('../certs/sportlink-cert.pem', import.meta.url)
const keyPath = process.env.SSL_KEY_PATH ?? (fs.existsSync(defaultKeyPath) ? defaultKeyPath : undefined)
const certPath = process.env.SSL_CERT_PATH ?? (fs.existsSync(defaultCertPath) ? defaultCertPath : undefined)

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
