import { describe, expect, it } from 'vitest';
import {
  PROVENANCE_CATEGORIES,
  validateFormationLink,
  validateFormationRecord,
  validateJournalEntry,
  validateUserCurriculumState,
  validateFormationEvidence,
  classifyProvenance,
} from '../../../domain/provenance';
import {
  validateAiArtifact,
  validateAiPermission,
  validateDeletionDependency,
  validateRouteSuggestion,
} from '../../../domain/ai';

describe('privacy and provenance contracts', () => {
  it('keeps all approved provenance categories distinct', () => {
    expect(PROVENANCE_CATEGORIES).toEqual([
      'authored_curriculum',
      'exact_user_wording',
      'user_confirmed_structured',
      'ai_suggested_structured',
      'ai_derived_artifact',
      'curriculum_progress',
      'formation_evidence',
    ]);
    expect(classifyProvenance({ kind: 'journal_entry' })).toBe('exact_user_wording');
    expect(classifyProvenance({ kind: 'formation_record' })).toBe('user_confirmed_structured');
    expect(classifyProvenance({ kind: 'curriculum_progress' })).toBe('curriculum_progress');
    expect(classifyProvenance({ kind: 'formation_evidence' })).toBe('formation_evidence');
  });

  it('distinguishes exact journal wording, structured records, progress, and evidence', () => {
    expect(validateJournalEntry({
      kind: 'journal_entry', id: 'entry-a', userId: 'user-a', nodeId: 'awaken.pay-attention.observe',
      entryKind: 'event', body: 'My exact words', category: 'exact_user_wording', provenance: 'user_authored',
    })).toEqual([]);
    expect(validateFormationRecord({
      kind: 'formation_record', id: 'record-a', userId: 'user-a', nodeId: 'see-clearly.fact',
      recordType: 'observable_fact', value: 'A structured value', sourceJournalEntryId: 'entry-a',
      category: 'user_confirmed_structured', provenance: 'user_authored',
    })).toEqual([]);
    expect(validateUserCurriculumState({
      kind: 'curriculum_progress', userId: 'user-a', curriculumVersionId: 'phase-1-v1',
      currentNodeId: 'see-clearly.fact', state: 'in_progress', completedNodeIds: ['awaken.pay-attention.observe'],
    })).toEqual([]);
    expect(validateUserCurriculumState({
      kind: 'curriculum_progress', userId: 'user-a', curriculumVersionId: 'phase-1-v1',
      currentNodeId: 'see-clearly.fact', state: 'in_progress', completedNodeIds: [], score: 8,
    })).toContain('curriculum progress contains unsupported field: score');
    expect(validateUserCurriculumState({
      kind: 'curriculum_progress', userId: 'user-a', curriculumVersionId: 'phase-2',
      currentNodeId: '', state: 'mature', completedNodeIds: 'everything',
    })).toEqual(expect.arrayContaining([
      'curriculum progress version must be phase-1-v1',
      'curriculum progress currentNodeId is required',
      'curriculum progress state is invalid',
      'curriculum progress completedNodeIds must be an array',
    ]));
    expect(validateUserCurriculumState({
      kind: 'curriculum_progress', userId: 'user-a', curriculumVersionId: 'phase-1-v1',
      currentNodeId: 'walk.unapproved', state: 'in_progress', completedNodeIds: ['join.unapproved'],
    })).toEqual(expect.arrayContaining([
      'curriculum progress currentNodeId must reference an authorized seed node',
      'curriculum progress completedNodeIds must reference authorized seed nodes',
    ]));
  });

  it('keeps AI suggestions distinct until an explicit confirmation', () => {
    expect(validateFormationRecord({
      kind: 'formation_record', id: 'record-a', userId: 'user-a', nodeId: 'see-clearly.fact',
      recordType: 'observable_fact', value: 'AI proposed this', sourceJournalEntryId: 'entry-a',
      category: 'ai_suggested_structured', provenance: 'ai_suggested',
    })).toContain('AI-suggested structured data is not a confirmed formation record');
    expect(validateAiArtifact({
      ...validAiArtifact(),
    })).toEqual([]);
    expect(validateAiArtifact({
      ...validAiArtifact(), status: 'confirmed', provenance: 'ai_suggested', confirmation: 'unconfirmed',
    })).toContain('AI suggestion cannot be confirmed without explicit user confirmation');
    expect(validateAiArtifact({
      ...validAiArtifact(), sources: [
        { sourceRole: 'selected_prior', journalEntryId: 'entry-a', contextGrantId: null, grantRevision: null },
      ],
    })).toContain('selected prior AI source requires a grant identity and revision');
    expect(validateAiArtifact({
      ...validAiArtifact(), sources: [
        { sourceRole: 'selected_prior', journalEntryId: 'entry-a', contextGrantId: '', grantRevision: 1 },
      ],
    })).toContain('selected prior AI source requires a grant identity and revision');
    expect(validateAiArtifact({
      ...validAiArtifact(),
      sources: [{ sourceRole: 'entire_history', journalEntryId: '', copiedText: 'private text' }],
    })).toEqual(expect.arrayContaining([
      'AI artifact source role is invalid',
      'AI artifact source journalEntryId is required',
      'AI artifact source contains unsupported field: copiedText',
    ]));
    expect(validateAiArtifact({
      ...validAiArtifact(), status: 'suggested', provenance: 'user_confirmed_ai', confirmation: 'user_confirmed',
    })).toContain('suggested AI artifact must remain ai_suggested and unconfirmed');
    expect(validateAiArtifact({
      ...validAiArtifact(), status: 'confirmed', provenance: 'ai_suggested', confirmation: 'user_confirmed',
    })).toContain('confirmed AI artifact requires user_confirmed_ai provenance and confirmation');
  });

  it('allows only an explicit single-entry Reflect permission scope', () => {
    expect(validateAiPermission({
      kind: 'ai_permission', id: 'grant-a', userId: 'user-a', sourceJournalEntryId: 'entry-a',
      scope: 'single_entry_reflect', revision: 1, revokedAt: null,
    })).toEqual([]);
    expect(validateAiPermission({
      kind: 'ai_permission', id: 'grant-b', userId: 'user-a', sourceJournalEntryId: 'entry-a',
      scope: 'entire_history', revision: 1, revokedAt: null,
    })).toContain('AI permission scope must be single_entry_reflect');
    expect(validateAiPermission({
      kind: 'ai_permission', id: 'grant-a', userId: 'user-a', sourceJournalEntryId: 'entry-a',
      scope: 'single_entry_reflect', revision: 1, revokedAt: null, includeEntireHistory: true,
    })).toContain('AI permission contains unsupported field: includeEntireHistory');
  });

  it('links cross-stage records by identity without copied user text', () => {
    expect(validateFormationLink({
      kind: 'formation_link', id: 'link-a', userId: 'user-a', linkType: 'awaken_to_see_clearly',
      source: { type: 'journal_entry', id: 'entry-a' },
      target: { type: 'formation_record', id: 'record-a' },
    })).toEqual([]);
    expect(validateFormationLink({
      kind: 'formation_link', id: 'link-a', userId: 'user-a', linkType: 'awaken_to_see_clearly',
      source: { type: 'journal_entry', id: 'entry-a' },
      target: { type: 'formation_record', id: 'record-a' }, copiedText: 'My exact words',
    })).toContain('formation link contains unsupported field: copiedText');

    expect(validateFormationLink({
      kind: 'formation_link', id: 'link-b', userId: 'user-a', linkType: 'awaken_to_see_clearly',
      source: { type: 'practice', id: 'practice-a' },
      target: { type: 'formation_record', id: 'record-a' },
    })).toContain('formation link endpoints are invalid for awaken_to_see_clearly');
    expect(validateFormationLink({
      kind: 'formation_link', id: 'link-c', userId: 'user-a', linkType: 'awaken_to_see_clearly',
      source: { type: 'journal_entry', id: 'entry-a', copiedText: 'My exact words' },
      target: { type: 'formation_record', id: 'record-a' },
    })).toContain('formation link source contains unsupported field: copiedText');
  });

  it('keeps routing advisory and deletion dependencies explicit', () => {
    expect(validateRouteSuggestion({
      kind: 'route_suggestion', suggestedStage: 'join', reason: 'Participation surfaced.',
      changesCurriculumState: false,
    })).toEqual([]);
    expect(validateRouteSuggestion({
      kind: 'route_suggestion', suggestedStage: 'join', reason: 'Participation surfaced.',
      changesCurriculumState: true,
    })).toContain('route suggestion must not change curriculum state');
    expect(validateDeletionDependency({
      kind: 'deletion_dependency', sourceJournalEntryId: 'entry-a', dependentAiArtifactId: 'artifact-a',
      onSourceDelete: 'delete_artifact',
    })).toEqual([]);
    expect(validateDeletionDependency({
      kind: 'deletion_dependency', sourceJournalEntryId: 'entry-a', dependentAiArtifactId: 'artifact-a',
      onSourceDelete: 'retain_summary',
    })).toContain('dependent AI artifact must be deleted with its source entry');
  });

  it('validates formation evidence independently from curriculum progress', () => {
    expect(validateFormationEvidence({
      kind: 'formation_evidence', category: 'formation_evidence', id: 'evidence-a', userId: 'user-a',
      evidenceType: 'practiced', sourceJournalEntryId: 'entry-a',
    })).toEqual([]);
    expect(validateFormationEvidence({
      kind: 'formation_evidence', category: 'formation_evidence', id: 'evidence-a', userId: 'user-a',
      evidenceType: 'maturity_score', sourceJournalEntryId: 'entry-a',
    })).toContain('formation evidence type is invalid');
  });
});

function validAiArtifact() {
  return {
    kind: 'ai_artifact', id: 'artifact-a', userId: 'user-a', threadId: 'thread-a',
    artifactType: 'suggested_tag', status: 'suggested', category: 'ai_suggested_structured',
    provenance: 'ai_suggested', confirmation: 'unconfirmed', modelId: 'test-model',
    globalPolicyVersion: 'global-v1', stagePolicyVersion: 'awaken-v1', modePolicyVersion: 'reflect-v1',
    outputSchemaVersion: 'reflect-v1',
    sources: [{ sourceRole: 'current', journalEntryId: 'entry-a', contextGrantId: null, grantRevision: null }],
  } as const;
}
