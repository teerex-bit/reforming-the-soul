import type { CurriculumSessionState } from './practice';
import { AUTHORIZED_PHASE_1_NODE_IDS } from './curriculum';

export const PROVENANCE_CATEGORIES = [
  'authored_curriculum',
  'exact_user_wording',
  'user_confirmed_structured',
  'ai_suggested_structured',
  'ai_derived_artifact',
  'curriculum_progress',
  'formation_evidence',
] as const;
export type ProvenanceCategory = typeof PROVENANCE_CATEGORIES[number];
export type PersistedProvenance = 'user_authored' | 'ai_suggested' | 'user_confirmed_ai';

export function classifyProvenance(value: Readonly<{ kind: string; category?: unknown }>): ProvenanceCategory {
  switch (value.kind) {
    case 'curriculum_node': return 'authored_curriculum';
    case 'journal_entry': return 'exact_user_wording';
    case 'formation_record': return 'user_confirmed_structured';
    case 'curriculum_progress': return 'curriculum_progress';
    case 'formation_evidence': return 'formation_evidence';
    case 'ai_artifact':
      if (value.category === 'ai_suggested_structured' || value.category === 'ai_derived_artifact') return value.category;
      throw new Error('AI artifact requires an explicit provenance category');
    default: throw new Error(`Unsupported provenance subject: ${value.kind}`);
  }
}

export interface JournalEntry {
  readonly kind: 'journal_entry';
  readonly id: string;
  readonly userId: string;
  readonly nodeId: string;
  readonly entryKind: string;
  readonly body: string;
  readonly category: 'exact_user_wording';
  readonly provenance: 'user_authored';
}

export interface FormationRecord {
  readonly kind: 'formation_record';
  readonly id: string;
  readonly userId: string;
  readonly nodeId: string;
  readonly recordType: string;
  readonly value: string;
  readonly sourceJournalEntryId: string;
  readonly category: 'user_confirmed_structured';
  readonly provenance: 'user_authored' | 'user_confirmed_ai';
}

export interface UserCurriculumState {
  readonly kind: 'curriculum_progress';
  readonly userId: string;
  readonly curriculumVersionId: 'phase-1-v1';
  readonly currentNodeId: string;
  readonly state: CurriculumSessionState;
  readonly completedNodeIds: readonly string[];
}

export interface FormationEvidence {
  readonly kind: 'formation_evidence';
  readonly category: 'formation_evidence';
  readonly id: string;
  readonly userId: string;
  readonly evidenceType: 'noticed' | 'practiced' | 'responded_differently';
  readonly sourceJournalEntryId: string;
}

export type FormationEndpoint = Readonly<{
  type: 'journal_entry' | 'formation_record' | 'practice';
  id: string;
}>;

export interface FormationLink {
  readonly kind: 'formation_link';
  readonly id: string;
  readonly userId: string;
  readonly linkType: 'awaken_to_see_clearly' | 'see_clearly_to_become' | 'practice_to_return';
  readonly source: FormationEndpoint;
  readonly target: FormationEndpoint;
}

function unsupportedFields(value: Record<string, unknown>, allowed: readonly string[], label: string): string[] {
  return Object.keys(value).filter(key => !allowed.includes(key)).map(key => `${label} contains unsupported field: ${key}`);
}

export function validateJournalEntry(value: Record<string, unknown>): string[] {
  const issues = unsupportedFields(value, ['kind', 'id', 'userId', 'nodeId', 'entryKind', 'body', 'category', 'provenance'], 'journal entry');
  if (value.kind !== 'journal_entry') issues.push('journal entry kind is invalid');
  if (value.category !== 'exact_user_wording' || value.provenance !== 'user_authored') {
    issues.push('journal entry must preserve exact user wording');
  }
  if (typeof value.body !== 'string' || value.body.length === 0) issues.push('journal entry body is required');
  return issues;
}

export function validateFormationRecord(value: Record<string, unknown>): string[] {
  const issues = unsupportedFields(
    value,
    ['kind', 'id', 'userId', 'nodeId', 'recordType', 'value', 'sourceJournalEntryId', 'category', 'provenance'],
    'formation record',
  );
  if (value.kind !== 'formation_record') issues.push('formation record kind is invalid');
  if (value.category === 'ai_suggested_structured' || value.provenance === 'ai_suggested') {
    issues.push('AI-suggested structured data is not a confirmed formation record');
  } else if (value.category !== 'user_confirmed_structured' || !['user_authored', 'user_confirmed_ai'].includes(String(value.provenance))) {
    issues.push('formation record must be user-confirmed structured data');
  }
  return issues;
}

export function validateUserCurriculumState(value: Record<string, unknown>): string[] {
  const issues = unsupportedFields(
    value,
    ['kind', 'userId', 'curriculumVersionId', 'currentNodeId', 'state', 'completedNodeIds'],
    'curriculum progress',
  );
  if (value.kind !== 'curriculum_progress') issues.push('curriculum progress kind is invalid');
  if (value.curriculumVersionId !== 'phase-1-v1') issues.push('curriculum progress version must be phase-1-v1');
  if (typeof value.currentNodeId !== 'string' || value.currentNodeId === '') {
    issues.push('curriculum progress currentNodeId is required');
  } else if (!(AUTHORIZED_PHASE_1_NODE_IDS as readonly string[]).includes(value.currentNodeId)) {
    issues.push('curriculum progress currentNodeId must reference an authorized seed node');
  }
  if (!['not_started', 'in_progress', 'completed'].includes(String(value.state))) {
    issues.push('curriculum progress state is invalid');
  }
  if (!Array.isArray(value.completedNodeIds)) {
    issues.push('curriculum progress completedNodeIds must be an array');
  } else if (value.completedNodeIds.some(nodeId => typeof nodeId !== 'string' || nodeId === '')) {
    issues.push('curriculum progress completedNodeIds must contain identities');
  } else if (value.completedNodeIds.some(nodeId => !(AUTHORIZED_PHASE_1_NODE_IDS as readonly string[]).includes(nodeId))) {
    issues.push('curriculum progress completedNodeIds must reference authorized seed nodes');
  }
  return issues;
}

export function validateFormationLink(value: Record<string, unknown>): string[] {
  const issues = unsupportedFields(value, ['kind', 'id', 'userId', 'linkType', 'source', 'target'], 'formation link');
  if (value.kind !== 'formation_link') issues.push('formation link kind is invalid');
  for (const side of ['source', 'target'] as const) {
    const endpoint = value[side];
    if (!endpoint || typeof endpoint !== 'object') {
      issues.push(`formation link ${side} must reference an identity`);
      continue;
    }
    const endpointRecord = endpoint as Record<string, unknown>;
    for (const key of Object.keys(endpointRecord)) {
      if (!['type', 'id'].includes(key)) issues.push(`formation link ${side} contains unsupported field: ${key}`);
    }
    if (typeof endpointRecord.id !== 'string' || endpointRecord.id === '') {
      issues.push(`formation link ${side} must reference an identity`);
    }
    if (!['journal_entry', 'formation_record', 'practice'].includes(String(endpointRecord.type))) {
      issues.push(`formation link ${side} type is invalid`);
    }
  }
  const sourceType = (value.source as Record<string, unknown> | undefined)?.type;
  const targetType = (value.target as Record<string, unknown> | undefined)?.type;
  const topology: Record<string, readonly [string, string]> = {
    awaken_to_see_clearly: ['journal_entry', 'formation_record'],
    see_clearly_to_become: ['formation_record', 'practice'],
    practice_to_return: ['practice', 'journal_entry'],
  };
  const allowed = topology[String(value.linkType)];
  if (!allowed || sourceType !== allowed[0] || targetType !== allowed[1]) {
    issues.push(`formation link endpoints are invalid for ${String(value.linkType)}`);
  }
  return issues;
}

export function validateFormationEvidence(value: Record<string, unknown>): string[] {
  const issues = unsupportedFields(
    value,
    ['kind', 'category', 'id', 'userId', 'evidenceType', 'sourceJournalEntryId'],
    'formation evidence',
  );
  if (value.kind !== 'formation_evidence' || value.category !== 'formation_evidence') {
    issues.push('formation evidence kind is invalid');
  }
  if (!['noticed', 'practiced', 'responded_differently'].includes(String(value.evidenceType))) {
    issues.push('formation evidence type is invalid');
  }
  return issues;
}
