import { describe, expect, it } from 'vitest';
import { awakenBackHref } from '../../../components/deep-dive/awaken-back-navigation';
import { A1_SECTIONS } from '../../../content/deep-dive/v1';
import { A2_SECTIONS } from '../../../content/deep-dive/v1/awaken/catch-yourself-being-you';
import { A3_SECTIONS, A4_SECTIONS } from '../../../content/deep-dive/v1/awaken/four-module-lessons';

describe('Awaken Back navigation', () => {
  for (const [slug, sections] of [
    ['pay-attention', A1_SECTIONS],
    ['catch-yourself-being-you', A2_SECTIONS],
    ['your-reactions-have-a-history', A3_SECTIONS],
    ['formation-is-not-identity', A4_SECTIONS],
  ] as const) {
    const path = `/deep-dive/awaken/${slug}`;
    it(`${slug}: entry returns to the Awaken list`, () => {
      expect(awakenBackHref(path, sections, 0)).toBe('/deep-dive/awaken');
    });
    it(`${slug}: each later section returns to its immediate predecessor`, () => {
      for (let index = 1; index < sections.length; index++) {
        expect(awakenBackHref(path, sections, index)).toBe(`${path}?section=${sections[index - 1].id}`);
      }
    });
  }
  it('A1 section 6 returns to section 5', () => {
    expect(awakenBackHref('/deep-dive/awaken/pay-attention', A1_SECTIONS, 5))
      .toBe(`/deep-dive/awaken/pay-attention?section=${A1_SECTIONS[4].id}`);
  });
});
