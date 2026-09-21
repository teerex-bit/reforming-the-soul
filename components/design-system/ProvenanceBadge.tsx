const labels = {
  user: 'User wording',
  structured: 'Structured by you',
  'ai-suggestion': 'AI suggestion',
  'ai-confirmed': 'AI-confirmed',
} as const;

type ProvenanceBadgeProps = { kind: keyof typeof labels };

export function ProvenanceBadge({ kind }: ProvenanceBadgeProps) {
  return <span className={`provenance-badge provenance-badge--${kind}`}>{labels[kind]}</span>;
}
