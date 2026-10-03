import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Link previews (Open Graph) need absolute URLs, so index.html uses __SITE_URL__, filled in at build time
  // from VITE_SITE_URL, e.g. https://drsarkar.in
  const siteUrl = (loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL || 'http://localhost:5173').replace(/\/+$/, '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'site-url',
        transformIndexHtml: (html: string) => html.replaceAll('__SITE_URL__', siteUrl),
      },
    ],
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  }
})
