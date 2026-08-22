import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function spaFallback() {
  return {
    name: 'spa-fallback',
    closeBundle() {
      const dist = path.resolve('dist')
      const index = path.join(dist, 'index.html')
      const fallback = path.join(dist, '404.html')
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, fallback)
        console.log('SPA fallback copied: dist/index.html -> dist/404.html')
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback()],
  base: '/usa-super-store/',
})
