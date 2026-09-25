import Link from 'next/link';

const handoffs = {
  a1: { label: 'Continue to A2', href: '/deep-dive/awaken/catch-yourself-being-you' },
  a2: { label: 'Continue to A3', href: '/deep-dive/awaken/your-reactions-have-a-history' },
  a3: { label: 'Continue to A4', href: '/deep-dive/awaken/formation-is-not-identity' },
  a4: { label: 'Continue to See Clearly', href: '/see-clearly/' },
} as const;

export function AwakenCompletionNav({ module }: { module: keyof typeof handoffs }) {
  const next = handoffs[module];
  if (module === 'a1') return <nav className="deep-dive-completion-actions deep-dive-completion-actions--pause" aria-label="Continue your journey">
    <Link className="button button--secondary" href="/deep-dive/awaken">Back to Awaken</Link>
    <Link className="deep-dive-completion-actions__back" href={next.href}>{next.label}</Link>
  </nav>;
  return <nav className="deep-dive-completion-actions" aria-label="Continue your journey">
    <Link className="button" href={next.href}>{next.label}</Link>
    <Link className="deep-dive-completion-actions__back" href="/deep-dive/awaken">Back to Awaken</Link>
  </nav>;
}
