import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      disable: process.env.NODE_ENV === 'development',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Restaurant POS System',
        short_name: 'Restaurant POS',
        description: 'A comprehensive restaurant point-of-sale system with table management, order processing, and real-time menu updates.',
        theme_color: '#dc2626',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{css,html,ico,png,svg}'],
        globIgnores: ['**/node_modules/**', '**/dist/**'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          },
          {
            urlPattern: /\/api\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60 // 5 minutes
              }
            }
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    cors: true,
    allowedHosts: [
      'ws-fe-d-a-ae-fc-kcyplwciwz.cn-hongkong-vpc.fcapp.run',
      'ws-feb-b-c-dbb-oxrsrxlavf.cn-hongkong-vpc.fcapp.run',
      'ws-b-c-d-bb-pwzglxvcvz.cn-hongkong-vpc.fcapp.run',
      'ws-d-ffae-cdcdd-lwxvkcwlet.cn-hongkong-vpc.fcapp.run',
      'ws-be-e-a-fceba-oiwnlcyzsw.cn-hongkong-vpc.fcapp.run',
      'ws-ceb-df-bccfd-pdrrsfijwt.cn-hongkong-vpc.fcapp.run',
      'ws-fcc-fb-b-eab-mhxjvtcecy.cn-hongkong-vpc.fcapp.run',
      'ws-baaa-ae-bbdc-mlqkoeexbv.cn-hongkong-vpc.fcapp.run',
      'ws-bccf-cbcdadc-mgojwfagaa.cn-hongkong-vpc.fcapp.run',
      'ws-cb-d-acfc-jwblszagtu.cn-hongkong-vpc.fcapp.run',
      'c-692f16b4-141b8308-61ccc0221820',
      'localhost',
      'ws-bddfa-ebaada-kdvgmdgadr.cn-hongkong-vpc.fcapp.run',
      '127.0.0.1',
      '.space.z.ai',
      'preview-chat-22c56d13-ef54-4891-9e5d-1881d90feaf9.space.z.ai',
      '*.space.z.ai'
    ],
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
    allowedHosts: [
      'ws-fe-d-a-ae-fc-kcyplwciwz.cn-hongkong-vpc.fcapp.run',
      'ws-feb-b-c-dbb-oxrsrxlavf.cn-hongkong-vpc.fcapp.run',
      'ws-b-c-d-bb-pwzglxvcvz.cn-hongkong-vpc.fcapp.run',
      'ws-d-ffae-cdcdd-lwxvkcwlet.cn-hongkong-vpc.fcapp.run',
      'ws-be-e-a-fceba-oiwnlcyzsw.cn-hongkong-vpc.fcapp.run',
      'ws-ceb-df-bccfd-pdrrsfijwt.cn-hongkong-vpc.fcapp.run',
      'ws-fcc-fb-b-eab-mhxjvtcecy.cn-hongkong-vpc.fcapp.run',
      'ws-baaa-ae-bbdc-mlqkoeexbv.cn-hongkong-vpc.fcapp.run',
      'ws-bccf-cbcdadc-mgojwfagaa.cn-hongkong-vpc.fcapp.run',
      'ws-cb-d-acfc-jwblszagtu.cn-hongkong-vpc.fcapp.run',
      'c-692f16b4-141b8308-61ccc0221820',
      'localhost',
      'ws-bddfa-ebaada-kdvgmdgadr.cn-hongkong-vpc.fcapp.run',
      '127.0.0.1',
      '.space.z.ai',
      'preview-chat-22c56d13-ef54-4891-9e5d-1881d90feaf9.space.z.ai',
      '*.space.z.ai'
    ],
  },
});