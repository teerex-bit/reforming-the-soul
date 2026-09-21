import type { StageId } from './stages';
import type { AiArtifactState } from './practice';

export const AI_MODES = ['explain', 'reflect', 'guide_me', 'route'] as const;
export type AiMode = typeof AI_MODES[number];
export type AiPermissionScope = 'single_entry_reflect';

export interface AiPermission {
  readonly kind: 'ai_permission';
  readonly id: string;
  readonly userId: string;
  readonly sourceJournalEntryId: string;
  readonly scope: AiPermissionScope;
  readonly revision: number;
  readonly revokedAt: string | null;
}

export interface AiArtifact {
  readonly kind: 'ai_artifact';
  readonly id: string;
  readonly userId: string;
  readonly threadId: string;
  readonly artifactType: 'summary' | 'suggested_tag' | 'route_suggestion';
  readonly status: AiArtifactState;
  readonly category: 'ai_suggested_structured' | 'ai_derived_artifact';
  readonly provenance: 'ai_suggested' | 'user_confirmed_ai';
  readonly confirmation: 'unconfirmed' | 'user_confirmed';
  readonly curriculumVersionId: string;
  readonly modelId: string;
  readonly globalPolicyVersion: string;
  readonly stagePolicyVersion: string;
  readonly modePolicyVersion: string;
  readonly outputSchemaVersion: string;
  readonly sources: readonly AiArtifactSource[];
}

export type AiArtifactSource =
  | Readonly<{ sourceRole: 'current'; journalEntryId: string; contextGrantId: null; grantRevision: null }>
  | Readonly<{ sourceRole: 'selected_prior'; journalEntryId: string; contextGrantId: string; grantRevision: number }>;

export interface RouteSuggestion {
  readonly kind: 'route_suggestion';
  readonly suggestedStage: StageId;
  readonly reason: string;
  readonly changesCurriculumState: false;
}

export interface DeletionDependency {
  readonly kind: 'deletion_dependency';
  readonly sourceJournalEntryId: string;
  readonly dependentAiArtifactId: string;
  readonly onSourceDelete: 'delete_artifact';
}

export type AiAdapterResult<T> =
  | { kind: 'success'; value: T; providerRequestId: string | null }
  | { kind: 'refusal'; safeMessage: string }
  | { kind: 'incomplete'; reason: string }
  | { kind: 'invalid'; issues: readonly string[] }
  | { kind: 'timeout' }
  | { kind: 'provider_error'; retryable: boolean };

export function validateAiPermission(value: Record<string, unknown>): string[] {
  const allowed = ['kind', 'id', 'userId', 'sourceJournalEntryId', 'scope', 'revision', 'revokedAt'];
  const issues = Object.keys(value).filter(key => !allowed.includes(key)).map(key => `AI permission contains unsupported field: ${key}`);
  if (value.kind !== 'ai_permission') issues.push('AI permission kind is invalid');
  for (const field of ['id', 'userId', 'sourceJournalEntryId']) {
    if (typeof value[field] !== 'string' || value[field] === '') issues.push(`AI permission ${field} is required`);
  }
  if (value.scope !== 'single_entry_reflect') issues.push('AI permission scope must be single_entry_reflect');
  if (typeof value.sourceJournalEntryId !== 'string' || value.sourceJournalEntryId.length === 0) {
    issues.push('AI permission requires one explicit source journal entry');
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1) issues.push('AI permission revision must be positive');
  if (value.revokedAt !== null && typeof value.revokedAt !== 'string') issues.push('AI permission revokedAt must be a string or null');
  return issues;
}

export function validateAiArtifact(value: Record<string, unknown>): string[] {
  const allowed = [
    'kind', 'id', 'userId', 'threadId', 'artifactType', 'status', 'category', 'provenance', 'confirmation',
    'curriculumVersionId', 'modelId', 'globalPolicyVersion', 'stagePolicyVersion', 'modePolicyVersion', 'outputSchemaVersion', 'sources',
  ];
  const issues = Object.keys(value).filter(key => !allowed.includes(key)).map(key => `AI artifact contains unsupported field: ${key}`);
  if (value.kind !== 'ai_artifact') issues.push('AI artifact kind is invalid');
  if (!['summary', 'suggested_tag', 'route_suggestion'].includes(String(value.artifactType))) issues.push('AI artifact type is invalid');
  if (!['suggested', 'confirmed', 'invalidated'].includes(String(value.status))) issues.push('AI artifact status is invalid');
  if (!['ai_suggested_structured', 'ai_derived_artifact'].includes(String(value.category))) {
    issues.push('AI artifact category is invalid');
  }
  if (!['ai_suggested', 'user_confirmed_ai'].includes(String(value.provenance))) {
    issues.push('AI artifact provenance is invalid');
  }
  if (value.status === 'confirmed' && value.confirmation !== 'user_confirmed') {
    issues.push('AI suggestion cannot be confirmed without explicit user confirmation');
  }
  if (value.status === 'suggested' && (value.provenance !== 'ai_suggested' || value.confirmation !== 'unconfirmed')) {
    issues.push('suggested AI artifact must remain ai_suggested and unconfirmed');
  }
  if (value.status === 'confirmed' && (value.provenance !== 'user_confirmed_ai' || value.confirmation !== 'user_confirmed')) {
    issues.push('confirmed AI artifact requires user_confirmed_ai provenance and confirmation');
  }
  if (value.status === 'invalidated') {
    const validInvalidated =
      (value.provenance === 'ai_suggested' && value.confirmation === 'unconfirmed') ||
      (value.provenance === 'user_confirmed_ai' && value.confirmation === 'user_confirmed');
    if (!validInvalidated) issues.push('invalidated AI artifact must retain its prior provenance state');
  }
  if (!Array.isArray(value.sources) || value.sources.length === 0) {
    issues.push('AI artifact requires explicit source dependencies');
  } else {
    const identities = new Set<string>();
    for (const rawSource of value.sources) {
      const source = rawSource as Record<string, unknown>;
      for (const key of Object.keys(source)) {
        if (!['sourceRole', 'journalEntryId', 'contextGrantId', 'grantRevision'].includes(key)) {
          issues.push(`AI artifact source contains unsupported field: ${key}`);
        }
      }
      if (!['current', 'selected_prior'].includes(String(source.sourceRole))) {
        issues.push('AI artifact source role is invalid');
      }
      if (typeof source.journalEntryId !== 'string' || source.journalEntryId === '') {
        issues.push('AI artifact source journalEntryId is required');
      }
      const identity = `${source.sourceRole}:${source.journalEntryId}`;
      if (identities.has(identity)) issues.push('AI artifact contains a duplicate source dependency');
      identities.add(identity);
      if (source.sourceRole === 'current' && (source.contextGrantId !== null || source.grantRevision !== null)) {
        issues.push('current AI source must not cite a context grant');
      }
      if (source.sourceRole === 'selected_prior' &&
        (typeof source.contextGrantId !== 'string' || source.contextGrantId === '' ||
          !Number.isInteger(source.grantRevision) || Number(source.grantRevision) < 1)) {
        issues.push('selected prior AI source requires a grant identity and revision');
      }
    }
  }
  for (const field of ['id', 'userId', 'threadId', 'curriculumVersionId', 'modelId', 'globalPolicyVersion', 'stagePolicyVersion', 'modePolicyVersion', 'outputSchemaVersion']) {
    if (typeof value[field] !== 'string' || value[field] === '') issues.push(`AI artifact ${field} is required`);
  }
  return issues;
}

export function validateRouteSuggestion(value: Record<string, unknown>): string[] {
  const issues: string[] = [];
  if (!['awaken', 'see-clearly', 'become', 'join'].includes(String(value.suggestedStage))) {
    issues.push('route suggestion stage is invalid');
  }
  if (value.changesCurriculumState !== false) issues.push('route suggestion must not change curriculum state');
  return issues;
}

export function validateDeletionDependency(value: Record<string, unknown>): string[] {
  const issues: string[] = [];
  if (value.onSourceDelete !== 'delete_artifact') {
    issues.push('dependent AI artifact must be deleted with its source entry');
  }
  if (typeof value.sourceJournalEntryId !== 'string' || typeof value.dependentAiArtifactId !== 'string') {
    issues.push('deletion dependency requires explicit source and artifact identities');
  }
  return issues;
}
