import { describe, expect, it } from 'vitest';
import { INTERACTION_TYPES, parseInteractionType } from '../../../domain/curriculum';
import { STAGE_ORDER, parseStageId } from '../../../domain/stages';

describe('canonical curriculum taxonomy', () => {
  it('keeps the approved four-stage order and rejects Walk', () => {
    expect(STAGE_ORDER).toEqual(['awaken', 'see-clearly', 'become', 'join']);
    expect(() => parseStageId('walk')).toThrow('Invalid curriculum stage: walk');
  });

  it('accepts exactly the approved interaction types', () => {
    expect(INTERACTION_TYPES).toEqual([
      'orient',
      'teach',
      'scripture',
      'notice',
      'name',
      'interpret',
      'reflect',
      'practice',
      'return',
      'ai_explain',
      'ai_reflect',
      'ai_guide',
      'route',
      'carry_forward',
    ]);
    expect(() => parseInteractionType('score')).toThrow('Invalid interaction type: score');
  });
});
