import { describe, expect, it } from 'vitest';
import {
  AI_ARTIFACT_STATES,
  PRACTICE_STATES,
  SESSION_STATES,
  canTransitionPractice,
  parseAiArtifactState,
  parsePracticeState,
  parseSessionState,
  validatePractice,
  validatePracticeReturn,
} from '../../../domain/practice';

describe('approved lifecycle contracts', () => {
  it('freezes curriculum session, practice, and AI artifact states', () => {
    expect(SESSION_STATES).toEqual(['not_started', 'in_progress', 'completed']);
    expect(PRACTICE_STATES).toEqual([
      'draft',
      'open',
      'waiting_for_real_life',
      'ready_to_review',
      'reviewed',
      'closed',
    ]);
    expect(AI_ARTIFACT_STATES).toEqual(['suggested', 'confirmed', 'invalidated']);
    expect(() => parseSessionState('mature')).toThrow();
    expect(() => parsePracticeState('fruit_score')).toThrow();
    expect(() => parseAiArtifactState('spiritually_verified')).toThrow();
  });

  it('permits only the approved forward practice transitions', () => {
    expect(canTransitionPractice('draft', 'open')).toBe(true);
    expect(canTransitionPractice('open', 'waiting_for_real_life')).toBe(true);
    expect(canTransitionPractice('waiting_for_real_life', 'ready_to_review')).toBe(true);
    expect(canTransitionPractice('ready_to_review', 'reviewed')).toBe(true);
    expect(canTransitionPractice('reviewed', 'closed')).toBe(true);
    expect(canTransitionPractice('waiting_for_real_life', 'closed')).toBe(false);
    expect(canTransitionPractice('closed', 'open')).toBe(false);
  });

  it('validates practices and returns without copied user wording', () => {
    expect(validatePractice({
      kind: 'practice', id: 'practice-a', userId: 'user-a', curriculumVersionId: 'phase-1-v1',
      nodeId: 'become.practice.open', controlTargetEntryId: 'entry-control',
      presentTruthEntryId: 'entry-truth', nextRightStepEntryId: 'entry-step',
      state: 'waiting_for_real_life', lockVersion: 0,
    })).toEqual([]);
    expect(validatePractice({
      kind: 'practice', id: 'practice-a', userId: 'user-a', curriculumVersionId: 'wrong-version',
      nodeId: 'become.unapproved', controlTargetEntryId: 'entry-control',
      presentTruthEntryId: 'entry-truth', nextRightStepEntryId: 'entry-step',
      state: 'waiting_for_real_life', lockVersion: 0,
    })).toEqual(expect.arrayContaining([
      'practice curriculum version must be phase-1-v1',
      'practice nodeId must reference an authorized seed node',
    ]));
    expect(validatePracticeReturn({
      kind: 'practice_return', id: 'return-a', userId: 'user-a', practiceId: 'practice-a',
      outcomeEntryId: 'entry-outcome', reviewEntryId: null,
    })).toEqual([]);
    expect(validatePracticeReturn({
      kind: 'practice_return', id: 'return-a', userId: 'user-a', practiceId: 'practice-a',
      outcomeEntryId: 'entry-outcome', reviewEntryId: null, outcomeText: 'copied wording',
    })).toContain('practice return contains unsupported field: outcomeText');
  });
});
