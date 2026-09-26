/** Shared behavioral rules for authored Deep Dive lessons. No curriculum or UI lives here. */
export function lessonState<S extends { id: string }>(input: {
  sections: readonly S[];
  pathname: string;
  groupHref: string;
  requestedSection?: string;
  lastSectionId?: string | null;
  completedAt?: string | Date | null;
  reflectionSection?: string;
}) {
  const { sections, pathname, groupHref, lastSectionId, reflectionSection } = input;
  if (!sections.length) throw new Error('A lesson must have at least one section');
  const completed = Boolean(input.completedAt);
  const reached = Math.max(0, sections.findIndex(section => section.id === lastSectionId));
  const requested = input.requestedSection ?? (completed ? sections[0].id : sections[reached].id);
  const found = sections.findIndex(section => section.id === requested);
  const index = found < 0 ? (completed ? 0 : reached) : completed ? found : Math.min(found, reached);
  const section = sections[index];
  const next = sections[index + 1];
  const reflectionIndex = reflectionSection ? sections.findIndex(item => item.id === reflectionSection) : -1;
  return {
    completed,
    index,
    section,
    next,
    backHref: index ? `${pathname}?section=${sections[index - 1].id}` : groupHref,
    nextHref: next ? `${pathname}?section=${next.id}` : null,
    reviewReflection: completed || reflectionIndex >= 0 && sections.findIndex(item => item.id === lastSectionId) > reflectionIndex,
  };
}

/** Server actions call this with fresh completion state; review navigation never writes progress. */
export async function advanceLessonSection<S extends { id: string }>(
  sections: readonly S[], pathname: string, target: string,
  save: (id: S['id']) => Promise<unknown>, getProgress: () => Promise<boolean | { completed: boolean; lastSectionId?: string | null }>,
) {
  const targetIndex = sections.findIndex(item => item.id === target);
  if (targetIndex < 0) return null;
  const progress = await getProgress();
  const completed = typeof progress === 'boolean' ? progress : progress.completed;
  const reached = typeof progress === 'boolean' ? -1 : Math.max(0, sections.findIndex(item => item.id === progress.lastSectionId));
  if (!completed && reached >= 0 && targetIndex > reached + 1) return null;
  if (!completed && targetIndex > reached) await save(sections[targetIndex].id);
  return `${pathname}?section=${sections[targetIndex].id}`;
}

export async function finishLesson(
  sections: readonly { id: string }[], pathname: string,
  complete: () => Promise<unknown>, getProgress: () => Promise<boolean | { completed: boolean; lastSectionId?: string | null }>,
) {
  if (!sections.length) throw new Error('A lesson must have at least one section');
  const progress = await getProgress();
  const completed = typeof progress === 'boolean' ? progress : progress.completed;
  if (!completed && typeof progress !== 'boolean' && progress.lastSectionId !== sections[sections.length - 1].id)
    throw new Error('Final section not reached');
  if (!completed) await complete();
  return `${pathname}?section=${sections[sections.length - 1].id}`;
}

/** A transition reports success only after persistence confirms it. */
export async function attemptLessonTransition(run: () => Promise<string | null>) {
  try {
    const destination = await run();
    return destination ? { destination } : { error: 'We could not move forward. Please try again.', signIn: false };
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthenticationRequiredError')
      return { error: 'Your session ended. Sign in, then return to this lesson.', signIn: true };
    return { error: 'We could not save your place. Please try again.', signIn: false };
  }
}
