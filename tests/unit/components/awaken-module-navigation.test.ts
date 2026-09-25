import { describe, expect, it } from 'vitest';
import { awakenModuleNavigation } from '../../../components/deep-dive/awaken-module-navigation';
import type { DeepDiveProgress } from '../../../domain/deep-dive';

const incomplete: DeepDiveProgress = { id: 'sample', lastSectionId: 'teaching', completedAt: null, reflection: 'My saved words' };
const completed: DeepDiveProgress = { ...incomplete, lastSectionId: 'carry-forward', completedAt: '2026-09-25T12:00:00Z' };

describe('Awaken module navigation', () => {
  for (const slug of ['pay-attention', 'catch-yourself-being-you', 'your-reactions-have-a-history', 'formation-is-not-identity']) {
    it(`begins, resumes, and reviews ${slug} without changing its progress`, () => {
      expect(awakenModuleNavigation(slug, 'Lesson', null)).toEqual({ label: 'Begin Lesson', href: `/deep-dive/awaken/${slug}` });
      expect(awakenModuleNavigation(slug, 'Lesson', incomplete)).toEqual({ label: 'Resume Lesson', href: `/deep-dive/awaken/${slug}?section=teaching` });
      expect(awakenModuleNavigation(slug, 'Lesson', completed)).toEqual({ label: 'Review Lesson', href: `/deep-dive/awaken/${slug}?section=entry` });
    });
  }
});
