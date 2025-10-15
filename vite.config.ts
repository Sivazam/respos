import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
    strictPort: false,
    hmr: {
      port: 3000,
    },
    cors: true,
    allowedHosts: [
      'ws-feb-b-c-dbb-oxrsrxlavf.cn-hongkong-vpc.fcapp.run',
      'ws-b-c-d-bb-pwzglxvcvz.cn-hongkong-vpc.fcapp.run',
      'ws-d-ffae-cdcdd-lwxvkcwlet.cn-hongkong-vpc.fcapp.run',
      'ws-be-e-a-fceba-oiwnlcyzsw.cn-hongkong-vpc.fcapp.run',
      'ws-ceb-df-bccfd-pdrrsfijwt.cn-hongkong-vpc.fcapp.run',
      'localhost',
      '127.0.0.1',
      '.space.z.ai'
    ],
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
  },
});
