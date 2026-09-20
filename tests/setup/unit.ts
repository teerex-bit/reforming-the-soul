import '@testing-library/jest-dom/vitest';

if (process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY must be unset during ordinary automated tests.');
}
