import type { AiAdapterResult } from '../../domain/ai';
import { reflectQuestionIssue } from './safety';

export const REFLECT_OUTPUT_SCHEMA_VERSION = 'rts-reflect-output-v1';
export type ReflectOutput = Readonly<{ questions: readonly string[] }>;

export const REFLECT_JSON_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['questions'],
  properties: { questions: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string', minLength: 1, maxLength: 300 } } },
} as const;

export function parseReflectOutput(value: unknown, providerRequestId: string | null = null): AiAdapterResult<ReflectOutput> {
  const issues: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { kind: 'invalid', issues: ['Reflect output must be an object'] };
  const record = value as Record<string, unknown>;
  const extras = Object.keys(record).filter(key => key !== 'questions');
  if (extras.length) issues.push(`Reflect output contains unsupported fields: ${extras.join(', ')}`);
  if (!Array.isArray(record.questions) || record.questions.length < 1 || record.questions.length > 3) {
    issues.push('Reflect output requires one to three questions');
  } else {
    for (const raw of record.questions) {
      if (typeof raw !== 'string' || raw.trim().length === 0) issues.push('Reflect questions must be non-empty strings');
      else {
        const issue = reflectQuestionIssue(raw);
        if (issue) issues.push(issue);
      }
    }
  }
  return issues.length ? { kind: 'invalid', issues } : {
    kind: 'success', value: { questions: [...record.questions as string[]] }, providerRequestId,
  };
}
