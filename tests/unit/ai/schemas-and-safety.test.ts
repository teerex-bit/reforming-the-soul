import { describe, expect, it } from 'vitest';
import { parseReflectOutput } from '../../../server/ai/schemas';

describe('Reflect structured output', () => {
  it('accepts only one to three precise questions', () => {
    expect(parseReflectOutput({ questions: ['What did you notice before you interpreted it?'] })).toEqual({
      kind: 'success', value: { questions: ['What did you notice before you interpreted it?'] }, providerRequestId: null,
    });
    expect(parseReflectOutput({ questions: [] }).kind).toBe('invalid');
    expect(parseReflectOutput({ questions: ['One?', 'Two?', 'Three?', 'Four?'] }).kind).toBe('invalid');
    expect(parseReflectOutput({ questions: ['What did you notice?'], diagnosis: 'anxiety' }).kind).toBe('invalid');
    expect(parseReflectOutput({ questions: ['This is a statement.'] }).kind).toBe('invalid');
  });

  it.each([
    'Could this prove you have trauma?',
    'God told you to reconcile with them.',
    'Your hidden motive is control, right?',
    'Is your calling definitely pastoral ministry?',
    'Would you rate your spiritual maturity as 8 out of 10?',
    'Should you reconcile now even if the relationship is unsafe?',
  ])('rejects forbidden authority or diagnostic language: %s', question => {
    expect(parseReflectOutput({ questions: [question] }).kind).toBe('invalid');
  });
});
