import { describe, expect, it } from 'vitest';
import { seeClearlyNavigation } from '../../../components/deep-dive/see-clearly-navigation';

describe('See Clearly group navigation', () => {
  it('keeps the first movement within See Yourself Clearly', () => {
    for (const id of ['sc1', 'sc2', 'sc3', 'sc4'] as const) {
      const navigation = seeClearlyNavigation(id);
      expect(navigation.backLabel).toBe('Back to See Yourself Clearly');
      expect(navigation.backHref).toBe('/deep-dive/see-clearly#see-yourself-heading');
    }
    expect(seeClearlyNavigation('sc1')).toMatchObject({ nextLabel: 'Continue to Follow the Formation Chain', nextHref: '/deep-dive/see-clearly#see-yourself-sc2' });
    expect(seeClearlyNavigation('sc2').nextLabel).toBe('Continue to The Learned Self-Story');
    expect(seeClearlyNavigation('sc3').nextLabel).toBe('Continue to What Is Actually True About Me');
    expect(seeClearlyNavigation('sc4')).toMatchObject({ transition: 'You have finished See Yourself Clearly. Next: See God Clearly.', nextLabel: 'Continue to The God I Learned', nextHref: '/deep-dive/see-clearly#see-god-sc5' });
  });

  it('keeps the second movement within See God Clearly and hands off to Become', () => {
    for (const id of ['sc5', 'sc6', 'sc7', 'sc8'] as const) {
      const navigation = seeClearlyNavigation(id);
      expect(navigation.backLabel).toBe('Back to See God Clearly');
      expect(navigation.backHref).toBe('/deep-dive/see-clearly#see-god-heading');
    }
    expect(seeClearlyNavigation('sc5').nextLabel).toBe('Continue to What I Expect From God');
    expect(seeClearlyNavigation('sc6').nextLabel).toBe('Continue to Jesus Shows Us the Father');
    expect(seeClearlyNavigation('sc7').nextLabel).toBe('Continue to Can I Trust God Here?');
    expect(seeClearlyNavigation('sc8').nextLabel).toBe('Continue to Become');
  });
});
