import { defineConfig } from 'vitest/config';
import clientConfig from './client/vite.config.js';

export default defineConfig({
  plugins: clientConfig.plugins,
  test: {
    include: ['server/test/**/*.test.js', 'client/src/**/*.test.{js,jsx}'],
    testTimeout: 30000,
    hookTimeout: 180000,
    fileParallelism: false,
  },
});
