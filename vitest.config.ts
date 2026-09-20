import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup/unit.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
  },
});
