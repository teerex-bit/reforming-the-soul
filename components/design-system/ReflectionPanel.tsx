import { ReactNode, useId } from 'react';
import { StatusMessage } from './StatusMessage';

type ReflectionPanelProps = { title: string; prompt: string; field: ReactNode; status?: string; error?: string };

export function ReflectionPanel({ title, prompt, field, status, error }: ReflectionPanelProps) {
  const headingId = useId();
  return (
    <section className="reflection-panel" aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      <p className="reflection-panel__prompt">{prompt}</p>
      {field}
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {status ? <StatusMessage tone="saved">{status}</StatusMessage> : null}
    </section>
  );
}
