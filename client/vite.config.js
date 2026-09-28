import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'require-deployment-api',
      configResolved(config) {
        if (config.command !== 'build' || process.env.VERCEL !== '1') return;
        const apiUrl = URL.parse(config.env.VITE_API_URL || '');
        if (
          !apiUrl ||
          apiUrl.protocol !== 'https:' ||
          apiUrl.pathname.replace(/\/$/, '') !== '/api' ||
          apiUrl.username ||
          apiUrl.password ||
          apiUrl.search ||
          apiUrl.hash
        )
          throw new Error(
            'Set VITE_API_URL in Vercel to your Render HTTPS URL ending in /api, then redeploy.',
          );
      },
    },
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:4000' },
  },
});
