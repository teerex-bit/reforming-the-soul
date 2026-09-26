'use client';

import { useActionState, useState } from 'react';
import { A4Reframe } from './A4Reframe';
import { LessonActionError } from './LessonTransitionForm';
import { ReviewReflection, type ReviewReflectionAction } from './ReviewReflection';
import type { NewAwakenSection } from '../../content/deep-dive/v1/awaken/four-module-lessons';

export type NewReflectionSaveState = Readonly<{ saved: boolean; error?: string }>;
type ReflectionAction = (state: NewReflectionSaveState, formData: FormData) => Promise<NewReflectionSaveState>;
type LessonProps = { section: NewAwakenSection; reflection: string | null; saveReflection: ReflectionAction; editReflection: ReviewReflectionAction; review?: boolean; generateReframe?: (statement: string) => Promise<string> };

const RESPONSES = ['Control', 'Withdrawal', 'Fixing', 'Pleasing', 'Proving', 'Escaping', 'Defending', 'Over-explaining', 'Something else'] as const;
const SOURCES = ['Family', 'Church', 'Culture', 'Authority figures', 'Success', 'Failure', 'Pain', 'Repeated experiences', 'Modeled behavior', 'A strategy that once worked', "I'm not sure", 'Something else'] as const;

function Reflection({ section, reflection, saveReflection, editReflection, review }: LessonProps) {
  const [state, action, pending] = useActionState(saveReflection, { saved: false });
  const [body, setBody] = useState(reflection ?? '');
  const [edited, setEdited] = useState(false);
  if (review) return <ReviewReflection id="new-awaken-reflection" label={section.prompt ?? 'Your reflection'} reflection={reflection} action={editReflection} />;
  return <form className="deep-dive-reflection" action={action}>
    <label htmlFor="new-awaken-reflection">{section.prompt}</label>
    <textarea id="new-awaken-reflection" name="body" rows={3} value={body} onChange={event => { setBody(event.target.value); setEdited(true); }} />
    <div className="deep-dive-reflection__actions">
      <button className="button" type="submit" disabled={pending || !body.trim()}>{pending ? 'Saving…' : 'Save & continue'}</button>
      <button className="button button--secondary" type="submit" name="skip" value="true" disabled={pending}>Continue without writing</button>
    </div>
    <p className="status-message status-message--saved" role="status" aria-live="polite">{state.saved && !edited ? 'Reflection saved.' : ''}</p>
    <LessonActionError error={state.error} />
  </form>;
}

function Thread() {
  const [response, setResponse] = useState('');
  const [source, setSource] = useState('');
  const [functionText, setFunctionText] = useState('');
  return <div className="a3-thread">
    <div className="a3-thread__fields">
      <label className="a3-thread__card">Recurring response<select value={response} onChange={event => setResponse(event.target.value)}><option value="">Choose if recognized</option>{RESPONSES.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="a3-thread__card">Possible source<select value={source} onChange={event => setSource(event.target.value)}><option value="">Choose if known</option>{SOURCES.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="a3-thread__card">Possible function<input aria-label="Possible function" aria-describedby="a3-function-hint" value={functionText} onChange={event => setFunctionText(event.target.value)} placeholder="I'm not sure" /><small id="a3-function-hint">What this response may have helped me accomplish, protect, or avoid.</small></label>
    </div>
    <div className="a3-thread__result" role="region" aria-label="Your working thread" aria-live="polite"><p>A recurring response may connect to where it was formed and to what it once helped you do.</p>{response || source || functionText ? <p className="a3-thread__selections">{[response, source, functionText].filter(Boolean).join(' · ')}</p> : null}<small>These selections are not saved. You decide what, if anything, fits.</small></div>
  </div>;
}

const STEPS = [
  ['NOTICE', 'Something in me just changed.'],
  ['NAME', 'What am I feeling, wanting, or doing?'],
  ['ASK', 'God, what do You want me to see here? You may leave the question open.'],
  ['RECEIVE', 'Stay with what becomes clear without forcing an answer.'],
] as const;

function Lesson({ section, reflection, saveReflection, editReflection, review, generateReframe, module }: LessonProps & { module: 'a3' | 'a4' }) {
  return <article className={`deep-dive-lesson deep-dive-lesson--${module} deep-dive-lesson--${section.id}`}>
    <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p><h1>{section.title}</h1>
    {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    {module === 'a3' && section.id === 'trace' ? <Thread /> : null}
    {module === 'a4' && section.id === 'reframe' ? <A4Reframe generate={generateReframe!} /> : null}
    {module === 'a4' && section.id === 'carry-forward' ? <section className="a4-carry-practice" aria-label="Carry-forward practice">{STEPS.map(([name, description]) => <div key={name}><strong>{name}</strong><p>{description}</p></div>)}</section> : null}
    {section.id === 'reflection' ? <Reflection section={section} reflection={reflection} saveReflection={saveReflection} editReflection={editReflection} review={review} /> : null}
  </article>;
}

export function A3Lesson(props: LessonProps) { return <Lesson {...props} module="a3" />; }
export function A4Lesson(props: LessonProps) { return <Lesson {...props} module="a4" />; }
