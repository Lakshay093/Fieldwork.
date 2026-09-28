import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['server/test/**/*.test.js', 'client/src/**/*.test.{js,jsx}'],
    testTimeout: 30000,
    hookTimeout: 180000,
    fileParallelism: false,
  },
});
