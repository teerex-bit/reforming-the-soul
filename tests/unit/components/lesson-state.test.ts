import { describe, expect, it, vi } from 'vitest';
import { lessonState } from '../../../components/deep-dive/lesson-state';
import { A1_SECTIONS } from '../../../content/deep-dive/v1';
import { A2_SECTIONS } from '../../../content/deep-dive/v1/awaken/catch-yourself-being-you';
import { A3_SECTIONS, A4_SECTIONS } from '../../../content/deep-dive/v1/awaken/four-module-lessons';
import { SC1_SECTIONS } from '../../../content/deep-dive/v1/see-clearly/sc1';

describe('shared lesson state across authored modules', () => {
  for (const [name, sections, group] of [
    ['A1', A1_SECTIONS, '/deep-dive/awaken'],
    ['A2', A2_SECTIONS, '/deep-dive/awaken'],
    ['A3', A3_SECTIONS, '/deep-dive/awaken'],
    ['A4', A4_SECTIONS, '/deep-dive/awaken'],
    ['SY1', SC1_SECTIONS, '/deep-dive/see-clearly/see-yourself-clearly'],
  ] as const) {
    const pathname = `/lesson/${name}`;
    const input = { sections: sections as readonly { id: string; eyebrow: string; title: string; paragraphs: readonly string[] }[], pathname, groupHref: group, reflectionSection: 'reflection' };
    it(`${name}: entry, resume, previous Back, and review`, async () => {
      const entry = lessonState(input);
      expect(entry.index).toBe(0);
      expect(entry.backHref).toBe(group);
      const resume = lessonState({ ...input, lastSectionId: sections[2].id });
      expect(resume.index).toBe(2);
      expect(resume.backHref).toBe(`${pathname}?section=${sections[1].id}`);
      const review = lessonState({ ...input, completedAt: new Date(), lastSectionId: sections.at(-1)!.id });
      expect(review.index).toBe(0);
      expect(review.reviewReflection).toBe(true);
      const save = vi.fn(async () => {});
      const target = sections[1].id;
      expect(await review.advance(target, save, async () => true)).toBe(`${pathname}?section=${target}`);
      expect(save).not.toHaveBeenCalled();
      expect(await review.finish(save, async () => true)).toBe(`${pathname}?section=${sections.at(-1)!.id}`);
      expect(save).not.toHaveBeenCalled();
      // A stale open tab cannot write progress after another tab completes the lesson.
      expect(await resume.advance(target, save, async () => true)).toBe(`${pathname}?section=${target}`);
      expect(save).not.toHaveBeenCalled();
      expect(await resume.advance(target, save, async () => false)).toBe(`${pathname}?section=${target}`);
      expect(save).toHaveBeenCalledOnce();
      expect(await resume.advance('invalid', save, async () => false)).toBeNull();
      expect(save).toHaveBeenCalledOnce();
    });
  }
});
