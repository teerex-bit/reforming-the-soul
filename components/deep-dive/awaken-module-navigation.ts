import type { DeepDiveProgress } from '../../domain/deep-dive';

export function awakenModuleNavigation(slug: string, title: string, progress: DeepDiveProgress | null) {
  const status = progress?.completedAt ? 'Review' : progress ? 'Resume' : 'Begin';
  const section = progress?.completedAt ? 'entry' : progress?.lastSectionId;
  return {
    label: `${status} ${title}`,
    href: `/deep-dive/awaken/${slug}${section ? `?section=${encodeURIComponent(section)}` : ''}`,
  };
}
