/** Back follows the lesson order, independent of browser history and saved progress. */
export function awakenBackHref(
  pathname: string,
  sections: readonly { id: string }[],
  index: number,
): string {
  return index > 0 ? `${pathname}?section=${sections[index - 1].id}` : '/deep-dive/awaken';
}
