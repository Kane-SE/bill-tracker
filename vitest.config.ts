import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Separate from vite.config.ts so the test runner's bundled Vite types don't
// clash with the app build's Vite plugins. Tests here are pure logic (no DOM).
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
