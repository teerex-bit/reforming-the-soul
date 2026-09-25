const lessons = [
  'Facts and Interpretation',
  'Follow the Formation Chain',
  'The Learned Self-Story',
  'What Is Actually True About Me',
  'The God I Learned',
  'What I Expect From God',
  'Jesus Shows Us the Father',
  'Can I Trust God Here?',
] as const;

export type SeeClearlyModule = 'sc1' | 'sc2' | 'sc3' | 'sc4' | 'sc5' | 'sc6' | 'sc7' | 'sc8';
const groupRoute = '/deep-dive/see-clearly';

export function seeClearlyNavigation(module: SeeClearlyModule) {
  const index = Number(module.slice(2)) - 1;
  const self = index < 4;
  const group = self ? 'See Yourself Clearly' : 'See God Clearly';
  const nextIndex = index + 1;
  const nextModule = nextIndex < lessons.length ? `sc${nextIndex + 1}` : null;
  const nextGroup = nextIndex < 4 ? 'see-yourself' : 'see-god';
  return {
    backLabel: `Back to ${group}`,
    backHref: `${groupRoute}#${self ? 'see-yourself' : 'see-god'}-heading`,
    nextLabel: nextModule ? `Continue to ${lessons[nextIndex]}` : 'Continue to Become',
    // Only SC1 exists today. The other destinations remain group anchors until their lessons are built.
    nextHref: nextModule ? `${groupRoute}#${nextGroup}-${nextModule}` : null,
    transition: module === 'sc4' ? 'You have finished See Yourself Clearly. Next: See God Clearly.' : module === 'sc8' ? 'You have finished See Clearly. Next: Become.' : null,
  };
}
