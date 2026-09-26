'use client';

import { useActionState, useState } from 'react';
import type { SY3Section } from '../../content/deep-dive/v1/see-clearly/sy3';
import type { SY3Record, SY3Source } from '../../server/data/see-clearly-sy3-repository';
import { LessonActionError } from './LessonTransitionForm';
import { ReviewReflection, type ReviewReflectionAction } from './ReviewReflection';

export type SY3SaveState = Readonly<{ error?: string; saved?: boolean; signIn?: boolean }>;
export type SY3Action = (state: SY3SaveState, formData: FormData) => Promise<SY3SaveState>;
type Props = Readonly<{ section: SY3Section; record: SY3Record | null; source: SY3Source | null;
  reflection: string | null; completed: boolean; reviewReflection: boolean;
  saveStory: SY3Action; saveReflection: SY3Action; editReflection: ReviewReflectionAction;
  deleteReflection: SY3Action }>;

function Recognition({ record, source, completed, saveStory }: Pick<Props, 'record' | 'source' | 'completed' | 'saveStory'>) {
  const [state, action, pending] = useActionState(saveStory, {});
  const [wording, setWording] = useState(record?.selfStoryHypothesis ?? '');
  const [useSource, setUseSource] = useState(Boolean(record?.sourceSy2RecordId && source));
  return <form className="sy3-recognition" action={action} onReset={event => event.preventDefault()}>
    {source ? <fieldset className="sy2-trace__source"><legend>Where would you like to begin?</legend>
      <label><input type="radio" name="source_choice" checked={useSource} onChange={() => setUseSource(true)} />Use my SY2 trace</label>
      <label><input type="radio" name="source_choice" checked={!useSource} onChange={() => setUseSource(false)} />Start from what I have been noticing lately</label>
    </fieldset> : <p>You can start from what you have been noticing lately. No earlier trace is needed.</p>}
    {useSource && source ? <aside className="sy3-recognition__source" aria-label="Your SY2 trace">
      <p className="eyebrow">YOUR EARLIER WORDS · SY2</p>
      {([['What I saw', source.perception], ['What I believed', source.belief], ['What I expected', source.expectation], ['What I desired', source.desire], ['What I intended', source.intention], ['What I chose', source.choice], ['How I lived', source.outcome]] as const).map(([label, value]) => value ? <p key={label}><strong>{label}:</strong> {value}</p> : null)}
    </aside> : null}
    {record?.sourceWasLinked && !record.sourceSy2RecordId ? <p role="status">Your earlier SY2 source is no longer available. Your own story wording remains here.</p> : null}
    <input type="hidden" name="source_sy2_record_id" value={useSource ? source?.id ?? '' : ''} />
    <label htmlFor="sy3-story">A story I sometimes carry is…</label>
    <p id="sy3-story-help">As you think about this moment—and other moments that have felt similar—what does the story underneath them seem to say about you?</p>
    <textarea id="sy3-story" name="wording" aria-describedby="sy3-story-help" rows={5} value={wording} onChange={event => setWording(event.target.value)} placeholder="I may have learned…" />
    <div className="deep-dive-reflection__actions">
      <button className="button" disabled={pending || !wording.trim()}>{pending ? 'Saving…' : completed ? 'Save changes' : 'Save & continue'}</button>
      {!completed ? <button className="button button--secondary" name="skip" value="true" disabled={pending}>Continue without saving a story</button> : null}
    </div>
    {state.saved ? <p role="status">Your words were saved.</p> : null}
    <LessonActionError error={state.error} signIn={state.signIn} />
  </form>;
}

function Reflection({ reflection, reviewReflection, saveReflection, editReflection, deleteReflection }: Pick<Props, 'reflection' | 'reviewReflection' | 'saveReflection' | 'editReflection' | 'deleteReflection'>) {
  const label = 'When this story shows up, what do you notice it changes in the way you respond?';
  const [state, action, pending] = useActionState(saveReflection, {});
  const [body, setBody] = useState(reflection ?? '');
  if (reviewReflection) return <><ReviewReflection id="sy3-reflection" label={label} reflection={reflection} action={editReflection} />
    {reflection ? <DeleteReflection action={deleteReflection} /> : null}</>;
  return <form className="deep-dive-reflection" action={action}>
    <label htmlFor="sy3-reflection">{label}</label>
    <textarea id="sy3-reflection" name="body" rows={3} value={body} onChange={event => setBody(event.target.value)} />
    <div className="deep-dive-reflection__actions"><button className="button" disabled={pending || !body.trim()}>{pending ? 'Saving…' : 'Save & continue'}</button>
      <button className="button button--secondary" name="skip" value="true" disabled={pending}>Continue without writing</button></div>
    <LessonActionError error={state.error} signIn={state.signIn} />
  </form>;
}

function DeleteReflection({ action }: { action: SY3Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction}><button className="button button--secondary" disabled={pending}>{pending ? 'Deleting…' : 'Delete reflection'}</button>
    <LessonActionError error={state.error} signIn={state.signIn} /></form>;
}

export function SY3Lesson(props: Props) {
  const { section } = props;
  return <article className={`deep-dive-lesson deep-dive-lesson--sy3 deep-dive-lesson--sy3-${section.id}`}>
    <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p><h1>{section.title}</h1>
    {section.paragraphs.map((paragraph, index) => <p className={section.id === 'entry' && index === 1 ? 'sy3-hinge' : undefined} key={paragraph}>{paragraph}</p>)}
    {section.id === 'recognition' ? <Recognition {...props} /> : null}
    {section.id === 'reflection' ? <Reflection {...props} /> : null}
  </article>;
}
