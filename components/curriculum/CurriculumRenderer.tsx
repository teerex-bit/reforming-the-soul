'use client';

import { FormEvent, useState } from 'react';
import type { CurriculumNode, InteractionDefinition } from '../../domain/curriculum';
import { Button } from '../design-system/Button';
import { Bridge } from './Bridge';
import { Prompt } from './Prompt';
import { Scripture } from './Scripture';
import { StructuredInput } from './StructuredInput';
import { Teaching } from './Teaching';

type CurriculumRendererProps = {
  node?: CurriculumNode;
  nodes?: readonly CurriculumNode[];
  onSubmit?: (values: Record<string, string>) => void | Promise<void>;
};

function Interaction({ content, onSubmit }: { content: InteractionDefinition; onSubmit?: CurriculumRendererProps['onSubmit'] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const fields = content.fields ?? [];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit?.(values);
  }
  return (
    <section className="reflection-panel">
      {content.prompt ? <Prompt help={content.help} prompt={content.prompt} /> : content.title ? <h1>{content.title}</h1> : null}
      {content.teaching ? <p>{content.teaching}</p> : null}
      {content.action ? <p>{content.action}</p> : null}
      {content.disclosure ? <p>{content.disclosure}</p> : null}
      {content.output ? <p>{content.output}</p> : null}
      {fields.length ? <form onSubmit={submit}>
        {fields.map(field => <StructuredInput disabled={!onSubmit} field={field} key={field.id} label={fields.length === 1 ? content.prompt ?? content.title ?? field.id : field.id} onChange={value => setValues(current => ({ ...current, [field.id]: value }))} value={values[field.id] ?? ''} />)}
        {!onSubmit ? <p role="status">This interaction is not available yet.</p> : null}
        <Button disabled={!onSubmit} type="submit">{content.saveAction ?? content.action ?? 'Save and continue'}</Button>
      </form> : content.action ? <p>{content.action}</p> : null}
    </section>
  );
}

function InteractionSequence({ nodes, onSubmit }: { nodes: readonly CurriculumNode[]; onSubmit?: CurriculumRendererProps['onSubmit'] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const interactions = nodes.flatMap(node => node.content.kind === 'interaction' ? [node.content] : []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit?.(values);
  }
  return <section className="reflection-panel"><form onSubmit={submit}>
    {interactions.map(content => <div key={content.prompt ?? content.title}>
      {content.prompt ? <Prompt help={content.help} prompt={content.prompt} /> : content.title ? <h1>{content.title}</h1> : null}
      {(content.fields ?? []).map(field => <StructuredInput disabled={!onSubmit} field={field} key={field.id} label={content.prompt ?? content.title ?? field.id} onChange={value => setValues(current => ({ ...current, [field.id]: value }))} value={values[field.id] ?? ''} />)}
    </div>)}
    {!onSubmit ? <p role="status">This interaction is not available yet.</p> : null}
    <Button disabled={!onSubmit} type="submit">Save and continue</Button>
  </form></section>;
}

export function CurriculumRenderer({ node, nodes, onSubmit }: CurriculumRendererProps) {
  if (nodes) return <InteractionSequence nodes={nodes} onSubmit={onSubmit} />;
  if (!node) return null;
  if (node.content.kind === 'session' || node.content.kind === 'module') return <Teaching title={node.content.title}>{node.content.kind === 'session' ? node.content.teaching : ''}</Teaching>;
  if (node.content.kind === 'bridge') return <Bridge content={node.content} />;
  return <><Interaction content={node.content} onSubmit={onSubmit} /><Scripture /></>;
}
