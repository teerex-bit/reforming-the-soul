import { getA1, getA2, getA3, getA4 } from './deep-dive-service';
import { getSC1 } from './see-clearly-sc1-service';
import { getSY2 } from './see-clearly-sy2-service';
import { awakenModuleNavigation } from '../../components/deep-dive/awaken-module-navigation';
import type { DeepDiveProgress } from '../../domain/deep-dive';

/** Existing Phase 1 progress is intentionally excluded; only guided Deep Dive state selects a lesson. */
export function currentJourneyDestination(
  a1: DeepDiveProgress | null, a2: DeepDiveProgress | null,
  a3: DeepDiveProgress | null, a4: DeepDiveProgress | null,
  sy1: DeepDiveProgress | null, sy2: DeepDiveProgress | null = null,
) {
  const awaken = [
    ['pay-attention', 'Pay Attention · A1', a1],
    ['catch-yourself-being-you', 'Catch Yourself Being You · A2', a2],
    ['your-reactions-have-a-history', 'Your Reactions Have a History · A3', a3],
    ['formation-is-not-identity', 'Formation Is Not Identity · A4', a4],
  ] as const;
  const unfinished = awaken.find(([, , progress]) => progress && !progress.completedAt);
  if (unfinished) return { stage: 'Awaken' as const, href: awakenModuleNavigation(unfinished[0], unfinished[1], unfinished[2]).href };
  // A participant with existing SY1 data resumes it even if historical Awaken progress is incomplete.
  if (!sy1) {
    const next = awaken.find(([, , progress]) => !progress);
    if (next) return { stage: 'Awaken' as const, href: awakenModuleNavigation(next[0], next[1], next[2]).href };
  }
  if (sy1?.completedAt && sy2) return {
    stage: 'See Clearly' as const,
    href: sy2.completedAt ? '/deep-dive/see-clearly#see-yourself-heading'
      : `/deep-dive/see-clearly/follow-the-formation-chain?section=${encodeURIComponent(sy2.lastSectionId)}`,
  };
  return {
    stage: 'See Clearly' as const,
    href: sy1?.completedAt ? '/deep-dive/see-clearly#see-yourself-heading'
      : `/deep-dive/see-clearly/facts-and-interpretation${sy1?.lastSectionId ? `?section=${encodeURIComponent(sy1.lastSectionId)}` : ''}`,
  };
}

export async function currentJourneyResume() {
  const [a1, a2, a3, a4, sy1, sy2] = await Promise.all([getA1(), getA2(), getA3(), getA4(), getSC1(), getSY2()]);
  return currentJourneyDestination(a1, a2, a3, a4, sy1.progress, sy2.progress);
}
