import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // ── Production build settings ──────────────────────
  build: {
    outDir: 'dist',
    // Optimise chunk splitting for better caching on CloudFront
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) requires manualChunks to be a function
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor'
          }
          if (id.includes('node_modules/react-router')) {
            return 'router'
          }
        },
      },
    },
    // Warn if any individual chunk exceeds 1MB
    chunkSizeWarningLimit: 1000,
    // Generate source maps for production debugging (set false to hide source)
    sourcemap: false,
  },

  // ── Dev server settings ────────────────────────────
  server: {
    port: 5173,
    // Proxy API calls to Spring Boot during local development
    // Replace target with your Spring Boot server URL
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // ── Preview (vite preview) settings ───────────────
  preview: {
    port: 4173,
  },
})
