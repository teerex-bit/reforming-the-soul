import { describe, expect, it, vi } from 'vitest';
import { lessonState, advanceLessonSection, finishLesson, attemptLessonTransition, lessonSaveFailure } from '../../../components/deep-dive/lesson-state';
import { A1_SECTIONS } from '../../../content/deep-dive/v1';
import { A2_SECTIONS } from '../../../content/deep-dive/v1/awaken/catch-yourself-being-you';
import { A3_SECTIONS, A4_SECTIONS } from '../../../content/deep-dive/v1/awaken/four-module-lessons';
import { SC1_SECTIONS } from '../../../content/deep-dive/v1/see-clearly/sc1';
import { SY2_SECTIONS } from '../../../content/deep-dive/v1/see-clearly/sy2';
import { SY3_SECTIONS } from '../../../content/deep-dive/v1/see-clearly/sy3';
import { SG1_SECTIONS } from '../../../content/deep-dive/v1/see-clearly/sg1';
import { SY4_SECTIONS } from '../../../content/deep-dive/v1/see-clearly/sy4';

describe('shared lesson state across authored modules', () => {
  for (const [name, sections, group] of [
    ['A1', A1_SECTIONS, '/deep-dive/awaken'],
    ['A2', A2_SECTIONS, '/deep-dive/awaken'],
    ['A3', A3_SECTIONS, '/deep-dive/awaken'],
    ['A4', A4_SECTIONS, '/deep-dive/awaken'],
    ['SY1', SC1_SECTIONS, '/deep-dive/see-clearly/see-yourself-clearly'],
    ['SY2', SY2_SECTIONS, '/deep-dive/see-clearly'],
    ['SY3', SY3_SECTIONS, '/deep-dive/see-clearly'],
    ['SY4', SY4_SECTIONS, '/deep-dive/see-clearly'],
    ['SG1', SG1_SECTIONS, '/deep-dive/see-clearly'],
  ] as const) {
    const pathname = `/lesson/${name}`;
    const input = { sections: sections as readonly { id: string; eyebrow: string; title: string; paragraphs: readonly string[] }[], pathname, groupHref: group, reflectionSection: 'reflection' };
    it(`${name}: entry, resume, previous Back, and review`, async () => {
      const entry = lessonState(input);
      expect(entry.index).toBe(0);
      expect(Object.values(entry).every(value => typeof value !== 'function')).toBe(true);
      expect(entry.backHref).toBe(group);
      const resume = lessonState({ ...input, lastSectionId: sections[2].id });
      expect(resume.index).toBe(2);
      expect(resume.backHref).toBe(`${pathname}?section=${sections[1].id}`);
      const review = lessonState({ ...input, completedAt: new Date(), lastSectionId: sections.at(-1)!.id });
      expect(review.index).toBe(0);
      expect(review.reviewReflection).toBe(true);
      const save = vi.fn(async () => {});
      const target = sections[1].id;
      expect(await advanceLessonSection(input.sections, pathname, target, save, async () => true)).toBe(`${pathname}?section=${target}`);
      expect(save).not.toHaveBeenCalled();
      expect(await finishLesson(input.sections, pathname, save, async () => true)).toBe(`${pathname}?section=${sections.at(-1)!.id}`);
      expect(save).not.toHaveBeenCalled();
      // A stale open tab cannot write progress after another tab completes the lesson.
      expect(await advanceLessonSection(input.sections, pathname, target, save, async () => true)).toBe(`${pathname}?section=${target}`);
      expect(save).not.toHaveBeenCalled();
      expect(await advanceLessonSection(input.sections, pathname, target, save, async () => false)).toBe(`${pathname}?section=${target}`);
      expect(save).toHaveBeenCalledOnce();
      expect(await advanceLessonSection(input.sections, pathname, 'invalid', save, async () => false)).toBeNull();
      expect(save).toHaveBeenCalledOnce();
    });
    it(`${name}: an incomplete participant cannot request a future section`, () => {
      const current = sections[2].id;
      expect(lessonState({ ...input, requestedSection: sections.at(-1)!.id }).section.id).toBe(sections[0].id);
      expect(lessonState({ ...input, lastSectionId: current, requestedSection: sections.at(-1)!.id }).section.id).toBe(current);
      expect(lessonState({ ...input, lastSectionId: current, requestedSection: sections[1].id }).section.id).toBe(sections[1].id);
      expect(lessonState({ ...input, lastSectionId: current, requestedSection: 'not-a-section' }).section.id).toBe(current);
      expect(lessonState({ ...input, completedAt: new Date(), requestedSection: sections.at(-1)!.id }).section.id).toBe(sections.at(-1)!.id);
    });
  }
});

describe('shared lesson transition recovery', () => {
  it('returns a retry message without claiming progress on a rejected save', async () => {
    const result = await attemptLessonTransition(async () => { throw new Error('database detail'); });
    expect(result).toEqual({ error: 'We could not save your place. Please try again.', signIn: false });
  });
  it('offers sign-in when the session expires and succeeds on retry', async () => {
    const { AuthenticationRequiredError } = await import('../../../server/auth/require-actor');
    expect(await attemptLessonTransition(async () => { throw new AuthenticationRequiredError(); })).toEqual({ error: 'Your session ended. Sign in, then return to this lesson.', signIn: true });
    expect(await attemptLessonTransition(async () => '/lesson?section=next')).toEqual({ destination: '/lesson?section=next' });
  });
  it('does not rewind the reached boundary when continuing from a previous section', async () => {
    const save = vi.fn(async () => {});
    const sections = A1_SECTIONS;
    const path = '/lesson/a1';
    expect(await advanceLessonSection(sections, path, sections[1].id, save, async () => ({ completed: false, lastSectionId: sections[3].id }))).toBe(`${path}?section=${sections[1].id}`);
    expect(save).not.toHaveBeenCalled();
    expect(await advanceLessonSection(sections, path, sections[5].id, save, async () => ({ completed: false, lastSectionId: sections[3].id }))).toBeNull();
    expect(save).not.toHaveBeenCalled();
    expect(await advanceLessonSection(sections, path, sections[4].id, save, async () => ({ completed: false, lastSectionId: sections[3].id }))).toBe(`${path}?section=${sections[4].id}`);
    expect(save).toHaveBeenCalledOnce();
  });
  it('does not complete before the final section has been reached', async () => {
    const complete = vi.fn(async () => {});
    await expect(finishLesson(A1_SECTIONS, '/lesson/a1', complete, async () => ({ completed: false, lastSectionId: A1_SECTIONS[2].id }))).rejects.toThrow('Final section not reached');
    expect(complete).not.toHaveBeenCalled();
  });
  it('identifies expired auth for a writing action without echoing private error details', async () => {
    const { AuthenticationRequiredError } = await import('../../../server/auth/require-actor');
    expect(lessonSaveFailure(new AuthenticationRequiredError(), 'Could not save your words.')).toEqual({ error: 'Your session ended. Sign in, then return to this lesson.', signIn: true });
    expect(lessonSaveFailure(new Error('private SQL detail'), 'Could not save your words.')).toEqual({ error: 'Could not save your words.', signIn: false });
  });
});
