import { afterEach, describe, expect, it } from 'vitest';
import { safeNext } from '../../../app/(auth)/sign-in/page';

describe('safeNext', () => {
  afterEach(() => window.history.replaceState({}, '', '/sign-in'));

  it('rejects an encoded backslash target that URL parsing would otherwise treat as external', () => {
    window.history.replaceState({}, '', '/sign-in?next=/%5Cevil.example');
    expect(safeNext()).toBe('/dashboard');
  });

  it('preserves an application-relative destination', () => {
    window.history.replaceState({}, '', '/sign-in?next=/formation/current?tab=notes');
    expect(safeNext()).toBe('/formation/current?tab=notes');
  });
});
