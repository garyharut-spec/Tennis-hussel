/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Tennis-hussel/',
  test: {
    environment: 'jsdom',
  },
});
