import { requireActor } from '../auth/require-actor';
import { practiceRepository, type PracticeRepository } from '../data/practice-repository';
export type { PracticeRepository } from '../data/practice-repository';

type ActorClient = Parameters<typeof requireActor>[0];
type Dependencies = Readonly<{ repository?: PracticeRepository; actorClient?: ActorClient }>;
function required(value: unknown, label: string): asserts value is string { if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`); }
function lock(value: unknown): asserts value is number { if (!Number.isInteger(value) || Number(value) < 0) throw new Error('expected lock version is required.'); }
async function actor(dependencies: Dependencies) { return requireActor(dependencies.actorClient); }

export async function createPractice(values: { controlTargetText: string; presentTruthText: string; nextRightStepText: string }, dependencies: Dependencies = {}) {
  required(values.controlTargetText, 'control target'); required(values.presentTruthText, 'present truth'); required(values.nextRightStepText, 'next right step');
  const verified = await actor(dependencies); return (dependencies.repository ?? practiceRepository()).create({ actorId: verified.id, ...values });
}
export async function recordPracticeReturn(values: { practiceId: string; expectedLockVersion: number; outcomeText: string }, dependencies: Dependencies = {}) {
  required(values.practiceId, 'practice'); required(values.outcomeText, 'outcome'); lock(values.expectedLockVersion);
  const verified = await actor(dependencies); return (dependencies.repository ?? practiceRepository()).recordReturn({ actorId: verified.id, ...values });
}
export async function reviewPractice(values: { practiceId: string; expectedLockVersion: number; reviewText: string }, dependencies: Dependencies = {}) {
  required(values.practiceId, 'practice'); required(values.reviewText, 'review'); lock(values.expectedLockVersion);
  const verified = await actor(dependencies); return (dependencies.repository ?? practiceRepository()).review({ actorId: verified.id, ...values });
}
export async function closePractice(values: { practiceId: string; expectedLockVersion: number }, dependencies: Dependencies = {}) {
  required(values.practiceId, 'practice'); lock(values.expectedLockVersion);
  const verified = await actor(dependencies); return (dependencies.repository ?? practiceRepository()).close({ actorId: verified.id, ...values });
}
export async function getPractice(practiceId: string, dependencies: Dependencies = {}) { const verified = await actor(dependencies); return (dependencies.repository ?? practiceRepository()).get(verified.id, practiceId); }
export async function getUnfinishedPractice(dependencies: Dependencies = {}) { const verified = await actor(dependencies); return (dependencies.repository ?? practiceRepository()).getUnfinished(verified.id); }
