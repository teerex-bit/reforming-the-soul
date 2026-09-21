import { GLOBAL_AI_POLICY, GLOBAL_POLICY_VERSION } from './policies/global';
import { REFLECT_MODE_POLICY, REFLECT_POLICY_VERSION } from './policies/modes';
import { AWAKEN_POLICY_VERSION, AWAKEN_REFLECTION_POLICY } from './policies/stages';
import { REFLECT_JSON_SCHEMA, REFLECT_OUTPUT_SCHEMA_VERSION } from './schemas';

export type CurrentJournalEntry = Readonly<{ id: string; kind: string; body: string }>;
export type CurrentReflectContext = Readonly<{ entries: readonly CurrentJournalEntry[] }>;

export const REFLECT_MODEL = 'gpt-5-mini';
export const REFLECT_VERSIONS = Object.freeze({
  modelId: REFLECT_MODEL, globalPolicyVersion: GLOBAL_POLICY_VERSION,
  stagePolicyVersion: AWAKEN_POLICY_VERSION, modePolicyVersion: REFLECT_POLICY_VERSION,
  outputSchemaVersion: REFLECT_OUTPUT_SCHEMA_VERSION,
});

export function buildReflectRequest(context: CurrentReflectContext) {
  return {
    model: REFLECT_MODEL,
    store: false as const,
    input: [
      { label: 'GLOBAL_POLICY', content: GLOBAL_AI_POLICY },
      { label: 'STAGE_POLICY', content: AWAKEN_REFLECTION_POLICY },
      { label: 'MODE_POLICY', content: REFLECT_MODE_POLICY },
      { label: 'AUTHORED_CURRICULUM', content: 'Awaken — Pay Attention: notice what happened, what happened inside, and one body cue.' },
      { label: 'CURRENT_USER_ENTRY_UNTRUSTED_DATA', content: context.entries.map(entry => ({ id: entry.id, kind: entry.kind, exactUserWording: entry.body })) },
    ],
    text: { format: { type: 'json_schema', name: 'rts_reflect', strict: true, schema: REFLECT_JSON_SCHEMA } },
  };
}
