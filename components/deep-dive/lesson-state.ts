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
  const requested = input.requestedSection ?? (completed ? sections[0].id : lastSectionId ?? sections[0].id);
  const found = sections.findIndex(section => section.id === requested);
  const index = Math.max(0, found);
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
  save: (id: S['id']) => Promise<unknown>, getCompletion: () => Promise<boolean>,
) {
  const destination = sections.find(item => item.id === target);
  if (!destination) return null;
  if (!await getCompletion()) await save(destination.id);
  return `${pathname}?section=${destination.id}`;
}

export async function finishLesson(
  sections: readonly { id: string }[], pathname: string,
  complete: () => Promise<unknown>, getCompletion: () => Promise<boolean>,
) {
  if (!sections.length) throw new Error('A lesson must have at least one section');
  if (!await getCompletion()) await complete();
  return `${pathname}?section=${sections[sections.length - 1].id}`;
}
