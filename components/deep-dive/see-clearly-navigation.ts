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

const modules = ['sc1', 'sy2', 'sy3', 'sy4', 'sg1', 'sg2', 'sg3', 'sg4'] as const;
export type SeeClearlyModule = typeof modules[number];
const groupRoute = '/deep-dive/see-clearly';

export function seeClearlyNavigation(module: SeeClearlyModule) {
  const index = modules.indexOf(module);
  const self = index < 4;
  const group = self ? 'See Yourself Clearly' : 'See God Clearly';
  const nextIndex = index + 1;
  const nextModule = modules[nextIndex] ?? null;
  const nextGroup = nextIndex < 4 ? 'see-yourself' : 'see-god';
  return {
    backLabel: `Back to ${group}`,
    backHref: `${groupRoute}#${self ? 'see-yourself' : 'see-god'}-heading`,
    nextLabel: nextModule ? `Continue to ${lessons[nextIndex]}` : 'Continue to Become',
    nextHref: module === 'sc1' ? '/deep-dive/see-clearly/follow-the-formation-chain'
      : nextModule ? `${groupRoute}#${nextGroup}-${nextIndex < 4 ? `sy${nextIndex + 1}` : `sg${nextIndex - 3}`}` : null,
    transition: module === 'sy4' ? 'You have finished See Yourself Clearly. Next: See God Clearly.' : module === 'sg4' ? 'You have finished See Clearly. Next: Become.' : null,
  };
}
