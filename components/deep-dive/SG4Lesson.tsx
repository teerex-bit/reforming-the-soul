'use client';

import { useActionState, useState } from 'react';
import type { SG4Section } from '../../content/deep-dive/v1/see-clearly/sg4';
import type { SG4Record } from '../../server/data/see-clearly-sg4-repository';
import type { SG3Record } from '../../server/data/see-clearly-sg3-repository';
import { LessonActionError } from './LessonTransitionForm';
import { ReviewReflection, type ReviewReflectionAction } from './ReviewReflection';

export type SG4SaveState = Readonly<{ error?: string; saved?: boolean; signIn?: boolean }>;
export type SG4Action = (state: SG4SaveState, formData: FormData) => Promise<SG4SaveState>;
type Props = Readonly<{ section: SG4Section; record: SG4Record | null; sg3Context: SG3Record | null; reflection: string | null;
  completed: boolean; reviewReflection: boolean; saveRecord: SG4Action; deleteRecord: SG4Action;
  saveReflection: SG4Action; editReflection: ReviewReflectionAction; deleteReflection: SG4Action }>;

function DeleteButton({ action, label }: { action: SG4Action; label: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction}><button className="button button--secondary" disabled={pending}>{pending ? 'Deleting…' : label}</button>
    <LessonActionError error={state.error} signIn={state.signIn} /></form>;
}

function TrustQuestion({ record, sg3Context, completed, saveRecord, deleteRecord }: Pick<Props, 'record' | 'sg3Context' | 'completed' | 'saveRecord' | 'deleteRecord'>) {
  const [state, action, pending] = useActionState(saveRecord, {});
  const [situation, setSituation] = useState(record?.situation ?? '');
  const [trustMeaning, setTrustMeaning] = useState(record?.trustMeaning ?? '');
  return <div className="sg4-trust">
    {sg3Context ? <details className="sg4-trust__context"><summary>My SG3 observation (optional)</summary>
      <blockquote>{sg3Context.observation}</blockquote><p>Your earlier words are here for context. They do not supply your answer.</p></details> : null}
    <form action={action} className="sg4-trust__form">
      <div className="sg4-trust__moment">
        <label htmlFor="sg4-situation">One unresolved situation…</label>
        <p id="sg4-situation-help">Name only what you are comfortable sharing. A few words are enough.</p>
        <textarea id="sg4-situation" name="situation" rows={3} aria-describedby="sg4-situation-help" value={situation} onChange={event => setSituation(event.target.value)} />
      </div>
      <div className="sg4-trust__meaning">
        <p className="eyebrow">THE OUTCOME IS STILL OPEN</p>
        <label htmlFor="sg4-trust-meaning">In this situation, trusting God would mean…</label>
        <p id="sg4-trust-help">A tentative thought or an honest question is welcome.</p>
        <textarea id="sg4-trust-meaning" name="trustMeaning" rows={5} aria-describedby="sg4-trust-help" value={trustMeaning} onChange={event => setTrustMeaning(event.target.value)} />
      </div>
      <div className="deep-dive-reflection__actions"><button className="button" disabled={pending || !situation.trim() || !trustMeaning.trim()}>{pending ? 'Saving…' : completed ? 'Save changes' : 'Save & continue'}</button>
        {!completed ? <button className="button button--secondary" name="skip" value="true" disabled={pending}>Continue without saving</button> : null}</div>
      {state.saved ? <p role="status">Your words were saved.</p> : null}
      <LessonActionError error={state.error} signIn={state.signIn} />
    </form>
    {completed && record ? <DeleteButton action={deleteRecord} label="Delete saved trust question" /> : null}
  </div>;
}

function Reflection({ reflection, reviewReflection, saveReflection, editReflection, deleteReflection }: Pick<Props, 'reflection' | 'reviewReflection' | 'saveReflection' | 'editReflection' | 'deleteReflection'>) {
  const label = 'What remains yours to do while the outcome is open?';
  const [state, action, pending] = useActionState(saveReflection, {});
  const [body, setBody] = useState(reflection ?? '');
  if (reviewReflection) return <><ReviewReflection key={reflection ?? 'empty'} id="sg4-reflection" label={label} reflection={reflection} action={editReflection} />
    {reflection ? <DeleteButton action={deleteReflection} label="Delete reflection" /> : null}</>;
  return <form className="deep-dive-reflection" action={action}>
    <label htmlFor="sg4-reflection">{label}</label><textarea id="sg4-reflection" name="body" rows={3} value={body} onChange={event => setBody(event.target.value)} />
    <div className="deep-dive-reflection__actions"><button className="button" disabled={pending || !body.trim()}>{pending ? 'Saving…' : 'Save & continue'}</button>
      <button className="button button--secondary" name="skip" value="true" disabled={pending}>Continue without writing</button></div>
    <LessonActionError error={state.error} signIn={state.signIn} />
  </form>;
}

export function SG4Lesson(props: Props) {
  const { section } = props;
  return <article className={`deep-dive-lesson deep-dive-lesson--sg4 deep-dive-lesson--sg4-${section.id}`}>
    <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p><h1>{section.title}</h1>
    {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    {section.id === 'trust-question' ? <TrustQuestion key={props.record ? `saved:${props.record.situation}:${props.record.trustMeaning}` : 'missing'} {...props} /> : null}
    {section.id === 'reflection' ? <Reflection {...props} /> : null}
  </article>;
}
