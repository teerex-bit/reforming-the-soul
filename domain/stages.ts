export const STAGE_ORDER = ['awaken', 'see-clearly', 'become', 'join'] as const;
export type StageId = typeof STAGE_ORDER[number];

export function parseStageId(value: unknown): StageId {
  if (typeof value === 'string' && (STAGE_ORDER as readonly string[]).includes(value)) return value as StageId;
  throw new Error(`Invalid curriculum stage: ${String(value)}`);
}
