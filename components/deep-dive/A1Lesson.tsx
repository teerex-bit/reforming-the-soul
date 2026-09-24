'use client';
import { useActionState, useEffect, useState } from 'react';
import type { A1Section } from '../../content/deep-dive/v1/awaken/pay-attention';

export type A1ReflectionSaveState = Readonly<{ saved: boolean }>;
type A1ReflectionAction = (state: A1ReflectionSaveState, formData: FormData) => Promise<A1ReflectionSaveState>;

export function A1Lesson({ section, index, total, reflection, saveReflection }: { section: A1Section; index: number; total: number; reflection: string | null; saveReflection: A1ReflectionAction }) {
  const [open, setOpen] = useState(false);
  const [saveState, formAction, pending] = useActionState(saveReflection, { saved: false });
  const [editedSinceSave, setEditedSinceSave] = useState(false);

  useEffect(() => {
    if (!pending && saveState.saved) setEditedSinceSave(false);
  }, [pending, saveState.saved]);

  return (
    <article className={`deep-dive-lesson deep-dive-lesson--${section.id}`}>
      <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p>
      <h1>{section.title}</h1>
      {section.id === 'scripture' ? (
        <>
          <figure className="deep-dive-scripture" aria-label="Luke 6:45 Scripture passage">
            <blockquote><p>{section.paragraphs[0]}</p></blockquote>
            <figcaption><cite>Luke 6:45 <span aria-hidden="true">·</span> World English Bible</cite></figcaption>
          </figure>
          {section.paragraphs.slice(1).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
        </>
      ) : section.id === 'practice' || section.id === 'carry-forward' ? (
        <section
          className={`deep-dive-guidance deep-dive-guidance--${section.id}`}
          aria-label={section.id === 'practice' ? 'Practice for the next few days' : 'Carry forward'}
        >
          {section.id === 'practice' ? <p className="deep-dive-guidance__label">For the next few days</p> : null}
          {section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
        </section>
      ) : section.paragraphs.map((paragraph, paragraphIndex) => (
        <p key={paragraphIndex} className={section.id === 'outside-inside' && paragraphIndex < 2 ? 'deep-dive-paired' : undefined}>{paragraph}</p>
      ))}
      {section.reveal ? (
        <div className="deep-dive-reveal">
          <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>{section.reveal.label}</button>
          {open ? <p>{section.reveal.text}</p> : null}
        </div>
      ) : null}
      {section.id === 'reflection' ? (
        <form className="deep-dive-reflection" action={formAction}>
          <label htmlFor="a1-reflection">{section.prompt}</label>
          <textarea
            id="a1-reflection"
            name="body"
            defaultValue={reflection ?? ''}
            placeholder="Write only what you want to keep..."
            onChange={() => setEditedSinceSave(true)}
          />
          <div className="deep-dive-reflection__actions">
            <button className="button" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save reflection'}</button>
            <button className="button button--secondary" type="submit" name="skip" value="true" disabled={pending}>Skip for now</button>
          </div>
          <p className="status-message status-message--saved" role="status" aria-live="polite" aria-atomic="true">
            {saveState.saved && !editedSinceSave ? 'Reflection saved.' : ''}
          </p>
        </form>
      ) : null}
    </article>
  );
}
