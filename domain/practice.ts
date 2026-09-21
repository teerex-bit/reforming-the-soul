export const SESSION_STATES = ['not_started', 'in_progress', 'completed'] as const;
export type CurriculumSessionState = typeof SESSION_STATES[number];

export const PRACTICE_STATES = [
  'draft', 'open', 'waiting_for_real_life', 'ready_to_review', 'reviewed', 'closed',
] as const;
export type PracticeState = typeof PRACTICE_STATES[number];

export const AI_ARTIFACT_STATES = ['suggested', 'confirmed', 'invalidated'] as const;
export type AiArtifactState = typeof AI_ARTIFACT_STATES[number];

export interface Practice {
  readonly kind: 'practice';
  readonly id: string;
  readonly userId: string;
  readonly curriculumVersionId: 'phase-1-v1';
  readonly nodeId: string;
  readonly controlTargetEntryId: string;
  readonly presentTruthEntryId: string;
  readonly nextRightStepEntryId: string;
  readonly state: PracticeState;
  readonly lockVersion: number;
}

export interface PracticeReturn {
  readonly kind: 'practice_return';
  readonly id: string;
  readonly userId: string;
  readonly practiceId: string;
  readonly outcomeEntryId: string;
  readonly reviewEntryId: string | null;
}

const PRACTICE_TRANSITIONS: Readonly<Record<PracticeState, readonly PracticeState[]>> = {
  draft: ['open'],
  open: ['waiting_for_real_life'],
  waiting_for_real_life: ['ready_to_review'],
  ready_to_review: ['reviewed'],
  reviewed: ['closed'],
  closed: [],
};

function parseLiteral<T extends string>(label: string, values: readonly T[], value: unknown): T {
  if (typeof value === 'string' && (values as readonly string[]).includes(value)) return value as T;
  throw new Error(`Invalid ${label}: ${String(value)}`);
}

export const parseSessionState = (value: unknown) => parseLiteral('curriculum session state', SESSION_STATES, value);
export const parsePracticeState = (value: unknown) => parseLiteral('practice state', PRACTICE_STATES, value);
export const parseAiArtifactState = (value: unknown) => parseLiteral('AI artifact state', AI_ARTIFACT_STATES, value);

export function canTransitionPractice(from: PracticeState, to: PracticeState): boolean {
  return PRACTICE_TRANSITIONS[from].includes(to);
}

function unsupportedFields(value: Record<string, unknown>, allowed: readonly string[], label: string): string[] {
  return Object.keys(value).filter(key => !allowed.includes(key)).map(key => `${label} contains unsupported field: ${key}`);
}

export function validatePractice(value: Record<string, unknown>): string[] {
  const issues = unsupportedFields(value, [
    'kind', 'id', 'userId', 'curriculumVersionId', 'nodeId', 'controlTargetEntryId',
    'presentTruthEntryId', 'nextRightStepEntryId', 'state', 'lockVersion',
  ], 'practice');
  if (value.kind !== 'practice') issues.push('practice kind is invalid');
  if (value.curriculumVersionId !== 'phase-1-v1') issues.push('practice curriculum version must be phase-1-v1');
  if (!(AUTHORIZED_PHASE_1_NODE_IDS as readonly unknown[]).includes(value.nodeId)) {
    issues.push('practice nodeId must reference an authorized seed node');
  }
  if (!(PRACTICE_STATES as readonly unknown[]).includes(value.state)) issues.push('practice state is invalid');
  if (!Number.isInteger(value.lockVersion) || Number(value.lockVersion) < 0) issues.push('practice lock version is invalid');
  for (const field of ['id', 'userId', 'nodeId', 'controlTargetEntryId', 'presentTruthEntryId', 'nextRightStepEntryId']) {
    if (typeof value[field] !== 'string' || value[field] === '') issues.push(`practice ${field} is required`);
  }
  return issues;
}

export function validatePracticeReturn(value: Record<string, unknown>): string[] {
  const issues = unsupportedFields(
    value,
    ['kind', 'id', 'userId', 'practiceId', 'outcomeEntryId', 'reviewEntryId'],
    'practice return',
  );
  if (value.kind !== 'practice_return') issues.push('practice return kind is invalid');
  for (const field of ['id', 'userId', 'practiceId', 'outcomeEntryId']) {
    if (typeof value[field] !== 'string' || value[field] === '') issues.push(`practice return ${field} is required`);
  }
  if (value.reviewEntryId !== null && typeof value.reviewEntryId !== 'string') {
    issues.push('practice return reviewEntryId must be a string or null');
  }
  return issues;
}
import { AUTHORIZED_PHASE_1_NODE_IDS } from './curriculum';
