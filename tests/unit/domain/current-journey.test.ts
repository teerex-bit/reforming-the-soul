import { describe, expect, it } from 'vitest';
import { currentJourneyDestination } from '../../../server/services/current-journey';
import type { DeepDiveProgress } from '../../../domain/deep-dive';

const progress = (lastSectionId: string, completedAt: string | null = null): DeepDiveProgress => ({
  id: 'record', lastSectionId, completedAt, reflection: 'Saved private words',
});
const done = progress('carry-forward', '2026-09-25T00:00:00Z');

describe('current Deep Dive participant resume', () => {
  it('starts new accounts at A1 without using legacy Phase 1 node IDs', () => {
    expect(currentJourneyDestination(null, null, null, null, null).href).toBe('/deep-dive/awaken/pay-attention');
  });
  it('resumes the last started Awaken lesson at its saved section', () => {
    expect(currentJourneyDestination(done, progress('example'), null, null, null).href)
      .toBe('/deep-dive/awaken/catch-yourself-being-you?section=example');
    expect(currentJourneyDestination(done, done, progress('trace'), null, null).href)
      .toBe('/deep-dive/awaken/your-reactions-have-a-history?section=trace');
  });
  it('enters SY1 after Awaken and resumes SY1 at its saved section', () => {
    expect(currentJourneyDestination(done, done, done, done, null).href)
      .toBe('/deep-dive/see-clearly/facts-and-interpretation');
    expect(currentJourneyDestination(done, done, done, done, progress('contrast')).href)
      .toBe('/deep-dive/see-clearly/facts-and-interpretation?section=contrast');
  });
  it('takes completed SY1 to its module group without writing progress', () => {
    expect(currentJourneyDestination(done, done, done, done, done).href)
      .toBe('/deep-dive/see-clearly#see-yourself-heading');
  });
  it('preserves existing SY1 work for accounts whose older Awaken progress has no new record', () => {
    expect(currentJourneyDestination(null, null, null, null, progress('practice')).href)
      .toBe('/deep-dive/see-clearly/facts-and-interpretation?section=practice');
  });
});
