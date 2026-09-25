'use client';

import { useActionState, useState } from 'react';
import type { NewAwakenSection } from '../../content/deep-dive/v1/awaken/four-module-lessons';

export type NewReflectionSaveState = Readonly<{ saved: boolean; error?: string }>;
type ReflectionAction = (state: NewReflectionSaveState, formData: FormData) => Promise<NewReflectionSaveState>;
type LessonProps = { section: NewAwakenSection; reflection: string | null; saveReflection: ReflectionAction; review?: boolean };

const RESPONSES = ['Control', 'Withdrawal', 'Fixing', 'Pleasing', 'Proving', 'Escaping', 'Defending', 'Over-explaining', 'Something else'] as const;
const SOURCES = ['Family', 'Church', 'Culture', 'Authority figures', 'Success', 'Failure', 'Pain', 'Repeated experiences', 'Modeled behavior', 'A strategy that once worked', "I'm not sure", 'Something else'] as const;

function Reflection({ section, reflection, saveReflection, review }: LessonProps) {
  const [state, action, pending] = useActionState(saveReflection, { saved: false });
  const [body, setBody] = useState(reflection ?? '');
  const [edited, setEdited] = useState(false);
  if (review) return <section className="deep-dive-saved-reflection" aria-label="Your saved reflection"><h2>Your reflection</h2><p>{reflection || 'You continued without writing.'}</p></section>;
  return <form className="deep-dive-reflection" action={action}>
    <label htmlFor="new-awaken-reflection">{section.prompt}</label>
    <textarea id="new-awaken-reflection" name="body" rows={3} value={body} onChange={event => { setBody(event.target.value); setEdited(true); }} />
    <div className="deep-dive-reflection__actions">
      <button className="button" type="submit" disabled={pending || !body.trim()}>{pending ? 'Saving…' : 'Save & continue'}</button>
      <button className="button button--secondary" type="submit" name="skip" value="true" disabled={pending}>Continue without writing</button>
    </div>
    <p className="status-message status-message--saved" role="status" aria-live="polite">{state.saved && !edited ? 'Reflection saved.' : ''}</p>
    {state.error ? <p className="field__error" role="alert">{state.error}</p> : null}
  </form>;
}

function Thread() {
  const [response, setResponse] = useState('');
  const [source, setSource] = useState('');
  const [functionText, setFunctionText] = useState('');
  return <div className="a3-thread">
    <label>Recurring response<select value={response} onChange={event => setResponse(event.target.value)}><option value="">Choose if recognized</option>{RESPONSES.map(value => <option key={value}>{value}</option>)}</select></label>
    <span aria-hidden="true">←</span>
    <label>Possible source<select value={source} onChange={event => setSource(event.target.value)}><option value="">Choose if known</option>{SOURCES.map(value => <option key={value}>{value}</option>)}</select></label>
    <span aria-hidden="true">←</span>
    <label>What it may have helped me accomplish, protect, or avoid<input value={functionText} onChange={event => setFunctionText(event.target.value)} placeholder="I'm not sure is a valid answer" /></label>
    <div className="a3-thread__result" role="region" aria-label="Your working thread" aria-live="polite"><p>{response || 'A response I notice'} → {source || 'a possible source I may not know'} → {functionText || 'a former function I may not know'}</p><small>These selections are not saved. You decide what, if anything, fits.</small></div>
  </div>;
}

function Reframe() {
  const [pattern, setPattern] = useState('');
  return <div className="a4-reframe">
    <label>A pattern you recognize<input value={pattern} onChange={event => setPattern(event.target.value)} placeholder="e.g., move toward control" /></label>
    <div role="region" aria-label="Your working reframe" aria-live="polite"><span className="eyebrow">A DIFFERENT WAY TO SAY IT</span><p>{pattern ? `I learned to ${pattern}, but this is not the whole truth of who I am.` : 'I learned / tend / have been formed to …, but this is not the whole truth of who I am.'}</p><small>Your words here are a working reframe. They are not saved.</small></div>
  </div>;
}

const STEPS = [
  ['NOTICE', 'Something in me just changed.'],
  ['NAME', 'What am I feeling, wanting, or doing?'],
  ['ASK · OPTIONAL', 'God, what do You want me to see here? You may leave the question open.'],
  ['RECEIVE · OPTIONAL', 'Stay with what becomes clear without forcing an answer.'],
] as const;

function Lesson({ section, reflection, saveReflection, review, module }: LessonProps & { module: 'a3' | 'a4' }) {
  return <article className={`deep-dive-lesson deep-dive-lesson--${module} deep-dive-lesson--${section.id}`}>
    <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p><h1>{section.title}</h1>
    {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    {module === 'a3' && section.id === 'trace' ? <Thread /> : null}
    {module === 'a4' && section.id === 'reframe' ? <Reframe /> : null}
    {module === 'a4' && section.id === 'carry-forward' ? <section className="a4-carry-practice" aria-label="Carry-forward practice">{STEPS.map(([name, description]) => <div key={name}><strong>{name}</strong><p>{description}</p></div>)}</section> : null}
    {section.id === 'reflection' ? <Reflection section={section} reflection={reflection} saveReflection={saveReflection} review={review} /> : null}
  </article>;
}

export function A3Lesson(props: LessonProps) { return <Lesson {...props} module="a3" />; }
export function A4Lesson(props: LessonProps) { return <Lesson {...props} module="a4" />; }
