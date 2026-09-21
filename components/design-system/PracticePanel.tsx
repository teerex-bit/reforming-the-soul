import { ReactNode, useId } from 'react';

type PracticePanelProps = { state: string; nextStep: string; returnAction: ReactNode; title?: string };

export function PracticePanel({ state, nextStep, returnAction, title = 'Your practice' }: PracticePanelProps) {
  const headingId = useId();
  return (
    <section className="practice-panel" aria-labelledby={headingId}>
      <p className="practice-panel__state">{state}</p>
      <h2 id={headingId}>{title}</h2>
      <p className="practice-panel__next">{nextStep}</p>
      {returnAction}
    </section>
  );
}
