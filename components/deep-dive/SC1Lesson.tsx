'use client';

import { useActionState, useState } from 'react';
import type { SC1Section } from '../../content/deep-dive/v1/see-clearly/sc1';
import type { SC1Record, SC1Source } from '../../server/data/see-clearly-sc1-repository';
import { ReviewReflection, type ReviewReflectionAction } from './ReviewReflection';

export type SC1SaveState = Readonly<{ error?: string }>;
type SC1Action = (state: SC1SaveState, formData: FormData) => Promise<SC1SaveState>;
type Props = Readonly<{
  section: SC1Section;
  record: SC1Record | null;
  reflection: string | null;
  sources: readonly SC1Source[];
  completed: boolean;
  reviewReflection: boolean;
  saveResponse: SC1Action;
  saveReflection: SC1Action;
  editReflection: ReviewReflectionAction;
}>;

function Contrast() {
  return <div className="sc1-contrast" aria-label="One moment with distinct fact and meaning">
    <div><span className="eyebrow">WHAT COULD BE OBSERVED</span><p>Two people stopped talking when I entered.</p></div>
    <div><span className="eyebrow">THE MEANING THAT ARRIVED</span><p>“They don’t want me here.”</p></div>
    <details className="sc1-contrast__more"><summary>Look again at the difference</summary><p>“They finished their conversation” is another possible meaning. Neither explanation is visible in the silence itself. The observation gives you a place to begin asking what is true.</p></details>
  </div>;
}

function Moment({ record, sources, completed, saveResponse }: Pick<Props, 'record' | 'sources' | 'completed' | 'saveResponse'>) {
  const [state, action, pending] = useActionState(saveResponse, {});
  const [facts, setFacts] = useState(record?.eventFacts ?? '');
  const [meaning, setMeaning] = useState(record?.automaticInterpretation ?? '');
  if (completed) return <section className="sc1-saved-moment" aria-label="Your saved moment">
    <div><h2>What happened</h2><p>{record?.eventFacts ?? 'Your source entry was removed.'}</p></div>
    <div><h2>What it meant to you</h2><p>{record?.automaticInterpretation ?? 'Your source entry was removed.'}</p></div>
  </section>;
  return <form className="sc1-moment" action={action}>
    {sources.length ? <label className="sc1-moment__source" htmlFor="sc1-source">Connect an earlier Awaken moment (optional)
      <select id="sc1-source" name="source_entry_id" defaultValue={record?.sourceEntryId ?? ''}>
        <option value="">Use a new moment</option>
        {sources.map(source => <option key={source.id} value={source.id}>{source.body.slice(0, 90)}{source.body.length > 90 ? '…' : ''}</option>)}
      </select>
    </label> : null}
    <div className="sc1-moment__fields">
      <label htmlFor="sc1-facts">What could a careful witness observe?<span>Describe what happened without guessing why.</span>
        <textarea id="sc1-facts" name="event_facts" rows={3} required value={facts} onChange={event => setFacts(event.target.value)} />
      </label>
      <label htmlFor="sc1-meaning">What did you immediately make it mean?<span>Name the meaning that came to mind, even if you are unsure.</span>
        <textarea id="sc1-meaning" name="automatic_interpretation" rows={3} required value={meaning} onChange={event => setMeaning(event.target.value)} />
      </label>
    </div>
    <p className="sc1-moment__bridge">What happened <span aria-hidden="true">→</span> what I believed it meant</p>
    <button className="button" type="submit" disabled={pending || !facts.trim() || !meaning.trim()}>{pending ? 'Saving…' : 'Save & continue'}</button>
    {state.error ? <p className="field__error" role="alert">{state.error}</p> : null}
  </form>;
}

function Reflection({ reflection, reviewReflection, saveReflection, editReflection }: Pick<Props, 'reflection' | 'reviewReflection' | 'saveReflection' | 'editReflection'>) {
  const [state, action, pending] = useActionState(saveReflection, {});
  const [body, setBody] = useState(reflection ?? '');
  if (reviewReflection) return <ReviewReflection id="sc1-reflection" label="A thought you want to keep (optional)" reflection={reflection} action={editReflection} />;
  return <form className="deep-dive-reflection" action={action}>
    <label htmlFor="sc1-reflection">A thought you want to keep (optional)</label>
    <textarea id="sc1-reflection" name="body" rows={3} value={body} onChange={event => setBody(event.target.value)} />
    <div className="deep-dive-reflection__actions">
      <button className="button" type="submit" disabled={pending || !body.trim()}>{pending ? 'Saving…' : 'Save & continue'}</button>
      <button className="button button--secondary" type="submit" name="skip" value="true" disabled={pending}>Continue without writing</button>
    </div>
    {state.error ? <p className="field__error" role="alert">{state.error}</p> : null}
  </form>;
}

export function SC1Lesson({ section, record, reflection, sources, completed, reviewReflection, saveResponse, saveReflection, editReflection }: Props) {
  return <article className={`deep-dive-lesson deep-dive-lesson--sc1 deep-dive-lesson--${section.id}`}>
    <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p><h1>{section.title}</h1>
    {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    {section.id === 'contrast' ? <Contrast /> : null}
    {section.id === 'interaction' ? <Moment record={record} sources={sources} completed={completed} saveResponse={saveResponse} /> : null}
    {section.id === 'reflection' ? <Reflection reflection={reflection} reviewReflection={reviewReflection} saveReflection={saveReflection} editReflection={editReflection} /> : null}
    {section.id === 'practice' ? <div className="sc1-practice" role="note"><span className="eyebrow">A WAY TO BEGIN</span><p>“What did I see or hear? What meaning appeared in me?”</p></div> : null}
  </article>;
}
