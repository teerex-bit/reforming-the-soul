'use client';

import { useActionState, useState } from 'react';
import type { SY4Section } from '../../content/deep-dive/v1/see-clearly/sy4';
import type { SY4Record, SY4Source } from '../../server/data/see-clearly-sy4-repository';
import { LessonActionError } from './LessonTransitionForm';
import { ReviewReflection, type ReviewReflectionAction } from './ReviewReflection';

export type SY4SaveState = Readonly<{ error?: string; saved?: boolean; signIn?: boolean }>;
export type SY4Action = (state: SY4SaveState, formData: FormData) => Promise<SY4SaveState>;
type Props = Readonly<{ section: SY4Section; record: SY4Record | null; source: SY4Source | null;
  reflection: string | null; completed: boolean; reviewReflection: boolean;
  saveTruth: SY4Action; saveReflection: SY4Action; editReflection: ReviewReflectionAction;
  deleteReflection: SY4Action }>;

function LookAgain({ record, source, completed, saveTruth }: Pick<Props, 'record' | 'source' | 'completed' | 'saveTruth'>) {
  const [state, action, pending] = useActionState(saveTruth, {});
  const [wording, setWording] = useState(record?.truthToLiveFrom ?? '');
  const [useSource, setUseSource] = useState(Boolean(record?.sourceSy3RecordId && source));
  return <form className="sy4-look-again" action={action} onReset={event => event.preventDefault()}>
    {source ? <fieldset className="sy2-trace__source"><legend>Bring your own words into view?</legend>
      <label><input type="radio" name="source_choice" checked={useSource} onChange={() => setUseSource(true)} />Look at my SY3 story</label>
      <label><input type="radio" name="source_choice" checked={!useSource} onChange={() => setUseSource(false)} />Continue without using it</label>
    </fieldset> : <p>You can continue without a saved SY3 story.</p>}
    {useSource && source ? <aside className="sy4-look-again__source" aria-label="Your SY3 story">
      <p className="eyebrow">THE STORY I LEARNED · SY3</p>
      <p>{source.selfStoryHypothesis}</p>
    </aside> : null}
    {record?.sourceWasLinked && !record.sourceSy3RecordId ? <p role="status">Your earlier SY3 story is no longer available. Your own truth wording remains here.</p> : null}
    <div className="sy4-look-again__authority"><p className="eyebrow">WHAT HAS AUTHORITY TO DEFINE ME?</p>
      <p>New creation and God’s workmanship speak to identity before performance. Your earlier story can be examined without being given the final word.</p></div>
    <input type="hidden" name="source_sy3_record_id" value={useSource ? source?.id ?? '' : ''} />
    <label htmlFor="sy4-truth">A truth I want to learn to live from is…</label>
    <p id="sy4-truth-help">After considering the teaching and Scripture, what truth do you want to learn to live from? You may leave this open.</p>
    <textarea id="sy4-truth" name="wording" aria-describedby="sy4-truth-help" rows={5} value={wording} onChange={event => setWording(event.target.value)} placeholder="I want to learn to live from…" />
    <div className="deep-dive-reflection__actions">
      <button className="button" disabled={pending || !wording.trim()}>{pending ? 'Saving…' : completed ? 'Save changes' : 'Save & continue'}</button>
      {!completed ? <button className="button button--secondary" name="skip" value="true" disabled={pending}>Continue without saving a statement</button> : null}
    </div>
    {state.saved ? <p role="status">Your words were saved.</p> : null}
    <LessonActionError error={state.error} signIn={state.signIn} />
  </form>;
}

function Reflection({ reflection, reviewReflection, saveReflection, editReflection, deleteReflection }: Pick<Props, 'reflection' | 'reviewReflection' | 'saveReflection' | 'editReflection' | 'deleteReflection'>) {
  const label = 'What makes it difficult to let what God says carry more authority than the story you have learned?';
  const [state, action, pending] = useActionState(saveReflection, {});
  const [body, setBody] = useState(reflection ?? '');
  if (reviewReflection) return <><ReviewReflection key={reflection ?? 'empty'} id="sy4-reflection" label={label} reflection={reflection} action={editReflection} />
    {reflection ? <DeleteReflection action={deleteReflection} /> : null}</>;
  return <form className="deep-dive-reflection" action={action}>
    <label htmlFor="sy4-reflection">{label}</label>
    <textarea id="sy4-reflection" name="body" rows={3} value={body} onChange={event => setBody(event.target.value)} />
    <div className="deep-dive-reflection__actions"><button className="button" disabled={pending || !body.trim()}>{pending ? 'Saving…' : 'Save & continue'}</button>
      <button className="button button--secondary" name="skip" value="true" disabled={pending}>Continue without writing</button></div>
    <LessonActionError error={state.error} signIn={state.signIn} />
  </form>;
}

function DeleteReflection({ action }: { action: SY4Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction}><button className="button button--secondary" disabled={pending}>{pending ? 'Deleting…' : 'Delete reflection'}</button>
    <LessonActionError error={state.error} signIn={state.signIn} /></form>;
}

export function SY4Lesson(props: Props) {
  const { section } = props;
  return <article className={`deep-dive-lesson deep-dive-lesson--sy4 deep-dive-lesson--sy4-${section.id}`}>
    <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p><h1>{section.title}</h1>
    {section.paragraphs.map((paragraph, index) => <p className={section.id === 'formation' && index === 2 ? 'sy4-hinge' : undefined} key={paragraph}>{paragraph}</p>)}
    {section.id === 'look-again' ? <LookAgain {...props} /> : null}
    {section.id === 'reflection' ? <Reflection {...props} /> : null}
  </article>;
}
