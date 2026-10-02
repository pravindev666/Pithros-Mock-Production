import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'favicon-32x32.png',
          'favicon-16x16.png',
          'pithros-icon-192.jpg',
          'pithros-icon-512.jpg',
          'og-image.jpg',
          'robots.txt',
          'sitemap.xml',
        ],
        manifest: {
          name: 'Pithros — Digital Memorial & Remembrance Platform',
          short_name: 'Pithros',
          description:
            'A permanent digital place to remember a life. Create beautiful memorials, preserve memories, and connect with farewell services.',
          theme_color: '#111820',
          background_color: '#111820',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          categories: ['lifestyle', 'social'],
          lang: 'en-IN',
          dir: 'ltr',
          icons: [
            {
              src: '/pithros-icon-192.jpg',
              sizes: '192x192',
              type: 'image/jpeg',
              purpose: 'any',
            },
            {
              src: '/pithros-icon-192.jpg',
              sizes: '192x192',
              type: 'image/jpeg',
              purpose: 'maskable',
            },
            {
              src: '/pithros-icon-512.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any',
            },
            {
              src: '/pithros-icon-512.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: '/og-image.jpg',
              sizes: '1200x630',
              type: 'image/jpeg',
              label: 'Pithros — Digital Memorial Platform',
            },
          ],
        },
        workbox: {
          // Cache strategies for production
          globPatterns: ['**/*.{js,css,html,ico,jpg,png,svg,woff2}'],
          runtimeCaching: [
            {
              // Google Fonts stylesheets
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Google Fonts webfont files
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Only anonymous, non-personalised reads are cached. The service worker
              // matches routes top-down and ignores the Authorization header, so caching
              // any authenticated response would let one signed-in account replay
              // another's data on a shared browser. Public reads are safe to cache.
              urlPattern: /^https?:\/\/.*\/api\/v1\/(public\/|billing\/plans(\?|$))/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pithros-public-api-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
                networkTimeoutSeconds: 10,
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Everything else under /api/v1 is per-account or authoritative
              // (auth, billing, admin, partner, verification): never cached.
              urlPattern: /^https?:\/\/.*\/api\/v1\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              // Cloudflare R2 media (memorial images, portraits)
              urlPattern: /\.r2\.cloudflarestorage\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'pithros-r2-media',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Generate source maps for production debugging
      sourcemap: false,
    },
  };
});
