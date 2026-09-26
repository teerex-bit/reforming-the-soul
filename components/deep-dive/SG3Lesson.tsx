'use client';

import { useActionState, useState } from 'react';
import type { SG3Section } from '../../content/deep-dive/v1/see-clearly/sg3';
import type { SG3Record } from '../../server/data/see-clearly-sg3-repository';
import type { SG2Record } from '../../server/data/see-clearly-sg2-repository';
import { LessonActionError } from './LessonTransitionForm';
import { ReviewReflection, type ReviewReflectionAction } from './ReviewReflection';

export type SG3SaveState = Readonly<{ error?: string; saved?: boolean; signIn?: boolean }>;
export type SG3Action = (state: SG3SaveState, formData: FormData) => Promise<SG3SaveState>;
type Props = Readonly<{ section: SG3Section; record: SG3Record | null; sg2Context: SG2Record | null; reflection: string | null;
  completed: boolean; reviewReflection: boolean; saveRecord: SG3Action; deleteRecord: SG3Action;
  saveReflection: SG3Action; editReflection: ReviewReflectionAction; deleteReflection: SG3Action }>;

function DeleteButton({ action, label }: { action: SG3Action; label: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction}><button className="button button--secondary" disabled={pending}>{pending ? 'Deleting…' : label}</button>
    <LessonActionError error={state.error} signIn={state.signIn} /></form>;
}

function Observation({ record, sg2Context, completed, saveRecord, deleteRecord }: Pick<Props, 'record' | 'sg2Context' | 'completed' | 'saveRecord' | 'deleteRecord'>) {
  const [state, action, pending] = useActionState(saveRecord, {});
  const [observation, setObservation] = useState(record?.observation ?? '');
  return <div className="sg3-observation">
    <p className="sg3-observation__anchor">John 14:8–9 <span aria-hidden="true">·</span> John 21</p>
    {sg2Context ? <details className="sg3-observation__context"><summary>My earlier expectation (optional)</summary>
      <p>In {sg2Context.situation}, I expected God to…</p><blockquote>{sg2Context.expectation}</blockquote>
      <p>These are your earlier words. You may look at them without deciding what they mean here.</p></details> : null}
    <form action={action} className="sg3-observation__form">
      <label htmlFor="sg3-observation">When I look at Jesus here, what do I notice about God?</label>
      <p id="sg3-observation-help">Notice something He says or does. An open question is welcome.</p>
      <textarea id="sg3-observation" name="observation" rows={5} aria-describedby="sg3-observation-help" value={observation} onChange={event => setObservation(event.target.value)} />
      <div className="deep-dive-reflection__actions"><button className="button" disabled={pending || !observation.trim()}>{pending ? 'Saving…' : completed ? 'Save changes' : 'Save & continue'}</button>
        {!completed ? <button className="button button--secondary" name="skip" value="true" disabled={pending}>Continue without saving</button> : null}</div>
      {state.saved ? <p role="status">Your observation was saved.</p> : null}
      <LessonActionError error={state.error} signIn={state.signIn} />
    </form>
    {completed && record ? <DeleteButton action={deleteRecord} label="Delete saved observation" /> : null}
  </div>;
}

function Reflection({ reflection, reviewReflection, saveReflection, editReflection, deleteReflection }: Pick<Props, 'reflection' | 'reviewReflection' | 'saveReflection' | 'editReflection' | 'deleteReflection'>) {
  const label = 'What feels familiar or surprising as you look at Jesus?';
  const [state, action, pending] = useActionState(saveReflection, {});
  const [body, setBody] = useState(reflection ?? '');
  if (reviewReflection) return <><ReviewReflection key={reflection ?? 'empty'} id="sg3-reflection" label={label} reflection={reflection} action={editReflection} />
    {reflection ? <DeleteButton action={deleteReflection} label="Delete reflection" /> : null}</>;
  return <form className="deep-dive-reflection" action={action}>
    <label htmlFor="sg3-reflection">{label}</label><textarea id="sg3-reflection" name="body" rows={3} value={body} onChange={event => setBody(event.target.value)} />
    <div className="deep-dive-reflection__actions"><button className="button" disabled={pending || !body.trim()}>{pending ? 'Saving…' : 'Save & continue'}</button>
      <button className="button button--secondary" name="skip" value="true" disabled={pending}>Continue without writing</button></div>
    <LessonActionError error={state.error} signIn={state.signIn} />
  </form>;
}

export function SG3Lesson(props: Props) {
  const { section } = props;
  return <article className={`deep-dive-lesson deep-dive-lesson--sg3 deep-dive-lesson--sg3-${section.id}`}>
    <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p><h1>{section.title}</h1>
    {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    {section.id === 'observation' ? <Observation key={props.record ? `saved:${props.record.observation}` : 'missing'} {...props} /> : null}
    {section.id === 'reflection' ? <Reflection {...props} /> : null}
  </article>;
}
