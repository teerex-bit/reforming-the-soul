'use client';

import { useActionState, useState } from 'react';
import type { SY2Section } from '../../content/deep-dive/v1/see-clearly/sy2';
import { sy2ChainFields, type SY2ChainField } from '../../domain/deep-dive';
import type { SY2Record, SY2Source } from '../../server/data/see-clearly-sy2-repository';
import { ReviewReflection, type ReviewReflectionAction } from './ReviewReflection';

export type SY2SaveState = Readonly<{ error?: string; saved?: boolean }>;
export type SY2Action = (state: SY2SaveState, formData: FormData) => Promise<SY2SaveState>;
type Props = Readonly<{
  section: SY2Section; record: SY2Record | null; source: SY2Source | null;
  reflection: string | null; completed: boolean; reviewReflection: boolean;
  saveChain: SY2Action; saveReflection: SY2Action; editReflection: ReviewReflectionAction;
}>;

const chainLabels = ['WHAT I SEE', 'WHAT I BELIEVE', 'WHAT I EXPECT', 'WHAT I DESIRE', 'WHAT I INTEND', 'WHAT I CHOOSE', 'HOW I LIVE'];
const prompts: Record<SY2ChainField, string> = {
  perception: 'What was I seeing in this moment?', belief: 'What did that make me believe was true?',
  expectation: 'What did I expect would happen next?', desire: 'What did I want most?',
  intention: 'What was I trying to make happen or prevent?', choice: 'What did I choose?',
  outcome: 'What did that choice produce?',
};

function ChainVisual() {
  return <ol className="sy2-chain" aria-label="The formation chain">
    {chainLabels.map((label, index) => <li key={label}><span className="sy2-chain__index">0{index + 1}</span><strong>{label}</strong></li>)}
  </ol>;
}

function Trace({ record, source, completed, saveChain }: Pick<Props, 'record' | 'source' | 'completed' | 'saveChain'>) {
  const [state, action, pending] = useActionState(saveChain, {});
  const [mode, setMode] = useState<'source' | 'new'>(record?.sourceSc1RecordId && source ? 'source' : 'new');
  const [step, setStep] = useState(0);
  const [words, setWords] = useState<Record<SY2ChainField, string>>(() => Object.fromEntries(sy2ChainFields.map(field => [field, record?.[field] ?? ''])) as Record<SY2ChainField, string>);
  const field = sy2ChainFields[step];
  const anyWords = sy2ChainFields.some(item => words[item].trim());
  return <form className="sy2-trace" action={action}>
    {source ? <fieldset className="sy2-trace__source"><legend>Choose a starting point</legend>
      <label><input type="radio" name="source_choice" value="source" checked={mode === 'source'} onChange={() => setMode('source')} />Use my SY1 moment</label>
      <label><input type="radio" name="source_choice" value="new" checked={mode === 'new'} onChange={() => setMode('new')} />Use another recent moment</label>
    </fieldset> : <p className="sy2-trace__source-note">Use another recent moment. You do not need a saved SY1 moment to continue.</p>}
    {mode === 'source' && source ? <aside className="sy2-trace__reference" aria-label="Your SY1 moment">
      <p><strong>What happened:</strong> {source.eventFacts}</p>
      <p><strong>What it meant then:</strong> {source.automaticInterpretation}</p>
    </aside> : null}
    {record?.sourceWasLinked && !record.sourceSc1RecordId ? <p role="status">Your earlier SY1 source is no longer available. Your own chain wording remains here.</p> : null}
    <input type="hidden" name="source_sc1_record_id" value={mode === 'source' ? source?.id ?? '' : ''} />
    {sy2ChainFields.map(item => <input key={item} type="hidden" name={item} value={words[item]} />)}
    <div className="sy2-trace__position" aria-live="polite">LINK {step + 1} OF {sy2ChainFields.length} · {chainLabels[step]}</div>
    <label className="sy2-trace__prompt" htmlFor={`sy2-${field}`}>{prompts[field]}
      <textarea id={`sy2-${field}`} rows={4} value={words[field]} onChange={event => setWords({ ...words, [field]: event.target.value })} placeholder="You may leave this open." />
    </label>
    <div className="sy2-trace__steps">
      {step > 0 ? <button type="button" className="button button--secondary" onClick={() => setStep(step - 1)}>Previous link</button> : null}
      {step < sy2ChainFields.length - 1 ? <button type="button" className="button button--secondary" onClick={() => setStep(step + 1)}>Next link</button> : null}
    </div>
    <div className="deep-dive-reflection__actions">
      <button className="button" type="submit" disabled={pending || !anyWords}>{pending ? 'Saving…' : completed ? 'Save changes' : 'Save & continue'}</button>
      {!completed ? <button className="button button--secondary" type="submit" name="skip" value="true" disabled={pending}>Continue without saving this trace</button> : null}
    </div>
    {state.saved ? <p role="status">Your trace was saved.</p> : null}
    {state.error ? <p className="field__error" role="alert">{state.error}</p> : null}
  </form>;
}

function Reflection({ reflection, reviewReflection, saveReflection, editReflection }: Pick<Props, 'reflection' | 'reviewReflection' | 'saveReflection' | 'editReflection'>) {
  const [state, action, pending] = useActionState(saveReflection, {});
  const [body, setBody] = useState(reflection ?? '');
  if (reviewReflection) return <ReviewReflection id="sy2-reflection" label="What became clearer when you followed the reaction backward?" reflection={reflection} action={editReflection} />;
  return <form className="deep-dive-reflection" action={action}>
    <label htmlFor="sy2-reflection">What became clearer when you followed the reaction backward?</label>
    <textarea id="sy2-reflection" name="body" rows={3} value={body} onChange={event => setBody(event.target.value)} />
    <div className="deep-dive-reflection__actions">
      <button className="button" type="submit" disabled={pending || !body.trim()}>{pending ? 'Saving…' : 'Save & continue'}</button>
      <button className="button button--secondary" type="submit" name="skip" value="true" disabled={pending}>Continue without writing</button>
    </div>
    {state.error ? <p className="field__error" role="alert">{state.error}</p> : null}
  </form>;
}

export function SY2Lesson({ section, record, source, reflection, completed, reviewReflection, saveChain, saveReflection, editReflection }: Props) {
  return <article className={`deep-dive-lesson deep-dive-lesson--sy2 deep-dive-lesson--${section.id}`}>
    <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p><h1>{section.title}</h1>
    {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    {section.id === 'chain' ? <ChainVisual /> : null}
    {section.id === 'trace' ? <Trace record={record} source={source} completed={completed} saveChain={saveChain} /> : null}
    {section.id === 'distinction' ? <div className="sy2-distinction"><p><strong>BELIEF</strong> What I think is true.</p><p><strong>DESIRE</strong> What I want in response.</p></div> : null}
    {section.id === 'reflection' ? <Reflection reflection={reflection} reviewReflection={reviewReflection} saveReflection={saveReflection} editReflection={editReflection} /> : null}
  </article>;
}
