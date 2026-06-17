import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icons/*.png',
          'favicon.png',
          'logo light mode.png',
          'logo dark mode.png',
        ],
        manifest: {
          name: 'Loopzy',
          short_name: 'Loopzy',
          description: 'Build consistency one loop at a time.',
          theme_color: '#4F46E5',
          background_color: '#4F46E5',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/icon-192x192-maskable.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icons/icon-512x512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/.*\/.*\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60},
              },
            },
            {
              urlPattern: /^https?:\/\/.*\/.*\.(?:woff|woff2|ttf|eot)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts',
                expiration: {maxEntries: 10, maxAgeSeconds: 60 * 24 * 60 * 60},
              },
            },
            {
              urlPattern: /^https?:\/\/.*/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {maxEntries: 100, maxAgeSeconds: 24 * 60 * 60},
                networkTimeoutSeconds: 5,
              },
            },
          ],
        },
      }),
    ],
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
