'use client';

import { useActionState, useState } from 'react';
import type { SG1Section } from '../../content/deep-dive/v1/see-clearly/sg1';
import type { SG1Record } from '../../server/data/see-clearly-sg1-repository';
import { LessonActionError } from './LessonTransitionForm';
import { ReviewReflection, type ReviewReflectionAction } from './ReviewReflection';

export type SG1SaveState = Readonly<{ error?: string; saved?: boolean; signIn?: boolean }>;
export type SG1Action = (state: SG1SaveState, formData: FormData) => Promise<SG1SaveState>;
type Props = Readonly<{ section: SG1Section; record: SG1Record | null; reflection: string | null;
  completed: boolean; reviewReflection: boolean; saveImage: SG1Action; deleteImage: SG1Action;
  saveReflection: SG1Action; editReflection: ReviewReflectionAction; deleteReflection: SG1Action }>;

function Recognition({ record, completed, saveImage, deleteImage }: Pick<Props, 'record' | 'completed' | 'saveImage' | 'deleteImage'>) {
  const [state, action, pending] = useActionState(saveImage, {});
  const [wording, setWording] = useState(record?.learnedGodImage ?? '');
  const [influence, setInfluence] = useState(record?.sourceInfluenceNote ?? '');
  return <div className="sg1-recognition">
    <div className="sg1-recognition__frame" aria-label="Picture and influence distinction">
      <p className="eyebrow">THE PICTURE I CARRY</p>
      <p>What I say about God and the picture I have learned to relate to may feel different. I can notice the picture without deciding yet whether it is true.</p>
      <p className="eyebrow">WHAT MAY HAVE SHAPED IT</p>
      <p>Possible influences are worth noticing, even when I cannot name a single source.</p>
    </div>
    <form action={action} className="sg1-recognition__form">
      <label htmlFor="sg1-image">The God I learned seemed…</label>
      <p id="sg1-image-help">When you think about the picture of God you have learned to carry, how would you describe Him? You may leave this open.</p>
      <textarea id="sg1-image" name="wording" rows={5} aria-describedby="sg1-image-help" value={wording} onChange={event => setWording(event.target.value)} placeholder="The God I learned seemed…" />
      <div className="sg1-recognition__note">
        <label htmlFor="sg1-influence">Some things that may have shaped this picture… <span>(optional)</span></label>
        <textarea id="sg1-influence" name="influence" rows={3} value={influence} onChange={event => setInfluence(event.target.value)} />
      </div>
      <div className="deep-dive-reflection__actions">
        <button className="button" disabled={pending || !wording.trim()}>{pending ? 'Saving…' : completed ? 'Save changes' : 'Save & continue'}</button>
        {!completed ? <button className="button button--secondary" name="skip" value="true" disabled={pending}>Continue without saving a picture</button> : null}
      </div>
      {state.saved ? <p role="status">Your words were saved.</p> : null}
      <LessonActionError error={state.error} signIn={state.signIn} />
    </form>
    {completed && record ? <DeleteButton action={deleteImage} label="Delete saved picture" /> : null}
  </div>;
}

function DeleteButton({ action, label }: { action: SG1Action; label: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction}><button className="button button--secondary" disabled={pending}>{pending ? 'Deleting…' : label}</button>
    <LessonActionError error={state.error} signIn={state.signIn} /></form>;
}

function Reflection({ reflection, reviewReflection, saveReflection, editReflection, deleteReflection }: Pick<Props, 'reflection' | 'reviewReflection' | 'saveReflection' | 'editReflection' | 'deleteReflection'>) {
  const label = 'What makes this picture of God feel familiar to you?';
  const [state, action, pending] = useActionState(saveReflection, {});
  const [body, setBody] = useState(reflection ?? '');
  if (reviewReflection) return <><ReviewReflection key={reflection ?? 'empty'} id="sg1-reflection" label={label} reflection={reflection} action={editReflection} />
    {reflection ? <DeleteButton action={deleteReflection} label="Delete reflection" /> : null}</>;
  return <form className="deep-dive-reflection" action={action}>
    <label htmlFor="sg1-reflection">{label}</label>
    <textarea id="sg1-reflection" name="body" rows={3} value={body} onChange={event => setBody(event.target.value)} />
    <div className="deep-dive-reflection__actions"><button className="button" disabled={pending || !body.trim()}>{pending ? 'Saving…' : 'Save & continue'}</button>
      <button className="button button--secondary" name="skip" value="true" disabled={pending}>Continue without writing</button></div>
    <LessonActionError error={state.error} signIn={state.signIn} />
  </form>;
}

export function SG1Lesson(props: Props) {
  const { section } = props;
  return <article className={`deep-dive-lesson deep-dive-lesson--sg1 deep-dive-lesson--sg1-${section.id}`}>
    <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p><h1>{section.title}</h1>
    {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    {section.id === 'recognition' ? <Recognition key={props.record ? `saved:${props.record.learnedGodImage}` : 'missing'} {...props} /> : null}
    {section.id === 'reflection' ? <Reflection {...props} /> : null}
  </article>;
}
