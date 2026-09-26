'use client';

import { useActionState, useState } from 'react';
import type { SG2Section } from '../../content/deep-dive/v1/see-clearly/sg2';
import type { SG2Record } from '../../server/data/see-clearly-sg2-repository';
import type { SG1Record } from '../../server/data/see-clearly-sg1-repository';
import { LessonActionError } from './LessonTransitionForm';
import { ReviewReflection, type ReviewReflectionAction } from './ReviewReflection';

export type SG2SaveState = Readonly<{ error?: string; saved?: boolean; signIn?: boolean }>;
export type SG2Action = (state: SG2SaveState, formData: FormData) => Promise<SG2SaveState>;
type Props = Readonly<{ section: SG2Section; record: SG2Record | null; sg1Context: SG1Record | null; reflection: string | null;
  completed: boolean; reviewReflection: boolean; saveRecord: SG2Action; deleteRecord: SG2Action;
  saveReflection: SG2Action; editReflection: ReviewReflectionAction; deleteReflection: SG2Action }>;

function DeleteButton({ action, label }: { action: SG2Action; label: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction}><button className="button button--secondary" disabled={pending}>{pending ? 'Deleting…' : label}</button>
    <LessonActionError error={state.error} signIn={state.signIn} /></form>;
}

function Recognition({ record, sg1Context, completed, saveRecord, deleteRecord }: Pick<Props, 'record' | 'sg1Context' | 'completed' | 'saveRecord' | 'deleteRecord'>) {
  const [state, action, pending] = useActionState(saveRecord, {});
  const [situation, setSituation] = useState(record?.situation ?? '');
  const [expectation, setExpectation] = useState(record?.expectation ?? '');
  return <div className="sg1-recognition">
    {sg1Context ? <details className="sg1-recognition__frame"><summary>Look back at my SG1 picture (optional)</summary>
      <p>{sg1Context.learnedGodImage}</p><p>This is your earlier wording for context. It does not determine what you expect here.</p></details> : null}
    <form action={action} className="sg1-recognition__form">
      <label htmlFor="sg2-situation">A real moment I noticed…</label>
      <p id="sg2-situation-help">Choose one situation. A few words are enough.</p>
      <textarea id="sg2-situation" name="situation" rows={3} aria-describedby="sg2-situation-help" value={situation} onChange={event => setSituation(event.target.value)} />
      <label htmlFor="sg2-expectation">In that moment, I expected God to…</label>
      <p id="sg2-expectation-help">Write what you found yourself expecting, even if you are uncertain.</p>
      <textarea id="sg2-expectation" name="expectation" rows={5} aria-describedby="sg2-expectation-help" value={expectation} onChange={event => setExpectation(event.target.value)} />
      <div className="deep-dive-reflection__actions">
        <button className="button" disabled={pending || !situation.trim() || !expectation.trim()}>{pending ? 'Saving…' : completed ? 'Save changes' : 'Save & continue'}</button>
        {!completed ? <button className="button button--secondary" name="skip" value="true" disabled={pending}>Continue without saving</button> : null}
      </div>
      {state.saved ? <p role="status">Your words were saved.</p> : null}
      <LessonActionError error={state.error} signIn={state.signIn} />
    </form>
    {completed && record ? <DeleteButton action={deleteRecord} label="Delete saved expectation" /> : null}
  </div>;
}

function Reflection({ reflection, reviewReflection, saveReflection, editReflection, deleteReflection }: Pick<Props, 'reflection' | 'reviewReflection' | 'saveReflection' | 'editReflection' | 'deleteReflection'>) {
  const label = 'When does this expectation tend to appear?';
  const [state, action, pending] = useActionState(saveReflection, {});
  const [body, setBody] = useState(reflection ?? '');
  if (reviewReflection) return <><ReviewReflection key={reflection ?? 'empty'} id="sg2-reflection" label={label} reflection={reflection} action={editReflection} />
    {reflection ? <DeleteButton action={deleteReflection} label="Delete reflection" /> : null}</>;
  return <form className="deep-dive-reflection" action={action}>
    <label htmlFor="sg2-reflection">{label}</label><textarea id="sg2-reflection" name="body" rows={3} value={body} onChange={event => setBody(event.target.value)} />
    <div className="deep-dive-reflection__actions"><button className="button" disabled={pending || !body.trim()}>{pending ? 'Saving…' : 'Save & continue'}</button>
      <button className="button button--secondary" name="skip" value="true" disabled={pending}>Continue without writing</button></div>
    <LessonActionError error={state.error} signIn={state.signIn} />
  </form>;
}

export function SG2Lesson(props: Props) {
  const { section } = props;
  return <article className={`deep-dive-lesson deep-dive-lesson--sg1 deep-dive-lesson--sg1-${section.id}`}>
    <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p><h1>{section.title}</h1>
    {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    {section.id === 'recognition' ? <Recognition key={props.record ? `saved:${props.record.situation}:${props.record.expectation}` : 'missing'} {...props} /> : null}
    {section.id === 'reflection' ? <Reflection {...props} /> : null}
  </article>;
}
